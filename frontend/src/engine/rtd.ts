// Method 12, the residence-time distribution of the stockpile as a buffer.
// Mirrors data-pipeline/stlab/model/rtd.py.
//
// A stockpile is not only a blender, it is a buffer, and its residence-time distribution is decided by
// its geometry and its reclaim rule. A freshly built cone reclaimed from its face behaves close to
// last-in-first-out; a properly bedded chevron reclaimed full-face behaves close to a well-mixed
// first-in-first-out. Neither is exact, and the honest answer is the SHAPE, not a label.
//
// The three-way FIFO, LIFO and blended abstraction is the industry's own: mine-planning software
// exposes stockpile reclaim as exactly those three rules. Process-scale RTD in mineral processing is
// Moraga, Kracht and Ortiz, Minerals Engineering 187, 107807, 2022, doi:10.1016/j.mineng.2022.107807.

export interface RtdResult {
  edges: number[];
  mass: number[];
  cumulative: number[];
  meanS: number;
  varS2: number;
  fifoMeanS: number;
  lifoMeanS: number;
  position: number;
  character: 'last-in-first-out' | 'blended' | 'first-in-first-out' | 'indeterminate';
  dimensionlessVariance: number;
}

export function histogram(residencesS: number[], weightsT: number[], nBins = 24) {
  if (residencesS.length === 0) {
    return { edges: [] as number[], mass: [] as number[], cumulative: [] as number[], meanS: 0, varS2: 0 };
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of residencesS) { if (r < lo) lo = r; if (r > hi) hi = r; }
  if (hi <= lo) hi = lo + 1;
  const width = (hi - lo) / nBins;
  const mass = new Array(nBins).fill(0);
  for (let i = 0; i < residencesS.length; i++) {
    const b = Math.min(nBins - 1, Math.max(0, Math.floor((residencesS[i] - lo) / width)));
    mass[b] += weightsT[i];
  }
  const total = mass.reduce((a, b) => a + b, 0) || 1;
  const norm = mass.map((m) => m / total);
  const cumulative: number[] = [];
  let acc = 0;
  for (const m of norm) { acc += m; cumulative.push(acc); }

  let tw = 0;
  for (const w of weightsT) tw += w;
  tw = tw || 1;
  let meanS = 0;
  for (let i = 0; i < residencesS.length; i++) meanS += residencesS[i] * weightsT[i];
  meanS /= tw;
  let varS2 = 0;
  for (let i = 0; i < residencesS.length; i++) varS2 += weightsT[i] * (residencesS[i] - meanS) ** 2;
  varS2 /= tw;

  const edges = Array.from({ length: nBins }, (_, b) => lo + (b + 0.5) * width);
  return { edges, mass: norm, cumulative, meanS, varS2 };
}

/**
 * Mean residence the same event sequence would give under pure FIFO and pure LIFO.
 *
 * Computed by walking an explicit inventory queue rather than by a closed form, so the references stay
 * exact when the stacking and reclaim rates are not constant.
 */
export function fifoLifoReferences(
  dumpTimesS: number[], dumpTonnes: number[], cutTimesS: number[], cutTonnes: number[],
): { fifoMeanS: number; lifoMeanS: number } {
  const walk = (lifo: boolean): number => {
    const stock: Array<[number, number]> = [];
    let di = 0;
    let weighted = 0;
    let total = 0;
    for (let ci = 0; ci < cutTimesS.length; ci++) {
      const ct = cutTimesS[ci];
      while (di < dumpTimesS.length && dumpTimesS[di] <= ct) {
        stock.push([dumpTimesS[di], dumpTonnes[di]]);
        di++;
      }
      let want = cutTonnes[ci];
      while (want > 1e-9 && stock.length > 0) {
        const item = lifo ? stock[stock.length - 1] : stock[0];
        const take = Math.min(want, item[1]);
        weighted += take * (ct - item[0]);
        total += take;
        item[1] -= take;
        want -= take;
        if (item[1] <= 1e-9) { if (lifo) stock.pop(); else stock.shift(); }
      }
    }
    return total > 0 ? weighted / total : 0;
  };
  return { fifoMeanS: walk(false), lifoMeanS: walk(true) };
}

/**
 * Place the measured mean residence between the LIFO and FIFO references.
 *
 * The label is a DESCRIPTIVE band over that position and the UI says so: there is no published
 * threshold that makes 0.6 "mostly first-in-first-out", and pretending otherwise would be an invented
 * number.
 */
export function character(
  actualMeanS: number, fifoMeanS: number, lifoMeanS: number,
): [number, RtdResult['character']] {
  const span = fifoMeanS - lifoMeanS;
  if (Math.abs(span) < 1e-9) return [0.5, 'indeterminate'];
  const p = Math.min(1, Math.max(0, (actualMeanS - lifoMeanS) / span));
  if (p < 0.25) return [p, 'last-in-first-out'];
  if (p > 0.75) return [p, 'first-in-first-out'];
  return [p, 'blended'];
}

/** `sigma^2 / tau^2`: zero for ideal plug flow, one for an ideal perfectly mixed tank. */
export function dimensionlessVariance(meanS: number, varS2: number): number {
  return meanS <= 0 ? 0 : varS2 / (meanS * meanS);
}
