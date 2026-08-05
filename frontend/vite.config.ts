import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The display version (X.XX.XXX) comes from the repo VERSION file, so the footer, the artifact
// cache-buster and the git tag cannot disagree. conventions/versioning.md makes that drift the most
// common failure on this product line, and reading one file is what prevents it.
const VERSION = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

// THE ENGINE VERSION COMES FROM THE PIN, for the same reason and after the same failure. It was
// hardcoded in four places across the footer, the focus view, an architecture diagram and the
// provenance line, and the engine itself had a fifth copy in `bedblend.__version__` that had drifted
// two releases behind its own manifest. A version a human has to update in five files eventually
// disagrees with itself, and a provenance line naming the wrong engine is worse than none.
const ENGINE = (
  readFileSync(new URL('../requirements.txt', import.meta.url), 'utf8')
    .match(/^bedblend==(\S+)/m) ?? []
)[1];
if (!ENGINE) throw new Error('no `bedblend==` pin found in requirements.txt');

// base '/' because the site is served at a custom domain root (stocktwin.fasl-work.com), not from a
// GitHub Pages project subpath. The SPA deep-link fallback is spa-404.mjs, which runs as postbuild.
export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    __ENGINE_VERSION__: JSON.stringify(ENGINE),
  },
  build: { chunkSizeWarningLimit: 1600 },
});
