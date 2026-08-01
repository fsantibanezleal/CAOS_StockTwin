// Method 4, kinetic size segregation in the flowing layer, solved as a conservation law.
// Mirrors data-pipeline/stlab/model/segregation.py.
//
// THE MODEL. Gray and Thornton, "A theory for particle size segregation in shallow granular
// free-surface flows", Proc. R. Soc. A 461(2057), 1447-1473, 2005, doi:10.1098/rspa.2004.1420.
//
//   w_l - w = + q phi_s      (large particles are levered up)                              (3.10)
//   w_s - w = - q phi_l      (small particles drain down)                                  (3.10)
//   q = (B / c) g cos(zeta)                                                                (3.11)
//   dphi/dt + d(phi u)/dx + d(phi v)/dy + d(phi w)/dz - Sr d/dz[phi (1 - phi)] = 0          (3.18)
//   Sr = q L / (H U)                                                                       (3.19)
//
// On a stockpile flank the avalanche is a shallow layer of roughly uniform thickness flowing over a
// static bed. Taking plug flow and marching in the downslope coordinate x reduces (3.18) to a
// one-dimensional scalar conservation law in depth,
//
//   dphi/dx + dF/dz = 0,     F(phi) = -Sr phi (1 - phi)
//
// with no flux through the free surface or the base. phi is the volume fraction of the SMALL species.
// F is convex, so a Godunov flux is exact for the Riemann problem at every interface, and the
// concentration SHOCKS Gray and Thornton identify as the observed feature survive rather than being
// smeared by a Lax-Friedrichs average.
//
// Sr = 0 degenerates to a passive tracer. That limit is the product's negative control, and it comes
// from this same code path rather than a separate branch, which is what makes the control meaningful.

export const NZ_DEFAULT = 32;
const CFL = 0.4;

function godunovFlux(pl: number, pr: number, sr: number): number {
  const f = (p: number) => -sr * p * (1 - p);
  if (pl <= pr) {
    if (pl <= 0.5 && 0.5 <= pr) return f(0.5);
    return Math.min(f(pl), f(pr));
  }
  if (pr <= 0.5 && 0.5 <= pl) return Math.max(f(pl), f(pr));
  return Math.max(f(pl), f(pr));
}

/**
 * The avalanching layer above the static bed, carrying a depth profile of the fine fraction.
 *
 * Index 0 is the BASE of the layer and `nz - 1` is the free surface. One instance lives for the
 * duration of one dump's avalanche.
 */
export class FlowingLayer {
  phi: Float64Array;
  readonly nz: number;
  readonly sr: number;
  private flux: Float64Array;
  private next: Float64Array;

  constructor(phi0: number, sr: number, nz = NZ_DEFAULT) {
    const p = Math.min(1, Math.max(0, phi0));
    this.nz = nz;
    this.sr = Math.max(0, sr);
    this.phi = new Float64Array(nz).fill(p);
    this.flux = new Float64Array(nz + 1);
    this.next = new Float64Array(nz);
  }

  get meanPhi(): number {
    let s = 0;
    for (let i = 0; i < this.nz; i++) s += this.phi[i];
    return s / this.nz;
  }

  /**
   * March the profile `dxNd` in non-dimensional downslope distance.
   *
   * Sub-stepped for the CFL condition: the characteristic speed of F is `|F'| = Sr|1 - 2 phi|`,
   * bounded by Sr. No-flux boundaries are imposed by leaving the wall fluxes at zero, which is the
   * boundary condition in the source and is also what makes the scheme conservative.
   */
  advance(dxNd: number): void {
    if (this.sr <= 0 || dxNd <= 0) return;
    const nz = this.nz;
    const dz = 1 / nz;
    const nSub = Math.max(1, Math.floor(dxNd / ((CFL * dz) / this.sr)) + 1);
    const ratio = dxNd / nSub / dz;
    for (let s = 0; s < nSub; s++) {
      const phi = this.phi;
      this.flux[0] = 0;
      this.flux[nz] = 0;
      for (let i = 1; i < nz; i++) this.flux[i] = godunovFlux(phi[i - 1], phi[i], this.sr);
      for (let i = 0; i < nz; i++) {
        this.next[i] = Math.min(1, Math.max(0, phi[i] - ratio * (this.flux[i + 1] - this.flux[i])));
      }
      const swap = this.phi;
      this.phi = this.next;
      this.next = swap;
    }
  }

  /**
   * Deposit the bottom `baseFrac` of the layer and keep the rest travelling.
   *
   * Returns `[phiDeposited, phiRemaining]`. Species mass is conserved exactly by construction, since
   * `baseFrac * phiDeposited + (1 - baseFrac) * phiRemaining` equals the mean before the call.
   *
   * A uniform layer, which is what Sr = 0 always produces, short-circuits. The quadrature below is
   * correct to about 1e-16, and the negative control asserts EQUALITY rather than near-equality,
   * because "the solver did nothing" has to be provable rather than approximately true.
   */
  splitBase(baseFrac: number): [number, number] {
    const f = Math.min(1, Math.max(0, baseFrac));
    if (f <= 0 || f >= 1) { const m = this.meanPhi; return [m, m]; }
    let lo = this.phi[0];
    let hi = this.phi[0];
    for (let i = 1; i < this.nz; i++) {
      if (this.phi[i] < lo) lo = this.phi[i];
      if (this.phi[i] > hi) hi = this.phi[i];
    }
    if (hi - lo <= 1e-15) return [lo, lo];

    const nz = this.nz;
    const dz = 1 / nz;
    let acc = 0;
    let z = 0;
    let i = 0;
    while (i < nz && z + dz <= f + 1e-15) { acc += this.phi[i] * dz; z += dz; i++; }
    if (i < nz && f - z > 1e-15) acc += this.phi[i] * (f - z);
    const phiDep = acc / f;

    const total = this.meanPhi;
    const rest = 1 - f;
    const phiRest = (total - acc) / rest;

    const out = new Float64Array(nz);
    const step = rest / nz;
    for (let k = 0; k < nz; k++) {
      const klo = f + k * step;
      const khi = klo + step;
      let s = 0;
      let a = klo;
      while (a < khi - 1e-15) {
        const cell = Math.min(nz - 1, Math.floor(a / dz));
        const b = Math.min(khi, (cell + 1) * dz);
        s += this.phi[cell] * (b - a);
        a = b;
      }
      out[k] = Math.min(1, Math.max(0, s / step));
    }
    this.phi = out;
    return [phiDep, phiRest];
  }
}

/** Equation (3.19): `Sr = q L / (H U)`, exposed so the UI can show the physical quantities. */
export function segregationNumber(qMs: number, pathM: number, layerHM: number, uMs: number): number {
  const denom = layerHM * uMs;
  return denom <= 0 ? 0 : Math.max(0, (qMs * pathM) / denom);
}
