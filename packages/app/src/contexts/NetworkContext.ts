import {Cluster} from '@solana/web3.js';
import {createContext} from 'react';

export const NetworkContext = createContext<{
  network: Cluster;
  setNetwork: (network: Cluster) => void;
}>({
  network: 'devnet',
  setNetwork: undefined!,
});
