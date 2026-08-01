// The incoming truck stream: a geostatistically structured grade sequence, not white noise.
// Mirrors data-pipeline/stlab/model/stream.py, including the generator, bit for bit.
//
// WHY NOT A RANDOM NUMBER GENERATOR WITH A MEAN. The whole question a blending bed answers is how much
// of the input's variability survives, and that depends on the input's AUTOCORRELATION, not just its
// variance. If consecutive trucks are strongly correlated, the layers a cut crosses are not
// independent samples and the bed recovers far less than the 1/N bound promises. A white-noise input
// would make every bed look excellent and would hide the single most important effect in the domain.
//
// Marques and Costa (Int. J. Miner. Process. 120, 48-55, 2013, doi:10.1016/j.minpro.2013.01.003) make
// exactly this point: they drive their blending-pile simulator with geostatistically simulated grades
// so that in-situ variability reaches the pile, validated on two large Vale iron mines.
//
// THE MODEL. A stationary Gaussian process in cumulative tonnage with an exponential covariance
// C(h) = sill * exp(-3h/a), which has its practical range at a. On evenly spaced samples this has an
// exact one-step recursion, so it is generated exactly rather than approximately, in one pass.

import type { StreamStructure, TruckDump } from './types';

/**
 * A seeded normal generator reproduced identically in the Python offline lane.
 *
 * A 32-bit xorshift feeding Box-Muller. Neither Python's `random` nor numpy's Generator can be
 * reproduced bit for bit in a browser, and the cross-lane determinism test requires that they can, so
 * the generator is written out once in a form both languages express the same way.
 */
export class Gauss {
  private s: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  private u32(): number {
    let x = this.s;
    x ^= (x << 13) >>> 0;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0;
    this.s = x >>> 0;
    return this.s;
  }

  uniform(): number {
    return (this.u32() + 0.5) / 4294967296;
  }

  normal(): number {
    if (this.spare !== null) { const v = this.spare; this.spare = null; return v; }
    const u1 = Math.max(1e-12, this.uniform());
    const u2 = this.uniform();
    const r = Math.sqrt(-2 * Math.log(u1));
    this.spare = r * Math.sin(2 * Math.PI * u2);
    return r * Math.cos(2 * Math.PI * u2);
  }
}

export interface StreamOptions {
  nDumps: number;
  seed: number;
  structure?: StreamStructure;
  meanCu?: number;
  sdCu?: number;
  rangeT?: number;
  tonnesPerTruck?: number;
  truckSpread?: number;
  coarseMean?: number;
  coarseSd?: number;
  cycleS?: number;
}

export const STRUCTURE_LABELS: Record<StreamStructure, { en: string; es: string; note_en: string; note_es: string }> = {
  stationary: {
    en: 'Stationary', es: 'Estacionaria',
    note_en: 'A correlated stream at the stated range.',
    note_es: 'Un flujo correlacionado con el alcance indicado.',
  },
  short_range: {
    en: 'Short range', es: 'Alcance corto',
    note_en: 'Correlation range much shorter than one layer, so layers are nearly independent and the achieved ratio can approach the ideal bound.',
    note_es: 'Alcance de correlacion mucho menor que una capa, de modo que las capas son casi independientes y el resultado puede acercarse a la cota ideal.',
  },
  long_range: {
    en: 'Long range', es: 'Alcance largo',
    note_en: 'Correlation range longer than the whole pile: every layer carries nearly the same grade and the bed has almost nothing to average.',
    note_es: 'Alcance mayor que la pila completa: cada capa lleva casi la misma ley y la cama casi no tiene nada que promediar.',
  },
  trending: {
    en: 'Trending', es: 'Con deriva',
    note_en: 'A linear grade drift across the shift. The mean moves, so variance reduction on the whole record becomes a misleading summary.',
    note_es: 'Una deriva lineal de ley durante el turno. La media se desplaza, de modo que la reduccion de varianza sobre todo el registro es un resumen enganoso.',
  },
  bimodal: {
    en: 'Bimodal', es: 'Bimodal',
    note_en: 'Two ore types arriving in runs. The reclaimed histogram stays bimodal even when the ratio looks respectable, so the distribution has to be shown.',
    note_es: 'Dos tipos de mineral que llegan en rachas. El histograma recuperado sigue siendo bimodal aunque la razon parezca aceptable, por eso hay que mostrar la distribucion.',
  },
};

export function generateStream(opts: StreamOptions): TruckDump[] {
  const {
    nDumps, seed, structure = 'stationary', meanCu = 0.62, sdCu = 0.16, rangeT = 4000,
    tonnesPerTruck = 220, truckSpread = 0.06, coarseMean = 0.35, coarseSd = 0.08, cycleS = 90,
  } = opts;

  const g = new Gauss(seed);
  let effRange = rangeT;
  if (structure === 'short_range') effRange = Math.max(1, rangeT * 0.08);
  else if (structure === 'long_range') effRange = rangeT * 12;

  const rho = effRange > 0 ? Math.exp((-3 * tonnesPerTruck) / effRange) : 0;
  const root = Math.sqrt(Math.max(0, 1 - rho * rho));
  let z = g.normal();

  // a second, independent correlated field drives the size distribution: size and grade are not the
  // same geological variable, and coupling them would bake in a correlation the data does not have
  const gs = new Gauss((seed ^ 0x5bf03635) >>> 0);
  let zs = gs.normal();

  const out: TruckDump[] = [];
  for (let k = 0; k < nDumps; k++) {
    const tT = Math.max(20, tonnesPerTruck * (1 + truckSpread * g.normal()));
    z = rho * z + root * g.normal();
    zs = rho * zs + root * gs.normal();

    let cu = meanCu + sdCu * z;
    if (structure === 'trending') {
      cu += sdCu * 2.2 * (k / Math.max(1, nDumps - 1) - 0.5);
    } else if (structure === 'bimodal') {
      // the correlated field selects the population, so the modes come in runs as they would from two
      // dig faces rather than being interleaved at random
      cu = (z < 0 ? meanCu - 0.9 * sdCu : meanCu + 0.9 * sdCu) + 0.35 * sdCu * g.normal();
    }
    cu = Math.max(0, cu);

    out.push({
      eventId: k,
      tS: k * cycleS,
      truckId: `T${String((k % 12) + 1).padStart(2, '0')}`,
      sourceId: `DIG-${String(Math.floor(k / 40) + 1).padStart(3, '0')}`,
      tonnes: tT,
      gradeCuPct: cu,
      gradeAuGpt: Math.max(0, 0.12 + 0.05 * z),
      coarseFrac: Math.min(0.95, Math.max(0.05, coarseMean + coarseSd * zs)),
      moisturePct: 3,
      xM: 0,
      yM: 0,
    });
  }
  return out;
}

export function cumulativeTonnes(dumps: TruckDump[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const d of dumps) { acc += d.tonnes; out.push(acc); }
  return out;
}
