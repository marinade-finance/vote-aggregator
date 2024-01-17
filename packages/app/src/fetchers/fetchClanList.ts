import { Cluster, PublicKey } from "@solana/web3.js";
import voteAggregtorSdk from "./voteAggregatorSdk";
import BN from "bn.js";

export type ClanInfo = {
  address: PublicKey;
  root: PublicKey;
  owner: PublicKey;
  delegate: PublicKey;
  voterAuthority: PublicKey;
  tokenOwnerRecord: PublicKey;
  voterWeightRecord: PublicKey;
  minVotingWeightToJoin: BN;
  activeMembers: BN;
  leavingMembers: BN;
  potentialVoterWeight: BN;
  name: string;
  description: string;
};

const fetchClanList = async ({
  network,
  root,
}: {
  network: Cluster;
  root: PublicKey;
}): Promise<ClanInfo[]> => {
  const sdk = voteAggregtorSdk(network);
  const clans = await sdk.clan.fetchClans({
    root,
  });
  return clans.map((clan) => ({
    address: clan.publicKey,
    root: clan.account.root,
    owner: clan.account.owner,
    delegate: clan.account.delegate,
    voterAuthority: clan.account.voterAuthority,
    tokenOwnerRecord: clan.account.tokenOwnerRecord,
    voterWeightRecord: clan.account.voterWeightRecord,
    minVotingWeightToJoin: clan.account.minVotingWeightToJoin,
    activeMembers: clan.account.activeMembers,
    leavingMembers: clan.account.leavingMembers,
    potentialVoterWeight: clan.account.potentialVoterWeight,
    name: clan.account.name,
    description: clan.account.description,
  }));
}

export default fetchClanList;