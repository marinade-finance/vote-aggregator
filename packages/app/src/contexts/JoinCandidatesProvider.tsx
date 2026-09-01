import {FC, ReactNode, useEffect, useState} from 'react';
import {PublicKey} from '@solana/web3.js';
import {useWallet} from '@solana/wallet-adapter-react';
import {JoinCandidates, JoinCandidatesContext} from './JoinCandidatesContext';

export const JoinCandidatesProvider: FC<{
  root: PublicKey;
  children: ReactNode;
}> = ({root, children}) => {
  const {publicKey} = useWallet();
  const [candidates, setCandidates] = useState<JoinCandidates>([]);

  useEffect(() => {
    setCandidates([]);
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    root.toBase58(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    publicKey?.toBase58(),
  ]);

  return (
    <JoinCandidatesContext.Provider value={{candidates, setCandidates}}>
      {children}
    </JoinCandidatesContext.Provider>
  );
};
