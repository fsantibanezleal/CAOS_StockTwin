// CONTRACT 2 mirrored in TypeScript. A drift against the Python schema fails `tsc --noEmit`, which is
// the build, so the browser can never quietly read a shape the pipeline stopped writing.
//
// Source of truth: data-pipeline/pipeline/bake.py, which writes these artifacts, and
// data-pipeline/pipeline/io/contract.py, which defines the ingestion contract.

export const TRACE_SCHEMA = 'stocktwin.trace/v1';
export const MANIFEST_SCHEMA = 'stocktwin.manifest/v1';
export const INDEX_SCHEMA = 'stocktwin.index/v1';

export interface TracePad {
  nx: number; ny: number; cell_m: number;
  repose_deg: number; repose_coarse_deg: number; bulk_density_tpm3: number;
}

export interface TraceEvent {
  id: number; t: number; t_t: number; cu: number; au: number; cf: number;
  x: number; y: number; src: string;
}

export interface TraceCut {
  id: number; t: number; t_t: number; cu: number; au: number; cf: number;
  n: number; res: number;
  /** [eventId, fraction] pairs, sorted by fraction descending. The fractions sum to one. */
  srcs: Array<[number, number]>;
}

export interface Trace {
  schema: typeof TRACE_SCHEMA;
  case_id: string;
  seed: number;
  pad: TracePad;
  config: { stacking: string; reclaim: string; n_passes: number; sr: number };
  events: TraceEvent[];
  cuts: TraceCut[];
  snapshots: Array<{ t_s: number; h: number[] }>;
  final: { h: number[]; cf: number[]; cu: number[] };
  starved: boolean;
}

export interface VariogramArtifact {
  lag_t: number[];
  gamma: number[];
  pairs: number[];
  model: { nugget: number; sill: number; range: number; rmse: number };
}

export interface InvariantCheck { worst: number; tol: number; what: string; pass: boolean }

export interface ControlVerdict {
  control: string;
  pass: boolean;
  measured: Record<string, unknown>;
  required: Record<string, unknown>;
  statement: string;
}

export interface Metrics {
  case_id: string;
  vrr: number;
  vrr_band: [number, number];
  vrr_ideal: number;
  n_layers_mean: number;
  efficiency: number;
  efficiency_band: [number, number];
  mixing_effect: number;
  var_in: number; var_out: number; mean_in: number; mean_out: number;
  toe_apex_grade_delta: number;
  segregation_index: number;
  segregation_band: [number, number];
  mass_residual_t: number;
  variogram_in: VariogramArtifact;
  variogram_out: VariogramArtifact;
  rtd: Record<string, unknown>;
  invariants: Record<string, InvariantCheck>;
  control: ControlVerdict | null;
  seeds: number;
}

export interface Manifest {
  schema: typeof MANIFEST_SCHEMA;
  case_id: string;
  category: string;
  reason: string;
  real_or_synthetic: string;
  expected_band: string;
  kill_criterion: string;
  split: string;
  engine: { package: string; version: string; model: string };
  params: Record<string, unknown>;
  seed: number;
  artifact: { path: string; format: string; trace_schema: string; bytes: number; sha256: string };
  lane: 'live' | 'precompute';
  gate: {
    lane: string; runtime: string; trace_bytes: number;
    run_ms_budget: number; frame_ms_budget: number; trace_bytes_budget: number; reasons: string[];
  };
  flags: Array<{ row: number; event_id?: number; flag: string }>;
  metrics: Record<string, number | [number, number]>;
  provenance: Record<string, string>;
  regen: string;
}

export interface ManifestIndex {
  schema: typeof INDEX_SCHEMA;
  engine_version: string;
  n_cases: number;
  cases: Array<{ case_id: string; category: string; manifest_path: string }>;
}

export interface MatrixRow {
  case_id: string; category: string;
  stacking: string; reclaim: string; structure: string;
  sr: number; n_passes: number;
  vrr: number; vrr_band: [number, number]; vrr_ideal: number; n_layers: number;
  efficiency: number; efficiency_band: [number, number]; mixing_effect: number;
  segregation_index: number; segregation_band: [number, number];
  toe_apex_grade_delta: number;
  var_in: number; var_out: number; mean_in: number; mean_out: number;
  n_cuts: number;
  rtd_character: string; rtd_position: number;
  starved: boolean; seeds: number;
}

export interface BenchmarkAssertion {
  id: string;
  pass: boolean;
  statement: string;
  measured: Record<string, number>;
}

export interface Matrix {
  rows: MatrixRow[];
  assertions: BenchmarkAssertion[];
  anchors: Array<{ what: string; vrr: number; source: string }>;
}
