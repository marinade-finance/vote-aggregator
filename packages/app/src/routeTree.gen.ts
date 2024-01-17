import { Route as rootRoute } from './routes/__root'
import { Route as RootIdImport } from './routes/$rootId'
import { Route as IndexImport } from './routes/index'

const RootIdRoute = RootIdImport.update({
  path: '/$rootId',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)
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
  }
}
export const routeTree = rootRoute.addChildren([IndexRoute, RootIdRoute])
