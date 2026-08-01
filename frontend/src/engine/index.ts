// The live lane's public surface: everything a page or a view is allowed to reach for.
//
// The engine is a pure, seeded, side-effect-free library. It touches no DOM, no fetch and no clock
// beyond the one timing call in `simulate`, which is what lets it be tested in node and mirrored
// against the offline lane.

export * from './types';
export * from './cases.generated';
export { cascade, criticalDrop, maxSlopeExcess, neighbourTable } from './heightfield';
export { FlowingLayer, segregationNumber, NZ_DEFAULT } from './segregation';
export { Pile, RECLAIM_GEOMETRY } from './pile';
export { dumpPosition, layersPerCut, STACKING_LABELS } from './stacking';
export * from './blending';
export * from './rtd';
export { generateStream, cumulativeTonnes, Gauss, STRUCTURE_LABELS } from './stream';
export type { StreamOptions } from './stream';
export {
  simulate, measure, inputVariogram, outputVariogram, residenceTime, blendingRegime, N_SNAPSHOTS,
} from './run';
export type { Snapshot } from './run';

import type { CaseDef } from './cases.generated';
import { generateStream } from './stream';
import type { RunConfig, TruckDump } from './types';

/** Build the run configuration for a case, with optional live overrides from the App controls. */
export function configFor(c: CaseDef, seed: number, over: Partial<RunConfig> = {}): RunConfig {
  return {
    caseId: c.id,
    pad: {
      nx: c.nx, ny: c.ny, cellM: c.cellM,
      reposeDeg: c.reposeDeg, reposeCoarseDeg: c.reposeCoarseDeg, bulkDensityTpm3: 1.9,
      ...(over.pad ?? {}),
    },
    stacking: over.stacking ?? c.stacking,
    reclaim: over.reclaim ?? c.reclaim,
    nPasses: over.nPasses ?? c.nPasses,
    sr: over.sr ?? c.sr,
    reclaimRate: over.reclaimRate ?? c.reclaimRate,
    startFraction: over.startFraction ?? c.startFraction,
    cutTonnes: over.cutTonnes ?? c.cutTonnes,
    seed,
  };
}

/** The incoming stream for a case, with optional live overrides. */
export function dumpsFor(
  c: CaseDef, seed: number, over: { structure?: CaseDef['structure']; rangeT?: number; nDumps?: number } = {},
): TruckDump[] {
  return generateStream({
    nDumps: over.nDumps ?? c.nDumps,
    seed,
    structure: over.structure ?? c.structure,
    rangeT: over.rangeT ?? c.rangeT,
    coarseSd: c.coarseSd,
  });
}
