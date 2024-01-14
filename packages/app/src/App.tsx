import {useCallback, useMemo} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {CssBaseline} from '@mui/material';
import {
  Adapter,
  WalletAdapterNetwork,
  WalletError,
} from '@solana/wallet-adapter-base';
import {clusterApiUrl} from '@solana/web3.js';
import {useSnackbar} from 'notistack';
import {ConnectionProvider, WalletProvider} from '@solana/wallet-adapter-react';
import {WalletDialogProvider} from '@solana/wallet-adapter-material-ui';
import Header from './components/Header';
import ClanList from './components/ClanList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});

function App() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const {enqueueSnackbar} = useSnackbar();
  const onError = useCallback(
    (error: WalletError, adapter?: Adapter) => {
      enqueueSnackbar(
        error.message ? `${error.name}: ${error.message}` : error.name,
        {variant: 'error'}
      );
      console.error(error, adapter);
    },
    [enqueueSnackbar]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={[]} onError={onError} autoConnect>
          <WalletDialogProvider>
            <Header />
            <ClanList sx={{width: '100%', ml: 10}} />
          </WalletDialogProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

export default App;
