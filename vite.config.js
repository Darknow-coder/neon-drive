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
      // Pages : présentation (FR / EN), le jeu, l'éditeur de circuits, les mentions légales
      input: { site: 'index.html', siteEn: 'en/index.html', main: 'jouer/index.html', editor: 'editor.html', legal: 'legal.html' },
    },
  },
  server: { host: true },
});
