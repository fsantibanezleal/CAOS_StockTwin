// The simulation driver. Mirrors data-pipeline/stlab/model/run.py.
//
// This is the function the App calls on every control change and the offline pipeline calls per case.
// Everything it does is a pure function of (RunConfig, seed), which is what makes a committed trace
// replayable and what lets the cross-lane test assert that the browser and the pipeline agree.
//
// Stacking and reclaiming are INTERLEAVED, as they are on a real pad. A simulator that stacks the
// whole pile and only then reclaims it is solving a different, easier problem in which every cut sees
// every layer. It is also the only way the starvation control can exist at all.

import * as blending from './blending';
import { Pile } from './pile';
import * as rtd from './rtd';
import { dumpPosition } from './stacking';
import { cumulativeTonnes } from './stream';
import type { BlendMetrics, ReclaimCut, RunConfig, RunResult, TruckDump } from './types';

export const N_SNAPSHOTS = 24;

export interface Snapshot { tS: number; h: Float64Array }

export function simulate(cfg: RunConfig, dumps: TruckDump[]): RunResult & { snapshots: Snapshot[] } {
  const t0 = performance.now();
  const pad = cfg.pad;
  const pile = new Pile(pad);
  const n = dumps.length;
  if (n === 0) throw new Error('simulate needs at least one dump');

  const positioned: TruckDump[] = dumps.map((d, k) => {
    const [x, y] = dumpPosition(cfg.stacking, k, n, pad.nx, pad.ny, pad.cellM, cfg.nPasses);
    return { ...d, xM: x, yM: y };
  });

  let totalT = 0;
  for (const d of positioned) totalT += d.tonnes;
  const startT = cfg.startFraction * totalT;
  const cuts: ReclaimCut[] = [];
  const snapshots: Snapshot[] = [];
  const snapEvery = Math.max(1, Math.floor(n / N_SNAPSHOTS));

  let stacked = 0;
  let debt = 0;
  let front = 0;
  let cutId = 0;
  let starved = false;

  for (let k = 0; k < n; k++) {
    const d = positioned[k];
    pile.deposit(d, cfg.sr);
    stacked += d.tonnes;

    if (stacked >= startT) {
      debt += d.tonnes * cfg.reclaimRate;
      while (debt >= cfg.cutTonnes) {
        const [cut, nf] = pile.reclaim(cutId, d.tS, cfg.cutTonnes, cfg.reclaim, front);
        front = nf;
        if (!cut) {
          // the machine walked the whole pad and found nothing: the pile is empty and the reclaimer
          // is starved, which is the C03 boundary rather than an error
          starved = true;
          debt = 0;
          break;
        }
        cuts.push(cut);
        cutId++;
        debt -= cut.tonnes;
      }
    }
    if (k % snapEvery === 0 || k === n - 1) {
      snapshots.push({ tS: d.tS, h: Float64Array.from(pile.h) });
    }
  }

  // drain what is left, so the mass balance closes and the last layers are represented
  let guard = 0;
  while (pile.inPileT > cfg.cutTonnes && guard < pad.nx * 4) {
    guard++;
    const [cut, nf] = pile.reclaim(cutId, positioned[n - 1].tS + guard * 60, cfg.cutTonnes, cfg.reclaim, front);
    front = nf;
    if (!cut) break;
    cuts.push(cut);
    cutId++;
  }

  const metrics = measure(pile, positioned, cuts);
  const nCells = pad.nx * pad.ny;
  const coarseFinal = new Float64Array(nCells);
  const gradeFinal = new Float64Array(nCells);
  for (let c = 0; c < nCells; c++) {
    coarseFinal[c] = pile.surfaceCoarse(c);
    gradeFinal[c] = pile.columnGrade(c);
  }

  return {
    caseId: cfg.caseId, pad, stacking: cfg.stacking, reclaim: cfg.reclaim,
    dumps: positioned, cuts,
    heightFinal: Float64Array.from(pile.h), coarseFinal, gradeFinal,
    columnLots: pile.stacks, metrics, starved,
    steepestSlopeDeg: pile.steepestSlopeDeg(), apexHeightM: pile.apexHeightM(),
    runMs: performance.now() - t0,
    snapshots,
  };
}

export function measure(pile: Pile, dumps: TruckDump[], cuts: ReclaimCut[]): BlendMetrics {
  const inVals = dumps.map((d) => d.gradeCuPct);
  const inW = dumps.map((d) => d.tonnes);
  const outVals = cuts.map((c) => c.gradeCuPct);
  const outW = cuts.map((c) => c.tonnes);

  const varIn = blending.tonnageWeightedVariance(inVals, inW);
  const varOut = cuts.length ? blending.tonnageWeightedVariance(outVals, outW) : 0;
  const meanIn = blending.tonnageWeightedMean(inVals, inW);
  const meanOut = cuts.length ? blending.tonnageWeightedMean(outVals, outW) : 0;
  const achieved = blending.vrr(varIn, varOut);

  let wSum = 0;
  let nl = 0;
  for (const c of cuts) { wSum += c.tonnes; nl += c.nLayers * c.tonnes; }
  const nLayers = wSum > 0 ? nl / wSum : 0;

  const [toe, apex] = pile.toeApexSplit();
  let dGrade = 0;
  let dCoarse = 0;
  if (toe.length && apex.length) {
    const avg = (cells: number[], f: (c: number) => number) =>
      cells.reduce((s, c) => s + f(c), 0) / cells.length;
    dGrade = avg(toe, (c) => pile.columnGrade(c)) - avg(apex, (c) => pile.columnGrade(c));
    dCoarse = avg(toe, (c) => pile.columnCoarse(c)) - avg(apex, (c) => pile.columnCoarse(c));
  }

  return {
    varIn, varOut, vrr: achieved, meanIn, meanOut,
    nLayersMean: nLayers,
    vrrIdeal: blending.vrrIdeal(nLayers),
    efficiency: blending.blendingEfficiency(achieved, nLayers),
    mixingEffect: blending.mixingEffect(varIn, varOut),
    toeApexGradeDelta: dGrade,
    segregationIndex: dCoarse,
    massResidualT: pile.depositedT - (pile.inPileT + pile.reclaimedT),
  };
}

export function inputVariogram(dumps: TruckDump[], nLags = 20): blending.Variogram {
  return blending.experimentalVariogram(
    dumps.map((d) => d.gradeCuPct), cumulativeTonnes(dumps), nLags,
  );
}

export function outputVariogram(cuts: ReclaimCut[], nLags = 20): blending.Variogram {
  if (cuts.length < 4) {
    return { lagT: [], gamma: [], pairs: [], model: { nugget: 0, sill: 0, range: 0, rmse: 0 } };
  }
  const pos: number[] = [];
  let acc = 0;
  for (const c of cuts) { acc += c.tonnes; pos.push(acc); }
  return blending.experimentalVariogram(cuts.map((c) => c.gradeCuPct), pos, nLags);
}

export function residenceTime(dumps: TruckDump[], cuts: ReclaimCut[]): rtd.RtdResult {
  const res = cuts.map((c) => c.residenceS);
  const wts = cuts.map((c) => c.tonnes);
  const hist = rtd.histogram(res, wts);
  const refs = rtd.fifoLifoReferences(
    dumps.map((d) => d.tS), dumps.map((d) => d.tonnes), cuts.map((c) => c.tS), wts,
  );
  const [position, char] = rtd.character(hist.meanS, refs.fifoMeanS, refs.lifoMeanS);
  return {
    ...hist, ...refs, position, character: char,
    dimensionlessVariance: rtd.dimensionlessVariance(hist.meanS, hist.varS2),
  };
}

/**
 * The blending regime, NAMED, for the in-stage label of the ADR-0070 focus route.
 *
 * These are DESCRIPTIVE bands over the achieved ratio and the segregation index, and the wording says
 * so rather than implying a published cut-off. The one exception is the 0.1 boundary, which is the
 * magnitude Bond, Coursaux and Worthington report for chevcon reclaimed full-face, and that provenance
 * is stated where it is shown.
 */
export function blendingRegime(m: BlendMetrics, es: boolean): { label: string; text: string } {
  if (Math.abs(m.segregationIndex) > 0.5 * Math.sqrt(Math.max(m.varOut, 1e-12))) {
    // size sorting dominates: where the cut is taken matters more than how the pile was built
    if (Math.abs(m.segregationIndex) > 0.15) {
      return es ? {
        label: 'Dominado por la segregacion',
        text: 'El sorteo por tamano entre el pie y la cresta es mayor que la dispersion del flujo recuperado: donde se toma el corte importa mas que como se construyo la pila.',
      } : {
        label: 'Segregation-dominated',
        text: 'The size sorting between toe and crest is larger than the spread of the reclaimed stream: where the cut is taken matters more than how the pile was built.',
      };
    }
  }
  if (m.vrr <= 0.1) {
    return es ? {
      label: 'Mezcla casi perfecta',
      text: 'La varianza de salida esta en la decima parte de la de entrada o menos, la magnitud que se reporta para chevcon recuperado con cara completa.',
    } : {
      label: 'Near-perfect blending',
      text: 'Output variance at a tenth of the input or less, the magnitude reported for chevcon reclaimed with a full-face machine.',
    };
  }
  if (m.vrr <= 0.3) {
    return es ? {
      label: 'Mezcla efectiva',
      text: 'La cama esta promediando de verdad, aunque bien por debajo de la cota de capas independientes.',
    } : {
      label: 'Effective blending',
      text: 'The bed is genuinely averaging, though well short of the independent-layer bound.',
    };
  }
  return es ? {
    label: 'Amortigua, no mezcla',
    text: 'La pila esta almacenando material mas que homogeneizarlo: la mayor parte de la variabilidad de entrada llega intacta a la planta.',
  } : {
    label: 'Buffering, not blending',
    text: 'The pile is storing material rather than homogenizing it: most of the input variability reaches the plant intact.',
  };
}
