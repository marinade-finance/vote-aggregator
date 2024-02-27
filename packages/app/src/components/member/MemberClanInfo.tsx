import {Box} from '@mui/material';
import BN from 'bn.js';
import {Cluster, LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';
import {useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {clanQueryOptions} from '../../queryOptions';
import {Link} from '@tanstack/react-router';
import {MembershipEntry} from 'vote-aggregator-sdk';

const MemberClanInfo = ({
  network,
  root,
  voterWeight,
  membership,
}: {
  network: Cluster;
  root: PublicKey;
  voterWeight: BN;
  membership: MembershipEntry;
}) => {
  const queryClient = useQueryClient();

  const {data: clanData} = useSuspenseQuery(
    clanQueryOptions({
      network,
      root,
      clan: membership.clan,
      queryClient,
    })
  );
  return (
    <>
      <Box>
        {!membership.leavingTime ? 'Member of' : 'Leaving'} clan:{' '}
        <Link
          to="/$rootId/clan/$clanId"
          params={{
            rootId: root.toBase58(),
            clanId: membership.clan.toBase58(),
          }}
        >
          {clanData.name}
        </Link>{' '}
        ({membership.clan.toBase58()})
        {!membership.leavingTime &&
          `at ${new Date(membership.leavingTime!.toNumber() * 1000)}`}
      </Box>
      <Box>
        Power used:{' '}
        {parseFloat(
          voterWeight.muln(membership.shareBp).divn(10000).toString()
        ) / LAMPORTS_PER_SOL}
      </Box>
    </>
  );
};

export default MemberClanInfo;
