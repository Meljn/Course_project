import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Course_project/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
