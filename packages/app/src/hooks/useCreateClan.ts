import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {Cluster, Keypair, PublicKey, Transaction} from '@solana/web3.js';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {VoteAggregatorSdk} from 'vote-aggregator-sdk';
import {clanListQueryOptions} from '../queryOptions';

const useCreateClan = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      root,
      name,
      description,
    }: {
      network: Cluster;
      root: PublicKey;
      name: string;
      description: string;
    }) => {
      const sdk = new VoteAggregatorSdk(connection);
      const {blockhash, lastValidBlockHeight} =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey!,
        blockhash,
        lastValidBlockHeight,
      });
      const rootData = await sdk.root.fetchRoot(root);
      const clanAddress = Keypair.generate();
      tx.add(
        await sdk.clan.createClanInstruction({
          root: rootData,
          rootAddress: root,
          clanAddress: clanAddress.publicKey,
          owner: publicKey!,
          payer: publicKey!,
        })
      );
      if (name || description) {
        tx.add(
          await sdk.clan.resizeClanInstruction({
            clanAddress: clanAddress.publicKey,
            clanAuthority: publicKey!,
            payer: publicKey!,
            size: 288 + name.length + description.length,
          })
        );
        if (name) {
          tx.add(
            await sdk.clan.setClanNameInstruction({
              clanAddress: clanAddress.publicKey,
              clanAuthority: publicKey!,
              name,
            })
          );
        }
        if (description) {
          tx.add(
            await sdk.clan.setClanDescriptionInstruction({
              clanAddress: clanAddress.publicKey,
              clanAuthority: publicKey!,
              description,
            })
          );
        }
      }

      // TODO: autojoin
      if (
        !(await sdk.connection.getAccountInfo(
          sdk.member.memberAddress({rootAddress: root, owner: publicKey!})[0]
        ))
      ) {
        tx.add(
          await sdk.member.createMemberInstruction({
            rootAddress: root,
            root: rootData,
            owner: publicKey!,
            payer: publicKey!,
          })
        );
      }

      tx.partialSign(clanAddress);
      const signature = await sendTransaction(tx, connection);
      const result = await connection.confirmTransaction({
        signature: signature,
        blockhash: tx.recentBlockhash!,
        lastValidBlockHeight: tx.lastValidBlockHeight!,
      });
      if (result.value.err) {
        throw new Error(result.value.err.toString());
      }
      return {clan: clanAddress.publicKey};
    },
    onSuccess: (_, {network, root}) => {
      queryClient.invalidateQueries(clanListQueryOptions({network, root}));
    },
  });
};

export default useCreateClan;
