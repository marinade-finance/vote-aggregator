import {
  Box,
  Paper,
  SxProps,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Theme,
  Toolbar,
} from '@mui/material';
import React from 'react';
import {FC} from 'react';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import {ClanInfo, useClanList} from '../hooks/useClanList';
import {useMember} from '../hooks/useMember';
import CoPresentIcon from '@mui/icons-material/CoPresent';

const ClanListHeader: FC = () => {
  return <Toolbar></Toolbar>;
};

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

export type ClanListProps = {
  sx?: SxProps<Theme>;
};

const ClanList: FC<ClanListProps> = ({sx}: ClanListProps) => {
  const {data: clans} = useClanList();
  const {data: member} = useMember();

  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof ClanInfo>('address');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

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
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - (clans?.length || 0)) : 0;

  const visibleRows =
    React.useMemo(
      () =>
        clans &&
        clans
          .slice()
          .sort(getComparator(order, orderBy))
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
      [order, orderBy, page, rowsPerPage, clans]
    ) || [];

  return (
    <Box sx={{...sx}}>
      <Paper sx={{width: '100%', mb: 2}}>
        <ClanListHeader />
        <TableContainer component={Paper}>
          <Table sx={{minWidth: 650}} size="small" aria-label="a clan table">
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Name</TableCell>
                <TableCell align="right">Description</TableCell>
                <TableCell align="right">Owner</TableCell>
                {member && <TableCell align="right">Rights</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map(clan => {
                const isMember = member?.clan?.equals(clan.address);
                return (
                  <TableRow
                    hover
                    // onClick={(event) => handleClick(event, row.id)}
                    // aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={clan.address.toBase58()}
                    // selected={isItemSelected}
                    sx={{cursor: 'pointer'}}
                  >
                    <TableCell component="th" scope="row" padding="none">
                      {clan.address.toBase58()}
                    </TableCell>
                    <TableCell align="right">{clan.name}</TableCell>
                    <TableCell align="right">{clan.description}</TableCell>
                    <TableCell align="right">{clan.owner.toBase58()}</TableCell>
                    {member && (
                      <TableCell align="right">
                        {isMember && <CheckBoxIcon />}
                        {clan.owner.equals(member.owner) && <CoPresentIcon/>}
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
          count={clans?.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default ClanList;
