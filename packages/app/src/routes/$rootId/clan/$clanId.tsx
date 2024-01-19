import {FileRoute} from '@tanstack/react-router';

export const Route = new FileRoute('/$rootId/clan/$clanId').createRoute({
  beforeLoad: ({params: {clanId}}) => {
    return {
      title: 'Clan: ' + clanId,
    };
  },
});
