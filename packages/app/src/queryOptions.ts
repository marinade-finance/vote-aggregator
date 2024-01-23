import {Cluster, PublicKey} from '@solana/web3.js';
import {queryOptions} from '@tanstack/react-query';
import fetchVoteAggregatorList from './fetchers/fetchVoteAggregatorList';
import fetchClanList from './fetchers/fetchClanList';
import fetchMember from './fetchers/fetchMember';
import fetchClan from './fetchers/fetchClan';
import fetchVoteAggregator from './fetchers/fetchVoteAggregator';
import fetchVsrVoter from './fetchers/fetchVsrVoter';

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

export const voteAggregatorQueryOptions = ({
  network,
  root,
}: {
  network: Cluster;
  root: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toBase58(), 'voteAggregator'],
    queryFn: ({queryKey}) => {
      return fetchVoteAggregator({
        network: queryKey[0] as Cluster,
        root: new PublicKey(queryKey[1]),
      });
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
    queryKey: [network, root.toBase58(), 'clanList'],
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
    queryKey: [network, root.toBase58(), 'clan', clan.toBase58()],
    queryFn: ({queryKey}) => {
      return fetchClan({
        network: queryKey[0] as Cluster,
        clan: new PublicKey(queryKey[3]),
      });
    },
  });
};

export const memberQueryOptions = ({
  network,
  root,
  owner,
}: {
  network: Cluster;
  root: PublicKey;
  owner: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toBase58(), 'member', owner.toBase58()],
    queryFn: ({queryKey}) => {
      return fetchMember({
        network: queryKey[0] as Cluster,
        root: new PublicKey(queryKey[1]),
        owner: new PublicKey(queryKey[3]),
      });
    },
  });
};

export const vsrVoterQueryOptions = ({
  network,
  root,
  owner,
}: {
  network: Cluster;
  root: PublicKey;
  owner: PublicKey;
}) => {
  return queryOptions({
    queryKey: [network, root.toBase58(), 'vsrVoter', owner.toBase58()],
    queryFn: async ({queryKey}) => {
      const network = queryKey[0] as Cluster
      const root = new PublicKey(queryKey[1]);
      const rootData = await fetchVoteAggregator({network, root}); // TODO: memoize
      return fetchVsrVoter({
        network,
        rootData,
        owner: new PublicKey(queryKey[3]),
      });
    },
  });
}