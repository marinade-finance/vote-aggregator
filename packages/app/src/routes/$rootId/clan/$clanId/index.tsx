import {FileRoute, Link} from '@tanstack/react-router';
import {clanQueryOptions} from '../../../../queryOptions';
import {PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useWallet} from '@solana/wallet-adapter-react';
import {Box} from '@mui/material';

const ClanComponent = () => {
  const {network} = Route.useSearch();
  const {rootId, clanId} = Route.useParams();
  const root = new PublicKey(rootId);
  const clan = new PublicKey(clanId);
  const {data: clanData} = useSuspenseQuery(
    clanQueryOptions({network, root, clan})
  );
  const {publicKey} = useWallet();
  return (
    <Box>
      <Box>
        Clan: {clanData.name} ({clanId})
      </Box>
      <Box>Description: {clanData.description}</Box>
      <Box>
        Owner:{' '}
        {clanData.owner.toBase58() === publicKey?.toBase58()
          ? 'You'
          : clanData?.owner.toBase58()}
      </Box>
      {clanData.owner.toBase58() === publicKey?.toBase58() && (
        <Box>
          <Link
            to="/$rootId/clan/$clanId/edit"
            params={{
              rootId,
              clanId,
            }}
          >
            Edit
          </Link>
          &nbsp;
          <Link
            to="/$rootId/clan/$clanId/transfer"
            params={{
              rootId,
              clanId,
            }}
          >
            Transfer
          </Link>
        </Box>
      )}
    </Box>
  );
};

export const Route = new FileRoute('/$rootId/clan/$clanId/').createRoute({
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
      })
    ),
  wrapInSuspense: true,
});
