import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_DEV_AUTH_BYPASS': JSON.stringify(process.env.MAESTRO_DEV_AUTH_BYPASS),
  },
  root: __dirname,
  base: '/',
  build: {
    outDir: path.resolve(__dirname, '../../dist/mobile'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@mobile': __dirname,
    },
  },
  server: {
    open: true,
    port: 5174,
  },
});
