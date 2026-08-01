import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor } from './src/engine/index.ts';
import { Pile } from './src/engine/pile.ts';
import * as hfmod from './src/engine/heightfield.ts';
const py = JSON.parse(readFileSync('E:/_Temp/py_moves.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const cfg = configFor(c, baked.seed);
const dumps = dumpsFor(c, baked.seed);
const p = new Pile(cfg.pad);
const rec = [];
const orig = hfmod.cascade;
// Pile imports cascade directly, so wrap by re-running it here on a clone is not possible; instead
// instrument by monkeypatching the module namespace is also not possible for ESM. Compare via the
// public band count returned by deposit() plus a recomputed cascade on a copy of the field.
for (let k = 0; k <= 33; k++) {
  const before = Float64Array.from(p.h);
  const bands = p.deposit(dumps[k], cfg.sr);
  // recompute what the cascade would have produced from `before` + the same placement is not exact,
  // so instead just compare the band count, which is min(N_BANDS, moves.length)
  rec.push(bands);
}
for (let i = 0; i < py.length; i++) {
  const pyBands = Math.min(12, py[i][0]);
  if (pyBands !== rec[i]) { console.log(`deposit ${i}: bands py=${pyBands} ts=${rec[i]} (py moves=${py[i][0]})`); }
}
console.log('band comparison done');
