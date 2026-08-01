// The live lane's types, mirroring data-pipeline/stlab/io/schema.py field for field.
//
// The two implementations are deliberately kept readable side by side rather than generated from one
// another. A generator would hide the one thing that matters here, which is whether the browser and
// the pipeline actually compute the same numbers, and that is asserted by a cross-lane test against a
// committed trace rather than by a build step.

export interface PadSpec {
  nx: number;
  ny: number;
  cellM: number;
  reposeDeg: number;
  reposeCoarseDeg: number;
  bulkDensityTpm3: number;
}

export interface TruckDump {
  eventId: number;
  tS: number;
  truckId: string;
  sourceId: string;
  tonnes: number;
  gradeCuPct: number;
  gradeAuGpt: number;
  coarseFrac: number;
  moisturePct: number;
  xM: number;
  yM: number;
}

export interface Lot {
  eventId: number;
  tonnes: number;
  gradeCuPct: number;
  gradeAuGpt: number;
  coarseFrac: number;
  tS: number;
}

export interface ReclaimCut {
  cutId: number;
  tS: number;
  tonnes: number;
  gradeCuPct: number;
  gradeAuGpt: number;
  coarseFrac: number;
  nLayers: number;
  residenceS: number;
  /** deposition event id -> fraction of THIS cut's tonnage. Sums to one; a test asserts it. */
  sources: Map<number, number>;
}

export interface BlendMetrics {
  varIn: number;
  varOut: number;
  /** var_out / var_in. LOWER IS BETTER. The formula is rendered next to every displayed value. */
  vrr: number;
  meanIn: number;
  meanOut: number;
  nLayersMean: number;
  vrrIdeal: number;
  efficiency: number;
  mixingEffect: number;
  toeApexGradeDelta: number;
  segregationIndex: number;
  massResidualT: number;
}

export interface RunConfig {
  caseId: string;
  pad: PadSpec;
  stacking: StackingMethod;
  reclaim: ReclaimMethod;
  nPasses: number;
  sr: number;
  reclaimRate: number;
  startFraction: number;
  cutTonnes: number;
  seed: number;
}

export interface RunResult {
  caseId: string;
  pad: PadSpec;
  stacking: StackingMethod;
  reclaim: ReclaimMethod;
  dumps: TruckDump[];
  cuts: ReclaimCut[];
  heightFinal: Float64Array;
  coarseFinal: Float64Array;
  gradeFinal: Float64Array;
  columnLots: Lot[][];
  metrics: BlendMetrics;
  starved: boolean;
  steepestSlopeDeg: number;
  apexHeightM: number;
  runMs: number;
}

export const STACKING_METHODS = ['chevron', 'windrow', 'coneshell', 'strata', 'chevcon'] as const;
export type StackingMethod = (typeof STACKING_METHODS)[number];

export const RECLAIM_METHODS = ['fullface', 'bucketwheel', 'end', 'loader'] as const;
export type ReclaimMethod = (typeof RECLAIM_METHODS)[number];

export const STREAM_STRUCTURES = [
  'stationary', 'short_range', 'long_range', 'trending', 'bimodal',
] as const;
export type StreamStructure = (typeof STREAM_STRUCTURES)[number];

export const DEFAULT_PAD: PadSpec = {
  nx: 64, ny: 24, cellM: 3.0, reposeDeg: 37.0, reposeCoarseDeg: 37.0, bulkDensityTpm3: 1.9,
};
