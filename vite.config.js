import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
