import {Box} from '@mui/material';
import {MemberInfo} from '../../fetchers/fetchMember';
import BN from 'bn.js';
import {Cluster, LAMPORTS_PER_SOL, PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {clanQueryOptions} from '../../queryOptions';
import {Link} from '@tanstack/react-router';

const MemberClanInfo = ({
  network,
  memberData,
}: {
  network: Cluster;
  memberData: MemberInfo;
}) => {
  if (memberData.clan.equals(PublicKey.default)) {
    throw new Error('Member not in clan');
  }

  const {data: clanData} = useSuspenseQuery(
    clanQueryOptions({network, root: memberData.root, clan: memberData.clan})
  );
  return (
    <>
      <Box>
        {memberData.clanLeavingTime.eq(new BN('9223372036854775807'))
          ? 'Member of'
          : 'Leaving'}{' '}
        clan:{' '}
        <Link
          to="/$rootId/clan/$clanId"
          params={{
            rootId: memberData.root.toBase58(),
            clanId: memberData.clan.toBase58(),
          }}
        >
          {clanData.name}
        </Link>{' '}
        ({memberData.clan.toBase58()})
        {!memberData.clanLeavingTime.eq(new BN('9223372036854775807')) &&
          `at ${new Date(memberData.clanLeavingTime.toNumber() * 1000)}`}
      </Box>
      <Box>
        Power used:{' '}
        {parseFloat(memberData.voterWeight.toString()) / LAMPORTS_PER_SOL}
      </Box>
    </>
  );
};

export default MemberClanInfo;
