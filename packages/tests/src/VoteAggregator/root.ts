import {PublicKey} from '@solana/web3.js';
import {MaxVoterWeightRecordAccount, RootAccount} from './accounts';
import {RealmTester} from '../SplGovernance/realm';
import {BN} from '@coral-xyz/anchor';
import {getMinimumBalanceForRentExemption} from '../utils';
import {AddedAccount} from 'solana-bankrun';
import {buildVoteAggregatorProgram} from './program';

export type RootTestData = {
  side: 'community' | 'council';
  voteAggregatorId?: PublicKey;
  votingWeightPlugin?: PublicKey;
  clanCount?: BN;
  memberCount?: BN;
  maxVoterWeight?: BN;
  maxProposalLifetime?: BN;
  nextWeightDeadline?: BN;
  epochLength?: BN;
};

export class RootTester {
  public realm: RealmTester;
  public side: 'community' | 'council';
  public voteAggregatorId: PublicKey;
  public root: RootAccount;
  public maxVoterWeight: MaxVoterWeightRecordAccount;

  get splGovernanceId(): PublicKey {
    return this.realm.splGovernanceId;
  }

  get rootAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        this.realm.realmAddress.toBuffer(),
        this.governingTokenMint.toBuffer(),
      ],
      this.voteAggregatorId
    );
  }

  get maxVoterWeightAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('max-voter-weight', 'utf-8'),
        this.rootAddress[0].toBuffer(),
      ],
      this.voteAggregatorId
    );
  }

  get governingTokenMint(): PublicKey {
    if (this.side === 'community') {
      return this.realm.realm.communityMint;
    } else {
      return this.realm.realm.config.councilMint!;
    }
  }

  get lockAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lock-authority', 'utf8'), this.rootAddress[0].toBuffer()],
      this.voteAggregatorId
    );
  }

  constructor({
    realm,
    side,
    voteAggregatorId = new PublicKey(
      'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
    ),
    votingWeightPlugin = PublicKey.default,
    clanCount = new BN(0),
    memberCount = new BN(0),
    maxVoterWeight = new BN(0),
    maxProposalLifetime = new BN(0),
    nextWeightDeadline = new BN(0),
    epochLength = new BN(0),
  }: RootTestData & {realm: RealmTester}) {
    this.realm = realm;
    this.side = side;
    this.voteAggregatorId = voteAggregatorId;
    const [, rootBump] = this.rootAddress;
    const [, maxVoterWeightBump] = this.maxVoterWeightAddress;
    const [, lockAuthorityBump] = this.lockAuthority;

    this.root = {
      realm: realm.realmAddress,
      governanceProgram: realm.splGovernanceId,
      governingTokenMint:
        side === 'community'
          ? realm.realm.communityMint
          : realm.realm.config.councilMint!,
      maxProposalLifetime,
      votingWeightPlugin,
      clanCount,
      memberCount,
      nextWeightDeadline,
      epochLength,
      bumps: {
        root: rootBump,
        maxVoterWeight: maxVoterWeightBump,
        lockAuthority: lockAuthorityBump,
      },
    };

    this.maxVoterWeight = {
      realm: this.realm.realmAddress,
      governingTokenMint: this.governingTokenMint,
      maxVoterWeight,
      maxVoterWeightExpiry: null, // TODO
      reserved: [0, 0, 0, 0, 0, 0, 0, 0],
    };
  }

  async accounts(): Promise<AddedAccount[]> {
    const accounts: AddedAccount[] = [];
    const program = buildVoteAggregatorProgram({
      voteAggregatorId: this.voteAggregatorId,
    });
    {
      const rootData = await program.coder.accounts.encode<RootAccount>(
        'root',
        this.root
      );
      accounts.push({
        address: this.rootAddress[0],
        info: {
          executable: false,
          owner: this.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(rootData.length),
          data: rootData,
        },
      });
    }
    {
      const mvwrData =
        await program.coder.accounts.encode<MaxVoterWeightRecordAccount>(
          'maxVoterWeightRecord',
          this.maxVoterWeight
        );
      accounts.push({
        address: this.maxVoterWeightAddress[0],
        info: {
          executable: false,
          owner: this.voteAggregatorId,
          lamports: getMinimumBalanceForRentExemption(mvwrData.length),
          data: mvwrData,
        },
      });
    }
    return accounts;
  }
}
