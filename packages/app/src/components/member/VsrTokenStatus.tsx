import {Box, Button, Card, Typography} from '@mui/material';
import {Cluster, LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';
import BN from 'bn.js';
import {VsrVoterInfo} from '../../fetchers/fetchVsrVoter';
import useDepositToVsr from '../../hooks/useDepositToVsr';
import {useSuspenseQuery} from '@tanstack/react-query';
import {voteAggregatorQueryOptions} from '../../queryOptions';

const VsrTokenStatus = ({
  network,
  rootAddress,
  vsrVoterData,
  mint,
  balance,
  configIndex,
  depositIndex,
}: {
  network: Cluster;
  rootAddress: PublicKey;
  vsrVoterData: VsrVoterInfo;
  mint: PublicKey;
  balance: BN;
  configIndex: number;
  depositIndex?: number;
}) => {
  const {data: rootData} = useSuspenseQuery(
    voteAggregatorQueryOptions({
      network,
      root: rootAddress,
    })
  );
  const depositMutation = useDepositToVsr();

  const handleDeposit = () => {
    depositMutation.mutate({
      network,
      rootAddress,
      rootData,
      vsrVoterData,
      configIndex,
      balance,
    });
  };

  return (
    <Card>
      <Typography>{mint.toBase58()}</Typography>
      {depositIndex !== undefined && (
        <Typography>
          Deposited:{' '}
          {parseFloat(
            vsrVoterData.voter!.deposits[
              depositIndex
            ].amountDepositedNative.toString()
          ) / LAMPORTS_PER_SOL}
        </Typography>
      )}
      {balance.gtn(0) && (
        <Box>
          <Typography>
            Free {parseFloat(balance.toString()) / LAMPORTS_PER_SOL}
          </Typography>
          <Button onClick={handleDeposit}>Deposit</Button>
        </Box>
      )}
    </Card>
  );
};

export default VsrTokenStatus;
