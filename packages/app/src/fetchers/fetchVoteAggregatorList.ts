import {Cluster, PublicKey} from '@solana/web3.js';
import voteAggregtorSdk from './voteAggregatorSdk';
import BN from 'bn.js';
import {Realm, getRealm} from '@solana/spl-governance';
import {RealmSide} from 'vote-aggregator-sdk';

export type RootInfo = {
  address: PublicKey;
  realm: PublicKey;
  realmData: Realm;
  side: RealmSide;
  governingTokenMint: PublicKey;
  votingWeightPlugin: PublicKey;
  maxProposalLifetime: BN;
  clanCount: BN;
  memberCount: BN;
};

const fetchVoteAggregatorList = async ({
  network,
}: {
  network: Cluster;
}): Promise<RootInfo[]> => {
  const sdk = voteAggregtorSdk(network);
  const roots = await sdk.root.fetchRoots({});
  const result: RootInfo[] = [];
  for (const {publicKey, account} of roots) {
    const realmData = await getRealm(sdk.connection, account.realm);
    result.push({
      address: publicKey,
      realm: account.realm,
      realmData: realmData.account,
      side: account.governingTokenMint.equals(realmData.account.communityMint)
        ? 'community'
        : 'council',
      governingTokenMint: account.governingTokenMint,
      votingWeightPlugin: account.votingWeightPlugin,
      maxProposalLifetime: account.maxProposalLifetime,
      clanCount: account.clanCount,
      memberCount: account.memberCount,
    });
  }

  return result;
};

export default fetchVoteAggregatorList;
