import {Box} from '@mui/material';
import {Cluster, PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {memberQueryOptions} from '../../queryOptions';
import {useWallet} from '@solana/wallet-adapter-react';
import MemberClanInfo from './MemberClanInfo';

const MemberManagement = ({
  network,
  root,
}: {
  network: Cluster;
  root: PublicKey;
}) => {
  const {publicKey} = useWallet();
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }

  const {data: memberData} = useSuspenseQuery(
    memberQueryOptions({network, owner: publicKey!, root})
  );

  return (
    <Box sx={{mt: 5}}>
      <Box>Your governance power</Box>
      {memberData && !memberData.clan.equals(PublicKey.default) && (
        <MemberClanInfo network={network} memberData={memberData} />
      )}
    </Box>
  );
};

export default MemberManagement;
