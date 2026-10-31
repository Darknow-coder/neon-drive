import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      // Deux pages : le jeu et l'éditeur de circuits
      input: { main: 'index.html', editor: 'editor.html' },
    },
  },
  server: { host: true },
});
