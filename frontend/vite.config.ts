import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',   // listen on all interfaces — required for phone access
    port: 3000,
    strictPort: true,   // don't silently move to 3001, 3002 etc.
    proxy: {
      // Every /api/* request from the browser → backend localhost:5000
      // This runs server-side so it works for both PC and phone
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Vite proxy error]', err.message);
          });
        },
      },
    },
  },
});
