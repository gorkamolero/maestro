import { defineConfig } from 'vite';
import path from 'node:path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react');
  const tailwindcss = await import('@tailwindcss/vite');

  return {
    plugins: [
      react.default(),
      tailwindcss.default(),
      nodePolyfills({
        include: ['process', 'buffer'],
        globals: { process: true, Buffer: true },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      fs: {
        // Allow serving files from parent node_modules (monorepo structure)
        allow: ['..'],
      },
    },
    build: {
      target: 'esnext',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
        supported: {
          'top-level-await': true
        }
      }
    },
  };
});
