import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {Cluster, PublicKey, Transaction} from '@solana/web3.js';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {VoteAggregatorSdk} from 'vote-aggregator-sdk';
import {clanQueryOptions, memberQueryOptions} from '../queryOptions';

const useJoinClan = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      owner,
      rootAddress,
      rootData,
      clanAddress,
      createMember,
    }: {
      network: Cluster;
      owner: PublicKey;
      rootData: {
        governanceProgram: PublicKey;
        realm: PublicKey;
        governingTokenMint: PublicKey;
        votingWeightPlugin: PublicKey;
      };
      rootAddress: PublicKey;
      clanAddress: PublicKey;
      createMember: boolean;
    }) => {
      const sdk = new VoteAggregatorSdk(connection);
      const {blockhash, lastValidBlockHeight} =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey!,
        blockhash,
        lastValidBlockHeight,
      });

      if (createMember) {
        tx.add(
          await sdk.member.createMemberInstruction({
            rootAddress: rootAddress,
            rootData,
            owner,
            payer: publicKey!,
          })
        );
      }

      const memberVoterWeightAddress = (
        await sdk.member.findVoterWeightRecord({
          rootData,
          owner,
        })
      ).pubkey;

      tx.add(
        await sdk.member.joinClanInstruction({
          rootData,
          memberData: {
            root: rootAddress,
            owner,
          },
          clanAddress,
          memberVoterWeightAddress,
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
    onSuccess: (_, {network, rootAddress, owner, clanAddress}) => {
      queryClient.invalidateQueries(
        memberQueryOptions({
          network,
          root: rootAddress,
          owner,
        })
      );
      queryClient.invalidateQueries(
        clanQueryOptions({
          network,
          root: rootAddress,
          clan: clanAddress,
          queryClient,
        })
      );
    },
  });
};

export default useJoinClan;
