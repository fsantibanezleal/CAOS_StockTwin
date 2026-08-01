// Method 1, the mass-conserving relaxation solver with an imposed angle of repose.
// Mirrors data-pipeline/stlab/model/heightfield.py.
//
// WHAT THIS IS. A height field receives material and relaxes until no local slope exceeds a critical
// value. The toppling rule is the one Bak, Tang and Wiesenfeld introduced for the sandpile automaton
// (Phys. Rev. Lett. 59(4), 381-384, 1987, doi:10.1103/PhysRevLett.59.381).
//
// WHAT THIS IS NOT. BTW is a model of avalanche size statistics under self-organized criticality, in
// which the critical slope is a free parameter and the interesting result is a power law. None of
// that is claimed. Here the critical slope is IMPOSED as the material's angle of repose, taken from
// published handbook ranges (about 34 to 60 degrees for ores), and the toppling rule is used only as a
// mass-conserving relaxation solver.
//
// THE ORDER OF THE RETURNED TRANSFERS IS THE POINT. The highest unstable cell topples first, then
// whatever it destabilised, so the sequence IS the avalanche path, and that is the downslope
// coordinate the segregation solver marches along.

const OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export const CONVERGE_TOL_M = 1e-9;
export const MAX_MOVES = 200_000;

/** One transfer: source cell, destination cell, metres of height moved. */
export type Move = readonly [number, number, number];

export interface NeighbourTable {
  /** flat neighbour indices, `idx[start[c] .. start[c+1]]` */
  idx: Int32Array;
  /** admissible drop to the matching neighbour, in metres */
  drop: Float64Array;
  start: Int32Array;
}

const tableCache = new Map<string, NeighbourTable>();

/** Maximum stable height difference to an orthogonal and to a diagonal neighbour, in metres. */
export function criticalDrop(cellM: number, reposeDeg: number): [number, number] {
  const slope = Math.tan((reposeDeg * Math.PI) / 180);
  const orth = cellM * slope;
  return [orth, orth * Math.SQRT2];
}

/**
 * Precomputed neighbours and admissible drops, cached per pad geometry.
 *
 * Flat typed arrays rather than an array of arrays: the cascade walks this on every transfer of every
 * dump, and in the Python lane rebuilding it inside the loop was the single largest cost in the whole
 * engine. The diagonal drop is larger by sqrt(2) because the repose angle is a SLOPE and the diagonal
 * neighbour is further away; using one drop for both is what makes a relaxed cone come out square.
 */
export function neighbourTable(nx: number, ny: number, cellM: number, reposeDeg: number): NeighbourTable {
  const key = `${nx}|${ny}|${cellM}|${reposeDeg}`;
  const hit = tableCache.get(key);
  if (hit) return hit;

  const [orth, diag] = criticalDrop(cellM, reposeDeg);
  const n = nx * ny;
  const start = new Int32Array(n + 1);
  const idxList: number[] = [];
  const dropList: number[] = [];
  for (let c = 0; c < n; c++) {
    start[c] = idxList.length;
    const i = c % nx;
    const j = (c / nx) | 0;
    for (let k = 0; k < OFFSETS.length; k++) {
      const ni = i + OFFSETS[k][0];
      const nj = j + OFFSETS[k][1];
      if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) continue;
      idxList.push(nj * nx + ni);
      dropList.push(k >= 4 ? diag : orth);
    }
  }
  start[n] = idxList.length;
  const table: NeighbourTable = {
    idx: Int32Array.from(idxList), drop: Float64Array.from(dropList), start,
  };
  if (tableCache.size > 8) tableCache.clear();
  tableCache.set(key, table);
  return table;
}

/** A binary max-heap keyed on height, with lazy invalidation. */
class MaxHeap {
  private keys: number[] = [];
  private vals: number[] = [];

  get size(): number { return this.vals.length; }

  push(key: number, val: number): void {
    this.keys.push(key);
    this.vals.push(val);
    let i = this.vals.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] >= this.keys[i]) break;
      this.swap(p, i);
      i = p;
    }
  }

  pop(): number {
    const top = this.vals[0];
    const kl = this.keys.pop()!;
    const vl = this.vals.pop()!;
    if (this.vals.length > 0) {
      this.keys[0] = kl;
      this.vals[0] = vl;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.vals.length && this.keys[l] > this.keys[m]) m = l;
        if (r < this.vals.length && this.keys[r] > this.keys[m]) m = r;
        if (m === i) break;
        this.swap(m, i);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.vals[a], this.vals[b]] = [this.vals[b], this.vals[a]];
  }
}

/**
 * Relax `h` in place and return the transfers in downslope order.
 *
 * A cell topples EXACTLY to its repose surface in one step. Giving away a total `T` split as
 * `t_k = max(0, d_k - T)` satisfies every constraint simultaneously and overshoots none, and `T`
 * solves the water-filling equation `T = sum_k max(0, d_k - T)`, which for the `k` largest excesses is
 * `T = (sum of those k) / (k + 1)`.
 *
 * Processing the highest unstable cell first, and applying its transfer immediately, is what keeps the
 * relaxation marching monotonically downhill. Simultaneous sweeps let a cell receive from several
 * neighbours at once and overshoot above the neighbour it had just fed, so the pair traded material
 * back and forth: a cone that should relax in about eight steps took over a hundred sweeps.
 */
export function cascade(
  h: Float64Array,
  nx: number,
  ny: number,
  cellM: number,
  reposeDeg: number,
  active?: Iterable<number>,
  maxMoves = MAX_MOVES,
): Move[] {
  const table = neighbourTable(nx, ny, cellM, reposeDeg);
  const heap = new MaxHeap();
  const queued = new Set<number>();
  const seeds = active ?? { *[Symbol.iterator]() { for (let c = 0; c < nx * ny; c++) yield c; } };
  for (const c of seeds) {
    if (!queued.has(c)) { queued.add(c); heap.push(h[c], c); }
  }

  const moves: Move[] = [];
  const overN: number[] = [];
  const overD: number[] = [];

  while (heap.size > 0 && moves.length < maxMoves) {
    const c = heap.pop();
    queued.delete(c);
    const hc = h[c];
    overN.length = 0;
    overD.length = 0;
    for (let p = table.start[c]; p < table.start[c + 1]; p++) {
      const n = table.idx[p];
      const d = hc - h[n] - table.drop[p];
      if (d > CONVERGE_TOL_M) { overN.push(n); overD.push(d); }
    }
    if (overN.length === 0) continue;

    // sort descending by excess; at most eight entries, so an insertion sort is the cheap choice
    for (let a = 1; a < overD.length; a++) {
      const dv = overD[a];
      const nv = overN[a];
      let b = a - 1;
      while (b >= 0 && overD[b] < dv) { overD[b + 1] = overD[b]; overN[b + 1] = overN[b]; b--; }
      overD[b + 1] = dv;
      overN[b + 1] = nv;
    }

    let total = 0;
    let level = 0;
    let kActive = 0;
    for (let k = 1; k <= overD.length; k++) {
      total += overD[k - 1];
      const cand = total / (k + 1);
      if (overD[k - 1] > cand) { level = cand; kActive = k; } else break;
    }
    if (kActive === 0) continue;

    for (let k = 0; k < kActive; k++) {
      const t = overD[k] - level;
      if (t <= CONVERGE_TOL_M) continue;
      const n = overN[k];
      h[c] -= t;
      h[n] += t;
      moves.push([c, n, t]);
      if (!queued.has(n)) { queued.add(n); heap.push(h[n], n); }
    }
    if (!queued.has(c)) { queued.add(c); heap.push(h[c], c); }
  }
  return moves;
}

/** Largest amount, in metres, by which any local drop exceeds the admissible one. */
export function maxSlopeExcess(
  h: Float64Array, nx: number, ny: number, cellM: number, reposeDeg: number,
): number {
  const table = neighbourTable(nx, ny, cellM, reposeDeg);
  let worst = 0;
  for (let c = 0; c < nx * ny; c++) {
    const hc = h[c];
    for (let p = table.start[c]; p < table.start[c + 1]; p++) {
      const d = hc - h[table.idx[p]] - table.drop[p];
      if (d > worst) worst = d;
    }
  }
  return worst;
}
