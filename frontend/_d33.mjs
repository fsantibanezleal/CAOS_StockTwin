import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor } from './src/engine/index.ts';
import { Pile } from './src/engine/pile.ts';
const py = JSON.parse(readFileSync('E:/_Temp/py_d33.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const cfg = configFor(c, baked.seed);
const dumps = dumpsFor(c, baked.seed);
const p = new Pile(cfg.pad);
for (let k = 0; k <= 33; k++) p.deposit(dumps[k], cfg.sr);
let wct = 0, wcf = 0, cellCt = 0, cellCf = 0;
for (let ci = 0; ci < p.stacks.length; ci++) {
  const st = p.stacks[ci], pt = py.tn[ci], pf = py.cf[ci];
  if (st.length !== pt.length) { console.log(`cell ${ci}: lot count py=${pt.length} ts=${st.length}`); continue; }
  for (let li = 0; li < st.length; li++) {
    const dt = Math.abs(st[li].tonnes - pt[li]);
    const df = Math.abs(st[li].coarseFrac - pf[li]);
    if (dt > wct) { wct = dt; cellCt = ci; }
    if (df > wcf) { wcf = df; cellCf = ci; }
  }
}
console.log(`worst tonnage diff    ${wct.toExponential(3)} (cell ${cellCt})`);
console.log(`worst coarseFrac diff ${wcf.toExponential(3)} (cell ${cellCf})`);
