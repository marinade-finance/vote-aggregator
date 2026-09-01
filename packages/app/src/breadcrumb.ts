// Context merges down the match chain, so a route with no title of its own repeats the parent's.
export const noBreadcrumb = () => ({title: undefined});
