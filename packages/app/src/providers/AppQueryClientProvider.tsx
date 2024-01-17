import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {FC} from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});

const AppQueryClientProvider: FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default AppQueryClientProvider;
