import {Keypair, PublicKey} from '@solana/web3.js';
import {getMinimumBalanceForRentExemption, resizeBN} from '../utils';
import {BN} from '@coral-xyz/anchor';
import {MemberAccount} from './accounts';
import {RootTester} from './root';
import {AddedAccount} from 'solana-bankrun';
import {buildVoteAggregatorProgram} from './program';
import {ClanTester} from './clan';
import {
  TokenOwnerRecordAccount,
  buildSplGovernanceProgram,
} from '../SplGovernance/program';

export type MemberTestData = {
  owner: PublicKey | Keypair;
  delegate?: PublicKey | Keypair;
  clan?: PublicKey;
  clanLeavingTime?: BN;
  voterWeightRecord?: PublicKey;
  voterWeight?: BN;
  voterWeightExpiry?: BN | null;
  governingTokenDepositAmount?: BN;
  unrelinquishedVotesCount?: BN;
  outstandingProposalCount?: number;
  governanceDelegate?: PublicKey | null;
};

export class MemberTester {
  public owner: PublicKey | Keypair;
  public delegate?: Keypair;
  public root: RootTester;
  public member: MemberAccount;
  public clan?: ClanTester | PublicKey;
  public tokenOwnerRecord: TokenOwnerRecordAccount;

  get ownerAddress(): PublicKey {
    return this.owner instanceof Keypair ? this.owner.publicKey : this.owner;
  }

  get memberAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('member', 'utf-8'),
        this.root.rootAddress[0].toBuffer(),
        this.ownerAddress.toBuffer(),
      ],
      this.root.voteAggregatorId
    );
  }

  get tokenOwnerRecordAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('governance', 'utf-8'),
        this.root.realm.realmAddress.toBuffer(),
        this.root.governingTokenMint.toBuffer(),
        this.ownerAddress.toBuffer(),
      ],
      this.root.splGovernanceId
    );
  }

  constructor({
    owner,
    delegate,
    root,
    clan,
    clanLeavingTime = new BN('9223372036854775807'), // i64::MAX
    voterWeightRecord = PublicKey.default,
    voterWeight = new BN(0),
    voterWeightExpiry = null,
    governingTokenDepositAmount = new BN(0),
    unrelinquishedVotesCount = new BN(0),
    outstandingProposalCount = 0,
    governanceDelegate = null,
  }: Omit<MemberTestData, 'clan'> & {
    root: RootTester;
    clan?: ClanTester | PublicKey;
  }) {
    this.owner = owner;
    if (delegate instanceof Keypair) {
      this.delegate = delegate;
      delegate = delegate.publicKey;
    }
    this.clan = clan;
    if (clan instanceof ClanTester) {
      clan = clan.clanAddress;
    }
    this.root = root;

    const [, addressBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('member', 'utf-8'),
        root.rootAddress[0].toBuffer(),
        this.ownerAddress.toBuffer(),
      ],
      root.voteAggregatorId
    );

    const [tokenOwnerRecord, tokenOwnerRecordBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from('governance', 'utf-8'),
          root.realm.realmAddress.toBuffer(),
          root.governingTokenMint.toBuffer(),
          this.ownerAddress.toBuffer(),
        ],
        root.splGovernanceId
      );

    this.member = {
      owner: this.ownerAddress,
      delegate: delegate || PublicKey.default,
      root: root.rootAddress[0],
      clan: clan || PublicKey.default,
      clanLeavingTime,
      voterWeight: resizeBN(voterWeight),
      voterWeightExpiry: voterWeightExpiry && resizeBN(voterWeightExpiry),
      tokenOwnerRecord,
      voterWeightRecord,
      bumps: {
        address: addressBump,
        tokenOwnerRecord: tokenOwnerRecordBump,
      },
    };

    this.tokenOwnerRecord = {
      accountType: {tokenOwnerRecordV2: {}},
      realm: root.realm.realmAddress,
      governingTokenMint: root.governingTokenMint,
      governingTokenOwner: this.ownerAddress,
      governingTokenDepositAmount: resizeBN(governingTokenDepositAmount),
      unrelinquishedVotesCount: resizeBN(unrelinquishedVotesCount),
      outstandingProposalCount,
      version: 1,
      reserved: [0, 0, 0, 0, 0, 0],
      governanceDelegate,
      reservedV2: Array(128).fill(0),
    };
  }

  async accounts(): Promise<AddedAccount[]> {
    const accounts: AddedAccount[] = [];
    const program = buildVoteAggregatorProgram({
      voteAggregatorId: this.root.voteAggregatorId,
    });
    const splGovernance = buildSplGovernanceProgram({
      splGovernanceId: this.root.splGovernanceId,
    });
    {
      const memberData = await program.coder.accounts.encode<MemberAccount>(
        'member',
        this.member
      );
      accounts.push({
        address: this.memberAddress[0],
        info: {
          executable: false,
          owner: this.root.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(memberData.length),
          data: memberData,
        },
      });
    }
    {
      const torData =
        await splGovernance.coder.accounts.encode<TokenOwnerRecordAccount>(
          'tokenOwnerRecordV2',
          this.tokenOwnerRecord
        );
      accounts.push({
        address: this.tokenOwnerRecordAddress[0],
        info: {
          executable: false,
          owner: this.root.splGovernanceId,
          lamports: getMinimumBalanceForRentExemption(torData.length),
          data: torData,
        },
      });
    }

    return accounts;
  }
}
