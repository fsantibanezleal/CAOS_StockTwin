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

  // 2. the reclaim cuts, which depend on the relaxation, the segregation and the ledger all agreeing.
  //
  // THE TOLERANCE HERE IS A MEASUREMENT, NOT A ROUND NUMBER, and it is worth stating why it is not
  // zero. The two lanes were compared quantity by quantity on this case:
  //
  //     input stream                    5.7e-14   (the generator is reproduced exactly)
  //     deposited tonnage, per lot      1.8e-13
  //     total pile mass                 1.1e-11
  //     lot size-split composition      9.8e-4    (first at deposit 33)
  //     cut grade                       5.4e-4    (by cut 76)
  //
  // Mass and geometry are exact; only the size-split composition drifts, and it drifts from the
  // segregation path's floating-point accumulation order rather than from a logic difference. The
  // cascade, the Godunov flux, the flowing layer, splitBase, the shift routine, reclaim and the run
  // driver were each read side by side against the offline lane and are equivalent, and the per-band
  // solver outputs (baseFrac, phiBefore, phiDep, phiMove) match to 1e-12 across all twelve bands of
  // the first divergent deposit.
  //
  // ADR-0069 clause 5 asks a mirrored live lane to REPORT its delta against the canonical engine, not
  // to be bit-identical to it. So this asserts the measured agreement and the product publishes the
  // number, rather than asserting an equality the code does not deliver. Tightening it is tracked as
  // BB-002 in the engine's backlog; the offline bake remains the only source of truth either way.
  const GRADE_PARITY = 1e-3;   // measured worst case 5.4e-4, with headroom for other cases
  assert.equal(live.cuts.length, baked.cuts.length, 'cut count');
  let worstGrade = 0;
  for (let i = 0; i < baked.cuts.length; i++) {
    worstGrade = Math.max(worstGrade, Math.abs(live.cuts[i].gradeCuPct - baked.cuts[i].cu));
    assert.ok(Math.abs(live.cuts[i].gradeCuPct - baked.cuts[i].cu) < GRADE_PARITY,
      `cut ${i} grade: live ${live.cuts[i].gradeCuPct} against baked ${baked.cuts[i].cu}`);
    // the layer count is discrete, so it must match EXACTLY: a different count is a different
    // reclaim, not a rounding difference, and it is the quantity every blending claim rests on
    assert.equal(live.cuts[i].nLayers, baked.cuts[i].n, `cut ${i} layer count`);
  }
  // a regression that made parity WORSE would still pass the bound above, so pin the measurement
  assert.ok(worstGrade < 6e-4,
    `cross-lane grade parity regressed to ${worstGrade.toExponential(2)}, was 5.4e-4`);

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
