import { FileRoute } from "@tanstack/react-router";

export const Route = new FileRoute('/$rootId').createRoute({
    beforeLoad: ({params: {rootId}}) => {
      return {
        title: 'Root: ' + rootId,
      };
    },
  });