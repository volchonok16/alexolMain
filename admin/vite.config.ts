import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Vite ставит crossorigin на module scripts — без CORS nginx/CF JS может висеть pending */
const stripCrossorigin = (): Plugin => ({
  name: 'strip-crossorigin',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, '');
    },
  },
});

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});