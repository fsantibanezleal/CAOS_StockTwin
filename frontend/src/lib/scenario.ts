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
export interface Frames {
  nx: number;
  ny: number;
  cell_m: number;
  z0: number[];
  frames: { placed: number; z: number[] }[];
}

export interface Cut {
  t: number;
  grade: number;
  disp: number;
  unc: number;
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
  title: { en: string; es: string };
  summary: { en: string; es: string };
  reason: string;
  tags: string[];
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
  reclaim: { n_cuts: number; tonnes: number };
  gate: {
    pairs_over_repose: number;
    worst_local_slope_deg: number;
    ledger_agrees_with_terrain: boolean;
    loads_offered: number;
    loads_placed: number;
    refusal_rate: number;
    mass_residual_rel: number;
    kill_criterion: string;
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
}

export interface TopographyRow {
  fill: string;
  relief_m: number;
  max_slope_deg: number;
  buildable_fraction: number;
}

export interface Index {
  scenarios: Pick<Manifest, 'id' | 'title' | 'summary' | 'tags' | 'build' | 'gate'>[];
  topography: TopographyRow[];
}

const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** Cache-bust every fetch with the app version.
 *
 *  GitHub Pages caches aggressively at the CDN, and a stale data file against a fresh bundle is the
 *  failure mode that looks like a rendering bug and is not one. */
const V = (import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? 'dev';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}?v=${V}`);
  if (!res.ok) throw new Error(`could not load ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadIndex(): Promise<Index> {
  return get<Index>('index.json');
}

export async function loadScenario(id: string): Promise<Scenario> {
  const [manifest, plan, loads, field, cuts, sectors, frames] = await Promise.all([
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
  ]);
  return { manifest, plan, loads, field, cuts, sectors, frames };
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
export function verdict(sc: Scenario): Verdict {
  const placed = sc.loads.filter((l) => l.placed);
  const gIn = placed.map((l) => l.grade);
  const wIn = placed.map(() => 1);
  const varIn = weightedVariance(gIn, wIn);

  const gOut = sc.cuts.map((c) => c.grade);
  const wOut = sc.cuts.map((c) => c.t);
  const varOut = weightedVariance(gOut, wOut);

  // THE EFFECTIVE NUMBER OF INDEPENDENT SOURCES per cut, not the raw count of them. A cut drawing
  // 95 percent of its tonnage from one dig block and traces of four others is averaging one source,
  // not five, and counting keys would say five. The inverse participation ratio, 1 / sum of squared
  // fractions, is the standard effective-sample-size measure and gives one for a pure cut and n for
  // an evenly mixed one.
  const eff = sc.cuts.map((c) => {
    const f = Object.values(c.prov);
    const ss = f.reduce((a, x) => a + x * x, 0);
    return ss > 0 ? 1 / ss : 1;
  });
  const nLayers = eff.length ? eff.reduce((a, b) => a + b, 0) / eff.length : 1;

  const vrr = varIn > 0 ? varOut / varIn : 0;
  const ideal = nLayers > 0 ? 1 / nLayers : 1;
  return {
    varIn,
    varOut,
    vrr,
    ideal,
    // NOT capped. An efficiency above one means the achieved reduction beat the bound, which is
    // arithmetically impossible for genuinely independent sources and therefore says the source
    // count is being underestimated rather than that the pile is miraculous. Silently clamping it to
    // 100 percent would hide exactly that diagnostic.
    efficiency: vrr > 0 ? ideal / vrr : 1,
    boundReliable: vrr > 0 ? ideal / vrr <= 1.05 : false,
    nLayers,
    tonnesIn: placed.length * 231,
    tonnesOut: wOut.reduce((a, b) => a + b, 0),
    meanGradeIn: weightedMean(gIn, wIn),
    meanGradeOut: weightedMean(gOut, wOut),
  };
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
