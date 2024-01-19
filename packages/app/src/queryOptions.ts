import {Cluster, PublicKey} from '@solana/web3.js';
import {queryOptions} from '@tanstack/react-query';
import fetchVoteAggregatorList from './fetchers/fetchVoteAggregatorList';
import fetchClanList from './fetchers/fetchClanList';
import fetchMember from './fetchers/fetchMember';
import fetchClan from './fetchers/fetchClan';

export const voteAggregatorListQueryOptions = ({
  network,
}: {
  network: Cluster;
}) => {
  return queryOptions({
    queryKey: [network, 'voteAggregatorList'],
    queryFn: ({queryKey}) => {
      return fetchVoteAggregatorList({network: queryKey[0] as Cluster});
    },
  });
};

export const clanListQueryOptions = ({
  network,
  root,
}: {
  network: Cluster;
  root: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toString(), 'clanList'],
    queryFn: ({queryKey}) =>
      fetchClanList({
        network: queryKey[0] as Cluster,
        root: new PublicKey(queryKey[1]),
      }),
  });
};

export const clanQueryOptions = ({
  network,
  root,
  clan,
}: {
  network: Cluster;
  root: PublicKey;
  clan: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toString(), 'clan', clan.toString()],
    queryFn: ({queryKey}) =>
      fetchClan({
        network: queryKey[0] as Cluster,
        clan: new PublicKey(queryKey[3]),
      }),
  });
};

export const memberQueryOptions = ({
  network,
  root,
  owner,
}: {
  network: Cluster;
  root: PublicKey;
  owner?: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toString(), 'member', owner?.toString() || ''],
    queryFn: ({queryKey}) => {
      return fetchMember({
        network: queryKey[0] as Cluster,
        root: new PublicKey(queryKey[1]),
        owner: new PublicKey(queryKey[3]),
      });
    },
    enabled: Boolean(owner),
  });
};
