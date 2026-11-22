import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the site works under /paga-lo-que-debes/ on GitHub Pages.
  base: './',
  plugins: [react()],
});
