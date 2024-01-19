import {Box, Button, TextField} from '@mui/material';
import {FileRoute, useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
import useCreateClan from '../../hooks/useCreateClan';
import {PublicKey} from '@solana/web3.js';

const CreateClanComponent = () => {
  const {network} = Route.useSearch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const {rootId} = Route.useParams();
  const root = new PublicKey(rootId);

  const navigate = useNavigate();

  const mutation = useCreateClan();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = event => {
    event.preventDefault();
    mutation.mutate(
      {network, root, name, description},
      {
        onSuccess: ({clan}) => {
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
      <Button type="submit">Create</Button>
    </Box>
  );
};

export const Route = new FileRoute('/$rootId/createClan').createRoute({
  component: CreateClanComponent,
  beforeLoad: () => {
    return {
      title: 'Create clan',
    };
  },
});
