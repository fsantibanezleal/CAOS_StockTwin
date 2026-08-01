// Methods 9, 10 and 11: the variance reduction ratio, the variogram, and the independent-layer bound.
// Mirrors data-pipeline/stlab/model/blending.py.
//
// THE METRIC, AND THE DIRECTION OF THE INEQUALITY.
//
//     VRR = var_out / var_in            LOWER IS BETTER
//
// That is the definition in Loubser and de Korte, J. S. Afr. Inst. Min. Metall. 115(8), 773-780, 2015,
// doi:10.17159/2411-9717/2015/v115n8a15, following Kumral (2006), and their own results confirm the
// direction: cone shell 0.232, chevcon 0.121, with the text concluding chevcon delivers much better
// consistency. The reciprocal convention also circulates in secondary sources; building against it
// would invert every number in the product and make the recommendation advise the worse method. That
// is why VRR_FORMULA_LABEL is rendered next to every displayed value.
//
// Both variances are on a TONNAGE base, which is Kumral's requirement. Cuts are typically an order of
// magnitude larger than the dumps that fed them, so a count-weighted variance would be wrong by
// roughly that factor.
//
// THE IDEAL BOUND. If the N layers a cut crosses were independent draws, the cut mean would have
// variance var_in / N, so VRR_ideal = 1/N and E_ideal = sqrt(N). Real beds do not reach it: Schramm
// (AT MINERALS PROCESSING 06/2021) reports a mixing effect of 5 to 7.5 for 200 to 600 layers, where
// the ideal sqrt(N) is 14.1 to 24.5. The bound is DERIVED here and labelled as derived; the De Wet
// (1994) design equation could not be verified from a primary source and is not reproduced.

export const VRR_FORMULA_LABEL = 'VRR = var_out / var_in (lower is better)';
export const VRR_FORMULA_LABEL_ES = 'VRR = var_salida / var_entrada (menor es mejor)';

export function tonnageWeightedMean(values: number[], weights: number[]): number {
  let w = 0;
  for (const x of weights) w += x;
  if (w <= 0) return 0;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i] * weights[i];
  return s / w;
}

export function tonnageWeightedVariance(values: number[], weights: number[]): number {
  let w = 0;
  for (const x of weights) w += x;
  if (w <= 0) return 0;
  const m = tonnageWeightedMean(values, weights);
  let s = 0;
  for (let i = 0; i < values.length; i++) s += weights[i] * (values[i] - m) ** 2;
  return s / w;
}

export function vrr(varIn: number, varOut: number): number {
  return varIn <= 0 ? Infinity : varOut / varIn;
}

/** `E = sigma_in / sigma_out`, the form the bulk-handling literature quotes design values in. */
export function mixingEffect(varIn: number, varOut: number): number {
  if (varOut <= 0) return Infinity;
  return varIn > 0 ? Math.sqrt(varIn / varOut) : 0;
}

export function vrrIdeal(nLayers: number): number {
  return nLayers > 0 ? 1 / nLayers : Infinity;
}

/**
 * `VRR_ideal / VRR_achieved`, in (0, 1]. How much of the ideal benefit was actually realised.
 *
 * The number that keeps the product honest. An achieved VRR alone invites comparison against zero;
 * against the bound it shows that a bed at 0.05 is recovering a fifth of what 100 independent layers
 * would have given.
 */
export function blendingEfficiency(achieved: number, nLayers: number): number {
  const ideal = vrrIdeal(nLayers);
  if (!Number.isFinite(achieved) || achieved <= 0 || !Number.isFinite(ideal)) return 0;
  return Math.min(1, ideal / achieved);
}

export interface Variogram {
  lagT: number[];
  gamma: number[];
  pairs: number[];
  model: { nugget: number; sill: number; range: number; rmse: number };
}

/**
 * Matheron's experimental semivariogram of a one-dimensional stream.
 *
 * `positions` is CUMULATIVE TONNAGE, not clock time. A stockpile's input is a one-dimensional lot in
 * Gy's sense and its heterogeneity is a function of mass along the stream; using time would make the
 * variogram depend on how busy the shift was.
 */
export function experimentalVariogram(
  values: number[], positions: number[], nLags = 20, maxLag?: number,
): Variogram {
  const n = values.length;
  const empty: Variogram = { lagT: [], gamma: [], pairs: [], model: { nugget: 0, sill: 0, range: 0, rmse: 0 } };
  if (n < 4) return empty;
  const spanT = positions[n - 1] - positions[0];
  if (spanT <= 0) return empty;
  const hmax = maxLag ?? spanT / 3;
  const width = hmax / nLags;
  const sums = new Float64Array(nLags);
  const counts = new Int32Array(nLags);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const h = positions[j] - positions[i];
      if (h >= hmax) break;
      const b = Math.floor(h / width);
      if (b >= nLags) continue;
      const d = values[i] - values[j];
      sums[b] += d * d;
      counts[b] += 1;
    }
  }
  const lagT: number[] = [];
  const gamma: number[] = [];
  const pairs: number[] = [];
  for (let b = 0; b < nLags; b++) {
    lagT.push((b + 0.5) * width);
    gamma.push(counts[b] > 0 ? sums[b] / (2 * counts[b]) : 0);
    pairs.push(counts[b]);
  }
  return { lagT, gamma, pairs, model: fitSpherical(lagT, gamma, pairs) };
}

/**
 * Fit a nugget-plus-spherical model by a grid search on the range.
 *
 * A grid search rather than a gradient method: the parameter is one-dimensional and bounded, the
 * objective is cheap, and a deterministic search gives identical results in the Python and TypeScript
 * lanes where an optimiser's convergence path would not. Determinism across lanes is a hard
 * requirement here, not a preference.
 */
export function fitSpherical(
  centres: number[], gamma: number[], counts: number[],
): { nugget: number; sill: number; range: number; rmse: number } {
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i < centres.length; i++) {
    if (counts[i] >= 5 && centres[i] > 0) pts.push([centres[i], gamma[i], counts[i]]);
  }
  if (pts.length < 4) return { nugget: 0, sill: 0, range: 0, rmse: 0 };
  const hmax = Math.max(...pts.map((p) => p[0]));
  let best = { nugget: 0, sill: 0, range: 0, rmse: Infinity };
  for (let step = 1; step <= 40; step++) {
    const a = (hmax * step) / 40;
    let sxx = 0; let sxy = 0; let sx = 0; let sy = 0; let sw = 0;
    for (const [h, g, w] of pts) {
      const x = h >= a ? 1 : 1.5 * (h / a) - 0.5 * (h / a) ** 3;
      sxx += w * x * x; sxy += w * x * g; sx += w * x; sy += w * g; sw += w;
    }
    const det = sxx * sw - sx * sx;
    if (Math.abs(det) < 1e-18) continue;
    let c = (sxy * sw - sx * sy) / det;
    let c0 = (sxx * sy - sx * sxy) / det;
    if (c < 0 || c0 < 0) { c = Math.max(0, c); c0 = Math.max(0, c0); }
    let err = 0;
    for (const [h, g, w] of pts) {
      const x = h >= a ? 1 : 1.5 * (h / a) - 0.5 * (h / a) ** 3;
      err += w * (c0 + c * x - g) ** 2;
    }
    const rmse = Math.sqrt(err / sw);
    if (rmse < best.rmse) best = { nugget: c0, sill: c0 + c, range: a, rmse };
  }
  return best;
}

/**
 * The published anchors the stacking axis is scored against.
 *
 * NOT reproduction targets: they come from a differently dimensioned circular pile, and the source is
 * internally inconsistent about them (Table IV back-solves to two different input variances for a
 * comparison described as being on the same input, and the conclusions quote a chevcon VRR below 0.1
 * where the table says 0.121). The product's own test is ordinal and magnitude-level.
 */
export const PUBLISHED_ANCHORS = [
  { vrr: 0.232, en: 'cone shell, circular pile', es: 'conos concéntricos, pila circular',
    src: 'Loubser and de Korte 2015, Table IV' },
  { vrr: 0.121, en: 'chevcon, circular pile', es: 'chevcon, pila circular',
    src: 'Loubser and de Korte 2015, Table IV' },
  { vrr: 0.10, en: 'chevcon plus a full-face reclaimer', es: 'chevcon con recuperador de cara completa',
    src: 'Bond, Coursaux and Worthington 2000' },
  { vrr: 0.03, en: 'a real blending bed, 200 to 600 layers', es: 'una cama de mezcla real, 200 a 600 capas',
    src: 'Schramm, AT minerals processing 06/2021' },
] as const;
