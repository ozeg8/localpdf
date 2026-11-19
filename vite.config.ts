import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { securityHeaders } from './scripts/security-headers.ts';

export default defineConfig({
  base: '/',
  plugins: [tailwindcss()],
  worker: { format: 'es' },
  build: { target: 'es2022', assetsInlineLimit: 0, sourcemap: false },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers: securityHeaders() },
});
