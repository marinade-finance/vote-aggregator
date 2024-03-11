import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {PublicKey} from '@solana/web3.js';
import {useMutation} from '@tanstack/react-query';
import {SplTfSdk} from '../devnet/SplTfSdk';

const useAirdrop = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const splTf = new SplTfSdk({
    connection,
  });

  return useMutation({
    mutationFn: async ({mint}: {mint: PublicKey}) => {
      const tx = await splTf.airdrop({mint, payer: publicKey!});
      tx.feePayer = publicKey!;
      const signature = await sendTransaction(tx, connection);
      const result = await connection.confirmTransaction({
        signature: signature,
        blockhash: tx.recentBlockhash!,
        lastValidBlockHeight: tx.lastValidBlockHeight!,
      });
      if (result.value.err) {
        throw new Error(result.value.err.toString());
      }
    },
  });
};

export default useAirdrop;
