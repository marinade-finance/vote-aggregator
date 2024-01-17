import {Cluster, PublicKey} from '@solana/web3.js';
import voteAggregtorSdk from './voteAggregatorSdk';
import BN from 'bn.js';

export type MemberInfo = {
  root: PublicKey;
  owner: PublicKey;
  delegate: PublicKey;
  clan: PublicKey;
  clanLeavingTime: BN;
  tokenOwnerRecord: PublicKey;
  voterWeightRecord: PublicKey;
  voterWeight: BN;
  voterWeightExpiry: BN | null;
};

const fetchMember = async ({
  network,
  root,
  owner,
}: {
  network: Cluster;
  root: PublicKey;
  owner: PublicKey;
}): Promise<MemberInfo | null> => {
  const sdk = voteAggregtorSdk(network);
  const member = await sdk.member.fetchMember({
    rootAddress: root,
    owner,
  });
  if (!member) {
    return null;
  }

  return {
    root: member.root,
    owner: member.owner,
    delegate: member.delegate,
    clan: member.clan,
    clanLeavingTime: member.clanLeavingTime,
    tokenOwnerRecord: member.tokenOwnerRecord,
    voterWeightRecord: member.voterWeightRecord,
    voterWeight: member.voterWeight,
    voterWeightExpiry: member.voterWeightExpiry,
  };
};

export default fetchMember;
