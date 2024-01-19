import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import {FileRoute, Link, useNavigate} from '@tanstack/react-router';
import {useMemo, useState} from 'react';
import {clanListQueryOptions, memberQueryOptions} from '../../queryOptions';
import {PublicKey} from '@solana/web3.js';
import {ClanInfo} from '../../fetchers/fetchClanList';
import {useQuery, useSuspenseQuery} from '@tanstack/react-query';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import {useWallet} from '@solana/wallet-adapter-react';

type Order = 'asc' | 'desc';

const getComparator =
  (order: Order, orderBy: keyof ClanInfo) => (a: ClanInfo, b: ClanInfo) => {
    switch (orderBy) {
      case 'address':
        return order === 'asc'
          ? a.address.toBase58().localeCompare(b.address.toBase58())
          : b.address.toBase58().localeCompare(a.address.toBase58());
      case 'name':
        return order === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case 'description':
        return order === 'asc'
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description);
      case 'owner':
        return order === 'asc'
          ? a.owner.toBase58().localeCompare(b.owner.toBase58())
          : b.owner.toBase58().localeCompare(a.owner.toBase58());
      default:
        throw new Error('Unknown field');
    }
  };

const ClanListComponent = () => {
  const navigate = useNavigate();
  const {network} = Route.useSearch();
  const {rootId} = Route.useParams();
  const root = new PublicKey(rootId);
  const {data: clans} = useSuspenseQuery(clanListQueryOptions({network, root}));
  const {publicKey} = useWallet();
  const member = useQuery(
    memberQueryOptions({
      network,
      root,
      owner: publicKey || undefined,
    })
  );
  const [order /*setOrder*/] = useState<Order>('asc');
  const [orderBy /*setOrderBy*/] = useState<keyof ClanInfo>('address');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - clans.length) : 0;

  const visibleRows =
    useMemo(
      () =>
        clans &&
        clans
          .slice()
          .sort(getComparator(order, orderBy))
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
      [order, orderBy, page, rowsPerPage, clans]
    ) || [];

  const openClan = (clan: PublicKey) => {
    navigate({
      to: '/$rootId/clan/$clanId',
      params: {
        rootId: root.toBase58(),
        clanId: clan.toBase58(),
      },
    });
  }

  return (
    <Box>
      <Paper sx={{width: '100%', mb: 2}}>
        <TableContainer component={Paper}>
          <Table sx={{minWidth: 650}} size="small" aria-label="a clan table">
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Name</TableCell>
                <TableCell align="right">Description</TableCell>
                <TableCell align="right">Owner</TableCell>
                {member.data && <TableCell align="right">Rights</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map(clan => {
                const isMember = member.data?.clan?.equals(clan.address);
                return (
                  <TableRow
                    hover
                    onClick={() => openClan(clan.address)}
                    // aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={clan.address.toBase58()}
                    // selected={isItemSelected}
                    sx={{cursor: 'pointer'}}
                  >
                    <TableCell component="th" scope="row" sx={{ml: 1}}>
                      {clan.address.toBase58()}
                    </TableCell>
                    <TableCell align="right">{clan.name}</TableCell>
                    <TableCell align="right">{clan.description}</TableCell>
                    <TableCell align="right">{clan.owner.toBase58()}</TableCell>
                    {member.data && (
                      <TableCell align="right">
                        {isMember && <CheckBoxIcon />}
                        {clan.owner.equals(member.data.owner) && (
                          <CoPresentIcon />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 33 * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={clans.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <Box>
        <Button component={Link} to="/$rootId/createClan" params={{rootId}}>
          Create
        </Button>
      </Box>
    </Box>
  );
};

export const Route = new FileRoute('/$rootId/').createRoute({
  component: ClanListComponent,
  loaderDeps: ({search: {network}}) => ({network}),
  loader: ({deps: {network}, params: {rootId}, context: {queryClient}}) =>
    queryClient.ensureQueryData(
      clanListQueryOptions({network, root: new PublicKey(rootId)})
    ),
  wrapInSuspense: true,
});
