import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {PublicKey} from '@solana/web3.js';
import {QueryFunctionContext, useQuery} from '@tanstack/react-query';

export type MemberInfo = {
  owner: PublicKey;
  clan?: PublicKey;
};

const getMember: (
  context: QueryFunctionContext
) => Promise<MemberInfo | null> = async (context: QueryFunctionContext) => {
  if (!context.queryKey[2]) {
    return null;
  }
  const owner = new PublicKey(context.queryKey[2])
  return {
    owner,
    clan: new PublicKey('2fQ1dVw9kCZG3U9p4X4Z2hQ7hZ7yJgJvR2xQqJ1y3z7p'),
  };
};

export const useMember = () => {
  const {connection} = useConnection();
  const {publicKey} = useWallet();

  return useQuery({
    queryKey: ['member', connection.rpcEndpoint, publicKey?.toBase58() || ''],
    queryFn: getMember,
  });
};
