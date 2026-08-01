// Find the FIRST point where the two lanes part, rather than the last.
import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor, simulate } from './src/engine/index.ts';

const py = JSON.parse(readFileSync('E:/_Temp/py_g01.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const ts = simulate(configFor(c, baked.seed), dumpsFor(c, baked.seed));

// 1. the input stream
let firstDump = -1, worstDump = 0;
for (let i = 0; i < py.dumps.length; i++) {
  const d = Math.max(
    Math.abs(ts.dumps[i].tonnes - py.dumps[i].t),
    Math.abs(ts.dumps[i].gradeCuPct - py.dumps[i].cu),
    Math.abs(ts.dumps[i].coarseFrac - py.dumps[i].cf),
    Math.abs(ts.dumps[i].xM - py.dumps[i].x),
    Math.abs(ts.dumps[i].yM - py.dumps[i].y));
  if (d > worstDump) worstDump = d;
  if (d > 1e-12 && firstDump < 0) firstDump = i;
}
console.log(`dumps: n_py=${py.dumps.length} n_ts=${ts.dumps.length} worst=${worstDump.toExponential(3)} first_diff=${firstDump}`);

// 2. the cuts
console.log(`cuts:  n_py=${py.cuts.length} n_ts=${ts.cuts.length}`);
let firstCut = -1;
for (let i = 0; i < Math.min(py.cuts.length, ts.cuts.length); i++) {
  const dg = Math.abs(ts.cuts[i].gradeCuPct - py.cuts[i].cu);
  const dt = Math.abs(ts.cuts[i].tonnes - py.cuts[i].t);
  const dn = Math.abs(ts.cuts[i].nLayers - py.cuts[i].n);
  if ((dg > 1e-12 || dt > 1e-9 || dn > 0) && firstCut < 0) {
    firstCut = i;
    console.log(`  FIRST cut divergence at ${i}: dgrade=${dg.toExponential(3)} dton=${dt.toExponential(3)} dlayers=${dn}`);
    console.log(`    py: t=${py.cuts[i].t} cu=${py.cuts[i].cu} n=${py.cuts[i].n}`);
    console.log(`    ts: t=${ts.cuts[i].tonnes} cu=${ts.cuts[i].gradeCuPct} n=${ts.cuts[i].nLayers}`);
  }
}
if (firstCut < 0) console.log('  cuts identical to 1e-12');

// 3. the final field
let worstH = 0, firstH = -1;
for (let i = 0; i < py.h.length; i++) {
  const d = Math.abs(ts.heightFinal[i] - py.h[i]);
  if (d > worstH) worstH = d;
  if (d > 1e-12 && firstH < 0) firstH = i;
}
console.log(`height: worst=${worstH.toExponential(3)} first_cell=${firstH}`);
