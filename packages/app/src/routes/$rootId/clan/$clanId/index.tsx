import {createFileRoute} from '@tanstack/react-router';
import {clanQueryOptions} from '../../../../queryOptions';
import {LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';
import {useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {useWallet} from '@solana/wallet-adapter-react';
import {Box} from '@mui/material';
import ClanManagement from '../../../../components/clan/ClanManagement';
// import ClanMembership from '../../../../components/clan/ClanMembership';

const ClanComponent = () => {
  const {network} = Route.useSearch();
  const {rootId, clanId} = Route.useParams();
  const root = new PublicKey(rootId);
  const queryClient = useQueryClient();
  const clan = new PublicKey(clanId);
  const {data: clanData} = useSuspenseQuery(
    clanQueryOptions({network, root, clan, queryClient})
  );
  const {publicKey} = useWallet();
  return (
    <Box>
      <Box>
        Clan: {clanData!.name} ({clanId})
      </Box>
      <Box>Description: {clanData.description}</Box>
      <Box>
        Owner:{' '}
        {publicKey && clanData.owner.equals(publicKey)
          ? 'You'
          : clanData.owner.toBase58()}
      </Box>
      {clanData.governanceDelegate && (
        <Box>
          Voter:{' '}
          {publicKey && clanData.governanceDelegate.equals(publicKey)
            ? 'You'
            : clanData.governanceDelegate.toBase58()}
        </Box>
      )}
      <Box>Voting actor PDA: {clanData.voterAuthority.toBase58()}</Box>
      <Box>
        Total power:{' '}
        {parseFloat(clanData.voterWeight.toString()) / LAMPORTS_PER_SOL}
      </Box>
      {publicKey && clanData.owner.equals(publicKey) && (
        <ClanManagement root={root} clan={clan} />
      )}
    </Box>
  );
};

export const Route = createFileRoute('/$rootId/clan/$clanId/')({
  component: ClanComponent,
  loaderDeps: ({search: {network}}) => ({network}),
  loader: ({
    deps: {network},
    params: {rootId, clanId},
    context: {queryClient},
  }) =>
    queryClient.ensureQueryData(
      clanQueryOptions({
        network,
        root: new PublicKey(rootId),
        clan: new PublicKey(clanId),
        queryClient,
      })
    ),
  wrapInSuspense: true,
});
