import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' }, // the Express server
    fs: { allow: [path.resolve(__dirname, '..')] } // lets the client import ../shared
  },
  build: { chunkSizeWarningLimit: 700 }
});
