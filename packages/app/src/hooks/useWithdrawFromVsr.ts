import {useMutation, useQueryClient} from '@tanstack/react-query';
import vsrSdk, {RegistrarAccount} from '../fetchers/vsrSdk';
import {Cluster, PublicKey, Transaction} from '@solana/web3.js';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {vsrVoterQueryOptions} from '../queryOptions';

const useWithdrawFromVsr = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      network,
      rootData,
      configIndex,
      depositIndex,
      balance,
    }: {
      network: Cluster;
      rootAddress: PublicKey;
      rootData: {
        realm: PublicKey;
        governanceProgram: PublicKey;
        governingTokenMint: PublicKey;
        votingWeightPlugin: PublicKey;
        registrar: RegistrarAccount;
      };
      configIndex: number;
      depositIndex: number;
      balance: BN;
    }) => {
      const sdk = vsrSdk({network, vsrProgram: rootData.votingWeightPlugin});
      const [registrarAddress] = PublicKey.findProgramAddressSync(
        [
          rootData.realm.toBuffer(),
          Buffer.from('registrar', 'utf-8'),
          rootData.governingTokenMint.toBuffer(),
        ],
        rootData.votingWeightPlugin
      );
      const [voterAddress] = PublicKey.findProgramAddressSync(
        [
          registrarAddress.toBuffer(),
          Buffer.from('voter', 'utf-8'),
          publicKey!.toBuffer(),
        ],
        rootData.votingWeightPlugin
      );
      const vault = getAssociatedTokenAddressSync(
        rootData.registrar.votingMints[configIndex].mint,
        voterAddress,
        true
      );
      const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('governance', 'utf-8'),
          rootData.realm.toBuffer(),
          rootData.governingTokenMint.toBuffer(),
          publicKey!.toBuffer(),
        ],
        rootData.governanceProgram
      );
      const [voterWeightRecord] = PublicKey.findProgramAddressSync(
        [
          registrarAddress.toBuffer(),
          Buffer.from('voter-weight-record', 'utf-8'),
          publicKey!.toBuffer(),
        ],
        rootData.votingWeightPlugin
      );
      const mint = rootData.registrar.votingMints[configIndex].mint;
      const destination = getAssociatedTokenAddressSync(mint, publicKey!);

      const {blockhash, lastValidBlockHeight} =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey!,
        blockhash,
        lastValidBlockHeight,
      });

      if (!(await connection.getAccountInfo(destination))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey!,
            destination,
            publicKey!,
            mint
          )
        );
      }

      tx.add(
        await sdk.methods
          .withdraw(depositIndex, balance)
          .accountsStrict({
            registrar: registrarAddress,
            voter: voterAddress,
            voterAuthority: publicKey!,
            tokenOwnerRecord,
            voterWeightRecord,
            vault,
            tokenProgram: TOKEN_PROGRAM_ID,
            destination,
          })
          .instruction()
      );

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
    onSuccess: (_, {network, rootAddress}) => {
      queryClient.invalidateQueries(
        vsrVoterQueryOptions({
          network,
          root: rootAddress,
          owner: publicKey!,
          queryClient,
        })
      );
    },
  });
};

export default useWithdrawFromVsr;
