import {Box} from '@mui/material';
import {useWallet} from '@solana/wallet-adapter-react';
import {PublicKey} from '@solana/web3.js';
import ButtonLink from '../ButtonLink';

const ClanManagement = ({root, clan}: {root: PublicKey; clan: PublicKey}) => {
  const {publicKey} = useWallet();
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }

  return (
    <Box>
      <ButtonLink
        to="/$rootId/clan/$clanId/edit"
        params={{
          rootId: root.toBase58(),
          clanId: clan.toBase58(),
        }}
      >
        Edit
      </ButtonLink>
      &nbsp;
      <ButtonLink
        to="/$rootId/clan/$clanId/transfer"
        params={{
          rootId: root.toBase58(),
          clanId: clan.toBase58(),
        }}
      >
        Transfer
      </ButtonLink>
      <ButtonLink
        to="/$rootId/clan/$clanId/setVotingDelegate"
        params={{
          rootId: root.toBase58(),
          clanId: clan.toBase58(),
        }}
      >
        Delegate voting
      </ButtonLink>
    </Box>
  );
};

export default ClanManagement;
