import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {Cluster, PublicKey, Transaction} from '@solana/web3.js';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {VoteAggregatorSdk} from 'vote-aggregator-sdk';
import {clanQueryOptions, memberQueryOptions} from '../queryOptions';
import vsrSdk from '../fetchers/vsrSdk';
import {SYSTEM_PROGRAM_ID} from '@solana/spl-governance';

const useJoinClan = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      network,
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
      const vsr = vsrSdk({network, vsrProgram: rootData.votingWeightPlugin});
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

      /*
      const memberVoterWeightAddress = (
        await sdk.member.findVoterWeightRecord({
          rootData,
          owner,
        })
      ).pubkey;
      */
      const [registrarAddress] = PublicKey.findProgramAddressSync(
        [
          rootData.realm.toBuffer(),
          Buffer.from('registrar', 'utf-8'),
          rootData.governingTokenMint.toBuffer(),
        ],
        rootData.votingWeightPlugin
      );
      const [memberVoterWeightAddress] = PublicKey.findProgramAddressSync(
        [
          registrarAddress.toBuffer(),
          Buffer.from('voter-weight-record', 'utf-8'),
          publicKey!.toBuffer(),
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
      tx.add(
        await vsr.methods
          .updateVoterWeightRecord()
          .accountsStrict({
            registrar: registrarAddress,
            voter: voterAddress,
            voterWeightRecord: memberVoterWeightAddress,
            systemProgram: SYSTEM_PROGRAM_ID,
          })
          .instruction()
      );

      tx.add(
        await sdk.member.joinClanInstruction({
          rootData,
          memberData: {
            root: rootAddress,
            owner,
          },
          clanAddress,
          memberVoterWeightAddress,
          payer: publicKey!,
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
