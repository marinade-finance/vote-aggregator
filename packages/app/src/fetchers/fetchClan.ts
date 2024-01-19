import {Cluster, PublicKey} from '@solana/web3.js';
import voteAggregtorSdk from './voteAggregatorSdk';
import { ClanInfo } from './fetchClanList';


const fetchClan = async ({
  network,
  clan,
}: {
  network: Cluster;
  clan: PublicKey;
}): Promise<ClanInfo> => {
  const sdk = voteAggregtorSdk(network);
  const clanData = await sdk.clan.fetchClan(clan);

  return {
    address: clan,
    root: clanData.root,
    owner: clanData.owner,
    delegate: clanData.delegate,
    voterAuthority: clanData.voterAuthority,
    tokenOwnerRecord: clanData.tokenOwnerRecord,
    voterWeightRecord: clanData.voterWeightRecord,
    minVotingWeightToJoin: clanData.minVotingWeightToJoin,
    activeMembers: clanData.activeMembers,
    leavingMembers: clanData.leavingMembers,
    potentialVoterWeight: clanData.potentialVoterWeight,
    name: clanData.name,
    description: clanData.description,
  };
};

export default fetchClan;
