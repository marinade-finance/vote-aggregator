import {TableCell} from '@mui/material';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import {Cluster, PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {memberQueryOptions} from '../../queryOptions';
import {useWallet} from '@solana/wallet-adapter-react';
import {ClanInfo} from '../../fetchers/fetchClanList';

const ClanRightsInfo = ({
  network,
  root,
  clan,
}: {
  network: Cluster;
  root: PublicKey;
  clan: ClanInfo;
}) => {
  const {publicKey} = useWallet();
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }

  const {data: memberData} = useSuspenseQuery(
    memberQueryOptions({
      network,
      root,
      owner: publicKey,
    })
  );
  const isMember = memberData?.clan?.equals(clan.address);
  const isOwner = publicKey.equals(clan.owner);

  return (
    <TableCell align="right">
      {isMember && <CheckBoxIcon />}
      {isOwner && <CoPresentIcon />}
    </TableCell>
  );
};

export default ClanRightsInfo;
