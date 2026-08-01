// The live lane's own invariants, asserted in node so a broken engine fails the build rather than a
// panel. These mirror tests/test_heightfield.py, test_segregation.py, test_ledger.py and
// test_blending.py: the two lanes have to agree, so they are held to the same statements.
import assert from 'node:assert/strict';
import test from 'node:test';

import { cascade, maxSlopeExcess, criticalDrop } from '../src/engine/heightfield';
import { FlowingLayer } from '../src/engine/segregation';
import { Pile, RECLAIM_GEOMETRY } from '../src/engine/pile';
import * as blending from '../src/engine/blending';
import { generateStream, cumulativeTonnes } from '../src/engine/stream';
import { CASES, CASES_BY_ID, casesByCategory } from '../src/engine/cases.generated';
import { configFor, dumpsFor, simulate } from '../src/engine';
import type { PadSpec, TruckDump } from '../src/engine/types';

function cone(nx = 41, ny = 41, spike = 8) {
  // A spike small enough that its relaxed toe stays clear of the walls. The pad edge is a wall, so a
  // larger spike leaves material stacked against the boundary that genuinely cannot relax; that is
  // correct behaviour and is flagged, but it is not what these tests measure.
  const h = new Float64Array(nx * ny);
  h[Math.floor(ny / 2) * nx + Math.floor(nx / 2)] = spike;
  return { h, nx, ny };
}

const sum = (a: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };

test('relaxation conserves mass to machine precision', () => {
  const { h, nx, ny } = cone();
  const before = sum(h);
  cascade(h, nx, ny, 2.0, 37.0);
  assert.ok(Math.abs(sum(h) - before) < 1e-9, `moved ${sum(h) - before} m of material`);
});

test('a relaxed field stands at or below the imposed repose angle', () => {
  const { h, nx, ny } = cone();
  cascade(h, nx, ny, 2.0, 37.0);
  assert.ok(maxSlopeExcess(h, nx, ny, 2.0, 37.0) <= 1e-6);
});

test('a steeper material builds a taller cone', () => {
  const peaks = [30, 45].map((r) => {
    const { h, nx, ny } = cone();
    cascade(h, nx, ny, 2.0, r);
    return Math.max(...h);
  });
  assert.ok(peaks[1] > peaks[0] * 1.2, `45 deg gave ${peaks[1]} against 30 deg ${peaks[0]}`);
});

test('the diagonal admissible drop is sqrt(2) times the orthogonal one', () => {
  const [orth, diag] = criticalDrop(3.0, 37.0);
  assert.ok(Math.abs(diag / orth - Math.SQRT2) < 1e-12);
});

test('the cascade is ordered downslope', () => {
  const { h, nx, ny } = cone();
  const apex = Math.floor(ny / 2) * nx + Math.floor(nx / 2);
  const moves = cascade(h, nx, ny, 2.0, 37.0);
  assert.ok(moves.length > 0);
  assert.equal(moves[0][0], apex, 'the first cell to topple must be the highest one');
});

test('the segregation march conserves species mass', () => {
  const layer = new FlowingLayer(0.5, 2.0, 32);
  const before = layer.meanPhi;
  for (let i = 0; i < 40; i++) layer.advance(0.05);
  assert.ok(Math.abs(layer.meanPhi - before) < 1e-9);
});

test('fines drain to the base of the flowing layer', () => {
  const layer = new FlowingLayer(0.5, 3.0, 32);
  for (let i = 0; i < 40; i++) layer.advance(0.05);
  const base = [...layer.phi.slice(0, 8)].reduce((a, b) => a + b, 0) / 8;
  const top = [...layer.phi.slice(-8)].reduce((a, b) => a + b, 0) / 8;
  assert.ok(base > top + 0.4, `base ${base} is not fine-rich against the surface ${top}`);
});

test('zero segregation number is EXACTLY a passive tracer', () => {
  // The negative control depends on equality, not near-equality: "the solver did nothing" has to be
  // provable rather than approximately true.
  const layer = new FlowingLayer(0.37, 0, 32);
  for (let i = 0; i < 50; i++) layer.advance(0.1);
  assert.ok([...layer.phi].every((p) => p === 0.37));
  const [dep, rest] = layer.splitBase(0.4);
  assert.equal(dep, 0.37);
  assert.equal(rest, 0.37);
});

test('splitBase conserves species mass', () => {
  const layer = new FlowingLayer(0.6, 2.5, 32);
  for (let i = 0; i < 10; i++) layer.advance(0.05);
  const before = layer.meanPhi;
  const f = 0.35;
  const [dep, rest] = layer.splitBase(f);
  assert.ok(Math.abs(f * dep + (1 - f) * rest - before) < 1e-9);
});

const pad: PadSpec = { nx: 24, ny: 16, cellM: 3, reposeDeg: 37, reposeCoarseDeg: 37, bulkDensityTpm3: 1.9 };
const dump = (i: number, x: number, cu = 0.6, cf = 0.35): TruckDump => ({
  eventId: i, tS: i * 90, truckId: 'T01', sourceId: 'DIG-001', tonnes: 220,
  gradeCuPct: cu, gradeAuGpt: 0.1, coarseFrac: cf, moisturePct: 3, xM: x, yM: 24,
});

function build(n = 40, sr = 1) {
  const p = new Pile(pad);
  for (let i = 0; i < n; i++) {
    p.deposit(dump(i, 12 + (i % 12) * 3, 0.4 + 0.02 * (i % 11), 0.25 + 0.01 * (i % 9)), sr);
  }
  return p;
}

test('deposited equals in-pile before any reclaim', () => {
  const p = build();
  assert.ok(Math.abs(p.depositedT - p.inPileT) < 1e-6);
});

test('the mass balance holds across every reclaim geometry, and provenance sums to one', () => {
  for (const method of Object.keys(RECLAIM_GEOMETRY) as Array<keyof typeof RECLAIM_GEOMETRY>) {
    const p = build();
    let front = 0;
    for (let k = 0; k < 8; k++) {
      const [cut, nf] = p.reclaim(k, 1e4 + k * 60, 600, method, front);
      front = nf;
      if (!cut) break;
      let s = 0;
      for (const [, f] of cut.sources) s += f;
      assert.ok(Math.abs(s - 1) < 1e-12, `${method}: provenance summed to ${s}`);
      assert.ok(cut.tonnes > 0 && Number.isFinite(cut.gradeCuPct));
    }
    assert.ok(Math.abs(p.depositedT - (p.inPileT + p.reclaimedT)) < 1e-6, method);
  }
});

test('a full-face cut crosses more layers than a loader bite', () => {
  const counts: Record<string, number> = {};
  for (const method of ['fullface', 'loader'] as const) {
    const p = build(60);
    const [cut] = p.reclaim(0, 1e5, 900, method, 6);
    assert.ok(cut);
    counts[method] = cut!.nLayers;
  }
  assert.ok(counts.fullface > counts.loader, JSON.stringify(counts));
});

test('at zero segregation every lot keeps its source size split', () => {
  const p = new Pile(pad);
  const expected = new Map<number, number>();
  for (let i = 0; i < 30; i++) {
    const cf = 0.2 + 0.02 * (i % 13);
    expected.set(i, cf);
    p.deposit(dump(i, 12 + (i % 10) * 3, 0.6, cf), 0);
  }
  let worst = 0;
  for (const stack of p.stacks) {
    for (const lot of stack) worst = Math.max(worst, Math.abs(lot.coarseFrac - expected.get(lot.eventId)!));
  }
  assert.ok(worst < 1e-12, `the solver changed a size split by ${worst} while switched off`);
});

test('the variance reduction ratio is out over in, so lower is better', () => {
  // Pinned against Loubser and de Korte 2015 Table IV: cone shell 0.232 is WORSE than chevcon 0.121.
  assert.ok(blending.vrr(1, 0.121) < blending.vrr(1, 0.232));
  assert.ok(blending.VRR_FORMULA_LABEL.includes('var_out / var_in'));
});

test('the variance is tonnage weighted, not count weighted', () => {
  const equal = blending.tonnageWeightedVariance([1, 3], [1, 1]);
  const skewed = blending.tonnageWeightedVariance([1, 3], [9, 1]);
  assert.ok(Math.abs(equal - 1) < 1e-12);
  assert.ok(skewed < equal);
});

test('a real bed recovers only a fraction of the ideal bound', () => {
  // Schramm reports a mixing effect of 5 to 7.5 for 200 to 600 layers; the ideal sqrt(N) would be
  // 14.1 to 24.5. This pins the resulting efficiency range so a change that starts reporting
  // near-ideal blending for a real bed fails here.
  for (const [n, e] of [[200, 5], [600, 7.5]] as const) {
    const eff = blending.blendingEfficiency(1 / (e * e), n);
    assert.ok(eff > 0 && eff < 0.35, `N=${n}, E=${e} gave efficiency ${eff}`);
  }
  assert.equal(blending.blendingEfficiency(0.001, 25), 1);
});

test('the variogram recovers a range of the right magnitude', () => {
  const dumps = generateStream({ nDumps: 600, seed: 5, structure: 'stationary', rangeT: 6000 });
  const v = blending.experimentalVariogram(dumps.map((d) => d.gradeCuPct), cumulativeTonnes(dumps), 24);
  assert.equal(v.lagT.length, 24);
  assert.ok(v.gamma[0] < v.gamma[v.gamma.length - 1], 'the semivariogram must rise with lag');
  assert.ok(v.model.range > 1000 && v.model.range < 30000, JSON.stringify(v.model));
});

test('the same seed gives the same stream, a different seed does not', () => {
  const a = generateStream({ nDumps: 120, seed: 3 });
  const b = generateStream({ nDumps: 120, seed: 3 });
  const c = generateStream({ nDumps: 120, seed: 4 });
  assert.deepEqual(a.map((d) => d.gradeCuPct), b.map((d) => d.gradeCuPct));
  assert.notDeepEqual(a.map((d) => d.gradeCuPct), c.map((d) => d.gradeCuPct));
});

test('the same configuration gives an identical run', () => {
  const c = CASES_BY_ID.R04_loader;
  const a = simulate(configFor(c, 11), dumpsFor(c, 11));
  const b = simulate(configFor(c, 11), dumpsFor(c, 11));
  assert.deepEqual([...a.heightFinal], [...b.heightFinal]);
  assert.deepEqual(a.cuts.map((x) => [x.cutId, x.tonnes, x.gradeCuPct, x.nLayers]),
    b.cuts.map((x) => [x.cutId, x.tonnes, x.gradeCuPct, x.nLayers]));
});

test('the generated case registry carries everything the acceptance contract requires', () => {
  assert.equal(CASES.length, 17);
  for (const c of CASES) {
    assert.ok(c.reason.length > 40, `${c.id} has no scientific reason`);
    assert.ok(c.expectedBand.length > 20, `${c.id} has no expected behaviour`);
    assert.ok(c.killCriterion.length > 20, `${c.id} has no kill criterion`);
    assert.equal(c.split, 'holdout');
  }
  const groups = casesByCategory();
  assert.equal(groups.length, 5);
  assert.equal(groups.find((g) => g.category === 'control')!.cases.length, 3);
});
