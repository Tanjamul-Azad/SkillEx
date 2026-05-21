import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const handleProxyError = (err: Error & { code?: string }, req: IncomingMessage, res: ServerResponse) => {
  const isBackendStarting = err.code === 'ECONNREFUSED';
  const isSockJsProbe = req.url?.startsWith('/ws/info');

  if (isBackendStarting && isSockJsProbe && !res.headersSent) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Backend is still starting');
    return;
  }

  console.warn(`[vite proxy] ${req.url ?? 'request'} failed: ${err.message}`);
};

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, '../database'),
      '@config': path.resolve(__dirname, './src/config'),
      '@scripts': path.resolve(__dirname, '../scripts'),
      'date-fns': path.resolve(__dirname, './node_modules/date-fns'),
    },
  },
  server: {
    port: 3000,
    host: true,
    // Proxy all /api calls to Spring Boot
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', handleProxyError);
        },
      },
    },
  },
});
