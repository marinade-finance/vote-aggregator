import {defineConfig} from 'vite';
// import {TanStackRouterVite} from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react-swc';
import inject from '@rollup/plugin-inject';
import {nodeResolve} from '@rollup/plugin-node-resolve';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    inject({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
    nodeResolve({
      browser: true,
    }) /*, TanStackRouterVite()*/,
  ],
  define: {
    // By default, Vite doesn't include shims for NodeJS/
    // necessary for segment analytics lib to work
    global: {},
  },
  build: {
    rollupOptions: {
      external: ['buffer', 'process'],
    },
  },
});
