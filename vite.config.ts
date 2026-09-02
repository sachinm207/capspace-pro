import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webmcpServerPlugin } from './src/server/webmcpServerPlugin';

export default defineConfig({
  plugins: [react(), webmcpServerPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
