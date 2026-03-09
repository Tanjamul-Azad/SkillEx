import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
    // Proxy all /api calls to Spring Boot
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
