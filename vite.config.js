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
      // Pages : le jeu, le site de présentation (FR / EN), l'éditeur de circuits, les mentions légales
      input: { main: 'index.html', site: 'site/index.html', siteEn: 'site/en/index.html', editor: 'editor.html', legal: 'legal.html' },
    },
  },
  server: { host: true },
});
