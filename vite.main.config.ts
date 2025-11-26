import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'node-pty',
        'systeminformation',
        // Externalize native modules to prevent bundling errors
      ],
    },
  },
});
