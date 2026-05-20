import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/predict_top': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/predict_forest': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
