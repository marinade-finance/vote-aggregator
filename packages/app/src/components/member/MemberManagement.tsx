import {Box, Paper} from '@mui/material';
import {Cluster, PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
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

  const {data: memberData} = useSuspenseQuery(
    memberQueryOptions({network, owner: publicKey!, root})
  );

  const {data: vsrVoterData} = useSuspenseQuery(
    vsrVoterQueryOptions({network, owner: publicKey!, root})
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
      {memberData && !memberData.clan.equals(PublicKey.default) && (
        <MemberClanInfo network={network} memberData={memberData} />
      )}
    </Box>
  );
};

export default MemberManagement;
