import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The display version (X.XX.XXX) comes from the repo VERSION file, so the footer, the artifact
// cache-buster and the git tag cannot disagree. conventions/versioning.md makes that drift the most
// common failure on this product line, and reading one file is what prevents it.
const VERSION = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

// base '/' because the site is served at a custom domain root (stocktwin.fasl-work.com), not from a
// GitHub Pages project subpath. The SPA deep-link fallback is spa-404.mjs, which runs as postbuild.
export default defineConfig({
  base: '/',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  build: { chunkSizeWarningLimit: 1600 },
});
