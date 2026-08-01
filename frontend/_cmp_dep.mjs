import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor } from './src/engine/index.ts';
import { Pile } from './src/engine/pile.ts';
const py = JSON.parse(readFileSync('E:/_Temp/py_sig.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const cfg = configFor(c, baked.seed);
const dumps = dumpsFor(c, baked.seed);
const p = new Pile(cfg.pad);
for (let i = 0; i < dumps.length; i++) {
  p.deposit(dumps[i], cfg.sr);
  const h = p.h;
  let s1 = 0, s2 = 0, mx = -Infinity;
  for (let k = 0; k < h.length; k++) { s1 += h[k]; s2 += h[k] * (k + 1); if (h[k] > mx) mx = h[k]; }
  const [q1, q2, qm] = py.sig[i];
  const d1 = Math.abs(s1 - q1), d2 = Math.abs(s2 - q2), dm = Math.abs(mx - qm);
  if (d1 > 1e-9 || d2 > 1e-6 || dm > 1e-12) {
    console.log(`FIRST deposit divergence at #${i}`);
    console.log(`  sum(h):   py=${q1} ts=${s1} d=${d1.toExponential(3)}`);
    console.log(`  weighted: py=${q2} ts=${s2} d=${d2.toExponential(3)}`);
    console.log(`  max(h):   py=${qm} ts=${mx} d=${dm.toExponential(3)}`);
    console.log(`  dump: t=${dumps[i].tonnes} cu=${dumps[i].gradeCuPct} x=${dumps[i].xM} y=${dumps[i].yM}`);
    process.exit(0);
  }
}
console.log('no deposit-level divergence detected');
