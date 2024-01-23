// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as RootIdImport } from './routes/$rootId'
import { Route as IndexImport } from './routes/index'
import { Route as RootIdIndexImport } from './routes/$rootId/index'
import { Route as RootIdCreateClanImport } from './routes/$rootId/createClan'
import { Route as RootIdClanClanIdImport } from './routes/$rootId/clan/$clanId'
import { Route as RootIdClanClanIdIndexImport } from './routes/$rootId/clan/$clanId/index'
import { Route as RootIdClanClanIdTransferImport } from './routes/$rootId/clan/$clanId/transfer'
import { Route as RootIdClanClanIdSetVotingDelegateImport } from './routes/$rootId/clan/$clanId/setVotingDelegate'
import { Route as RootIdClanClanIdEditImport } from './routes/$rootId/clan/$clanId/edit'

// Create/Update Routes

const RootIdRoute = RootIdImport.update({
  path: '/$rootId',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const RootIdIndexRoute = RootIdIndexImport.update({
  path: '/',
  getParentRoute: () => RootIdRoute,
} as any)

const RootIdCreateClanRoute = RootIdCreateClanImport.update({
  path: '/createClan',
  getParentRoute: () => RootIdRoute,
} as any)

const RootIdClanClanIdRoute = RootIdClanClanIdImport.update({
  path: '/clan/$clanId',
  getParentRoute: () => RootIdRoute,
} as any)

const RootIdClanClanIdIndexRoute = RootIdClanClanIdIndexImport.update({
  path: '/',
  getParentRoute: () => RootIdClanClanIdRoute,
} as any)

const RootIdClanClanIdTransferRoute = RootIdClanClanIdTransferImport.update({
  path: '/transfer',
  getParentRoute: () => RootIdClanClanIdRoute,
} as any)

const RootIdClanClanIdSetVotingDelegateRoute =
  RootIdClanClanIdSetVotingDelegateImport.update({
    path: '/setVotingDelegate',
    getParentRoute: () => RootIdClanClanIdRoute,
  } as any)

const RootIdClanClanIdEditRoute = RootIdClanClanIdEditImport.update({
  path: '/edit',
  getParentRoute: () => RootIdClanClanIdRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/$rootId': {
      preLoaderRoute: typeof RootIdImport
      parentRoute: typeof rootRoute
    }
    '/$rootId/createClan': {
      preLoaderRoute: typeof RootIdCreateClanImport
      parentRoute: typeof RootIdImport
    }
    '/$rootId/': {
      preLoaderRoute: typeof RootIdIndexImport
      parentRoute: typeof RootIdImport
    }
    '/$rootId/clan/$clanId': {
      preLoaderRoute: typeof RootIdClanClanIdImport
      parentRoute: typeof RootIdImport
    }
    '/$rootId/clan/$clanId/edit': {
      preLoaderRoute: typeof RootIdClanClanIdEditImport
      parentRoute: typeof RootIdClanClanIdImport
    }
    '/$rootId/clan/$clanId/setVotingDelegate': {
      preLoaderRoute: typeof RootIdClanClanIdSetVotingDelegateImport
      parentRoute: typeof RootIdClanClanIdImport
    }
    '/$rootId/clan/$clanId/transfer': {
      preLoaderRoute: typeof RootIdClanClanIdTransferImport
      parentRoute: typeof RootIdClanClanIdImport
    }
    '/$rootId/clan/$clanId/': {
      preLoaderRoute: typeof RootIdClanClanIdIndexImport
      parentRoute: typeof RootIdClanClanIdImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  RootIdRoute.addChildren([
    RootIdCreateClanRoute,
    RootIdIndexRoute,
    RootIdClanClanIdRoute.addChildren([
      RootIdClanClanIdEditRoute,
      RootIdClanClanIdSetVotingDelegateRoute,
      RootIdClanClanIdTransferRoute,
      RootIdClanClanIdIndexRoute,
    ]),
  ]),
])
