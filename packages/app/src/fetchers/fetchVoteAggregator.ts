import { Cluster, PublicKey } from "@solana/web3.js";
import voteAggregtorSdk from "./voteAggregatorSdk";
import { RootInfo } from "./fetchVoteAggregatorList";
import { getRealm } from "@solana/spl-governance";

const fetchVoteAggregator = async ({
  network,
  root,
}: {
  network: Cluster;
  root: PublicKey;
}): Promise<RootInfo> => {
  const sdk = voteAggregtorSdk(network);
  const rootData = await sdk.root.fetchRoot(root);
  // TODO: memoize this
  const realmData = await getRealm(sdk.connection, rootData.realm);
  return {
    ...rootData,
    address: root,
    realmData: realmData.account,
    side: rootData.governingTokenMint.equals(realmData.account.communityMint)
      ? 'community'
      : 'council',
  }
}

export default fetchVoteAggregator;
