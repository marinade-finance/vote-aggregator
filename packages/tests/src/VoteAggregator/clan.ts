import {Keypair, PublicKey} from '@solana/web3.js';
import {getMinimumBalanceForRentExemption, resizeBN} from '../utils';
import {BN} from '@coral-xyz/anchor';
import {ClanAccount, VoterWeightAccount} from './accounts';
import {RootTester} from './root';
import {AddedAccount} from 'solana-bankrun';
import {buildVoteAggregatorProgram} from './voteAggregator';
import {
  TokenOwnerRecordAccount,
  buildSplGovernanceProgram,
} from '../splGovernance';

export type ClanTestData = {
  address: PublicKey;
  owner: PublicKey | Keypair;
  delegate?: PublicKey | Keypair;
  minVotingWeightToJoin?: BN;
  activeMembers?: BN;
  leavingMembers?: BN;
  potentialVotingWeight?: BN;
  name: string;
  description?: string;
  voterWeight?: BN;
  governingTokenDepositAmount?: BN;
  unrelinquishedVotesCount?: BN;
  outstandingProposalCount?: number;
  governanceDelegate?: PublicKey | null;
};

export class ClanTester {
  public owner?: Keypair;
  public delegate?: Keypair;
  public root: RootTester;
  public clanAddress: PublicKey;
  public clan: ClanAccount;
  public tokenOwnerRecord: TokenOwnerRecordAccount;
  public voterWeightRecord: VoterWeightAccount;

  get voterAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('voter-authority', 'utf-8'), this.clanAddress.toBuffer()],
      this.root.voteAggregatorId
    );
  }

  get voterWeightAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('voter-weight', 'utf-8'), this.clanAddress.toBuffer()],
      this.root.voteAggregatorId
    );
  }

  get tokenOwnerRecordAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('governance', 'utf-8'),
        this.root.realm.realmAddress.toBuffer(),
        this.root.governingTokenMint.toBuffer(),
        this.voterAuthority[0].toBuffer(),
      ],
      this.root.splGovernanceId
    );
  }

  constructor({
    address,
    owner,
    delegate,
    root,
    minVotingWeightToJoin = new BN(0),
    activeMembers = new BN(0),
    leavingMembers = new BN(0),
    potentialVotingWeight = new BN(0),
    name,
    description = '',
    voterWeight = new BN(0),
    governingTokenDepositAmount = new BN(0),
    unrelinquishedVotesCount = new BN(0),
    outstandingProposalCount = 0,
    governanceDelegate = null,
  }: ClanTestData & {root: RootTester}) {
    this.clanAddress = address;
    if (owner instanceof Keypair) {
      this.owner = owner;
      owner = owner.publicKey;
    }
    if (delegate instanceof Keypair) {
      this.delegate = delegate;
      delegate = delegate.publicKey;
    }
    this.root = root;

    const [voterAuthority, voterAuthorityBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from('voter-authority', 'utf-8'), address.toBuffer()],
        root.voteAggregatorId
      );

    const [tokenOwnerRecord, tokenOwnerRecordBump] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from('governance', 'utf-8'),
          root.realm.realmAddress.toBuffer(),
          root.governingTokenMint.toBuffer(),
          owner.toBuffer(),
        ],
        root.splGovernanceId
      );

    const [voterWeightRecord, voterWeightRecordBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from('voter-weight', 'utf-8'), address.toBuffer()],
        root.voteAggregatorId
      );

    this.clan = {
      root: root.rootAddress[0],
      owner,
      delegate: delegate || PublicKey.default,
      voterAuthority,
      tokenOwnerRecord,
      voterWeightRecord,
      minVotingWeightToJoin: resizeBN(minVotingWeightToJoin),
      bumps: {
        voterAuthority: voterAuthorityBump,
        tokenOwnerRecord: tokenOwnerRecordBump,
        voterWeightRecord: voterWeightRecordBump,
      },
      activeMembers: resizeBN(activeMembers),
      leavingMembers: resizeBN(leavingMembers),
      potentialVotingWeight: resizeBN(potentialVotingWeight),
      name,
      description,
    };

    this.voterWeightRecord = {
      realm: root.realm.realmAddress,
      governingTokenMint: root.governingTokenMint,
      governingTokenOwner: this.voterAuthority[0],
      voterWeight: resizeBN(voterWeight),
      voterWeightExpiry: null,
      weightAction: null,
      weightActionTarget: null,
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    };

    this.tokenOwnerRecord = {
      accountType: {tokenOwnerRecordV2: {}},
      realm: root.realm.realmAddress,
      governingTokenMint: root.governingTokenMint,
      governingTokenOwner: voterAuthority,
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
      const clanData = await program.coder.accounts.encode<ClanAccount>(
        'clan',
        this.clan
      );
      accounts.push({
        address: this.clanAddress,
        info: {
          executable: false,
          owner: this.root.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(clanData.length),
          data: clanData,
        },
      });
    }

    {
      const voterWeigthRecordData =
        await program.coder.accounts.encode<VoterWeightAccount>(
          'voterWeightRecord',
          this.voterWeightRecord
        );
      accounts.push({
        address: this.voterWeightAddress[0],
        info: {
          executable: false,
          owner: this.root.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(
            voterWeigthRecordData.length
          ),
          data: voterWeigthRecordData,
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
          owner: this.root.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(torData.length),
          data: torData,
        },
      });
    }

    return accounts;
  }
}
