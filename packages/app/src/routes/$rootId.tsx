import {Box} from '@mui/material';
import {Outlet} from '@tanstack/react-router';
import {FileRoute} from '@tanstack/react-router';
import {useWallet} from '@solana/wallet-adapter-react';
import MemberManagement from '../components/member/MemberManagement';
import {PublicKey} from '@solana/web3.js';
import {voteAggregatorQueryOptions} from '../queryOptions';

const RootComponent = () => {
  const {network} = Route.useSearch();
  const {publicKey} = useWallet();
  const {rootId} = Route.useParams();
  const root = new PublicKey(rootId);
  return (
    <Box sx={{width: '100%', ml: 10}}>
      <Outlet />
      {publicKey && <MemberManagement network={network} root={root} />}
    </Box>
  );
};

export const Route = new FileRoute('/$rootId').createRoute({
  component: RootComponent,
  loaderDeps: ({search: {network}}) => ({network}),
  loader: ({deps: {network}, params: {rootId}, context: {queryClient}}) =>
    queryClient.ensureQueryData(
      voteAggregatorQueryOptions({network, root: new PublicKey(rootId)})
    ),
  beforeLoad: ({params: {rootId}}) => {
    return {
      title: 'Root: ' + rootId,
    };
  },
});
