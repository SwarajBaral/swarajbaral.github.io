import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into ../origami so GitHub Pages serves it at /origami/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../origami', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
