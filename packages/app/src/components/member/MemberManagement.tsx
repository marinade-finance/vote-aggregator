import {Box, Paper} from '@mui/material';
import {Cluster, PublicKey} from '@solana/web3.js';
import {useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {memberQueryOptions, vsrVoterQueryOptions} from '../../queryOptions';
import {useWallet} from '@solana/wallet-adapter-react';
import MemberClanInfo from './MemberClanInfo';
import VsrTokenStatus from './VsrTokenStatus';

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
  const queryClient = useQueryClient();

  const {data: memberData} = useSuspenseQuery(
    memberQueryOptions({network, owner: publicKey!, root})
  );

  const {data: vsrVoterData} = useSuspenseQuery(
    vsrVoterQueryOptions({network, owner: publicKey!, root, queryClient})
  );

  return (
    <Box sx={{mt: 5}}>
      <Box>Your governance power</Box>
      <Paper>
        {vsrVoterData.tokenStatuses.map(
          ({mint, balance, configIndex, depositIndex}) => (
            <VsrTokenStatus
              key={mint.toBase58()}
              vsrVoterData={vsrVoterData}
              mint={mint}
              balance={balance}
              depositIndex={depositIndex}
              network={network}
              rootAddress={root}
              configIndex={configIndex}
            />
          )
        )}
      </Paper>
      {memberData?.membership.map(membership => (
        <MemberClanInfo
          network={network}
          root={root}
          voterWeight={memberData.voterWeight}
          membership={membership}
        />
      ))}
    </Box>
  );
};

export default MemberManagement;
