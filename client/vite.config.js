import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the build work from any folder - Render, Tomcat (/nabta/) or a plain file server.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
});
