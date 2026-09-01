import {Card, CardActions, CardContent, Typography} from '@mui/material';
import {RootInfo} from '../../fetchers/fetchVoteAggregatorList';
import ButtonLink from '../ButtonLink';

const VoteAggregatorItem = ({root}: {root: RootInfo}) => {
  return (
    <Card>
      <CardContent>
        <Typography>
          {root.realmData.name} ({root.side})
        </Typography>
        <Typography>{root.address.toBase58()}</Typography>
      </CardContent>
      <CardActions>
        <ButtonLink to={'/$rootId'} params={{rootId: root.address.toBase58()}}>
          Open
        </ButtonLink>
      </CardActions>
    </Card>
  );
};

export default VoteAggregatorItem;
