# Calibrating the Gray-Thornton segregation number Sr

**Date:** 2026-08-04 · **Product:** StockTwin (v0.05.000) · **Method under review:** 07, the discrete-element
calibration heap · **Status of this document:** research dossier, persisted before any implementation.

Every equation, number and DOI below was resolved against the primary source in this session. Anything
derived by me is labelled DERIVED and the arithmetic is shown. Anything I could not resolve is labelled
UNVERIFIED.

---

## 1. The headline

Three findings, in order of consequence.

1. **Gray and Thornton never measure Sr.** Every figure in the 2005 paper (figures 3 through 9) uses
   `Sr = 1`, and the caption of figure 4 says why: "The segregation number `Sr = 1` which implies that
   all of the solutions segregate fully at `x = 1`." It is a normalisation that puts the triple point at
   the right-hand edge of the plotted domain, not an observation. The product's current anchor is
   therefore not weak evidence, it is *no* evidence, and `docs/methods/07_dem-calibration.md` is right to
   say so.

2. **Sr for this product's own geometry can be calibrated today, from published measurements, with zero
   compute, and it comes out near 0.3, not 1.** Two independent calibrations, one DEM (Fan et al. 2014,
   a bounded heap, the correct geometry) and one experimental (Trewhela et al. 2021, a refractive-index
   matched shear cell), agree to within 19 percent once Trewhela's own packing-efficiency correction is
   applied. See section 5. The current anchor `Sr = 1` sits at the top of the plausible band and is only
   reached if the flowing layer is about four particle diameters thick rather than eight.

3. **The DEM lane cannot be run on this host today, and should not be.** `conda` is not installed
   (verified: `Get-Command conda` returns nothing). Even with conda installed, PyChrono is a 504 MB
   package pulling roughly 1.3 GB of compressed CUDA 12.8, cuBLAS, cuSPARSE, NPP and MKL dependencies for
   one calibration step that runs once per release. And it would produce, at best, a worse version of the
   number Fan et al. already measured with up to a million particles and validated against a physical
   experiment. See sections 6 and 7.

The recommendation is to **delist method 7 as written and replace it with method 7-prime: a fit of `Sr`
against published measured profiles and percolation length scales.** That is cheaper, more defensible,
and it is a *real* calibration rather than a self-referential one.

---

## 2. What Sr is, dimensionally, from the source

Gray, J.M.N.T. and Thornton, A.R. (2005). *A theory for particle size segregation in shallow granular
free-surface flows.* Proc. R. Soc. A **461**(2057), 1447-1473. doi:10.1098/rspa.2004.1420.
Full text read at https://eprints.maths.manchester.ac.uk/193/1/PRS_GrayThornton.pdf (MIMS EPrint 2006.39).

The chain, with the paper's own equation numbers:

**Pressure partition (3.9).** The load is not shared in proportion to volume fraction; the small grains
support less than their share while they percolate.

$$f^{l} = \phi^{l} + B\,\phi^{s}\phi^{l}, \qquad f^{s} = \phi^{s} - B\,\phi^{s}\phi^{l}$$

**Percolation velocities relative to the bulk (3.10).**

$$w^{l} - w = +q\,\phi^{s}, \qquad w^{s} - w = -q\,\phi^{l}$$

**Mean segregation velocity (3.11).**

$$q = \frac{B}{c}\,g\cos\zeta$$

**Non-dimensionalisation (3.17).** `x = L x̃`, `z = H z̃`, `(u,v) = U(ũ,ṽ)`, `w = (HU/L) w̃`, `t = (L/U) t̃`.

**The segregation equation (3.18) and the segregation number (3.19).**

$$\frac{\partial\phi}{\partial t} + \frac{\partial}{\partial x}(\phi u) + \frac{\partial}{\partial y}(\phi v) + \frac{\partial}{\partial z}(\phi w) - S_r\frac{\partial}{\partial z}\Big[\phi(1-\phi)\Big] = 0$$

$$\boxed{\;S_r = \frac{q\,L}{H\,U}\;}$$

The paper's own words: `Sr` "is the ratio of the mean segregation velocity to typical magnitudes of the
normal bulk velocity, `w`."

**Units.** `q` is m/s, `L` and `H` are m, `U` is m/s. `Sr` is dimensionless.

**The crucial consequence, which the product must state.** `Sr` is **not a material property**. It is a
material property (`q`, or equivalently a percolation length scale `S`) divided by a *geometry*
(`HU/L`). Two flows of the same ore at the same shear rate have different `Sr` if their flank length or
their flowing-layer thickness differ. Any sentence of the form "the segregation number of this ore is
X" is wrong. The correct statement is `Sr = L / L_seg` where

$$L_{\text{seg}} = \frac{H\,U}{q}$$

is the downslope distance over which a full-depth column segregates completely. This follows directly
from (4.16) to (4.18), where the triple point at which the two shocks merge sits at `x = 1/Sr` in
non-dimensional units.

**Symbols.** `φ` volume fraction of the small species, dimensionless; `φ^s, φ^l` small and large
fractions, summing to 1; `w^s, w^l, w` normal velocities of each species and of the bulk, m/s;
`q` mean segregation velocity, m/s; `B` dimensionless magnitude of the pressure-partition perturbation;
`c` inter-particle drag coefficient, units such that `B/c` has units of velocity per unit acceleration
(s); `ζ` slope inclination, rad; `L`, `H`, `U` typical path length (m), flowing-layer thickness (m) and
downslope velocity (m/s); `g` 9.81 m/s².

**Gray and Thornton give no value for `B` or `c`.** They say only, of (3.11), that "the case of constant
`q` is investigated as it is the simplest mathematical structure that leads to segregation." The
parameter is left open on purpose. This is the root cause of the product's problem.

---

## 3. The published values of Sr, with what each one actually is

There is no published *range* of `Sr` for bidisperse mixtures, because `Sr` is geometry-dependent and
nobody reports it as a material constant. What is published is `q` (or the percolation length scale `S`,
or a fitted scaling law for `f_sl`), from which `Sr` follows once a geometry is named. The table below is
therefore split: the *measured* column is what the paper reports; the *Sr* column is derived by me from
that measurement plus the paper's own stated geometry, with the arithmetic shown.

| # | Source | System | Size ratio `R = d_l/d_s` | Small-particle conc. | What is measured | `Sr` (derived) |
|---|---|---|---|---|---|---|
| 1 | Gray and Thornton 2005, figs 3-9 | chute, theory only | n/a | `φ0` = 0.1, 0.3, 0.5, 0.6 | nothing; `Sr = 1` **chosen** in every figure so that full segregation lands at `x = 1` | 1 (a normalisation, NOT a measurement) |
| 2 | Wiederseiner et al. 2011, Table III run 22 | 3 m chute, glass beads, ζ = 29° | 2 (1 and 2 mm) | φ̄ = 0.74 | `q` = 1.99 mm/s, `D` = 2.52 mm²/s, `Pe` = 19, `h` = 24 mm, `ū` = 34.5 mm/s | `L_seg` = 416 mm; `Sr` = 1.68 over the 0.70 m observation window, 7.2 over the full 3 m flume |
| 3 | Wiederseiner et al. 2011, run 23 | same | 2 | φ̄ = 0.50 | `q` = 1.23, `D` = 2.08, `Pe` = 16.5, `h` = 28, `ū` = 26.6 | `L_seg` = 606 mm; `Sr` = 1.16 / 4.95 |
| 4 | Wiederseiner et al. 2011, run 24 | same | 2 | φ̄ = 0.52 | `q` = 1.61, `D` = 2.79, `Pe` = 11, `h` = 19, `ū` = 35.2 | `L_seg` = 415 mm; `Sr` = 1.69 / 7.22 |
| 5 | Wiederseiner et al. 2011, run 25 | same | 2 | φ̄ = 0.67 | `q` = 1.74, `D` = 2.66, `Pe` = 13, `h` = 20, `ū` = 36.4 | `L_seg` = 418 mm; `Sr` = 1.67 / 7.17 |
| 6 | Fan et al. 2014, fig 5 left | quasi-2D **bounded heap**, DEM validated against experiment | 2 (1 and 2 mm) | `c_s(0)` = 0.5 | `S` = 0.19 mm, `L` = 490 mm, `δ` = 11 mm, `q` = 360 mm²/s, `D` = 0.8 mm²/s, **Λ = 0.78**, `Pe` = 19 | **0.78** (Λ ≡ `Sr`, see section 4) |
| 7 | Fan et al. 2014, fig 5 right | same, higher feed rate | 2 | 0.5 | `S` = 0.18 mm, `L` = 430 mm, `δ` = 14 mm, `q` = 1200 mm²/s, `D` = 2.83 mm²/s, **Λ = 0.40**, `Pe` = 28 | **0.40** |
| 8 | Trewhela et al. 2021, Table 3 + eq (7.8) | oscillatory shear cell, index-matched | 1.17 to 4.17 | 0 to 1 | `A` = 0.108, `B` = 0.3744, `C` = 0.2712, `E` = 2.0957 | `Sr` is a **field**, not a constant; see (7.8) in section 4 |
| 9 | Thornton et al. 2012 DPM, digitised in Trewhela et al. 2021 fig 15 | DPM chute, 50:50 | 1.0 to 2.0 | 0.5 | steady-state segregation Péclet number from ~2.5 at `R` = 1.1 rising to a **maximum ~7.5 at `R` ≈ 1.7**, falling to ~7.0 at `R` = 2.0 | `Pe`, not `Sr`; establishes the size-ratio dependence |
| 10 | Golick and Daniels 2009 | annular shear cell, `d_L` = 6 mm, `d_S` = 1.5 to 5.0 mm | 1.2 to 4 (`r = d_S/d_L` = 0.25 to 0.83) | 0.5 by mass | dimensionless segregation rate `Ω_s`, **non-monotonic in size ratio, maximum at `r = 3/6`, i.e. `R = 2`**; a fivefold increase in confining pressure cuts `Ω_s` by a factor of 100 at low `r` | qualitative; establishes that `Sr` is not monotone in `R` and is strongly pressure-dependent |

### Arithmetic behind rows 2 to 5

`Pe = qh/D` is the paper's own definition (their §II, below eq 13); recomputing it from Table III is a
consistency check on my reading of the table:

| Run | `q h / D` | `Pe` reported | `L_seg = hū/q` | `Sr` over `L` = 700 mm |
|---|---|---|---|---|
| 22 | 1.99·24/2.52 = 18.95 | 19 | 24·34.5/1.99 = **416 mm** | 700/416 = **1.68** |
| 23 | 1.23·28/2.08 = 16.56 | 16.5 | 28·26.6/1.23 = **606 mm** | **1.16** |
| 24 | 1.61·19/2.79 = 10.96 | 11 | 19·35.2/1.61 = **415 mm** | **1.69** |
| 25 | 1.74·20/2.66 = 13.08 | 13 | 20·36.4/1.74 = **418 mm** | **1.67** |

All four reproduce the published `Pe` to better than one percent, so the extraction is sound.
`L` = 700 mm is the length of the panoramic observation window (their §III B, ten stitched 7 cm frames);
`L` = 3000 mm is the full flume.

### What row 1 means for the product

The statement currently in `docs/methods/07_dem-calibration.md` is accurate but understates the problem.
It says figure 4 "shows a layer segregating completely within one non-dimensional path length at
`Sr = 1`, which is a statement of the model rather than an independent measurement." Correct, and the
figure caption confirms it verbatim. But `Sr = 1` is used in **every** figure of the paper, including the
time-dependent (figs 6, 7) and numerical (figs 8, 9) sections. There is no figure in Gray and Thornton
2005 at any other value. The anchor is a plotting convention.

---

## 4. The bridge that makes the calibration possible without any DEM

### 4.1 Fan et al. 2014: `q = S γ̇`, and Λ is Sr

Fan, Y., Schlick, C.P., Umbanhowar, P.B., Ottino, J.M. and Lueptow, R.M. (2014). *Modeling size
segregation of granular materials: the roles of segregation, advection and diffusion.* J. Fluid Mech.
**741**, 252-279. doi:10.1017/jfm.2013.680. Full text read at https://arxiv.org/pdf/1401.7387.

They ran DEM (linear spring-dashpot, Cundall and Strack, up to one million particles, `ρ` = 2500 kg/m³,
`ε` = 0.8, `μ` = 0.4, `t_c` = 1e-3 s, `dt` = 1e-5 s) on a **quasi-2D bounded heap** of width `W` = 45.7 cm,
gap `T` = 1.27 cm, and measured the percolation velocity directly. Their equation (2.10):

$$w_{p,l} = S\,\dot\gamma\,(1-c_l), \qquad w_{p,s} = -S\,\dot\gamma\,(1-c_s)$$

This is **structurally identical to Gray and Thornton (3.10)** with

$$\boxed{\;q = S\,\dot\gamma\;}$$

where `S` is a **percolation length scale** with units of metres. `S` is the transferable material
quantity that Gray and Thornton left open as `B/c`.

Their **Table 1**, the measured values, with `d̄ = φ^l d_l + φ^s d_s` = 0.5(`d_s + d_l`) at the 50:50 inlet
and `S/d̄` DERIVED by me:

| `R` | `d_s` (mm) | `d_l` (mm) | `Q` (mm³/s) | `S` (mm) | `d̄` (mm) | `S/d̄` (DERIVED) |
|---|---|---|---|---|---|---|
| 1.5 | 1.0 | 1.5 | 1.52e4 | 0.067 | 1.25 | 0.054 |
| 1.5 | 1.5 | 2.25 | 1.52e4 | 0.20 | 1.875 | 0.107 |
| 1.5 | 2.0 | 3.0 | 1.52e4 | 0.33 | 2.50 | 0.132 |
| 2.0 | 1.0 | 2.0 | 4.57e3 | 0.19 | 1.50 | 0.127 |
| 2.0 | 1.0 | 2.0 | 1.52e4 | 0.18 | 1.50 | 0.120 |
| 2.0 | 1.0 | 2.0 | 5.48e4 | 0.17 | 1.50 | 0.113 |
| 2.0 | 1.5 | 3.0 | 1.52e4 | 0.38 | 2.25 | 0.169 |
| 3.0 | 1.0 | 3.0 | 1.52e4 | 0.29 | 2.00 | 0.145 |
| 3.0 | 1.0 | 3.0 | 5.48e4 | 0.30 | 2.00 | 0.150 |

Two properties of this table matter enormously for StockTwin.

* **`S` is essentially independent of the feed rate.** The three `R` = 2 rows at `Q` = 4.57e3, 1.52e4 and
  5.48e4 mm³/s, a twelvefold change, give `S` = 0.19, 0.18, 0.17 mm. A ten percent spread over an order
  of magnitude of throughput. This is a robust material constant, which is exactly what a stockpile model
  needs, because tipping rate varies enormously in operation.
* **`S` scales with particle size, not with `R` alone.** `S/d̄` clusters around **0.13**, with a full range
  of 0.054 to 0.169. The paper's own summary: "`S` is somewhat smaller than the size of the smallest
  particles."

Their non-dimensionalisation (3.2) uses `x̃ = x/L`, `z̃ = z/δ`, `ũ = u/(2q/δ)`, yielding (3.3):

$$\Lambda = \frac{S\,L}{\delta^{2}}, \qquad Pe = \frac{2q\,\delta}{D\,L}$$

and the paper's own gloss: "Λ is the ratio of an advection timescale, `L/u = L/(2q/δ)`, to a segregation
timescale, `δ/w_p = δ/(2Sq/δ²)`."

**Λ is Sr.** Substitute `q_GT = S γ̇` into (3.19) with `H = δ` and the reference shear rate `γ̇ = U/δ`:

$$S_r = \frac{q_{GT} L}{H U} = \frac{S(U/\delta)L}{\delta U} = \frac{S L}{\delta^{2}} = \Lambda$$

The identity is exact under `γ̇_ref = U/δ`, which is the plug-with-basal-shear estimate the StockTwin
solver already assumes. The only difference is that Fan et al. keep the streamwise and depth dependence
of `γ̇` explicit through the factors `(1 - x̃)` and `g(z̃)` in their (3.3), whereas Gray and Thornton hold
`q` constant. So `Λ` is `Sr` evaluated at a reference shear rate.

**Verification of Λ from their own reported numbers** (their figure 5 caption):

* low feed: `S L/δ²` = 0.19 · 490 / 11² = 93.1/121 = 0.769, reported **Λ = 0.78**. ✔
* high feed: 0.18 · 430 / 14² = 77.4/196 = 0.395, reported **Λ = 0.40**. ✔

So a **bidisperse laboratory heap with `R` = 2 has a measured `Sr` between 0.40 and 0.78.** That is the
first genuine measured `Sr` in the literature for the geometry StockTwin models.

### 4.2 Trewhela et al. 2021: a fitted scaling law for the segregation velocity

Trewhela, T., Ancey, C. and Gray, J.M.N.T. (2021). *An experimental scaling law for particle-size
segregation in dense granular flows.* J. Fluid Mech. **916**, A55. doi:10.1017/jfm.2021.227. Full text read
at https://personalpages.manchester.ac.uk/staff/nico.gray/Papers/JFM_916_2021.pdf.

This is the modern replacement for `q = const`. Refractive-index matched oscillatory shear cell,
6 to 25 mm borosilicate beads, size ratios 1.17 to 4.17, shear rates 0.26 to 2.3 s⁻¹.

**Segregation velocity magnitude (4.9):**

$$f_{sl} = \mathcal{B}\,\frac{\rho_{*}g\,\dot\gamma\,\bar d^{2}}{\mathcal{C}\rho_{*}g\bar d + p}\,\mathcal{F}(R,\phi^{s})$$

**Size-ratio function (7.3), (7.4):**

$$\mathcal{F} = (R-1) + \mathcal{E}\,\Lambda(\phi^{s})(R-1)^{2}, \qquad \Lambda(\phi^{s}) = \phi^{l} = 1-\phi^{s}$$

**Diffusivity (7.5), after Utter and Behringer 2004:**

$$\mathcal{D}_{sl} = \mathcal{A}\,\dot\gamma\,\bar d^{2}$$

**Mean grain size (4.2):** `d̄ = φ^l d_l + φ^s d_s`. **Lithostatic pressure (4.13):** `p = ρ* g Φ (h - z)`,
`Φ` the solids volume fraction. **Non-dimensional segregation rate (7.8):**

$$S_r = \frac{T f_{sl}}{h} = \frac{\mathcal{B}\dot\gamma T(\bar d/h)^{2}\mathcal{F}}{\mathcal{C}(\bar d/h) + \Phi(1-\hat z)}$$

With `T = L/U` this is exactly Gray and Thornton (3.19) with `q → f_sl`, so the two formulations are
consistent and (7.8) is the direct generalisation of `Sr` to a spatially varying field.

**Table 3, the fitted non-dimensional coefficients:**

$$\mathcal{A} = 0.108, \qquad \mathcal{B} = 0.3744, \qquad \mathcal{C} = 0.2712, \qquad \mathcal{E} = 2.0957$$

**Two corrections the paper itself insists on, and which StockTwin must apply.**

* **Dry correction (§4.3, §8).** The experiments used an interstitial fluid (benzyl alcohol / ethanol,
  `ρ_f` = 1.044 g/cm³, grains `ρ_*` = 2.2 g/cm³). Thornton, Gray and Hogg (2006), doi:10.1017/S0022112005007676,
  showed `f_sl` is moderated by `ρ̂ = (ρ_* - ρ_f)/ρ_*`. Trewhela §8: "To account for the absence of an
  interstitial fluid, the constant `B` is divided by a buoyancy factor." For this system
  `ρ̂ = (2.2 - 1.044)/2.2 = 0.5255`, so a **dry** flow uses
  `B_dry = 0.3744/0.5255 = ` **0.7125** (DERIVED).
* **Packing-efficiency reduction (§8, eqs 8.2, 8.3).** Their own law overpredicts the segregation rate at
  intermediate concentrations relative to Thornton et al.'s (2012) DPM data. They fix it with
  $$\mathcal{R} = 1 + a(R-1)^{2}\phi^{s}(1-\phi^{s}), \qquad a = 9$$
  dividing the Péclet number (and hence the segregation rate). Their words: this "accurately captures
  Thornton et al.'s (2012) steady-state Péclet number dependence on `R`, with a maximum segregation at a
  grain-size ratio of `R` ≈ 1.66", against `R` ≈ 1.7 in the DPM. It is also what reconciles the law with
  Golick and Daniels' non-monotonic result at `R` ≈ 2 (table row 10).

### 4.3 Do the two calibrations agree? Yes, once the corrections are applied.

Evaluate Trewhela at Fan's lab-heap conditions (`d̄` = 1.5 mm, `δ` = 11 mm, `R` = 2, `φ^s` = 0.5, `Φ` = 0.6,
mid-depth so `h - z` = 5.5 mm) and read off the effective `S = f_sl/γ̇`:

* `C d̄` = 0.2712 · 1.5 = 0.407 mm; `p/(ρ*g)` = `Φ(h-z)` = 0.6 · 5.5 = 3.30 mm; denominator = 3.71 mm
* `F` = (2-1) + 2.0957 · 0.5 · 1 = 2.048
* `S_eff` = `B_dry` · `d̄²` · `F` / 3.71 mm = 0.7125 · 2.25 · 2.048 / 3.71 = **0.885 mm**
* packing factor at `R` = 2, `φ^s` = 0.5: `R` = 1 + 9 · 1 · 0.25 = 3.25
* corrected `S_eff` = 0.885 / 3.25 = **0.272 mm**

Fan et al. measured `S` = **0.18 mm** for the same `R` = 2, `d̄` = 1.5 mm mixture. Uncorrected, Trewhela is
4.9x high. With Trewhela's own two corrections applied, the two independent calibrations land within
**1.5x** of each other. That is genuinely good for granular segregation and it is the honest error bar.

---

## 5. What Sr is for StockTwin, from published measurements only

### 5.1 The product's own geometry

From `bedblend/material.py` (installed `bedblend==0.6.0`, the version StockTwin depends on):

| Quantity | Value | Source |
|---|---|---|
| `d50_mm` | 120.0 | `Material` default, ROM ore |
| `coarse_fraction` | 0.35, so `φ^s` = 0.65 | same |
| `repose_dry_deg` | 37.0 | same |
| reference drop | 11.0 m | `facesegregation.REFERENCE_DROP_M`, the published 10 to 12 m stockpile-height limit |

DERIVED geometry: flank slope length `L = drop / sin(37°) = 11 / 0.6018 =` **18.3 m**. Take `d̄` = 0.12 m,
`R` = 2, `Φ` = 0.6, `U` = 4 m/s, and a flowing-layer thickness `δ` = 1.0 m, which is 8.3 `d̄`, inside Fan's
measured `δ/d̄` = 7.3 to 9.3 for a heap.

### 5.2 Route A, Fan's percolation length scale

`S = 0.13 d̄ = 0.13 · 0.12 =` 0.0156 m.

$$S_r = \Lambda = \frac{S L}{\delta^{2}} = \frac{0.0156 \times 18.3}{1.0^{2}} = \mathbf{0.285}$$

### 5.3 Route B, Trewhela's scaling law, dry- and packing-corrected

`γ̇ = U/δ` = 4 s⁻¹; `φ^s` = 0.65 so `Λ(φ^s)` = 0.35; `F` = 1 + 2.0957 · 0.35 · 1 = 1.7335;
`C ρ* g d̄` = 0.2712 · 2700 · 9.81 · 0.12 = 862 Pa; `p` = 2700 · 9.81 · 0.6 · 0.5 = 7946 Pa.

* `f_sl` (dry `B` = 0.7125) = 0.7125 · 2700 · 9.81 · 4 · 0.12² · 1.7335 / 8808 = **0.225 m/s**
* packing factor: `R` = 1 + 9 · 1 · 0.65 · 0.35 = 3.048
* corrected `f_sl` = 0.225 / 3.048 = **0.0738 m/s**

$$S_r = \frac{f_{sl}L}{\delta U} = \frac{0.0738 \times 18.3}{1.0 \times 4.0} = \mathbf{0.338}$$

### 5.4 The calibrated value, and where the real uncertainty lives

**Two independent published calibrations, in the product's own geometry, give `Sr` = 0.285 and 0.338, a
19 percent spread. Recommended central value `Sr` = 0.31.**

The method spread is *not* the dominant uncertainty. `Sr ∝ δ⁻²`, and the flowing-layer thickness on a
mine-scale dumped face has never been measured. Sensitivity, Route A:

| `δ` | `δ/d̄` | `Sr` |
|---|---|---|
| 0.5 m | 4.2 | **1.14** |
| 0.75 m | 6.3 | 0.51 |
| 1.0 m | 8.3 | **0.29** |
| 1.25 m | 10.4 | 0.18 |
| 1.5 m | 12.5 | 0.13 |

So `Sr = 1`, the current anchor, is recovered only if the avalanching layer is about four particle
diameters thick. Fan et al. measured 7.3 to 9.3 for a heap and note the flowing layer in bounded heap flow
is "only a few particle diameters thick (< 10 `d_l`)". Eight is the better prior. **`Sr` = 1 is therefore
roughly three times too high**, and the honest statement of the error is `Sr` = 0.3, plausible band
0.13 to 1.14, dominated by `δ`, not by the segregation physics.

### 5.5 Why this is not a cosmetic change

`docs/methods/04_segregation.md` reports the measured response of the toe-minus-apex coarse-fraction
delta on the strong-sieving case: -0.010 at `Sr` = 0, +0.037 at 0.5, +0.067 at 1.0, saturating near +0.09.
Linear interpolation to `Sr` = 0.31 gives roughly **+0.019**, against the +0.067 the product reports today.
Recalibrating cuts the headline segregation index by about a factor of three. That is a change to a
number a reader acts on, which is precisely why the calibration is worth doing properly and why the
current "published anchor" wording, though honest, is not sufficient.

---

## 6. Can it run here? Verified install audit

All checks below were executed in this session on the target host (Windows 11 Pro 26200).

### 6.1 conda is not installed

```
Get-Command conda   -> NOT FOUND
Get-Command mamba   -> NOT FOUND
```

`conda env create -f environment-dem.yml` has therefore never been run and cannot be run today without
first installing a conda distribution. Latest Miniforge is **26.3.2-3**, published 2026-06-01,
`Miniforge3-26.3.2-3-Windows-x86_64.exe`, 75 MB (verified via the GitHub releases API).

### 6.2 PyChrono IS published for Windows, and the docs get the channel wrong

Authoritative check against `https://conda.anaconda.org/projectchrono/win-64/repodata.json`:

| Version | win-64 Python builds | Notable deps |
|---|---|---|
| 7.0.0 | py38, py39, py310 | light, no CUDA, no MPI |
| 8.0.0 | py38, py39, py310 | eigen, glew, glfw, irrlicht, mkl 2020, numpy. **No CUDA, no openmpi** |
| 9.0.1 | py312, py313 | CUDA 12.8, cuBLAS, cuRAND, cuSPARSE, NPP, MKL 2025.2, occt, openmpi, irrlicht |
| 10.0.0 | py312, py313 | as 9.0.1 plus vulkanscenegraph, urdfdom |

Latest is **10.0.0**, `win-64/pychrono-10.0.0-py312h418371c_677.conda`, 504.6 MB, uploaded 2026-05-08.

**Correction to the docs.** `docs/methods/07_dem-calibration.md`, `docs/guides/03_dem-lane.md` and
`environment-dem.yml` all state "PyChrono is published only on conda-forge". That is false:
`api.anaconda.org/package/conda-forge/pychrono` returns 404. **conda-forge does not host pychrono at
all.** It comes from the `projectchrono` channel; conda-forge only supplies its dependencies. The yml
lists both channels so it would still resolve, but the prose is wrong in three places.

### 6.3 `pip install pychrono` installs the WRONG package. This is a live hazard.

PyPI **does** have a project called `pychrono`, at version 1.1.0, and it is **not Project Chrono**:

```
name    : pychrono
version : 1.1.0
summary : A package for managing delays, scheduling tasks, timing functions, caching results,
          and enhancing time-based operations with robust decorators for asynchronous execution,
          throttling, retries, and more.
files   : pychrono-1.1.0-py3-none-any.whl (10,837 bytes)
```

A 10 KB pure-Python timing-decorator library occupying the name. Anyone who reads "PyChrono has no pip
wheel" and tries `pip install pychrono` anyway gets a silent success and an import that does not do what
they think. The docs should say so explicitly rather than only saying no wheel exists.

### 6.4 Would the solve succeed? Plausible but UNVERIFIED, and heavy

The win-64 builds of 9.0.1 and 10.0.0 declare `openmpi`, which has **zero win-64 builds** on conda-forge
(linux-64 165, linux-aarch64 141, linux-ppc64le 142, osx-64 120, osx-arm64 77, win-64 **0**) and none
anywhere else on anaconda.org. That looked like a hard blocker until I checked the noarch subdir:
conda-forge ships one `noarch: generic` stub, `noarch/openmpi-4.1.3-h8b79891_4.tar.bz2`, 9.6 KB, whose
only dependency is `mpi 1.0 openmpi`, and `mpi` version 1.0 build `openmpi` **does** exist for win-64.
So the constraint chain closes through the stub and the solve is probably satisfiable.

**I am not claiming it works.** Conda is not installed, so I could not run it. Marked UNVERIFIED.

Download cost, if it does solve (latest win-64 sizes from conda-forge, compressed):

| Package | MB | Package | MB |
|---|---|---|---|
| pychrono | 504.6 | mkl | 109.3 |
| libcublas | 357.2 | libcurand | 44.2 |
| libcusparse | 135.0 | cuda-nvrtc | 29.8 |
| libnpp | 107.0 | occt | 24.2 |
| others (irrlicht, vsg, urdfdom, glew, glfw, eigen, tinyxml2, yaml) | ~6 | | |
| **total** | **~1.32 GB compressed**, roughly 3.5 to 4.5 GB installed, plus the 75 MB Miniforge installer | | |

For one calibration that runs once per release, on a machine whose C: drive has 127 GB free of 952 GB.

### 6.5 Alternative engines with pip wheels: what actually exists

Probed against the PyPI JSON API:

| Package | On PyPI | Latest | Windows wheels | Verdict |
|---|---|---|---|---|
| `numba` | yes | 0.66.0 | cp310, cp311, cp312, cp313, cp314, cp314t win_amd64 | **usable**, general JIT, write the DEM yourself |
| `taichi` | yes | 1.7.4 | cp39 through cp313 win_amd64 | usable, GPU-capable, but a whole DSL to learn |
| `warp-lang` | yes | 1.16.0 | py3-none-win_amd64 | usable, NVIDIA, has particle/contact primitives |
| `pymunk` | yes | 7.3.0 | yes | 2D rigid body (Chipmunk), not a granular DEM |
| `pychrono` | yes | 1.1.0 | n/a | **name squat, unrelated** |
| `yade` | yes | 0.1.3 | n/a | name squat; real Yade is Linux-only C++ |
| `liggghts` | **no** | - | - | absent |
| `mercurydpm` | **no** | - | - | absent (MercuryDPM is C++ only) |

### 6.6 The lightweight in-house DEM: verified installable and verified fast enough

**Install, executed and verified in an isolated venv on `E:\_Temp` (360 GB free):**

```powershell
python -m venv E:\_Temp\stocktwin-dem-probe\.venv
E:\_Temp\stocktwin-dem-probe\.venv\Scripts\python.exe -m pip install "numba>=0.61" "numpy>=1.26"
```

Result: `numba 0.66.0`, `llvmlite 0.48.0`, `numpy 2.4.6` on Python 3.13.0. About 57 MB of wheels, roughly
20 seconds. No conda, no CUDA, no MKL.

**Throughput, measured** with a 2D bidisperse soft-sphere pour (linear spring-dashpot normal force,
Coulomb-capped tangential spring after Cundall and Strack 1979, uniform-grid neighbour search, single
thread), probe script left at `E:\_Temp\stocktwin-dem-probe\dem_probe.py`:

```
N=  2000  jit= 2.79s   5201.0 steps/s   1.040e+07 particle-steps/s
N=  6000  jit= 0.00s   1652.3 steps/s   9.914e+06 particle-steps/s
N= 20000  jit= 0.00s    505.3 steps/s   1.011e+07 particle-steps/s
```

**1.0e7 particle-steps per second, flat in `N` up to 20k**, single-threaded, on this host. JIT warm-up
2.8 s once, then cached.

**The finding that changes the calculus: a mine-scale DEM is SMALLER than a lab-scale one.** ROM rock is
`d̄` = 0.12 m, so the flowing layer StockTwin actually cares about needs very few particles:

* one sphere of `d` = 0.12 m occupies `π/6 · 0.12³` = 9.05e-4 m³
* a flowing-layer slab 18.3 m long, 1.0 m thick, 1.0 m wide is 18.3 m³, at 0.6 solid fraction that is
  10.98 m³ of solids, or **~12,100 spheres** (DERIVED)
* Rayleigh time for real rock (`G` ≈ 1e10 Pa, `ρ` = 2700): `t_R ≈ π(d/2)√(ρ/G)/(0.1631ν+0.8766)` ≈ 1.05e-4 s,
  so `dt` ≈ 0.2 `t_R` ≈ 2e-5 s
* 5 s of pour at `dt` = 2e-5 s is 2.5e5 steps, so 3.0e9 particle-steps
* at an ESTIMATED 3e6 particle-steps/s in 3D (2D measured 1.0e7; 3D costs roughly 3x for 27 neighbour
  cells instead of 9 and ~6 contacts instead of ~4), that is **about 17 minutes single-threaded**, or a
  few minutes with `numba.prange` across cores

The lab-scale glass-bead heap that method 7 was written to simulate is the *expensive* case: Fan et al.
needed up to one million particles to get 1 mm beads into a 45 cm heap. At mine scale you need a hundred
times fewer particles for a physically larger domain. This is the opposite of the intuition the plan was
built on.

**Estimate, not measurement.** The 3e6 particle-steps/s figure for 3D is scaled from the 2D measurement,
not measured. Marked as such.

---

## 7. Is a full DEM even needed? The argument, both ways

### The case FOR running a DEM

* It would be StockTwin's own measurement rather than a transfer from someone else's geometry, which is
  worth something rhetorically on a Benchmark page.
* It would produce the apex-to-toe *profile*, not just a scalar, so the fit residual would be a real
  error bar on the shape and not only on the magnitude.
* It would exercise the actual coupling: cascade, deposition, overrun beyond the toe. None of Fan,
  Wiederseiner or Trewhela measure overrun, which `facesegregation.overrun_fraction` currently models
  with an admittedly invented curve capped at 0.25.
* At mine scale it is cheap (section 6.6), so the historic reason to skip it has evaporated.

### The case AGAINST

* **It would re-measure something already measured, worse.** Fan et al. 2014 ran a bounded heap, the exact
  geometry, with up to a million particles, and validated it against a physical experiment (Fan et al.
  2012). Any in-house heap will be smaller, less validated and less citable.
* **It answers the wrong question.** The dominant uncertainty is `δ`, the flowing-layer thickness on a
  real dumped face (section 5.4). A DEM of a *simulated* heap does not measure `δ` on a *real* face; it
  reproduces whatever `δ` the simulation's own kinematics produce, which is then circular.
* **The solver cannot use the profile it would produce.** `bedblend/segregation.py` solves the `D = 0`
  hyperbolic limit, `F(φ) = -Sr φ(1-φ)` with a Godunov flux, and the docstring is proud that "the
  concentration SHOCKS Gray and Thornton identify as the observed feature survive." But every modern
  measurement is at *finite* Péclet: Wiederseiner `Pe` = 11 to 19, Fan `Pe` = 19 to 28, Trewhela `Pe`
  varying from 5.74 at the base to 430 at the free surface. Wiederseiner's abstract is explicit: "Because
  of diffusive remixing, there was no sharp separation between the small-particle and large-particle
  layers, but a continuous transition." Fitting a shock-capturing `D = 0` solver to a measured diffuse
  profile will bias `Sr` low or high depending on the loss function, because the solver has no free
  parameter that can widen the interface and will trade width against `Sr`.
* **Cost of the conda lane is out of proportion.** 1.3 GB download, 4 GB installed, a Miniforge
  installation on a 127 GB-free system drive, all for one number.

### Verdict

**A full DEM is not needed and should not be the calibration.** The published route is better evidence,
costs nothing, and is defensible on a Benchmark page in a way a small in-house heap would not be. What
each buys:

| Path | Buys | Costs | Does not fix |
|---|---|---|---|
| Published calibration (Fan + Trewhela) | `Sr` = 0.31, two independent sources agreeing to 19 percent, real citations, immediate | hours of transcription | `δ` uncertainty; the `D = 0` gap |
| Fit to Wiederseiner's measured profile | a residual, a shape check, exercises the solver | a day, plus writing the fitter that the docs already claim exists | the `D = 0` gap makes the shape fit ill-posed; a chute is not a heap |
| In-house numba DEM at mine scale | own measurement, overrun, `δ` from the sim's own kinematics | ~1 week to write and validate a 3D DEM properly, ~17 min per run | still not a measurement of `δ` on a real face |
| PyChrono lab heap as planned | nothing the above do not give | Miniforge + 4 GB + a solve I could not verify | everything above |

---

## 8. Defects found in the current release while auditing

These are facts about the repository as it stands on 2026-08-04, checked directly.

1. **`stlab` does not exist.** `docs/guides/03_dem-lane.md` documents
   `from stlab.stages.calibrate import fit` and `environment-dem.yml` documents
   `python -m stlab.stages.dem --out models/dem`. There is no `stlab` package anywhere in the repository.
   `find . -type d -name stlab` returns nothing.
2. **`data-pipeline/pipeline/calibrate.py` does not exist.** `docs/methods/07_dem-calibration.md` says it
   "grid-searches the `Sr` whose continuum profile best matches" the DEM profile. The pipeline contains
   `assay.py`, `bake.py`, `kill_es.py`, `scenarios.py` and `io/`. No calibrate module.
3. **The Gray-Thornton solver is not wired into the live build.** `bedblend/segregation.py`
   (`FlowingLayer`, `segregation_number`) is exported from `bedblend/__init__.py` but called by no other
   module in `bedblend==0.6.0`; `grep -rn "\bsr\b" *.py` across the installed package matches nothing
   outside `segregation.py` itself. The live pile build goes `build.py -> facesegregation.segregate_face`,
   which has no `Sr` at all; it has `REFERENCE_DROP_M`, `FAST_FLOW_ANGLE_DEG` and hand-tuned coefficients
   (2.2, 1.6, 0.30, 0.25, and the 0.35/0.65 baseline ramp). The baked contract writes
   `"seg": r.segregation_index`, which is `seg.intensity` from the heuristic, not a Gray-Thornton output.
   So the claim in `docs/methods/07_dem-calibration.md` that "`Sr` is the only free quantity in the live
   segregation model" is not true of the shipped build path today.
4. **`docs/methods/04_segregation.md` points at the wrong file.** Its header names
   `bedblend/facesegregation.py`, but every equation it quotes (3.10, 3.11, 3.18, 3.19, the Godunov flux,
   the 32 depth cells, the CFL sub-stepping) is implemented in `bedblend/segregation.py`.
   `facesegregation.py` is a separate heuristic whose own docstring says "The functional forms are the
   simplest curves that reproduce those statements" and "This is a defensible operational model, not a
   validated constitutive one."
5. **`config.sr` in `frontend/src/lib/contract.types.ts` has no producer.** The type declares
   `config: { stacking, reclaim, n_passes, sr }` but nothing in `data-pipeline/` writes an `sr` key.

None of these is a reason to abandon the method. All of them are reasons the calibration should be done
as part of wiring the Gray-Thornton solver into the live path, not before it.

---

## 9. Recommended path

Three tiers, in order. Tier 0 alone discharges the kill criterion honestly.

### Tier 0, do now, hours, no compute

1. **Delist method 7 as written** and replace it with method 7-prime, "calibration against published
   segregation measurements". The kill criterion in the plan says the fallback is "published experimental
   segregation distances"; sections 3 to 5 above are exactly that fallback, executed.
2. **Replace the `Sr = 1` anchor with `Sr` derived from geometry**, computed at runtime rather than
   hardcoded:

   ```
   Sr = S * L / delta**2         # Fan et al. 2014 eq (3.3), Lambda == Sr
   S  = 0.13 * d_bar             # Fan et al. 2014 Table 1, S/d_bar = 0.13 (range 0.054 to 0.169)
   L  = drop_m / sin(repose)     # flank slope length, already in the engine
   delta = 8.3 * d_bar           # Fan et al. 2014 fig 3, delta/d_bar = 7.3 to 9.3
   ```

   For StockTwin defaults this returns `Sr` = 0.285. Cross-check it against Trewhela (7.8) with
   `B_dry = 0.7125`, `C = 0.2712`, `E = 2.0957` and the `R = 1 + 9(R-1)²φ^s(1-φ^s)` packing factor, which
   returns 0.338. Ship the pair and the 19 percent spread as the error bar.
3. **Expose `δ/d̄` as the control, not `Sr`.** `Sr ∝ δ⁻²` and `δ` is the only quantity in the chain that is
   genuinely unknown at mine scale. A reader moving a `δ/d̄` slider from 4 to 12 and watching `Sr` go from
   1.14 to 0.13 learns something true. A reader moving a bare `Sr` slider learns nothing.
4. **Fix the five defects in section 8**, in particular deleting or implementing the `stlab` references,
   and correcting "published only on conda-forge" to "published on the `projectchrono` channel;
   conda-forge does not host it".
5. **Add the pip hazard to `docs/guides/03_dem-lane.md`:** `pip install pychrono` succeeds and installs an
   unrelated 10 KB timing library, PyPI `pychrono` 1.1.0.
6. **Delete `environment-dem.yml`** or demote it to `docs/frameworks/03_pychrono/` as a documented
   not-taken road. Keeping a conda lane in the repo root for a method that has been delisted is the kind
   of stale artefact that makes the next reader assume the calibration exists.

### Tier 1, optional, about a day

Write the fitter the docs already promise, and fit `Sr` against Wiederseiner et al. 2011's measured
profile (their figure 4, run 22, `x` = 70 cm from the inlet, `Pe` = 19, `φ̄` = 0.74, scaled with
`H = h` = 24 mm). **Fit the shock position, not the profile shape**, because the StockTwin solver is the
`D = 0` limit and the measured profile is an `S`-shape produced by finite-`Pe` diffusion. Concretely: fit
the depth at which `φ` crosses 0.5, or the depth-integrated first moment `∫ z φ dz / ∫ φ dz`. Publish the
residual. Expected outcome: a chute-geometry `Sr` near 1.7 over the 0.7 m window (table row 2), which is
a *different geometry* from the pile flank and must be reported as a cross-check on `q`, not as the
product's `Sr`.

The honest alternative, and the better one if there is appetite: **add diffusion**. Replace
`F(φ) = -Sr φ(1-φ)` with the Gray and Chugunov (2006) advection-diffusion form,
doi:10.1017/S0022112006002977, which Wiederseiner et al. validated experimentally and Fan et al. and
Trewhela et al. both use. That makes `Pe` a second parameter, and `Pe` is the quantity every one of these
papers actually reports (11 to 28 across three independent studies). The solver becomes parabolic and
needs an implicit or sub-stepped diffusive term, but it stops contradicting its own reference list.

### Tier 2, only if a reviewer demands an in-house DEM

Write a 3D soft-sphere DEM with numba, **at mine scale, not lab scale**, per section 6.6:
about 12,000 spheres of `d̄` = 0.12 m in an 18.3 m x 1.0 m x 1.0 m flowing-layer slab, `dt` ≈ 2e-5 s,
5 s of simulated pour, an estimated 17 minutes single-threaded. Install is one verified pip command:

```powershell
pip install "numba>=0.61" "numpy>=1.26"
```

This keeps the whole offline lane pip-installable, which was the stated reason for splitting the DEM lane
out in the first place, and it lets `environment-dem.yml` be deleted rather than merely unused.

**Do not install PyChrono for this.** It is a 4 GB environment whose solve I could not verify, wrapping a
general multiphysics engine, for a problem that is 12,000 spheres and one contact law.

---

## 10. Risks and caveats

1. **`Sr` is not a material constant and the product must stop implying it is.** It is
   `L / L_seg`. Publishing a single number without the geometry that produced it is the same category of
   error as the `Sr = 1` anchor.
2. **The `δ` uncertainty is not resolvable by any calibration in this dossier.** `Sr ∝ δ⁻²` and no source
   measures the flowing-layer thickness of a mine-scale dumped face. The 0.13 to 1.14 band in section 5.4
   is the truth and shrinking it needs field data, not more modelling.
3. **The `D = 0` solver contradicts its own reference list.** Wiederseiner, Fan and Trewhela all report
   finite Péclet numbers (11 to 28) and all three state that diffusive remixing prevents the sharp shocks
   the StockTwin solver is built to preserve. Any profile fit with the current solver is ill-posed.
4. **Fan's `S` was measured on 1 to 3 mm glass spheres.** Extrapolating `S/d̄` = 0.13 to 120 mm angular
   blasted rock is a 40x extrapolation in size and a change in particle shape. `S/d̄` is dimensionless and
   is nearly feed-rate independent over 12x, which is encouraging, but it is still an extrapolation and
   must be labelled one.
5. **Trewhela's law needs two corrections that are easy to forget**, the dry buoyancy factor
   (`B_dry = B/ρ̂` = 0.7125) and the packing-efficiency reduction (`a` = 9). Omitting them makes the law
   overpredict by roughly 5x (section 4.3). Any implementation must carry both, with a test.
6. **Golick and Daniels' pressure dependence is unmodelled and could be large.** A fivefold pressure
   increase cut their segregation rate by a factor of 100 at low size ratio. On a stockpile, pressure at
   the base of the flowing layer varies with layer thickness, which varies down the flank. Neither
   Gray-Thornton nor Fan's `q = S γ̇` carries a pressure term; Trewhela's `1/(C ρ*g d̄ + p)` does. This is
   an argument for adopting the Trewhela form over the constant-`q` form.
7. **The size-ratio dependence is non-monotonic**, with a maximum near `R` ≈ 1.66 to 2.0 (Thornton et al.
   2012 DPM, Golick and Daniels 2009, reconciled in Trewhela §8). StockTwin's two-species split is
   effectively at `R` ≈ 2, which is at or near that maximum, so the current configuration sits at the
   *most* segregating size ratio. That is worth saying explicitly rather than leaving as a coincidence.
8. **The conda solve is UNVERIFIED.** I did not install Miniforge and did not run
   `conda env create -f environment-dem.yml`. The chain through the noarch `openmpi` stub looks sound but
   solver behaviour under channel priority is not something to claim without running it.
9. **The 3D DEM throughput figure is an ESTIMATE.** 1.0e7 particle-steps/s was measured in 2D; 3e6/s in 3D
   is scaled by a factor of 3 and not measured.
10. **Calibrating `Sr` calibrates a solver that is currently dead code** (section 8, item 3). The
    calibration and the wiring must land together or the calibration is decorative.

---

## 11. Sources, all resolved this session

Every DOI below was resolved through the Crossref API and returned matching author, year, journal, volume
and pages. Full text was read for those marked FULL TEXT.

| Citation | DOI | Verified | What it gives |
|---|---|---|---|
| Gray, J.M.N.T. and Thornton, A.R. (2005). A theory for particle size segregation in shallow granular free-surface flows. Proc. R. Soc. A 461(2057), 1447-1473 | 10.1098/rspa.2004.1420 | yes, **FULL TEXT** | (3.10), (3.11), (3.18), (3.19); `Sr = 1` used in every figure and why |
| Wiederseiner, S., Andreini, N., Épely-Chauvin, G., Moser, G., Monnereau, M., Gray, J.M.N.T. and Ancey, C. (2011). Experimental investigation into segregating granular flows down chutes. Phys. Fluids 23(1), 013301 | 10.1063/1.3536658 | yes, **FULL TEXT** | Table II and III: fitted `q` = 1.23 to 1.99 mm/s, `D` = 2.08 to 2.79 mm²/s, `Pe` = 11 to 19, `h`, `ū` per run; ±20 percent stated uncertainty |
| Fan, Y., Schlick, C.P., Umbanhowar, P.B., Ottino, J.M. and Lueptow, R.M. (2014). Modeling size segregation of granular materials: the roles of segregation, advection and diffusion. J. Fluid Mech. 741, 252-279 | 10.1017/jfm.2013.680 | yes, **FULL TEXT** | `q = S γ̇` (2.10); Table 1 percolation length scale `S` for R = 1.5, 2, 3; `Λ = SL/δ²` and `Pe = 2qδ/DL` (3.3); measured `Λ` = 0.78 and 0.40 for a bounded heap |
| Trewhela, T., Ancey, C. and Gray, J.M.N.T. (2021). An experimental scaling law for particle-size segregation in dense granular flows. J. Fluid Mech. 916, A55 | 10.1017/jfm.2021.227 | yes, **FULL TEXT** | (4.9), (7.2) to (7.5), (7.8), (8.2), (8.3); Table 3: A = 0.108, B = 0.3744, C = 0.2712, E = 2.0957; the dry buoyancy correction and the packing-efficiency factor a = 9 |
| Golick, L.A. and Daniels, K.E. (2009). Mixing and segregation rates in sheared granular materials. Phys. Rev. E 80, 042301 | 10.1103/PhysRevE.80.042301 | yes, **FULL TEXT** | annular shear cell, `d_L` = 6 mm, `d_S` = 1.5 to 5 mm; non-monotonic `Ω_s` with maximum at `r = 3/6`; 5x pressure cuts `Ω_s` by 100x at low `r` |
| Thornton, A.R., Weinhart, T., Luding, S. and Bokhove, O. (2012). Modelling of particle size segregation: calibration using the discrete particle method. Int. J. Mod. Phys. C 23(8), 1240014 | 10.1142/S0129183112400141 | yes (metadata; full text paywalled) | the canonical DEM-to-continuum `Sr` calibration; its steady-state `Pe` vs `R` data is digitised in Trewhela et al. 2021 fig 15: `Pe` ~2.5 at R = 1.1 rising to ~7.5 at R ≈ 1.7 |
| Savage, S.B. and Lun, C.K.K. (1988). Particle size segregation in inclined chute flow of dry cohesionless granular solids. J. Fluid Mech. 189, 311-335 | 10.1017/S002211208800103X | yes | the original kinetic-sieving theory and the experiments Gray and Thornton compare to |
| Gray, J.M.N.T. and Chugunov, V.A. (2006). Particle-size segregation and diffusive remixing in shallow granular avalanches. J. Fluid Mech. 569, 365-398 | 10.1017/S0022112006002977 | yes | the advection-diffusion generalisation; the model Wiederseiner et al. validate; the route to a finite-`Pe` StockTwin solver |
| Gray, J.M.N.T. and Ancey, C. (2009). Segregation, recirculation and deposition of coarse particles near two-dimensional avalanche fronts. J. Fluid Mech. 629, 387-423 | 10.1017/S0022112009006466 | yes (metadata) | coarse-rich front of constant length depositing a carpet of grains; the mechanism behind coarse-at-the-toe and the overrun term |
| Gray, J.M.N.T. and Ancey, C. (2011). Multi-component particle-size segregation in shallow granular avalanches. J. Fluid Mech. 678, 535-588 | 10.1017/jfm.2011.138 | yes (metadata) | the multi-species generalisation, if StockTwin ever moves past two species |
| Thornton, A.R., Gray, J.M.N.T. and Hogg, A.J. (2006). A three-phase mixture theory for particle size segregation in shallow granular free-surface flows. J. Fluid Mech. 550, 1-25 | 10.1017/S0022112005007676 | yes (metadata) | the `ρ̂ = (ρ* - ρ_f)/ρ*` buoyancy factor that Trewhela's dry correction rests on |
| Utter, B. and Behringer, R.P. (2004). Self-diffusion in dense granular shear flows. Phys. Rev. E 69, 031308 | 10.1103/PhysRevE.69.031308 | yes (metadata) | source of `A` = 0.108 (radial) and 0.223 (tangential) in `D = A γ̇ d̄²` |
| Gray, J.M.N.T. (2018). Particle segregation in dense granular flows. Annu. Rev. Fluid Mech. 50(1), 407-433 | 10.1146/annurev-fluid-122316-045201 | yes (metadata) | the review; already cited by the product |
| Project Chrono, PyChrono installation | https://api.projectchrono.org/pychrono_installation.html | yes | official install docs, conda only |
| projectchrono channel repodata (win-64) | https://conda.anaconda.org/projectchrono/win-64/repodata.json | yes, read directly | authoritative build matrix and dependency lists for pychrono 7.0.0 through 10.0.0 |
| PyPI `pychrono` 1.1.0 | https://pypi.org/pypi/pychrono/json | yes, read directly | proof the PyPI name is an unrelated squat |
| Miniforge releases | https://api.github.com/repos/conda-forge/miniforge/releases/latest | yes | 26.3.2-3, 2026-06-01, Windows x86_64 installer 75 MB |

---

## 12. Artefacts left on disk

| Path | What |
|---|---|
| `E:\_Temp\stocktwin-dem-probe\.venv` | isolated venv proving `pip install "numba>=0.61" "numpy>=1.26"` works (numba 0.66.0, llvmlite 0.48.0, numpy 2.4.6, Python 3.13.0) |
| `E:\_Temp\stocktwin-dem-probe\dem_probe.py` | 2D bidisperse soft-sphere DEM throughput probe, the script that produced the 1.0e7 particle-steps/s figure |
| `E:\_Temp\stocktwin-dem-probe\repodata.json` | projectchrono win-64 repodata snapshot, 2026-08-04 |

Delete when the calibration lands. Nothing was written to `C:\`.
