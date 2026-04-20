import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // This will forward all /api requests to your backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Optional: remove /api prefix if your backend expects it without /api
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
});