import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Only proxy /api when no absolute backend URL is configured.
  // In production (Vercel) VITE_API_BASE_URL is set to the deployed backend,
  // so the browser hits it directly — no proxy needed.
  const apiBaseUrl = env.VITE_API_BASE_URL ?? '';
  const needsProxy = !apiBaseUrl.startsWith('http');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',    // listen on all interfaces — required for phone access
      port: 3000,
      strictPort: true,    // don't silently move to 3001, 3002 etc.
      proxy: needsProxy
        ? {
            // Every /api/* request from the browser → backend localhost:5000
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
          }
        : undefined,
    },
  };
});
