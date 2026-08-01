import { readFileSync } from 'node:fs';
import { CASES_BY_ID, configFor, dumpsFor } from './src/engine/index.ts';
import { Pile } from './src/engine/pile.ts';
import { dumpPosition } from './src/engine/stacking.ts';
const py = JSON.parse(readFileSync('E:/_Temp/py_probe.json', 'utf8'));
const baked = JSON.parse(readFileSync('../data/derived/G01_chevron/trace.json', 'utf8'));
const c = CASES_BY_ID[baked.case_id];
const cfg = configFor(c, baked.seed);
const dumps = dumpsFor(c, baked.seed);
const pad = cfg.pad, n = dumps.length;
const pos = dumps.map((d, k) => {
  const [x, y] = dumpPosition(cfg.stacking, k, n, pad.nx, pad.ny, pad.cellM, cfg.nPasses);
  return { ...d, xM: x, yM: y };
});
let total = 0; for (const d of pos) total += d.tonnes;
const startT = cfg.startFraction * total;
const pile = new Pile(pad);
let stacked = 0, debt = 0, front = 0, cutId = 0;
const probes = [];
for (let k = 0; k < n; k++) {
  pile.deposit(pos[k], cfg.sr); stacked += pos[k].tonnes;
  if (stacked >= startT) {
    debt += pos[k].tonnes * cfg.reclaimRate;
    while (debt >= cfg.cutTonnes) {
      if (cutId === 33 || cutId === 34) {
        let s = 0, sw = 0, nl = 0;
        for (let i = 0; i < pile.colT.length; i++) { s += pile.colT[i]; sw += pile.colT[i] * (i + 1); }
        for (const st of pile.stacks) nl += st.length;
        probes.push({ cut: cutId, k, front, colt: s, colt_w: sw, nlots: nl, inpile: pile.inPileT });
      }
      const [cut, nf] = pile.reclaim(cutId, pos[k].tS, cfg.cutTonnes, cfg.reclaim, front);
      front = nf;
      if (!cut) { debt = 0; break; }
      cutId++; debt -= cut.tonnes;
    }
  }
  if (cutId > 34) break;
}
for (let i = 0; i < probes.length; i++) {
  const t = probes[i], p = py[i];
  console.log(`cut ${t.cut}: k py=${p.k} ts=${t.k} | front py=${p.front} ts=${t.front} | nlots py=${p.nlots} ts=${t.nlots}`);
  console.log(`   colt   py=${p.colt} ts=${t.colt}  d=${Math.abs(p.colt - t.colt).toExponential(3)}`);
  console.log(`   colt_w py=${p.colt_w} ts=${t.colt_w}  d=${Math.abs(p.colt_w - t.colt_w).toExponential(3)}`);
}
