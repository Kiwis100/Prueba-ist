import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use the repo name as base path only for production builds (GitHub Pages).
  // Dev server keeps base '/' so the local proxy still works.
  base: command === 'build' ? '/Pruebo-ist/' : '/',
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
