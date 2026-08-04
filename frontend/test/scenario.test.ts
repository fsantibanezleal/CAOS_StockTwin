/**
 * The browser side of Contract 2: the artifacts parse, and every verdict recomputes from the events.
 *
 * These run against the COMMITTED artifacts, not against a fixture, because the whole point of the
 * split is that the page derives its numbers in front of the reader. A test that made up its own
 * trace would prove the arithmetic and nothing about what ships.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MEASURED,
  type Cut,
  type Field,
  type Index,
  type Load,
  type Manifest,
  type Plan,
  type Scenario,
  type Sector,
  profileStats,
  segregationSummary,
  variogram,
  verdict,
  weightedVariance,
} from '../src/lib/scenario';

const DERIVED = join(__dirname, '..', '..', 'data', 'derived');
const read = <T>(...p: string[]): T => JSON.parse(readFileSync(join(DERIVED, ...p), 'utf-8')) as T;

const index = read<Index>('index.json');
const IDS = index.scenarios.map((s) => s.id);

function load(id: string): Scenario {
  return {
    manifest: read<Manifest>(id, 'manifest.json'),
    plan: read<Plan>(id, 'plan.json'),
    loads: read<Load[]>(id, 'loads.json'),
    field: read<Field>(id, 'field.json'),
    cuts: read<Cut[]>(id, 'cuts.json'),
    sectors: read<{ areas: Sector[] }>(id, 'sectors.json'),
    frames: read(id, 'frames.json'),
    volume: read(id, 'volume.json'),
  };
}

describe('the committed artifacts', () => {
  it('exist and enumerate the whole scenario matrix', () => {
    expect(existsSync(DERIVED)).toBe(true);
    // ADR-0056 puts the floor at a dozen configurable cases. The matrix is checked against the
    // floor rather than against a hardcoded list, so adding a case does not break a test that has
    // nothing to do with it.
    expect(IDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(IDS).size).toBe(IDS.length);
    expect(IDS).toContain('single');
  });

  it.each(IDS)('%s parses and every file is present', (id: string) => {
    const sc = load(id);
    expect(sc.loads.length).toBeGreaterThan(0);
    expect(sc.cuts.length).toBeGreaterThan(0);
    expect(sc.plan.areas.length).toBeGreaterThan(0);
    expect(sc.field.z.length).toBe(sc.field.nx * sc.field.ny);
    expect(sc.field.z0.length).toBe(sc.field.z.length);
  });

  it.each(IDS)('%s carries the truck paths the site view has to draw', (id: string) => {
    const placed = load(id).loads.filter((l) => l.placed);
    expect(placed.length).toBeGreaterThan(0);
    // Felipe's requirement: the truck is drawn coming in and going away, not just the dump point.
    expect(placed.every((l) => Array.isArray(l.approach))).toBe(true);
    expect(placed.every((l) => Array.isArray(l.departure))).toBe(true);
    expect(placed.some((l) => (l.approach?.length ?? 0) >= 2)).toBe(true);
  });

  it.each(IDS)('%s passed its gate: zero pairs over repose, mass conserved', (id: string) => {
    const g = load(id).manifest.gate;
    expect(g.pairs_over_repose).toBe(0);
    expect(g.ledger_agrees_with_terrain).toBe(true);
    expect(g.mass_residual_rel).toBeLessThan(1e-6);
  });

  it.each(IDS)('%s never sits below its original ground', (id: string) => {
    const f = load(id).field;
    const worst = Math.min(...f.z.map((z, i) => z - f.z0[i]));
    expect(worst).toBeGreaterThan(-1e-6);
  });
});

describe('the verdicts are RECOMPUTED, never read from the file', () => {
  it('no manifest carries a baked variance-reduction ratio', () => {
    // A baked ratio would be unfalsifiable: a reader could not tell a real result from a typo.
    for (const id of IDS) {
      const blob = readFileSync(join(DERIVED, id, 'manifest.json'), 'utf-8');
      for (const k of ['"vrr"', '"efficiency"', '"var_out"', '"variance_reduction"']) {
        expect(blob).not.toContain(k);
      }
    }
  });

  it.each(IDS)('%s produces a plausible verdict from its events alone', (id: string) => {
    const v = verdict(load(id));
    expect(v.varIn).toBeGreaterThan(0);
    expect(v.vrr).toBeGreaterThanOrEqual(0);
    expect(v.vrr).toBeLessThan(1); // a pile that did nothing would sit at one
    expect(v.ideal).toBeGreaterThan(0);
    expect(v.nLayers).toBeGreaterThan(1); // a cut drawing from one source is not blending

    // AN EFFICIENCY ABOVE ONE IS ARITHMETICALLY IMPOSSIBLE for genuinely independent sources, so it
    // means the source count is underestimated rather than that the pile beat the theoretical limit.
    // Measured, two of the three scenarios do exceed it, by 5x and 44x. That is an open gap and it is
    // NOT hidden: the contract is that whenever the bound cannot be believed the product says so and
    // withholds the number instead of printing a headline of several thousand percent.
    if (v.efficiency > 1.05) {
      expect(v.boundReliable).toBe(false);
    } else {
      expect(v.boundReliable).toBe(true);
    }
  });

  it('the weighted variance is actually weighted', () => {
    // Equal values have zero variance whatever the weights; unequal values weighted onto one side
    // must move the answer, or the weights are being ignored.
    expect(weightedVariance([1, 1, 1], [1, 5, 9])).toBeCloseTo(0, 12);
    const even = weightedVariance([0, 10], [1, 1]);
    const skewed = weightedVariance([0, 10], [99, 1]);
    expect(skewed).toBeLessThan(even);
  });

  it.each(IDS)('%s yields a variogram over the full range of lags', (id: string) => {
    const placed = load(id).loads.filter((l) => l.placed);
    let run = 0;
    const coord = placed.map(() => (run += 231));
    const vg = variogram(
      placed.map((l) => l.grade),
      coord,
      20,
    );
    expect(vg.centres.length).toBe(20);
    expect(vg.gamma.every((g) => Number.isFinite(g) && g >= 0)).toBe(true);
  });

  it('the variogram RISES with lag where the feed is a single correlated stream', () => {
    // NOT ON EVERY SCENARIO, and the exception is the interesting part. A rising variogram is what
    // short-range correlation looks like: nearby loads resemble each other and distant ones do not.
    // `two_phase` works two areas one after the other, so the second half of the campaign is a
    // different stretch of the ore body from the first, and the structure at long lag is set by the
    // difference between the phases rather than by the correlation inside either. Its variogram
    // comes out flat to falling, and that is the scenario reporting what it was built to show.
    for (const id of ['single', 'long_dwell', 'short_dwell']) {
      const placed = load(id).loads.filter((l) => l.placed);
      let run = 0;
      const coord = placed.map(() => (run += 231));
      const vg = variogram(placed.map((l) => l.grade), coord, 20);
      expect(vg.gamma[vg.gamma.length - 1]).toBeGreaterThan(vg.gamma[0]);
    }
  });
});

describe('the physics reached the artifact', () => {
  it.each(IDS)('%s produced both construction phases', (id: string) => {
    const counts = load(id).manifest.build.profiles;
    expect(counts.paddock ?? 0).toBeGreaterThan(0);
    const cascade = Object.entries(counts)
      .filter(([k]) => k !== 'paddock')
      .reduce((a, [, n]) => a + n, 0);
    expect(cascade).toBeGreaterThan(0);
  });

  it.each(IDS)('%s dump geometry stays under the measured envelope', (id: string) => {
    // THE UPPER BOUND IS UNIVERSAL, the lower one is not, and conflating them was wrong. The
    // envelope was surveyed off a 30 m dump crest, so it is what a TALL bench produces. A dump
    // cannot exceed it whatever the geometry, because that would mean the model is inventing size.
    // But a deliberately short bench produces a shorter dump BY CONSTRUCTION: `short_bench` runs
    // 9 m lifts, which cascade about 14 m, and its mean length comes out at 11.6 m against a
    // surveyed minimum of 13. That is the scenario's whole point, stated in its own reason, and a
    // test that fails on it is asserting that every bench must be tall.
    for (const r of profileStats(load(id))) {
      if (r.profile === 'paddock' || !r.len) continue;
      expect(r.len).toBeLessThanOrEqual(MEASURED.length[1]);
      expect(r.wid).toBeLessThanOrEqual(MEASURED.width[1]);
      expect(r.len).toBeGreaterThan(0);
      expect(r.wid).toBeGreaterThan(0);
    }
  });

  it('a full-height bench reproduces the measured envelope, both bounds', () => {
    // The scenarios whose bench is in the range the envelope was surveyed at.
    for (const id of ['single', 'valley', 'wet_material']) {
      if (!IDS.includes(id)) continue;
      for (const r of profileStats(load(id))) {
        if (r.profile === 'paddock' || !r.len) continue;
        expect(r.len).toBeGreaterThanOrEqual(MEASURED.length[0]);
        expect(r.wid).toBeGreaterThanOrEqual(MEASURED.width[0]);
      }
    }
  });

  it.each(IDS)('%s shows size segregation in the ledger', (id: string) => {
    // A flat coarse field would mean the sorting never got past the solver.
    const s = segregationSummary(load(id));
    expect(s.coarseMax - s.coarseMin).toBeGreaterThan(0.01);
  });

  it('the yard separated its material classes', () => {
    const sc = load('yard');
    const grades = sc.sectors.areas.map((a) => a.grade).sort((a, b) => a - b);
    const widest = Math.max(...sc.sectors.areas.map((a) => a.ci['0.95'] ?? 0));
    expect(sc.sectors.areas.length).toBeGreaterThanOrEqual(2);
    // Routing that produced identical piles would be routing in name only.
    expect(grades[grades.length - 1] - grades[0]).toBeGreaterThan(widest);
  });

  it('the class labels match the grades they hold', () => {
    // This is the defect the sector chart caught on sight: the router walks the threshold ladder
    // upward, so classes must be listed low to high or every pile is mislabelled.
    const areas = load('yard').sectors.areas;
    const low = areas.find((a) => a.name.includes('low'));
    const high = areas.find((a) => a.name.includes('high'));
    if (low && high) expect(low.grade).toBeLessThan(high.grade);
  });

  it('the landform cases have real relief and the flat pads do not', () => {
    // Any landform case in the index, not a named one: the matrix is a moving set and a test that
    // pins one scenario by name fails for a reason that has nothing to do with what it checks.
    const hills = index.scenarios.filter((s) => s.category === 'landform').map((s) => s.id);
    expect(hills.length).toBeGreaterThan(0);
    let withRelief = 0;
    for (const id of hills) {
      const z0 = load(id).field.z0;
      if (Math.max(...z0) - Math.min(...z0) > 10) withRelief++;
    }
    expect(withRelief).toBeGreaterThan(0);

    const flat = load('single').field;
    expect(Math.max(...flat.z0) - Math.min(...flat.z0)).toBeCloseTo(0, 6);
  });
});
