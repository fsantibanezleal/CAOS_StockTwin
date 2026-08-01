import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor } from './src/engine/index.ts';
import { Pile } from './src/engine/pile.ts';
const py = JSON.parse(readFileSync('E:/_Temp/py_ledger.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const cfg = configFor(c, baked.seed);
const dumps = dumpsFor(c, baked.seed);
const p = new Pile(cfg.pad);
for (let i = 0; i < dumps.length; i++) {
  p.deposit(dumps[i], cfg.sr);
  let nl = 0, w = 0, s = 0;
  for (let ci = 0; ci < p.stacks.length; ci++) {
    const st = p.stacks[ci];
    nl += st.length;
    for (let li = 0; li < st.length; li++) w += st[li].tonnes * (ci + 1) + st[li].coarseFrac * (li + 1);
  }
  for (let k = 0; k < p.colT.length; k++) s += p.colT[k];
  const [qn, qw, qs] = py[i];
  if (nl !== qn || Math.abs(w - qw) > 1e-6 || Math.abs(s - qs) > 1e-9) {
    console.log(`FIRST ledger divergence at deposit #${i}`);
    console.log(`  nlots  py=${qn} ts=${nl}`);
    console.log(`  compsig py=${qw} ts=${w}  d=${Math.abs(qw - w).toExponential(3)}`);
    console.log(`  colt   py=${qs} ts=${s}  d=${Math.abs(qs - s).toExponential(3)}`);
    console.log(`  dump   t=${dumps[i].tonnes} cf=${dumps[i].coarseFrac} x=${dumps[i].xM} y=${dumps[i].yM}`);
    process.exit(0);
  }
}
console.log('ledger identical across all deposits');
