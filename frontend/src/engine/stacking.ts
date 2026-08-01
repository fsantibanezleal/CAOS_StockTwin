// Method 2, the five industrial stacking geometries as deposition paths.
// Mirrors data-pipeline/stlab/model/stacking.py.
//
// DEFINITIONS, cross-checked against sources rather than paraphrased.
//
// * Chevron: the stacker travels the full length along the centre line, back and forth, laying
//   gable-section layers on top of one another (Schramm, AT MINERALS PROCESSING 06/2021). Many thin
//   layers, and a strong toe bias because every layer avalanches down the same two flanks.
// * Windrow: the same longitudinal travel with the deposition axis slewing laterally between passes,
//   so the pile is built as parallel cords stacked pyramidally.
// * Cone shell: successive cones at a stepping position, each shelling over the last. Few effective
//   layers per cut, which is why Bond et al. (2000), Loubser and de Korte (2015) and Wintz (2011) all
//   report it as unsuitable when homogenization matters.
// * Strata: inclined layers built against one flank, the stacker stepping laterally as the pile grows.
// * Chevcon: chevron travel plus the stepping of cone shell, producing inclined layers along the pile.
//   Loubser and de Korte measure VRR 0.121 for chevcon against 0.232 for cone shell on a CIRCULAR pile.
//
// WHAT THIS PRODUCT REPRODUCES: the ORDER chevcon better than cone shell, not the digits, which come
// from a differently dimensioned circular pile whose source is internally inconsistent about them.

import type { StackingMethod } from './types';

export const STACKING_LABELS: Record<StackingMethod, { en: string; es: string }> = {
  chevron: { en: 'Chevron', es: 'Chevron' },
  windrow: { en: 'Windrow', es: 'Windrow (cordones)' },
  coneshell: { en: 'Cone shell', es: 'Conos concentricos' },
  strata: { en: 'Strata', es: 'Estratos inclinados' },
  chevcon: { en: 'Chevcon', es: 'Chevcon' },
};

function span(nx: number, cellM: number, marginCells = 4): [number, number] {
  const lo = marginCells * cellM;
  const hi = (nx - 1 - marginCells) * cellM;
  return [lo, Math.max(lo + cellM, hi)];
}

/**
 * Pad coordinates for dump `k` of `nDumps` under `method`.
 *
 * `nPasses` is the number of stacker passes, which for the longitudinal methods is the number of
 * LAYERS the pile ends up with. It is the single most consequential operating parameter in the
 * product: it is the N of the independent-layer bound, and every source agrees that more layers blend
 * better.
 */
export function dumpPosition(
  method: StackingMethod, k: number, nDumps: number,
  nx: number, ny: number, cellM: number, nPasses: number,
): [number, number] {
  const [xLo, xHi] = span(nx, cellM);
  const yMid = ((ny - 1) * cellM) / 2;
  const u = k / Math.max(1, nDumps - 1);
  const passes = Math.max(1, nPasses);

  const triangle = (): number => {
    const s = (u * passes) % 2;
    return s <= 1 ? s : 2 - s;
  };

  switch (method) {
    case 'chevron':
      return [xLo + triangle() * (xHi - xLo), yMid];
    case 'windrow': {
      const nCords = 3;
      const cord = Math.floor(u * passes) % nCords;
      const offset = (cord - (nCords - 1) / 2) * ((ny * cellM) / (nCords + 1));
      return [xLo + triangle() * (xHi - xLo), yMid + offset];
    }
    case 'coneshell': {
      const nCones = Math.max(2, Math.floor(passes / 6));
      const cone = Math.min(nCones - 1, Math.floor(u * nCones));
      return [xLo + ((cone + 0.5) / nCones) * (xHi - xLo), yMid];
    }
    case 'strata': {
      const lean = (u - 0.5) * (ny * cellM) * 0.55;
      return [xLo + triangle() * (xHi - xLo), yMid + lean];
    }
    case 'chevcon': {
      const window = 0.55 * (xHi - xLo);
      const origin = xLo + u * (xHi - xLo - window);
      return [origin + triangle() * window, yMid];
    }
  }
}

/**
 * How many stacked layers a full-face cut should cross, from the geometry alone.
 *
 * A prediction, not a measurement, and it is reported next to the MEASURED layer count the ledger
 * produces. When the two disagree the geometry is doing something the operator did not intend, which
 * is exactly what a teaching tool should surface rather than hide.
 */
export function layersPerCut(method: StackingMethod, nPasses: number): number {
  const p = Math.max(1, nPasses);
  switch (method) {
    case 'chevron':
    case 'windrow':
      return p;
    case 'chevcon':
      return Math.max(1, Math.floor(p * 0.55));
    case 'strata':
      return Math.max(1, Math.floor(p * 0.7));
    case 'coneshell':
      return Math.max(1, Math.ceil(p / Math.max(2, Math.floor(p / 6))));
  }
}
