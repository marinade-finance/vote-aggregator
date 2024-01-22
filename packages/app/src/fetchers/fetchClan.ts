import {Cluster, PublicKey} from '@solana/web3.js';
import voteAggregtorSdk from './voteAggregatorSdk';
import BN from 'bn.js';
import {ClanInfo} from './fetchClanList';

export type DetailedClanInfo = ClanInfo & {
  voterWeight: BN;
  voterWeightExpiry: BN | null;
};

const fetchClan = async ({
  network,
  clan,
}: {
  network: Cluster;
  clan: PublicKey;
}): Promise<DetailedClanInfo> => {
  const sdk = voteAggregtorSdk(network);
  const clanData = await sdk.clan.fetchClan(clan);
  const vwr = await sdk.clan.fetchVoterWeight({clanAddress: clan});

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
    voterWeight: vwr.voterWeight,
    voterWeightExpiry: vwr.voterWeightExpiry,
  };
};

export default fetchClan;
