/**
 * Reading the baked trace, and recomputing every verdict from it in the browser.
 *
 * THE SPLIT THAT MATTERS. The artifact carries EVENTS and GEOMETRY: the dump plan, the load log with
 * each truck's approach and departure path, the block field, the reclaim cuts. It does NOT carry the
 * answers. Variance reduction, the ideal bound, the sector confidence intervals and the segregation
 * summary are all computed here, from the events, every time the page loads.
 *
 * That is not an architectural preference. A trace that shipped a baked variance-reduction ratio
 * would be a slide: a reader could not tell a real result from a typo, and nothing in the page would
 * fail if the number were wrong. Recomputing means the numbers on screen are derived in front of the
 * reader from data they can also see.
 *
 * WHY THE SIMULATION ITSELF IS NOT HERE. The engine routes every load over the trafficable surface,
 * floods the pad for reachability, relaxes after every operation and sorts each cascading load by
 * size. That is tens of seconds per few hundred loads. Running it in a page would mean either a
 * frozen tab or a model simple enough to be wrong, and the previous version of this product chose the
 * second.
 */

export type XY = [number, number];

export interface Bench {
  index: number;
  top_m: number;
  designed_volume_m3: number;
}

export interface Area {
  name: string;
  material_class: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  access: XY;
  ramp_width_m: number;
  benches: Bench[];
}

export interface Plan {
  areas: Area[];
  row_spacing_m: number;
  tip_spacing_m: number;
  loads_per_dozer_pass: number;
  shovel: XY;
}

/** One truck load. This is the shape a fleet-management export has: one row per load, located. */
export interface Load {
  seq: number;
  area: string;
  bench: number;
  phase: 'paddock' | 'edge';
  truck: number;
  grade: number;
  block: number;
  placed: boolean;
  /** Where the truck actually stood. */
  x?: number;
  y?: number;
  /** Where the plan asked for it. The gap between the two is a real, reportable quantity. */
  px?: number;
  py?: number;
  offset?: number;
  profile?: 'paddock' | 'oval' | 'comet' | 'rectangular' | 'sloughed_heap' | null;
  d_crest?: number;
  head?: number;
  /** The multi-element assay, generated around the copper grade from shared geological factors. */
  cu?: number;
  mo?: number;
  au?: number;
  ag?: number;
  fe?: number;
  clay?: number;
  ph?: number;
  moisture?: number;
  recovery?: number;
  len?: number;
  wid?: number;
  thick?: number;
  seg?: number;
  overrun?: number;
  drop?: number;
  approach?: XY[];
  departure?: XY[];
  refused?: string;
}

export interface Field {
  nx: number;
  ny: number;
  cell_m: number;
  /** Original ground. Kept separate from `z` so "how much material is here" stays a different
   *  question from "how high is the surface", which they are on any sloping site. */
  z0: number[];
  z: number[];
  grade: (number | null)[];
  coarse: (number | null)[];
  blocks: [number, number, number, number, number][];
}

/** Surface snapshots through the build, so the pile can be watched growing rather than only
 *  inspected once finished. */
/** The pile as a block model: one deposition event per voxel, on a fixed vertical grid.
 *
 *  THIS IS THE PRODUCT. Only the surface used to ship, so the app could say what the top of the pile
 *  looks like and nothing at all about what is inside it, which is the wrong half of a stockpile.
 *  A column is `[k0, events]`: the lowest occupied voxel index and the events above it, contiguous.
 *  `null` is a column with no material. The assay is joined by event from the load log, so adding a
 *  variable costs nothing here and cannot desynchronise from the geometry. */
export interface Volume {
  nx: number;
  ny: number;
  nz: number;
  cell_m: number;
  dz_m: number;
  base_m: number;
  z0: number[];
  columns: ([number, number[]] | null)[];
}

/** One assay variable, declared by the generator so the selector and the units cannot drift. */
export interface AssayVar {
  key: string;
  label: string;
  unit: string;
  lo: number;
  hi: number;
  decimals: number;
}

export interface Frames {
  nx: number;
  ny: number;
  cell_m: number;
  z0: number[];
  /** `nx` and `ny` are the FULL terrain grid. The `z` arrays are sampled every `step` cells in each
   *  direction, so each one holds `ceil(nx/step) * ceil(ny/step)` values and has to be expanded
   *  before it can be drawn against the field. `seq` is the sequence number of the load just placed,
   *  which is what lets a player show the truck working right now instead of every path ever
   *  driven. */
  step?: number;
  /** One surface per reclaim cut, same grid and same delta encoding as the build frames. The pile
   *  coming DOWN is as much of the operation as the pile going up, and the timeline runs through
   *  both. */
  reclaim?: { seq: number; placed: number; z?: number[]; d?: number[] }[];
  /** The first frame is complete; the rest carry only the cells that changed, as flat
   *  [index, value, index, value] pairs. A load touches a couple of dozen cells and leaves the rest
   *  alone, so a full surface per frame writes the same numbers hundreds of times: 2.6 MB per
   *  scenario against 110 MB for the whole site. `expandFrame` accumulates them. */
  frames: { seq: number; placed: number; z?: number[]; d?: number[] }[];
}

export interface Cut {
  t: number;
  grade: number;
  disp: number;
  unc: number;
  /** Where the loader stood: the centroid of the cells this cut engaged, in pad metres. */
  x?: number;
  y?: number;
  /** How many cells it engaged, which is the size of the bite. */
  cells?: number;
  /** The load index during the build at which this cut was taken. Present only on a CONCURRENT
   *  campaign, where the loader works the pile while trucks are still tipping into it; absent on a
   *  sequential one, where every cut happens after the last load. */
  at?: number;
  prov: Record<string, number>;
}

export interface SectorQuadrant {
  name: string;
  grade: number;
  n: number;
  ci: Record<string, number>;
}

export interface Sector {
  name: string;
  class: string;
  tonnes: number;
  grade: number;
  stdev: number;
  n: number;
  ci: Record<string, number>;
  quadrants: SectorQuadrant[];
}

export interface Manifest {
  id: string;
  /** Which axis of the matrix this scenario varies. Groups the case selector. */
  category?: string;
  title: { en: string; es: string };
  summary: { en: string; es: string };
  reason: string;
  tags: string[];
  /** The assay variable table, declared by the generator that produced the loads. */
  assay_variables?: AssayVar[];
  seed: number;
  pad: { nx: number; ny: number; cell_m: number };
  material: { repose_deg: number; loose_density_t_m3: number };
  stream: {
    n_loads: number;
    loads_per_block: number;
    measured_range_t: number;
    var_in: number;
  };
  build: {
    loads_placed: number;
    refusal_rate: number;
    profiles: Record<string, number>;
    dozer_passes: number;
    mean_displacement_m: number;
    peak_m: number;
    volume_m3: number;
  };
  /** `mode` is absent on a sequential campaign and 'concurrent' where the loader works the pile
   *  while trucks are still tipping into it. It changes how the timeline is assembled, not just how
   *  it is described: see `timelineLength`. */
  reclaim: { n_cuts: number; tonnes: number; mode?: 'after' | 'concurrent' };
  gate: {
    pairs_over_repose: number;
    worst_local_slope_deg: number;
    ledger_agrees_with_terrain: boolean;
    loads_offered: number;
    loads_placed: number;
    refusal_rate: number;
    mass_residual_rel: number;
    kill_criterion: { en: string; es: string };
  };
}

export interface Scenario {
  manifest: Manifest;
  frames: Frames | null;
  plan: Plan;
  loads: Load[];
  field: Field;
  cuts: Cut[];
  sectors: { areas: Sector[] };
  volume: Volume | null;
}

export interface TopographyRow {
  fill: string;
  relief_m: number;
  max_slope_deg: number;
  buildable_fraction: number;
}

export interface Index {
  scenarios: Pick<Manifest, 'id' | 'category' | 'title' | 'summary' | 'tags' | 'build' | 'gate'>[];
  topography: TopographyRow[];
}

const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** Cache-bust every fetch with the app version.
 *
 *  GitHub Pages caches aggressively at the CDN, and a stale data file against a fresh bundle is the
 *  failure mode that looks like a rendering bug and is not one. */
const V = (import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? 'dev';

/** Statuses worth trying again. A 503 from a static host is the CDN, not the artifact. */
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);

async function get<T>(path: string, attempt = 0): Promise<T> {
  // RETRY THE TRANSIENT ONES. A scenario is seven files and a reader switching cases asks for seven
  // more; a static host will occasionally answer one of them with a 503, and the page was turning
  // that into "Could not load the scenario data" and showing nothing. Observed live. The artifact is
  // fine and the next request proves it, so the loader asks again with a short backoff rather than
  // failing a whole page over one blip.
  let res: Response;
  try {
    res = await fetch(`${base}data/${path}?v=${V}`);
  } catch (e) {
    if (attempt >= 3) throw e;
    await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    return get<T>(path, attempt + 1);
  }
  if (!res.ok) {
    if (TRANSIENT.has(res.status) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      return get<T>(path, attempt + 1);
    }
    throw new Error(`could not load ${path}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function loadIndex(): Promise<Index> {
  return get<Index>('index.json');
}

export async function loadScenario(id: string): Promise<Scenario> {
  const [manifest, plan, loads, field, cuts, sectors, frames, volume] = await Promise.all([
    get<Manifest>(`${id}/manifest.json`),
    get<Plan>(`${id}/plan.json`),
    get<Load[]>(`${id}/loads.json`),
    get<Field>(`${id}/field.json`),
    get<Cut[]>(`${id}/cuts.json`),
    get<{ areas: Sector[] }>(`${id}/sectors.json`),
    // Frames are the only optional artifact: a scenario baked before they existed still loads, it
    // just cannot be played. Failing the whole page over a missing animation would be the wrong
    // trade.
    get<Frames>(`${id}/frames.json`).catch(() => null),
    get<Volume>(`${id}/volume.json`).catch(() => null),
  ]);
  return { manifest, plan, loads, field, cuts, sectors, frames, volume };
}

/* ------------------------------------------------------------------------------------------- */
/* The verdicts. Computed here, from the events, never read from the artifact.                   */
/* ------------------------------------------------------------------------------------------- */

export function weightedMean(values: number[], weights: number[]): number {
  const w = weights.reduce((a, b) => a + b, 0);
  if (w <= 0) return 0;
  return values.reduce((a, v, i) => a + v * weights[i], 0) / w;
}

export function weightedVariance(values: number[], weights: number[]): number {
  const w = weights.reduce((a, b) => a + b, 0);
  if (w <= 0) return 0;
  const m = weightedMean(values, weights);
  return values.reduce((a, v, i) => a + weights[i] * (v - m) ** 2, 0) / w;
}

export interface Verdict {
  varIn: number;
  varOut: number;
  /** var_out / var_in. Lower is better, and one means the pile did nothing. */
  vrr: number;
  /** The 1/N bound for N independent layers. The honest comparison, because the ideal is typically
   *  three to four times better than any real bed achieves. */
  ideal: number;
  efficiency: number;
  /** Whether the efficiency can be believed.
   *
   *  An efficiency above one says the achieved reduction beat the independent-source bound, which is
   *  arithmetically impossible for genuinely independent sources. It therefore does not mean the pile
   *  is miraculous; it means N is being underestimated. Measured on two of the three scenarios the
   *  ratio comes out at 5 to 44 times the bound, so the source count taken from cut provenance is
   *  clearly not capturing how many independent grades a cut actually averages. Until that is
   *  root-caused the number is withheld rather than displayed, because a headline of "4387 percent of
   *  ideal" is worse than no headline at all. */
  boundReliable: boolean;
  nLayers: number;
  tonnesIn: number;
  tonnesOut: number;
  meanGradeIn: number;
  meanGradeOut: number;
}

/**
 * Recompute the blending verdict from the load log and the reclaim cuts.
 *
 * `nLayers` is estimated from the build itself rather than assumed: it is the mean number of distinct
 * dig blocks a cut drew from, which is exactly what the 1/N bound is about. Taking it from a
 * configured "number of passes" would let the bound be set rather than measured.
 */
/*
 * THE EFFECTIVE NUMBER OF INDEPENDENT SOURCES per cut, not the raw count of them, is what makes the
 * 1/N bound honest. A cut drawing 95 percent of its tonnage from one dig block and traces of four
 * others is averaging one source, not five, and counting keys would say five. The inverse
 * participation ratio, 1 / sum of squared fractions, is the standard effective-sample-size measure
 * and gives one for a pure cut and n for an evenly mixed one. It lives in `verdictAt`, which this
 * calls at the neutral knob setting so there is exactly one implementation of the arithmetic.
 *
 * The efficiency is NOT capped. Above one it says the achieved reduction beat the bound, which is
 * arithmetically impossible for genuinely independent sources and therefore says the source count is
 * being underestimated rather than that the pile is miraculous. Clamping it to 100 percent would
 * hide exactly that diagnostic, which is why it is withheld instead.
 */
export function verdict(sc: Scenario): Verdict {
  return verdictAt(sc, KNOBS);
}

/* ------------------------------------------------------------------------------------------- */
/* THE KNOBS. Continuous parameters that recompute the verdict IN THE BROWSER, from the events.  */
/* ------------------------------------------------------------------------------------------- */
/*
 * WHY THESE THREE AND NOT SLIDERS OVER THE PHYSICS. ADR-0017 section 3.2 wants continuous knobs over
 * the domain's real quantities driving a live recompute, and ADR-0070 clause 6 forbids presenting a
 * parameter as live when it cannot respond. Repose angle, bench height, truck limit and dozer cadence
 * all change WHAT IS BUILT: they route every load again and relax the whole field after every
 * operation, which is tens of seconds of Python. They stay readouts, honestly labelled as such.
 *
 * What IS live is everything downstream of the built pile, and it is not a consolation prize: the
 * three knobs below are the decisions a plant actually makes about a stockpile it did not build.
 * How many cuts the surge capacity averages before the mill sees them. How large a share of a cut a
 * dig block needs before it counts as an independent source. What cutoff the ore stream is screened
 * at. Each is a real operating choice, each moves the headline number, and each is recomputed here
 * from the cut ledger rather than looked up.
 */

/** The default knob positions: the values the verdict is quoted at when nobody has touched anything. */
export const KNOBS = {
  /** One cut at a time: no downstream surge averaging. */
  batch: 1,
  /** Count every dig block that appears in a cut, however small its share. */
  threshold: 0,
  /** No screening: every reclaimed tonne is ore. */
  cutoff: 0,
} as const;

export interface Knobs {
  /** How many consecutive reclaim cuts the downstream surge capacity averages before the mill. */
  batch: number;
  /** Minimum tonnage share for a dig block to count as an independent source in the 1/N bound. */
  threshold: number;
  /** Grade below which a cut is waste rather than ore, in the same units as the cut grade. */
  cutoff: number;
}

/** Average consecutive cuts in groups of `batch`, tonnage-weighted, as a surge bin does. */
export function batchCuts(cuts: Cut[], batch: number): { t: number; grade: number }[] {
  const k = Math.max(1, Math.round(batch));
  if (k === 1) return cuts.map((c) => ({ t: c.t, grade: c.grade }));
  const out: { t: number; grade: number }[] = [];
  for (let i = 0; i < cuts.length; i += k) {
    const g = cuts.slice(i, i + k);
    const t = g.reduce((a, c) => a + c.t, 0);
    out.push({ t, grade: t > 0 ? g.reduce((a, c) => a + c.grade * c.t, 0) / t : 0 });
  }
  return out;
}

/**
 * The verdict at a given knob setting. `verdict(sc)` is this at the defaults.
 *
 * The 1/N bound moves with BOTH knobs and that is the physics, not a convenience: averaging k cuts
 * multiplies the effective source count by k, and dropping trace provenance below a threshold cuts
 * it. A reader who slides the batch up and watches the measured reduction fall faster than the bound
 * is watching the pile's own mixing lose its advantage to the surge bin, which is the argument the
 * product exists to make.
 */
export function verdictAt(sc: Scenario, knobs: Knobs): Verdict {
  const placed = sc.loads.filter((l) => l.placed);
  const gIn = placed.map((l) => l.grade);
  const wIn = placed.map(() => 1);
  const varIn = weightedVariance(gIn, wIn);

  // The cutoff screens the stream BEFORE the surge bin, because that is where a screen sits.
  const kept = knobs.cutoff > 0 ? sc.cuts.filter((c) => c.grade >= knobs.cutoff) : sc.cuts;
  const batched = batchCuts(kept, knobs.batch);
  const gOut = batched.map((c) => c.grade);
  const wOut = batched.map((c) => c.t);
  const varOut = weightedVariance(gOut, wOut);

  // Effective independent sources per cut, with shares below the threshold discarded as trace and
  // the survivors renormalised: a cut is not made more diverse by a dig block that contributed a
  // hundredth of it. Averaging k cuts then multiplies the count, since the batches are disjoint.
  const eff = kept.map((c) => {
    let f = Object.values(c.prov).filter((x) => x >= knobs.threshold);
    const s = f.reduce((a, x) => a + x, 0);
    if (s <= 0) f = Object.values(c.prov);
    const tot = f.reduce((a, x) => a + x, 0) || 1;
    const ss = f.reduce((a, x) => a + (x / tot) ** 2, 0);
    return ss > 0 ? 1 / ss : 1;
  });
  const perCut = eff.length ? eff.reduce((a, b) => a + b, 0) / eff.length : 1;
  const nLayers = perCut * Math.max(1, Math.round(knobs.batch));

  const vrr = varIn > 0 ? varOut / varIn : 0;
  const ideal = nLayers > 0 ? 1 / nLayers : 1;
  return {
    varIn,
    varOut,
    vrr,
    ideal,
    efficiency: vrr > 0 ? ideal / vrr : 1,
    boundReliable: vrr > 0 ? ideal / vrr <= 1.05 : false,
    nLayers,
    tonnesIn: placed.length * 231,
    tonnesOut: wOut.reduce((a, b) => a + b, 0),
    meanGradeIn: weightedMean(gIn, wIn),
    meanGradeOut: weightedMean(gOut, wOut),
  };
}

export interface GradeTonnage {
  /** Tonnes at or above the cutoff. */
  ore: number;
  /** Tonnes below it. */
  waste: number;
  /** Tonnage-weighted grade of the ore stream. */
  oreGrade: number;
  /** Grade of what the cutoff threw away, which is the number that says whether it was too high. */
  wasteGrade: number;
  /** Contained metal in the ore stream, in grade-tonnes. */
  metal: number;
  /** Contained metal lost to the waste stream. */
  metalLost: number;
  /** Share of the reclaimed metal that survives the screen. */
  recovery: number;
  /** The whole curve, for plotting: cutoff against ore tonnes and ore grade. */
  curve: { cutoff: number; ore: number; grade: number }[];
}

/** A grade-tonnage curve over the reclaim cuts, and the point the cutoff knob is standing on. */
export function gradeTonnage(sc: Scenario, cutoff: number): GradeTonnage {
  const cuts = sc.cuts;
  let ore = 0;
  let waste = 0;
  let metal = 0;
  let metalLost = 0;
  for (const c of cuts) {
    if (c.grade >= cutoff) {
      ore += c.t;
      metal += c.grade * c.t;
    } else {
      waste += c.t;
      metalLost += c.grade * c.t;
    }
  }
  const grades = cuts.map((c) => c.grade);
  const lo = grades.length ? Math.min(...grades) : 0;
  const hi = grades.length ? Math.max(...grades) : 1;
  const curve: { cutoff: number; ore: number; grade: number }[] = [];
  const STEPS = 40;
  for (let i = 0; i <= STEPS; i += 1) {
    const x = lo + ((hi - lo) * i) / STEPS;
    let t = 0;
    let m = 0;
    for (const c of cuts) {
      if (c.grade >= x) {
        t += c.t;
        m += c.grade * c.t;
      }
    }
    curve.push({ cutoff: x, ore: t, grade: t > 0 ? m / t : 0 });
  }
  return {
    ore,
    waste,
    oreGrade: ore > 0 ? metal / ore : 0,
    wasteGrade: waste > 0 ? metalLost / waste : 0,
    metal,
    metalLost,
    recovery: metal + metalLost > 0 ? metal / (metal + metalLost) : 1,
    curve,
  };
}

/** The grade range of the reclaim cuts, which is the domain the cutoff knob is allowed to move in. */
export function cutGradeRange(sc: Scenario): [number, number] {
  const g = sc.cuts.map((c) => c.grade);
  if (!g.length) return [0, 1];
  return [Math.min(...g), Math.max(...g)];
}

/** Experimental semivariogram of a series against a cumulative coordinate. */
export function variogram(
  values: number[],
  coord: number[],
  nLags = 20,
): { centres: number[]; gamma: number[]; counts: number[] } {
  const n = values.length;
  const centres: number[] = [];
  const gamma: number[] = [];
  const counts: number[] = [];
  if (n < 4) return { centres, gamma, counts };
  const span = coord[n - 1] - coord[0];
  const width = span / nLags;
  const sum = new Array(nLags).fill(0);
  const cnt = new Array(nLags).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const h = coord[j] - coord[i];
      const k = Math.floor(h / width);
      if (k < 0 || k >= nLags) continue;
      sum[k] += (values[i] - values[j]) ** 2;
      cnt[k] += 1;
    }
  }
  for (let k = 0; k < nLags; k++) {
    centres.push((k + 0.5) * width);
    gamma.push(cnt[k] ? sum[k] / (2 * cnt[k]) : 0);
    counts.push(cnt[k]);
  }
  return { centres, gamma, counts };
}

export interface SegSummary {
  nSorted: number;
  meanIntensity: number;
  maxIntensity: number;
  meanDrop: number;
  maxDrop: number;
  meanOverrun: number;
  coarseMin: number;
  coarseMax: number;
}

/**
 * How much the pile sorted itself, summarised from the load log and the coarse field.
 *
 * A spread of zero in the coarse field would mean the sorting never reached the ledger, so this
 * number is a check as much as a readout.
 */
export function segregationSummary(sc: Scenario): SegSummary {
  const sorted = sc.loads.filter((l) => l.placed && (l.seg ?? 0) > 0);
  const coarse = sc.field.coarse.filter((v): v is number => v !== null);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    nSorted: sorted.length,
    meanIntensity: mean(sorted.map((l) => l.seg ?? 0)),
    maxIntensity: sorted.length ? Math.max(...sorted.map((l) => l.seg ?? 0)) : 0,
    meanDrop: mean(sorted.map((l) => l.drop ?? 0)),
    maxDrop: sorted.length ? Math.max(...sorted.map((l) => l.drop ?? 0)) : 0,
    meanOverrun: mean(sorted.map((l) => l.overrun ?? 0)),
    coarseMin: coarse.length ? Math.min(...coarse) : 0,
    coarseMax: coarse.length ? Math.max(...coarse) : 0,
  };
}

/** Loads grouped by the dump profile they formed, for the measured-envelope comparison. */
export function profileStats(sc: Scenario): {
  profile: string;
  n: number;
  len: number;
  wid: number;
  thick: number;
}[] {
  const by = new Map<string, Load[]>();
  for (const l of sc.loads) {
    if (!l.placed || !l.profile) continue;
    const k = l.profile;
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(l);
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return [...by.entries()]
    .map(([profile, ls]) => ({
      profile,
      n: ls.length,
      len: mean(ls.map((l) => l.len ?? 0)),
      wid: mean(ls.map((l) => l.wid ?? 0)),
      thick: mean(ls.map((l) => l.thick ?? 0)),
    }))
    .sort((a, b) => b.n - a.n);
}

/** The measured envelope from 28 UAV-surveyed dumps, for the app to compare itself against. */
export const MEASURED = {
  length: [13, 46] as const,
  width: [11, 23] as const,
  thickness: [0.368, 2.032] as const,
  angle: [12, 36] as const,
  volume: [94, 155] as const,
  source: 'Young & Rogers, Mining 2022, 2(1), 86-102, table 5 (28 dumps, UAV photogrammetry)',
  doi: '10.3390/mining2010006',
};

/** Material thickness above ORIGINAL ground, which is not the same as surface elevation. */
export function thickness(f: Field): number[] {
  return f.z.map((v, i) => v - f.z0[i]);
}

export function extent(f: Field): { w: number; h: number } {
  return { w: f.nx * f.cell_m, h: f.ny * f.cell_m };
}


/** Where the truck is, and what the ground looks like, at a fractional position through the build.
 *
 * A LOAD IS AN EVENT WITH A DURATION, not an instant. Given `pos = 12.4` this returns the state 40
 * percent of the way through load 12: the truck part-way along its approach, and the surface still
 * the one it is driving onto. The three phases are drive in, tip, drive out, and the material
 * appears at the tip rather than fading in, because that is what tipping is.
 */
export interface PlayState {
  /** Sequence number of the load being worked. */
  seq: number;
  /** Surface to draw. */
  z: number[] | null;
  /** Truck position and heading in pad metres, or null before the first load. */
  truck: { x: number; y: number; heading: number } | null;
  /** The part of the route already driven, for drawing the trail behind the truck. */
  trail: [number, number][];
  /** The part still to drive. */
  ahead: [number, number][];
  /** Which of the three phases we are in. */
  phase: 'approach' | 'tip' | 'departure';
  /** Which machine is on the stage. A haul truck delivering, or a loader taking material away. */
  job: 'haul' | 'reclaim';
  /** On a reclaim step, the cut being taken. */
  cut?: Cut | null;
  /** How far through the current phase, 0 to 1. Lets the scene animate WITHIN a phase. */
  sub: number;
  /** The direction the load runs out, from the engine: the outward normal of the crest at the spot. */
  dumpHeading: number | null;
}

const APPROACH_FRAC = 0.45;
const TIP_FRAC = 0.15;

/** Walk a polyline to a fraction of its length, returning the point, heading, and the split. */
function walk(
  path: [number, number][],
  f: number,
): { x: number; y: number; heading: number; done: [number, number][]; left: [number, number][] } | null {
  if (path.length < 2) return null;
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total <= 0) return null;
  let want = Math.min(Math.max(f, 0), 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) {
      const u = segs[i] > 0 ? Math.min(want / segs[i], 1) : 1;
      const a = path[i];
      const b = path[i + 1];
      const x = a[0] + (b[0] - a[0]) * u;
      const y = a[1] + (b[1] - a[1]) * u;
      return {
        x,
        y,
        heading: Math.atan2(b[1] - a[1], b[0] - a[0]),
        done: [...path.slice(0, i + 1), [x, y]],
        left: [[x, y], ...path.slice(i + 1)],
      };
    }
    want -= segs[i];
  }
  return null;
}

/** The signed angle from `a` to `b`, taking the short way round, so a turn never spins the long way. */
function shortestTurn(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** True when the loader works the pile while trucks are still tipping into it. */
export function isConcurrent(sc: Scenario | null): boolean {
  return sc?.manifest.reclaim.mode === 'concurrent';
}

/**
 * How many steps the whole timeline has.
 *
 * TWO SHAPES, BECAUSE THERE ARE TWO OPERATIONS. On a SEQUENTIAL campaign the pile is filled and then
 * taken down, so the timeline is every placed load followed by every reclaim cut, and the reclaim
 * surfaces are a second chain that starts from the finished pile.
 *
 * On a CONCURRENT campaign the cuts happen DURING the build, and the build chain already contains
 * them: measured on the shipped artifact, 32 of the 744 build frames of `concurrent` and 50 of
 * `surge` DECREASE in volume, which is the loader biting into a pile the trucks are still feeding.
 * Appending the reclaim chain on top of that plays the whole build, then rewinds to a nearly empty
 * pile and grows it again, because the reclaim chain is a parallel recording of the same terrain
 * rather than a continuation of it. So on a concurrent campaign the timeline is the build alone, and
 * the cuts are drawn where they actually happened.
 */
export function timelineLength(sc: Scenario | null): number {
  const f = sc?.frames;
  if (!f) return 0;
  if (isConcurrent(sc)) return f.frames.length;
  return f.frames.length + (f.reclaim?.length ?? 0);
}

/**
 * Which cut, if any, is being taken at this point in the build.
 *
 * A cut records the load index it was taken at, so a concurrent campaign can put the loader on the
 * stage at the moment it worked rather than after everything else had finished. The cut is shown for
 * a short window around its own load so the machine is legible at playback speed instead of flashing
 * for a single frame.
 */
const CUT_WINDOW = 2;

function cutAt(sc: Scenario, seq: number): { cut: Cut; k: number } | null {
  for (let k = 0; k < sc.cuts.length; k += 1) {
    const at = sc.cuts[k].at;
    if (typeof at === 'number' && seq >= at && seq < at + CUT_WINDOW) return { cut: sc.cuts[k], k };
  }
  return null;
}

export function playState(sc: Scenario, pos: number): PlayState | null {
  const f = sc.frames;
  if (!f || !f.frames.length) return null;

  // THE TIMELINE RUNS PAST THE END OF THE BUILD, on a sequential campaign. Everything after the last
  // load is the reclaim campaign: an orange loader working the face, taking the pile back down cut
  // by cut. It is the second half of what a stockpile does and it was not on the timeline at all.
  // On a concurrent campaign there is no "after": see `timelineLength`.
  const nBuild = f.frames.length;
  if (!isConcurrent(sc) && f.reclaim?.length && pos >= nBuild) {
    const k = Math.min(Math.floor(pos - nBuild), f.reclaim.length - 1);
    const c = sc.cuts[k] ?? null;
    const z = expandReclaim(f, k);
    const here = c && typeof c.x === 'number' && typeof c.y === 'number'
      ? { x: c.x, y: c.y, heading: 0 }
      : null;
    return {
      seq: -1 - k,
      z,
      truck: here,
      trail: [],
      ahead: [],
      phase: 'tip',
      sub: pos - nBuild - k,
      dumpHeading: null,
      job: 'reclaim',
      cut: c,
    };
  }
  const i = Math.min(Math.max(Math.floor(pos), 0), f.frames.length - 1);
  const frac = Math.min(Math.max(pos - i, 0), 1);
  const cur = f.frames[i];
  const load = sc.loads.find((l) => l.seq === cur.seq) ?? null;

  // The surface BEFORE this load is the previous frame; the surface after is this one. Material
  // appears when the tray goes up, not gradually while the truck is still driving.
  const before = i > 0 ? expandFrame(f, i - 1) : expandFrame(f, 0);
  const after = expandFrame(f, i);

  let phase: PlayState['phase'] = 'approach';
  let sub = 0;
  if (frac < APPROACH_FRAC) {
    phase = 'approach';
    sub = frac / APPROACH_FRAC;
  } else if (frac < APPROACH_FRAC + TIP_FRAC) {
    phase = 'tip';
    sub = (frac - APPROACH_FRAC) / TIP_FRAC;
  } else {
    phase = 'departure';
    sub = (frac - APPROACH_FRAC - TIP_FRAC) / (1 - APPROACH_FRAC - TIP_FRAC);
  }

  const path = phase === 'departure' ? (load?.departure ?? []) : (load?.approach ?? []);
  const w = walk(path as [number, number][], phase === 'tip' ? 1 : sub);

  // THE TRUCK TURNS BEFORE IT TIPS, because that is what a haul truck does: it reverses to the tip
  // head so the tray discharges over its REAR. The engine already places the material behind the
  // truck, 0.66 of a body length back, and records the direction it runs out as the outward normal
  // of the crest. The scene was orienting the truck by its direction of travel right through the
  // tip, which put the load off the nose. It now swings to face AWAY from the run-out over the last
  // stretch of the approach, holds there while the tray is up, and swings back to travel on the way
  // out.
  const dumpHeading = typeof load?.head === 'number' ? load.head : null;
  const TURN_STARTS_AT = 0.7;
  let heading = w ? w.heading : (dumpHeading ?? 0);
  if (dumpHeading !== null) {
    const backedIn = dumpHeading + Math.PI;   // nose away from the dump, tray over it
    if (phase === 'tip') {
      heading = backedIn;
    } else if (phase === 'approach' && sub > TURN_STARTS_AT) {
      const k = (sub - TURN_STARTS_AT) / (1 - TURN_STARTS_AT);
      heading = heading + shortestTurn(heading, backedIn) * k;
    } else if (phase === 'departure' && sub < 1 - TURN_STARTS_AT) {
      const k = sub / (1 - TURN_STARTS_AT);
      heading = backedIn + shortestTurn(backedIn, heading) * k;
    }
  }

  // THE LOADER IS ON THE STAGE WHILE THE TRUCKS ARE STILL TIPPING. On a concurrent campaign a cut
  // happens at a known load, so at that moment the machine to draw is the orange loader taking
  // material off, not the yellow haul truck putting it on. Two machines cannot share one PlayState,
  // and drawing the truck would be the wrong claim about what is happening, so for the short window
  // of a cut the stage shows the loader. The surface needs no special handling: the build chain
  // already carries the bite.
  const active = isConcurrent(sc) ? cutAt(sc, cur.seq) : null;
  if (active) {
    const c = active.cut;
    return {
      seq: cur.seq,
      z: after,
      truck:
        typeof c.x === 'number' && typeof c.y === 'number' ? { x: c.x, y: c.y, heading: 0 } : null,
      trail: [],
      ahead: [],
      phase: 'tip',
      sub: frac,
      dumpHeading: null,
      job: 'reclaim',
      cut: c,
    };
  }

  return {
    seq: cur.seq,
    z: phase === 'approach' ? before : after,
    truck: w
      ? { x: w.x, y: w.y, heading }
      : load && load.x !== undefined && load.y !== undefined
        ? { x: load.x, y: load.y, heading }
        : null,
    trail: w ? w.done : [],
    ahead: w ? w.left : [],
    phase,
    sub,
    dumpHeading,
    job: 'haul',
  };
}

/** Expand one playback frame back onto the full terrain grid.
 *
 * Frames are stored at half resolution because a hundred and forty of them at full resolution is
 * megabytes for something that is watched rather than measured. THE EXPANSION IS NOT OPTIONAL: the
 * renderer indexes the surface as `z[j * nx + i]`, so a half-length array does not merely look
 * coarse, it reads the wrong cells entirely. An earlier version guarded with a length check and fell
 * back to the finished pile, which meant the player appeared to work while showing the same surface
 * for every frame.
 *
 * Bilinear, not nearest: over a two-cell stride nearest gives a blocky staircase that reads as a
 * rendering fault. It rounds the crest by a fraction of a cell while playing; the final state is
 * drawn from the real field, so nothing measured is affected.
 */
/** The coarse surface at `index`, accumulating deltas from the last complete frame. Cached, because
 *  playing forward would otherwise replay the whole history on every tick. */
const COARSE = new WeakMap<Frames, { at: number; z: number[] }>();

function coarseAt(f: Frames, index: number): number[] | null {
  const first = f.frames[0];
  if (!first?.z) return null;
  const cache = COARSE.get(f);
  let at: number;
  let z: number[];
  if (cache && cache.at <= index) {
    at = cache.at;
    z = cache.z;
  } else {
    at = 0;
    z = first.z.slice();
  }
  for (let k = at + 1; k <= index; k++) {
    const fr = f.frames[k];
    if (!fr) break;
    if (fr.z) {
      z = fr.z.slice();
    } else if (fr.d) {
      for (let i = 0; i + 1 < fr.d.length; i += 2) z[fr.d[i]] = fr.d[i + 1];
    }
  }
  COARSE.set(f, { at: index, z });
  return z;
}

export function expandFrame(f: Frames, index: number): number[] | null {
  const fr = f.frames[index];
  if (!fr) return null;
  const coarse = coarseAt(f, index);
  if (!coarse) return null;
  const step = f.step ?? 1;
  if (step === 1) return coarse.slice();

  const { nx, ny } = f;
  const hnx = Math.ceil(nx / step);
  const hny = Math.ceil(ny / step);
  if (coarse.length !== hnx * hny) return null;

  const out = new Array<number>(nx * ny);
  for (let j = 0; j < ny; j++) {
    const v = j / step;
    const j0 = Math.min(Math.floor(v), hny - 1);
    const j1 = Math.min(j0 + 1, hny - 1);
    const tj = v - j0;
    for (let i = 0; i < nx; i++) {
      const u = i / step;
      const i0 = Math.min(Math.floor(u), hnx - 1);
      const i1 = Math.min(i0 + 1, hnx - 1);
      const ti = u - i0;
      const a = coarse[j0 * hnx + i0];
      const b = coarse[j0 * hnx + i1];
      const c = coarse[j1 * hnx + i0];
      const d = coarse[j1 * hnx + i1];
      out[j * nx + i] = (a + (b - a) * ti) * (1 - tj) + (c + (d - c) * ti) * tj;
    }
  }
  return out;
}


/** Assay value for one deposition event, or null if the event is not in the log.
 *
 *  The volume stores an event per voxel and the assay lives on the load. Joining them here rather
 *  than baking the assay into every voxel is what keeps the artifact at a hundred kilobytes instead
 *  of tens of megabytes, and it means a new variable never requires a re-bake of the geometry.
 */
export function assayIndex(loads: Load[]): Map<number, Load> {
  const m = new Map<number, Load>();
  for (const l of loads) if (l.placed) m.set(l.seq, l);
  return m;
}

/** Elevation of the centre of voxel `k`, in pad metres. */
export function voxelZ(vol: Volume, k: number): number {
  return vol.base_m + (k + 0.5) * vol.dz_m;
}


/** A per-cell surface value for any assay variable, taken from the topmost voxel in each column.
 *
 *  WHY THIS EXISTS. The field carries a grade and a coarse fraction per column and nothing else, so
 *  the site view could colour the pile by copper and by size and by thickness, and by nothing else.
 *  The assay lives on the LOAD, and the volume says which load is on top of each column, so the two
 *  join into a surface for any of the nine variables. What the reader sees is the material actually
 *  exposed at the surface, which is also what a grade-control sample of the pile would hit.
 */
export function surfaceValues(sc: Scenario, key: string): (number | null)[] | null {
  const vol = sc.volume;
  if (!vol) return null;
  const by = assayIndex(sc.loads);
  const out: (number | null)[] = new Array(vol.nx * vol.ny).fill(null);
  for (let c = 0; c < out.length; c++) {
    const col = vol.columns[c];
    if (!col) continue;
    const ev = col[1][col[1].length - 1];
    const l = by.get(ev) as (Load & Record<string, number | undefined>) | undefined;
    const v = l ? l[key] : undefined;
    out[c] = typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  return out;
}


/** The surface after reclaim cut `k`, accumulated from the last build frame through the cut deltas. */
const RECLAIM_CACHE = new WeakMap<Frames, { at: number; z: number[] }>();

function expandReclaim(f: Frames, k: number): number[] | null {
  const list = f.reclaim;
  if (!list?.length) return null;
  const cache = RECLAIM_CACHE.get(f);
  let at: number;
  let z: number[];
  if (cache && cache.at <= k) {
    at = cache.at;
    z = cache.z;
  } else {
    const first = list[0];
    if (!first?.z) return null;
    at = 0;
    z = first.z.slice();
  }
  for (let i = at + 1; i <= k; i++) {
    const fr = list[i];
    if (!fr) break;
    if (fr.z) z = fr.z.slice();
    else if (fr.d) for (let j = 0; j + 1 < fr.d.length; j += 2) z[fr.d[j]] = fr.d[j + 1];
  }
  RECLAIM_CACHE.set(f, { at: k, z });
  return upsample(f, z);
}

/** Bilinear expansion of a coarse surface onto the full grid. Shared by both timelines. */
function upsample(f: Frames, coarse: number[]): number[] | null {
  const step = f.step ?? 1;
  if (step === 1) return coarse.slice();
  const { nx, ny } = f;
  const hnx = Math.ceil(nx / step);
  const hny = Math.ceil(ny / step);
  if (coarse.length !== hnx * hny) return null;
  const out = new Array<number>(nx * ny);
  for (let j = 0; j < ny; j++) {
    const v = j / step;
    const j0 = Math.min(Math.floor(v), hny - 1);
    const j1 = Math.min(j0 + 1, hny - 1);
    const tj = v - j0;
    for (let i = 0; i < nx; i++) {
      const u = i / step;
      const i0 = Math.min(Math.floor(u), hnx - 1);
      const i1 = Math.min(i0 + 1, hnx - 1);
      const ti = u - i0;
      const a = coarse[j0 * hnx + i0];
      const b = coarse[j0 * hnx + i1];
      const c = coarse[j1 * hnx + i0];
      const d = coarse[j1 * hnx + i1];
      out[j * nx + i] = (a + (b - a) * ti) * (1 - tj) + (c + (d - c) * ti) * tj;
    }
  }
  return out;
}
