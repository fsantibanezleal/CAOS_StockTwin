// Prebuild: copy the committed CONTRACT-2 artifacts into the SPA's public/ so the static site can
// fetch them. The canonical copies live in ../data/derived; public/data is a build-time overlay and
// is git-ignored.
//
// This script COPIES. It never runs science, never regenerates a trace and never writes into
// data/derived. The canonical bake is an explicit release operation (`python data-pipeline/run.py`), and
// keeping the two apart is what stops a web build from quietly changing the scientific evidence.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');

const derived = join(ROOT, 'data', 'derived');
if (existsSync(derived)) {
  mkdirSync(join(PUB, 'data'), { recursive: true });
  cpSync(derived, join(PUB, 'data'), { recursive: true });
  console.log('[copy-data] data/derived -> public/data');
} else {
  console.warn('[copy-data] no data/derived yet; the app runs its live engine and the baked');
  console.warn('[copy-data] cross-case pages will show an honest "not baked" state.');
  mkdirSync(join(PUB, 'data', 'manifests'), { recursive: true });
}
