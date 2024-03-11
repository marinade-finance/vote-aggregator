import {Button} from '@mui/material';
import {PublicKey} from '@solana/web3.js';
import useAirdrop from '../../hooks/useAirdrop';

const Airdrop = ({mint}: {mint: PublicKey}) => {
  const mutation = useAirdrop();
  const handleAirdrop = () => {
    mutation.mutate({mint});
  };
  return <Button onClick={handleAirdrop}>Airdrop</Button>;
};

export default Airdrop;
