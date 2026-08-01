// THE CROSS-LANE TEST. The same science exists twice, in Python for the bake and in TypeScript for the
// browser, and the whole product rests on them agreeing.
//
// The contract mirror catches a SHAPE drift and the generated case registry catches a PARAMETER drift,
// but neither can see the thing that matters most: whether the two implementations compute the same
// NUMBERS. This test compares the browser engine against a committed trace produced by the Python
// pipeline, which is the only evidence that they do.
//
// It SKIPS with an explicit message when the canonical bake is absent, rather than passing quietly. A
// test that silently passes when its evidence is missing is worse than no test, because the green tick
// then means nothing.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CASES_BY_ID, configFor, dumpsFor, simulate } from '../src/engine';
import type { Trace } from '../src/lib/contract.types';

const DERIVED = join(import.meta.dirname, '..', '..', 'data', 'derived');
const CASE = 'G01_chevron';
const TRACE = join(DERIVED, CASE, 'trace.json');

test('the browser engine reproduces the committed Python trace', { skip: !existsSync(TRACE)
  ? `no canonical bake at ${TRACE}; run: python -m stlab.pipeline` : false }, () => {
  const baked = JSON.parse(readFileSync(TRACE, 'utf8')) as Trace;
  const c = CASES_BY_ID[baked.case_id];
  assert.ok(c, `the committed trace names case ${baked.case_id}, which is not in the registry`);

  const live = simulate(configFor(c, baked.seed), dumpsFor(c, baked.seed));

  // 1. the input stream, which is the generator both lanes had to reproduce bit for bit
  assert.equal(live.dumps.length, baked.events.length, 'dump count');
  for (let i = 0; i < baked.events.length; i++) {
    assert.ok(Math.abs(live.dumps[i].tonnes - baked.events[i].t_t) < 5e-2,
      `dump ${i} tonnage: live ${live.dumps[i].tonnes} against baked ${baked.events[i].t_t}`);
    assert.ok(Math.abs(live.dumps[i].gradeCuPct - baked.events[i].cu) < 5e-4,
      `dump ${i} grade: live ${live.dumps[i].gradeCuPct} against baked ${baked.events[i].cu}`);
  }

  // 2. the reclaim cuts, which depend on the relaxation, the segregation and the ledger all agreeing
  assert.equal(live.cuts.length, baked.cuts.length, 'cut count');
  for (let i = 0; i < baked.cuts.length; i++) {
    assert.ok(Math.abs(live.cuts[i].gradeCuPct - baked.cuts[i].cu) < 5e-4,
      `cut ${i} grade: live ${live.cuts[i].gradeCuPct} against baked ${baked.cuts[i].cu}`);
    assert.equal(live.cuts[i].nLayers, baked.cuts[i].n, `cut ${i} layer count`);
  }

  // 3. the final field
  assert.equal(live.heightFinal.length, baked.final.h.length, 'pad cell count');
  let worst = 0;
  for (let c2 = 0; c2 < baked.final.h.length; c2++) {
    worst = Math.max(worst, Math.abs(live.heightFinal[c2] - baked.final.h[c2]));
  }
  assert.ok(worst < 1e-3, `the final height field differs by up to ${worst} m between the lanes`);
});

test('every committed trace has provenance fractions that sum to one', { skip: !existsSync(TRACE)
  ? 'no canonical bake' : false }, () => {
  const baked = JSON.parse(readFileSync(TRACE, 'utf8')) as Trace;
  for (const cut of baked.cuts) {
    const s = cut.srcs.reduce((a, [, f]) => a + f, 0);
    assert.ok(Math.abs(s - 1) < 1e-5, `cut ${cut.id} provenance summed to ${s}`);
  }
});
