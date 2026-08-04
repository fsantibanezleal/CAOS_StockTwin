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
  cutMarks,
  isConcurrent,
  playState,
  profileStats,
  segregationSummary,
  timelineLength,
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

describe('a concurrent campaign is fed and drawn at the same time', () => {
  // THE TWO CASES THAT ANSWER "does anything model loading and draining together". They exist
  // because a real surge pile is worked from both ends, and they very nearly did not ship: the bake
  // produced them and the assembly step left them out of the artifact tree, so the app offered
  // twenty cases and neither of these was among them. These assertions are the reason that cannot
  // happen quietly again.
  const CONCURRENT = index.scenarios
    .filter((s) => s.category === 'campaign')
    .map((s) => s.id)
    .filter((id) => read<Manifest>(id, 'manifest.json').reclaim.mode === 'concurrent');

  it('ships at least one case where the loader works while the trucks are still tipping', () => {
    expect(CONCURRENT.length).toBeGreaterThanOrEqual(2);
  });

  it('every cut records the load it was taken at, and it is DURING the build', () => {
    for (const id of CONCURRENT) {
      const sc = load(id);
      const nLoads = sc.manifest.build.loads_placed;
      expect(sc.cuts.length).toBeGreaterThan(0);
      for (const c of sc.cuts) {
        expect(typeof c.at).toBe('number');
        expect(c.at!).toBeGreaterThan(0);
        // Strictly inside the build: a cut at or past the last load is a sequential campaign wearing
        // a concurrent label.
        expect(c.at!).toBeLessThan(nLoads);
      }
      // And they are spread through it rather than bunched at the end.
      const ats = sc.cuts.map((c) => c.at!);
      expect(Math.min(...ats)).toBeLessThan(nLoads * 0.2);
      expect(Math.max(...ats)).toBeGreaterThan(nLoads * 0.8);
    }
  });

  it('a sequential campaign records no such index', () => {
    for (const c of load('single').cuts) expect(c.at).toBeUndefined();
  });

  it('THE BUILD CHAIN ALREADY CARRIES THE BITES, so the timeline must not append the reclaim', () => {
    for (const id of CONCURRENT) {
      const sc = load(id);
      // The frames of a concurrent build DECREASE in volume wherever a cut was taken. If they did
      // not, the two chains would be separate stories and interleaving them would be wrong.
      const f = sc.frames!;
      let z = [...(f.frames[0].z as number[])];
      let prev = z.reduce((a, b) => a + b, 0);
      let dips = 0;
      for (let i = 1; i < f.frames.length; i++) {
        const fr = f.frames[i];
        if (fr.z) z = [...fr.z];
        else if (fr.d) for (let j = 0; j + 1 < fr.d.length; j += 2) z[fr.d[j]] = fr.d[j + 1];
        const v = z.reduce((a, b) => a + b, 0);
        if (v < prev - 1e-6) dips++;
        prev = v;
      }
      expect(dips).toBeGreaterThan(0);

      // So the timeline is the build ALONE. Appending the reclaim chain replays a nearly empty pile
      // after the finished one, which is the defect this locks out.
      expect(isConcurrent(sc)).toBe(true);
      expect(timelineLength(sc)).toBe(f.frames.length);
    }
  });

  it('a sequential timeline still runs build then reclaim', () => {
    const sc = load('single');
    expect(isConcurrent(sc)).toBe(false);
    expect(timelineLength(sc)).toBe(sc.frames!.frames.length + (sc.frames!.reclaim?.length ?? 0));
  });

  it('the loader appears on the stage DURING the build, not after it', () => {
    for (const id of CONCURRENT) {
      const sc = load(id);
      const n = timelineLength(sc);
      let sawReclaim = 0;
      let sawHaul = 0;
      // Walk the whole timeline at load granularity and count which machine is on the stage.
      for (let i = 0; i < n; i++) {
        const st = playState(sc, i + 0.5);
        if (!st) continue;
        if (st.job === 'reclaim') sawReclaim++;
        else sawHaul++;
      }
      expect(sawReclaim).toBeGreaterThan(0);
      expect(sawHaul).toBeGreaterThan(0);

      // And the FIRST reclaim moment is early, not at the end.
      let firstReclaim = -1;
      for (let i = 0; i < n; i++) {
        const st = playState(sc, i + 0.5);
        if (st?.job === 'reclaim') { firstReclaim = i; break; }
      }
      expect(firstReclaim).toBeGreaterThanOrEqual(0);
      expect(firstReclaim).toBeLessThan(n * 0.25);
    }
  });

  it('drawing while feeding blends WORSE than filling then drawing, which is the whole point', () => {
    // The kill criterion, asserted on the artifact: a cut taken part-way through the build has fewer
    // lifts available to cross, so it must homogenize less than the sequential campaign on the same
    // seed and geometry. A pile that blended just as well either way would not be blending by
    // residence at all.
    const seq = verdict(load('single'));
    for (const id of CONCURRENT) {
      const con = verdict(load(id));
      expect(con.vrr).toBeGreaterThan(seq.vrr);
      expect(con.nLayers).toBeLessThan(seq.nLayers);
    }
  });
});


describe('something comes for the reclaimed material', () => {
  // A cut used to be a tonnage, a grade and a centroid: the ore left the ledger and no vehicle on
  // site carried it away, so the pile lost volume with no machine in the picture. Felipe found it by
  // asking the obvious question, which no gate here was asking.
  it('every scenario routes a truck to its cuts', () => {
    for (const id of IDS) {
      const sc = load(id);
      const served = sc.cuts.filter((c) => c.stand);
      expect(served.length, `${id} has no cut a truck could reach`).toBeGreaterThan(0);
      expect(served.length / sc.cuts.length, `${id} strands most of its reclaim`).toBeGreaterThan(0.5);
    }
  });

  it('the truck drives in and out, and the legs are not the same walk reversed', () => {
    let differing = 0;
    for (const id of IDS) {
      for (const c of load(id).cuts.filter((x) => x.stand)) {
        expect(c.in!.length).toBeGreaterThanOrEqual(2);
        expect(c.out!.length).toBeGreaterThanOrEqual(2);
        // In ends where out begins: the truck is loaded where it stopped.
        expect(c.in![c.in!.length - 1]).toEqual(c.stand);
        expect(c.out![0]).toEqual(c.stand);
        const reversed = [...c.in!].reverse();
        if (JSON.stringify(reversed) !== JSON.stringify(c.out)) differing++;
      }
    }
    // The cut has just been taken and the face relaxed, so on at least some cuts the way out is a
    // different walk. If every leg were an exact mirror the second solve would be doing nothing.
    expect(differing).toBeGreaterThan(0);
  });

  it('the truck stands beside the face, not on the loader', () => {
    for (const id of IDS) {
      for (const c of load(id).cuts.filter((x) => x.stand)) {
        const dx = c.stand![0] - (c.x ?? 0);
        const dy = c.stand![1] - (c.y ?? 0);
        expect(Math.hypot(dx, dy), `${id}: the truck is parked on the loader`).toBeGreaterThan(0);
      }
    }
  });

  it('a reclaim moment puts BOTH machines on the stage, and the truck leaves loaded', () => {
    const sc = load('single');
    const n = timelineLength(sc);
    const nBuild = sc.frames!.frames.length;
    // Walk one whole cut: drive in, load, drive out.
    const seen = new Set<string>();
    let sawLoader = 0;
    for (let f = 0.05; f < 0.98; f += 0.05) {
      const st = playState(sc, nBuild + f);
      if (!st) continue;
      expect(st.job).toBe('reclaim');
      seen.add(st.phase);
      if (st.loader) sawLoader++;
      expect(st.truck, 'no truck on a reclaim step').not.toBeNull();
    }
    expect(seen.has('approach')).toBe(true);
    expect(seen.has('tip')).toBe(true);        // being loaded
    expect(seen.has('departure')).toBe(true);
    expect(sawLoader).toBeGreaterThan(0);
  });

  it('the cuts are marked on the timeline, so they can be found', () => {
    for (const id of IDS) {
      const sc = load(id);
      const marks = cutMarks(sc);
      expect(marks.length, `${id} marks no cuts`).toBeGreaterThan(0);
      const n = timelineLength(sc);
      for (const m of marks) {
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(n);
      }
    }
  });
});
