import {SnackbarProvider} from 'notistack';
import AppRouterProvider from './providers/AppRouterProvider';
import AppQueryClientProvider from './providers/AppQueryClientProvider';
import AppConnectionProvider from './providers/AppConnetionProvider';
import AppWalletProvider from './providers/AppWalletProvider';
import {NetworkProvider} from './contexts/NetworkContext';

function App() {
  return (
    <AppQueryClientProvider>
      <SnackbarProvider maxSnack={3}>
        <NetworkProvider>
          <AppConnectionProvider>
            <AppWalletProvider>
              <AppRouterProvider />
            </AppWalletProvider>
          </AppConnectionProvider>
        </NetworkProvider>
      </SnackbarProvider>
    </AppQueryClientProvider>
  );
}

export default App;
