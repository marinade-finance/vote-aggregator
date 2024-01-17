import {defineConfig} from 'vite';
// import {TanStackRouterVite} from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react-swc';
import inject from '@rollup/plugin-inject'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()/*, TanStackRouterVite()*/],
  define: {
    // By default, Vite doesn't include shims for NodeJS/
    // necessary for segment analytics lib to work
    global: {},
  },
  build:{
    rollupOptions: {
        plugins: [inject({ Buffer: ['Buffer', 'Buffer'], process: 'process' })],
    }
  }
});
