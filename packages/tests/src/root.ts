import {PublicKey} from '@solana/web3.js';
import {RootAccount} from './accounts';
import {RealmTestData} from './realm';
import {BN} from '@coral-xyz/anchor';
import {resizeBN} from './utils';
import {AddedAccount} from 'solana-bankrun';
import {buildVoteAggregatorProgram} from './voteAggregator';

export class RootTestData {
  public realm: RealmTestData;
  public side: 'community' | 'council';
  public voteAggregatorId: PublicKey;
  public root: RootAccount;

  get splGovernanceId(): PublicKey {
    return this.realm.splGovernanceId;
  }

  rootAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('root', 'utf-8'),
        this.realm.id.toBuffer(),
        this.governingTokenMint.toBuffer(),
      ],
      this.voteAggregatorId
    );
  }

  maxVoterWeightAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('max-voter-weight', 'utf-8'),
        this.rootAddress()[0].toBuffer(),
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

  constructor({
    realm,
    side,
    voteAggregatorId = new PublicKey(
      'VoTaGDreyne7jk59uwbgRRbaAzxvNbyNipaJMrRXhjT'
    ),
    votingWeightPlugin = PublicKey.default,
    clanCount = new BN(0),
    memberCount = new BN(0),
  }: {
    realm: RealmTestData;
    side: 'community' | 'council';
    voteAggregatorId?: PublicKey;
    votingWeightPlugin?: PublicKey;
    clanCount?: BN;
    memberCount?: BN;
  }) {
    this.realm = realm;
    this.side = side;
    this.voteAggregatorId = voteAggregatorId;
    const [, rootBump] = this.rootAddress();
    const [, maxVoterWeightBump] = this.maxVoterWeightAddress();

    this.root = {
      realm: realm.id,
      governanceProgram: realm.splGovernanceId,
      governingTokenMint:
        side === 'community'
          ? realm.realm.communityMint
          : realm.realm.config.councilMint!,
      maxProposalLifetime: resizeBN(new BN(0)),
      votingWeightPlugin,
      clanCount,
      memberCount,
      bumps: {
        root: rootBump,
        maxVoterWeight: maxVoterWeightBump,
      },
    };
  }

  async accounts(): Promise<AddedAccount[]> {
    const accounts = await this.realm.accounts();
    const program = buildVoteAggregatorProgram({
      voteAggregatorId: this.voteAggregatorId,
    });
    const rootData = await program.coder.accounts.encode<RootAccount>(
      'root',
      this.root
    );
    return accounts.concat({
      address: this.rootAddress()[0],
      info: {
        executable: false,
        owner: this.voteAggregatorId,
        lamports: 1000000000000,
        data: rootData,
      },
    });
  }
}
