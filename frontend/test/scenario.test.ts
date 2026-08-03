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
  };
}

describe('the committed artifacts', () => {
  it('exist and enumerate the three agreed scenarios', () => {
    expect(existsSync(DERIVED)).toBe(true);
    expect(new Set(IDS)).toEqual(new Set(['single', 'yard', 'sidehill']));
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

  it.each(IDS)('%s yields a variogram that rises with lag', (id: string) => {
    const placed = load(id).loads.filter((l) => l.placed);
    let run = 0;
    const coord = placed.map(() => (run += 231));
    const vg = variogram(
      placed.map((l) => l.grade),
      coord,
      20,
    );
    expect(vg.centres.length).toBe(20);
    expect(vg.gamma[vg.gamma.length - 1]).toBeGreaterThan(vg.gamma[0]);
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

  it.each(IDS)('%s dump geometry stays inside the measured envelope', (id: string) => {
    for (const r of profileStats(load(id))) {
      if (r.profile === 'paddock' || !r.len) continue;
      expect(r.len).toBeGreaterThanOrEqual(MEASURED.length[0]);
      expect(r.len).toBeLessThanOrEqual(MEASURED.length[1]);
      expect(r.wid).toBeGreaterThanOrEqual(MEASURED.width[0]);
      expect(r.wid).toBeLessThanOrEqual(MEASURED.width[1]);
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

  it('the sidehill has real relief and the flat pads do not', () => {
    const hill = load('sidehill').field;
    expect(Math.max(...hill.z0) - Math.min(...hill.z0)).toBeGreaterThan(10);
    const flat = load('single').field;
    expect(Math.max(...flat.z0) - Math.min(...flat.z0)).toBeCloseTo(0, 6);
  });
});
