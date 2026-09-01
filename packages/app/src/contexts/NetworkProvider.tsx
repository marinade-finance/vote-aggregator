import {Cluster} from '@solana/web3.js';
import {FC, ReactNode, useState} from 'react';
import {NetworkContext} from './NetworkContext';

export const NetworkProvider: FC<{children: ReactNode}> = ({children}) => {
  const [network, setNetwork] = useState<Cluster>('devnet');

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};
