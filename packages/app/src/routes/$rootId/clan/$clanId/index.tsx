import {FileRoute} from '@tanstack/react-router';
import {clanQueryOptions} from '../../../../queryOptions';
import {LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useWallet} from '@solana/wallet-adapter-react';
import {Box} from '@mui/material';
import ClanManagement from '../../../../components/clan/ClanManagement';
import ClanMembership from '../../../../components/clan/ClanMembership';

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
        Clan: {clanData!.name} ({clanId}){' '}
        {publicKey && (
          <ClanMembership network={network} root={root} clan={clan} />
        )}
      </Box>
      <Box>Description: {clanData.description}</Box>
      <Box>
        Owner:{' '}
        {publicKey && clanData.owner.equals(publicKey)
          ? 'You'
          : clanData.owner.toBase58()}
      </Box>
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
