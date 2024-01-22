import {Box, Button, TextField} from '@mui/material';
import {FileRoute, useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
import {PublicKey} from '@solana/web3.js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {clanQueryOptions} from '../../../../queryOptions';
import useConfigureClan from '../../../../hooks/useConfigureClan';

const EditClanComponent = () => {
  const {network} = Route.useSearch();
  const {rootId, clanId} = Route.useParams();
  const root = new PublicKey(rootId);
  const clan = new PublicKey(clanId);
  const {data: clanData} = useSuspenseQuery(
    clanQueryOptions({network, root, clan})
  );

  const [name, setName] = useState(clanData!.name);
  const [description, setDescription] = useState(clanData!.description);

  const navigate = useNavigate();

  const mutation = useConfigureClan();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = event => {
    event.preventDefault();
    mutation.mutate(
      {network, root, clan, name, description},
      {
        onSuccess: () => {
          navigate({
            to: '/$rootId/clan/$clanId',
            params: {
              rootId: root.toBase58(),
              clanId: clan.toBase58(),
            },
          });
        },
      }
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        name="name"
        label="Name"
        value={name}
        onChange={event => setName(event.target.value)}
      />
      <TextField
        name="description"
        label="Description"
        fullWidth
        sx={{mt: 1}}
        value={description}
        onChange={event => setDescription(event.target.value)}
      />
      <Button type="submit">Edit</Button>
    </Box>
  );
};

export const Route = new FileRoute('/$rootId/clan/$clanId/edit').createRoute({
  component: EditClanComponent,
  beforeLoad: () => {
    return {
      title: 'edit',
    };
  },
});
