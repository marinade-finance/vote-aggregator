import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {Cluster, PublicKey, Transaction} from '@solana/web3.js';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {VoteAggregatorSdk} from 'vote-aggregator-sdk';
import {
  clanListQueryOptions,
  clanQueryOptions,
  memberQueryOptions,
} from '../queryOptions';

const useStartLeavingClan = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberData,
    }: {
      network: Cluster;
      memberData: {
        root: PublicKey;
        owner: PublicKey;
        clan: PublicKey;
      };
    }) => {
      const sdk = new VoteAggregatorSdk(connection);
      const {blockhash, lastValidBlockHeight} =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey!,
        blockhash,
        lastValidBlockHeight,
      });

      tx.add(
        await sdk.member.startLeavingClanInstruction({
          memberData,
        })
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
    onSuccess: (_, {network, memberData}) => {
      queryClient.invalidateQueries(
        memberQueryOptions({
          network,
          root: memberData.root,
          owner: memberData.owner,
        })
      );
      queryClient.invalidateQueries(
        clanQueryOptions({
          network,
          root: memberData.root,
          clan: memberData.clan,
          queryClient,
        })
      );
      queryClient.invalidateQueries(
        clanListQueryOptions({network, root: memberData.root})
      );
    },
  });
};

export default useStartLeavingClan;
