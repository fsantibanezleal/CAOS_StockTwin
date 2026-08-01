// Method 8, the per-cell lot ledger, and the deposition and reclaim mechanics built on it.
// Mirrors data-pipeline/stlab/model/pile.py.
//
// THE DATA STRUCTURE. Every pad cell owns an ordered stack of lots, bottom to top. Depositing pushes;
// the relaxation cascade moves material from the TOP of a source stack to the top of a destination
// stack, because that is what an avalanche does; reclaiming pops according to the geometry of the
// method. A cut's provenance is the tonnage-weighted histogram of the event ids it consumed.
//
// THE PUBLISHED ANALOGUE. Zhao, Lu, Koch and Hurdsman model a stockpile as a grid of voxels each
// holding a quality composition and compute a bucket-wheel cut's quality in advance from it
// (doi:10.1016/j.minpro.2015.04.012, doi:10.1016/j.aei.2015.07.002). The near-real-time version driven
// by GPS dump and load positions is Zhao, Lu, Statsenko and Koch (doi:10.1108/JEDT-12-2020-0541),
// whose abstract states that tracing ore grade at run-of-mine stockpiles is hard with current fleet
// systems because the information is not available in real time. That is the gap this product shows.

import { cascade } from './heightfield';
import { FlowingLayer } from './segregation';
import type { Lot, PadSpec, ReclaimCut, ReclaimMethod, TruckDump } from './types';

const MIN_LOT_T = 1e-9;
const FOOTPRINT_R_M = 4.5;
const N_BANDS = 12;

/**
 * A reclaim geometry is two numbers: the fraction of the face WIDTH the machine engages and how far
 * down the column it REACHES in one cut. Together they decide how many stacked layers land in the cut,
 * which is the dominant term in the variance reduction. Nothing else about the machines matters to the
 * grade of what they take.
 */
export const RECLAIM_GEOMETRY: Record<ReclaimMethod, {
  depth: number; proportional: boolean; machine: string; machineEs: string;
}> = {
  fullface: {
    depth: 1.0, proportional: true,
    machine: 'bridge or harrow reclaimer, full cross-section',
    machineEs: 'recuperador de puente o rastrillo, seccion completa',
  },
  bucketwheel: {
    depth: 0.55, proportional: false,
    machine: 'slewing bucket wheel, bench cut',
    machineEs: 'rueda de cangilones giratoria, corte por banco',
  },
  end: {
    depth: 0.3, proportional: false,
    machine: 'end reclaim, exposed end face',
    machineEs: 'recuperacion por el extremo, cara expuesta',
  },
  loader: {
    depth: 0.12, proportional: false,
    machine: 'front-end loader, scattered bites',
    machineEs: 'cargador frontal, mordidas dispersas',
  },
};

export class Pile {
  readonly pad: PadSpec;
  h: Float64Array;
  stacks: Lot[][];
  colT: Float64Array;
  depositedT = 0;
  reclaimedT = 0;
  touchedBoundary = false;
  private tpm: number;
  private footprint: Array<[number, number, number]>;

  constructor(pad: PadSpec) {
    this.pad = pad;
    const n = pad.nx * pad.ny;
    this.h = new Float64Array(n);
    this.colT = new Float64Array(n);
    this.stacks = Array.from({ length: n }, () => [] as Lot[]);
    this.tpm = pad.cellM * pad.cellM * pad.bulkDensityTpm3;
    this.footprint = this.buildFootprint();
  }

  /**
   * Offsets and weights of the disc a single truck load lands on.
   *
   * A haul truck tips a load that spreads over roughly nine metres, not over one cell. Treating it as
   * a point source puts a thirty-metre spike on the pad that the relaxation then has to demolish, and
   * that is not what happens on a pad.
   */
  private buildFootprint(): Array<[number, number, number]> {
    const r = Math.max(0, Math.floor(FOOTPRINT_R_M / this.pad.cellM));
    const out: Array<[number, number, number]> = [];
    let total = 0;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        const d = Math.hypot(di, dj) * this.pad.cellM;
        if (d > FOOTPRINT_R_M) continue;
        const w = 0.5 * (1 + Math.cos((Math.PI * d) / FOOTPRINT_R_M));
        out.push([di, dj, w]);
        total += w;
      }
    }
    return total > 0 ? out.map(([di, dj, w]) => [di, dj, w / total] as [number, number, number])
      : [[0, 0, 1]];
  }

  get inPileT(): number {
    let s = 0;
    for (let i = 0; i < this.colT.length; i++) s += this.colT[i];
    return s;
  }

  columnGrade(c: number): number {
    const t = this.colT[c];
    if (t <= 0) return 0;
    let s = 0;
    for (const lot of this.stacks[c]) s += lot.tonnes * lot.gradeCuPct;
    return s / t;
  }

  columnCoarse(c: number): number {
    const t = this.colT[c];
    if (t <= 0) return 0;
    let s = 0;
    for (const lot of this.stacks[c]) s += lot.tonnes * lot.coarseFrac;
    return s / t;
  }

  surfaceCoarse(c: number): number {
    const st = this.stacks[c];
    return st.length ? st[st.length - 1].coarseFrac : 0;
  }

  /**
   * Push a lot, coalescing it into the top lot when they came from the same dump.
   *
   * Without this the ledger fragments without bound: every transfer splits the straddling lot, so a
   * column accumulates thousands of slivers of the same event and the simulation goes quadratic.
   * Merging two lots of the SAME event is exactly lossless for provenance, and the tonnage-weighted
   * coarse fraction is exactly lossless for species mass. Lots from DIFFERENT events are never merged,
   * because that is precisely the information the product exists to keep.
   */
  private push(c: number, lot: Lot): void {
    const st = this.stacks[c];
    const top = st.length ? st[st.length - 1] : null;
    if (top && top.eventId === lot.eventId) {
      const t = top.tonnes + lot.tonnes;
      top.coarseFrac = (top.tonnes * top.coarseFrac + lot.tonnes * lot.coarseFrac) / t;
      top.tonnes = t;
      top.tS = Math.min(top.tS, lot.tS);
    } else {
      st.push(lot);
    }
    this.colT[c] += lot.tonnes;
    this.h[c] = this.colT[c] / this.tpm;
  }

  private popTop(c: number, tonnes: number): Lot[] {
    let want = tonnes;
    const taken: Lot[] = [];
    const st = this.stacks[c];
    let removed = 0;
    while (want > MIN_LOT_T && st.length > 0) {
      const top = st[st.length - 1];
      if (top.tonnes <= want + MIN_LOT_T) {
        st.pop();
        taken.push(top);
        want -= top.tonnes;
        removed += top.tonnes;
      } else {
        top.tonnes -= want;
        taken.push({ ...top, tonnes: want });
        removed += want;
        want = 0;
      }
    }
    this.colT[c] = Math.max(0, this.colT[c] - removed);
    this.h[c] = this.colT[c] / this.tpm;
    taken.reverse();
    return taken;
  }

  /**
   * SHIFT the coarse fraction of the top `tonnes` of a column by `dCoarse`.
   *
   * A shift, not an assignment. An avalanche does not consist only of the load that triggered it: it
   * carries whatever that load dislodged, which came from earlier dumps with their own size
   * distributions. Writing an absolute composition would stamp the current truck's size split onto
   * older material, destroying exactly the information the ledger exists to keep. What the solver
   * produces is a redistribution, and the two shifts cancel by construction, so applying the shift
   * conserves species mass and is exactly neutral when the solver is off.
   */
  private shiftTop(c: number, tonnes: number, dCoarse: number): void {
    if (Math.abs(dCoarse) < 1e-15) return;
    let want = tonnes;
    const st = this.stacks[c];
    let k = st.length - 1;
    while (want > MIN_LOT_T && k >= 0) {
      const lot = st[k];
      const share = lot.tonnes <= want + MIN_LOT_T ? 1 : want / lot.tonnes;
      lot.coarseFrac = Math.min(1, Math.max(0, lot.coarseFrac + dCoarse * share));
      want -= lot.tonnes;
      k--;
    }
  }

  /** Place one truck load and run its avalanche. Returns the number of downslope bands used. */
  deposit(dump: TruckDump, sr: number, nz = 32): number {
    const pad = this.pad;
    const ci = Math.min(pad.nx - 1, Math.max(0, Math.floor(dump.xM / pad.cellM)));
    const cj = Math.min(pad.ny - 1, Math.max(0, Math.floor(dump.yM / pad.cellM)));

    const active = new Set<number>();
    let placed = 0;
    for (const [di, dj, w] of this.footprint) {
      const i = ci + di;
      const j = cj + dj;
      if (i < 0 || i >= pad.nx || j < 0 || j >= pad.ny) continue;
      const c = j * pad.nx + i;
      const t = dump.tonnes * w;
      if (t <= MIN_LOT_T) continue;
      this.push(c, {
        eventId: dump.eventId, tonnes: t, gradeCuPct: dump.gradeCuPct,
        gradeAuGpt: dump.gradeAuGpt, coarseFrac: dump.coarseFrac, tS: dump.tS,
      });
      placed += t;
      active.add(c);
    }
    if (placed < dump.tonnes - MIN_LOT_T && active.size > 0) {
      // the footprint was clipped by the pad edge; the remainder lands on the centre cell so the mass
      // balance stays exact rather than quietly losing the overhang
      this.push(cj * pad.nx + ci, {
        eventId: dump.eventId, tonnes: dump.tonnes - placed, gradeCuPct: dump.gradeCuPct,
        gradeAuGpt: dump.gradeAuGpt, coarseFrac: dump.coarseFrac, tS: dump.tS,
      });
    }
    this.depositedT += dump.tonnes;

    const moves = cascade(this.h, pad.nx, pad.ny, pad.cellM, pad.reposeDeg, active);
    if (moves.length === 0) return 0;

    // The cascade is already in downslope order, so it is banded into a fixed number of steps along
    // the path. A fixed count keeps the segregation solve cheap and, more importantly, keeps the
    // non-dimensional path length equal to one whatever the avalanche's size, so Sr stays comparable
    // between a small dump and a large one.
    const nBands = Math.min(N_BANDS, moves.length);
    const band = moves.length / nBands;
    const layer = new FlowingLayer(1 - dump.coarseFrac, sr, nz);
    const dxNd = 1 / nBands;
    let arriving = dump.tonnes;

    for (let b = 0; b < nBands; b++) {
      const lo = Math.floor(b * band);
      const hi = b < nBands - 1 ? Math.floor((b + 1) * band) : moves.length;
      if (hi <= lo) continue;
      layer.advance(dxNd);

      let outT = 0;
      const bySrc = new Map<number, number>();
      for (let m = lo; m < hi; m++) {
        const t = moves[m][2] * this.tpm;
        outT += t;
        bySrc.set(moves[m][0], (bySrc.get(moves[m][0]) ?? 0) + t);
      }
      if (outT <= MIN_LOT_T) { arriving = 0; continue; }

      const staying = Math.max(0, arriving - outT);
      const baseFrac = Math.min(0.95, staying / (staying + outT));
      const phiBefore = layer.meanPhi;
      const [phiDep, phiMove] = layer.splitBase(baseFrac);
      const dDep = phiDep - phiBefore;
      const dMove = phiMove - phiBefore;

      if (staying > MIN_LOT_T) {
        for (const [src, moved] of bySrc) {
          this.shiftTop(src, Math.min(staying * (moved / outT), this.colT[src]), -dDep);
        }
      }

      for (let m = lo; m < hi; m++) {
        const [src, dst, dh] = moves[m];
        const t = dh * this.tpm;
        if (t <= MIN_LOT_T) continue;
        for (const lot of this.popTop(src, t)) {
          this.push(dst, { ...lot, coarseFrac: Math.min(1, Math.max(0, lot.coarseFrac - dMove)) });
        }
        const i = dst % pad.nx;
        const j = (dst / pad.nx) | 0;
        if (i === 0 || i === pad.nx - 1 || j === 0 || j === pad.ny - 1) this.touchedBoundary = true;
      }
      arriving = outT;
    }
    return nBands;
  }

  private reclaimCells(method: ReclaimMethod, front: number, salt: number): number[] {
    const { nx, ny } = this.pad;
    if (method === 'fullface' || method === 'end') {
      return Array.from({ length: ny }, (_, j) => j * nx + front);
    }
    if (method === 'bucketwheel') {
      const lo = Math.floor(ny / 3);
      const n = Math.max(1, Math.floor(ny / 3));
      return Array.from({ length: Math.min(n, ny - lo) }, (_, k) => (lo + k) * nx + front);
    }
    // a loader works wherever the face is accessible; always biting the crest would flatter the method
    const step = Math.max(1, Math.floor(ny / 3));
    const js = [0, 1, 2].map((k) => (salt * 7 + k * step) % ny);
    return [...new Set(js.map((j) => Math.min(ny - 1, Math.max(0, j)) * nx + front))].sort((a, b) => a - b);
  }

  /** Take one cut and return it with its provenance, plus the station the machine ended on. */
  reclaim(
    cutId: number, tS: number, targetT: number, method: ReclaimMethod, front: number,
  ): [ReclaimCut | null, number] {
    const nx = this.pad.nx;
    let f = Math.min(nx - 1, Math.max(0, front));
    const spec = RECLAIM_GEOMETRY[method];
    const taken: Lot[] = [];
    let got = 0;
    let stations = 0;

    // A shallow-reaching machine cannot fill a cut from one station, so it advances along the pile,
    // exactly as it would on a pad. Returning one undersized cut per station instead would produce
    // thousands of tiny cuts and make the reclaimed stream look far more variable than it is, purely
    // as an artefact of the model's step size.
    while (got < targetT - MIN_LOT_T && stations < nx) {
      const cells = this.reclaimCells(method, f, cutId + stations);
      let reach = 0;
      for (const c of cells) reach += this.colT[c] * spec.depth;
      if (reach <= MIN_LOT_T) { f = (f + 1) % nx; stations++; continue; }
      const want = Math.min(targetT - got, reach);

      if (spec.proportional) {
        let avail = 0;
        for (const c of cells) avail += this.colT[c];
        const frac = want / avail;
        for (const c of cells) {
          const st = this.stacks[c];
          if (st.length === 0) continue;
          const keep: Lot[] = [];
          let removed = 0;
          for (const lot of st) {
            const part = lot.tonnes * frac;
            if (part > MIN_LOT_T) { taken.push({ ...lot, tonnes: part }); removed += part; }
            const rest = lot.tonnes - part;
            if (rest > MIN_LOT_T) keep.push({ ...lot, tonnes: rest });
          }
          this.stacks[c] = keep;
          this.colT[c] = Math.max(0, this.colT[c] - removed);
          this.h[c] = this.colT[c] / this.tpm;
        }
      } else {
        const perCell = want / cells.length;
        for (const c of cells) {
          taken.push(...this.popTop(c, Math.min(perCell, this.colT[c] * spec.depth)));
        }
      }

      let newGot = 0;
      for (const lot of taken) newGot += lot.tonnes;
      if (newGot <= got + MIN_LOT_T) { f = (f + 1) % nx; stations++; continue; }
      got = newGot;
      if (got < targetT - MIN_LOT_T) { f = (f + 1) % nx; stations++; }
    }

    if (got <= MIN_LOT_T) return [null, f];

    const sources = new Map<number, number>();
    let gCu = 0;
    let gAu = 0;
    let coarse = 0;
    let resid = 0;
    for (const lot of taken) {
      sources.set(lot.eventId, (sources.get(lot.eventId) ?? 0) + lot.tonnes);
      gCu += lot.tonnes * lot.gradeCuPct;
      gAu += lot.tonnes * lot.gradeAuGpt;
      coarse += lot.tonnes * lot.coarseFrac;
      resid += lot.tonnes * (tS - lot.tS);
    }
    for (const [k, v] of sources) sources.set(k, v / got);

    this.reclaimedT += got;
    return [{
      cutId, tS, tonnes: got, gradeCuPct: gCu / got, gradeAuGpt: gAu / got,
      coarseFrac: coarse / got, nLayers: sources.size, residenceS: resid / got, sources,
    }, f];
  }

  /**
   * Cells in the lowest and highest thirds of the occupied pad, by height.
   *
   * Defining the toe and the apex by height rather than by distance from a nominal centre keeps the
   * segregation index meaningful for every stacking geometry, including the ones that build several
   * crests.
   */
  toeApexSplit(): [number[], number[]] {
    const occ: Array<[number, number]> = [];
    for (let c = 0; c < this.h.length; c++) if (this.h[c] > 1e-6) occ.push([this.h[c], c]);
    if (occ.length < 6) return [[], []];
    occ.sort((a, b) => a[0] - b[0]);
    const k = Math.max(1, Math.floor(occ.length / 3));
    return [occ.slice(0, k).map((x) => x[1]), occ.slice(-k).map((x) => x[1])];
  }

  apexHeightM(): number {
    let m = 0;
    for (let i = 0; i < this.h.length; i++) if (this.h[i] > m) m = this.h[i];
    return m;
  }

  /** Steepest local slope actually standing, in degrees. Shown next to the IMPOSED repose angle. */
  steepestSlopeDeg(): number {
    const { nx, ny, cellM } = this.pad;
    let worst = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = j * nx + i;
        if (i + 1 < nx) worst = Math.max(worst, Math.abs(this.h[c] - this.h[c + 1]));
        if (j + 1 < ny) worst = Math.max(worst, Math.abs(this.h[c] - this.h[c + nx]));
      }
    }
    return (Math.atan2(worst, cellM) * 180) / Math.PI;
  }
}
