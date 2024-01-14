import {AppBar, Stack, Toolbar, Typography} from '@mui/material';
import {WalletMultiButton} from '@solana/wallet-adapter-material-ui';
import React from 'react';
import {FC} from 'react';

const Header: FC = () => {
  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography>Vote Aggregator</Typography>
        <Stack direction='row' sx={{marginLeft: 'auto'}}>
          <Typography sx={{paddingTop: '0.3em', marginRight: '1em'}}>Network: Devnet</Typography>
          <WalletMultiButton color="secondary" sx={{marginLeft: 'auto'}} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;