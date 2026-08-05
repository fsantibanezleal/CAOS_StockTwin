# StockTwin physics gaps: implementation plan

**Date:** 2026-08-04 · **Author:** Lucy (Claude session) · **Status:** proposed, awaiting Felipe's validation

**Inputs.** Three adversarially verified research dossiers in this folder:

| Dossier | File | Dossier verdict | Verifier verdict |
|---|---|---|---|
| Depth-averaged mu(I) slump | `mui-slump-2026-08-04.md` | no | no, and under-argued |
| Gray-Thornton `Sr` calibration + DEM lane | `dem-sr-calibration-2026-08-04.md` | yes-with-caveats | no-as-stated, honest:false |
| Self-weight compaction + degradation | `compaction-degradation-2026-08-04.md` | no (compaction), yes-with-caveats (degradation) | honest, compaction under-argued, degradation over-claimed |

**Engine boundary.** The product declares no package. Every engine change below is a `bedblend`
release in its own repository, https://github.com/fsantibanezleal/CAOS_BedBlend, published to
PyPI, then re-pinned in this repository's `requirements.txt` and re-baked.

**Everything quantitative below was re-derived in this session against the actual artifacts and the
installed package, not copied from the dossiers.** The reproductions are listed in appendix A.

---

## Decision summary, ordered by value to what this product measures

The product measures three things: grade homogenization, size segregation, provenance. The ordering
follows how much each item moves one of those three.

1. **Compaction and degradation dossier: SPLIT.** Do not ship self-weight compaction or a spatial
   density field. Do not ship a quantified degradation model. **Ship the parcel-split defect fix**,
   which currently destroys 40.2 percent of the coarse species mass in every artifact the product
   ships, and the density reconciliation, which is 2.89 percent on every tonnage. This is first
   because it is the only item that moves a shipped number by tens of percent, and because no
   segregation work downstream can be measured on a ledger that is losing the field being measured.
2. **`Sr` calibration and DEM lane: SPLIT.** Do not ship a calibrated `Sr` number. Do not ship the
   DEM lane, delist method 7. **Ship the wiring**: the product's SOTA segregation claim currently
   describes `bedblend/segregation.py`, which no shipped code path calls, while the running model is
   a heuristic with three fitted constants and no `Sr` at all. Replace the fitted composition curves
   with the Gray-Thornton march that is already written and already tested, and expose the flowing
   layer thickness rather than a bare dimensionless knob.
3. **mu(I) slump: DO NOT SHIP, either form.** Neither the depth-averaged solver nor the two-angle
   hysteresis the dossier proposes as its cheap alternative. Both move the face by less than one
   cell and less than one voxel. Delist method 6 permanently, with the measurement that would
   reopen it.

**Sequencing is a hard dependency, not a preference.** Item 1 before item 2. The coarse field is the
observable that any segregation change would be judged on, and it is currently wrong by 40 percent.
Calibrating or rewiring segregation against the present artifact would be fitting to a defect.

---

# Part 1. Compaction, degradation, and the parcel-split defect

## 1A. SHIP: the parcel split loses `coarse_fraction`

### The defect

`bedblend/blocks.py`, `BlockModel.take_from_top`, lines 180-183 as installed:

```python
cut = p.z1_m - want
out.append(
    Parcel(cut, p.z1_m, p.grade, p.source_block, p.event_id, p.lift, p.area,
           p.grade_uncertainty, p.displacement_m)
)
p.z1_m = cut
```

`Parcel` has ten fields (`blocks.py` lines 52-64) and `coarse_fraction` is the tenth, defaulting to
`0.0`. Nine positional arguments are passed. The upper slice, which is the slice that LEAVES, silently
resets its coarse fraction to zero.

Reproduced by execution in this session against the installed `bedblend 0.6.0`:

```
a 2.00 m parcel at coarse_fraction 0.35, split at 1.00 m
  moved slice     coarse_fraction = 0.0000
  remaining slice coarse_fraction = 0.3500
  coarse species mass 0.700 -> 0.350
```

### Why every gate stays green

Thickness is conserved exactly by the split, so `assert_consistent` (`blocks.py` line 283, ledger
versus terrain) passes; grade, source block, event id, lift, area, uncertainty and displacement are
all inside the nine arguments that are passed, so provenance and grade both survive. The only field
that dies is the one nothing checks. There is no invariant on species mass anywhere in the package.

### The path is hot

`apply_transfers` (`blocks.py` line 159) is the single route for both dozer passes and every
relaxation transfer, and `reclaim.py` line 224 uses it too. The shipped reference case records
`mean_displacement_m = 19.52` at 2.5 m cells, so material has been through this split many times.

### Measured consequence in the shipped artifact

From `data/derived/single/field.json`, recomputed this session:

```
occupied cells                          2886
thickness-weighted coarse fraction    0.2093
material coarse_fraction placed       0.3500
deficit                                40.2 %
range                          0.0000 .. 0.4509
cells reading exactly 0.0                 43
```

`docs/methods/18_material.md` currently explains that range as physics: "the coarse fraction across a
shipped pile spans 0.000 to 0.483 rather than sitting at a uniform value: only the loads that cascaded
were sorted." That sentence is describing a bug. A paddock load is recorded at exactly `split.coarse
= 0.35` (`build.py` line 470), so an unsorted load cannot read 0.000; the 43 zero cells are parcels
that were split at least once and lost the field.

### The fix

`Parcel` is a plain mutable `@dataclass`, so the field-order-independent form is available and is the
correct one, because it makes this class of bug impossible rather than fixing one instance:

```python
from dataclasses import replace, fields   # add to the existing dataclasses import

# in take_from_top, replacing lines 180-183:
cut = p.z1_m - want
out.append(replace(p, z0_m=cut))   # z1_m is already this slice's top
p.z1_m = cut
```

`replace` copies every declared field and overrides only the named one, so a field added to `Parcel`
in a future release is carried automatically.

### The tests that pin it

In `tests/test_blocks_sectors.py`, in the package's existing naming style:

```python
def test_a_split_slice_differs_from_its_parent_only_in_its_z_interval():
    """THE GATE THAT CATCHES THE NEXT ONE. Positional reconstruction dropped coarse_fraction and
    every other field survived, so no existing invariant fired. Iterating the declared fields means
    a field added later is covered without anyone remembering to cover it."""
    p = Parcel(z0_m=0.0, z1_m=2.0, grade=0.71, source_block=4, event_id=17, lift=2,
               area="north", grade_uncertainty=0.09, displacement_m=13.5, coarse_fraction=0.42)
    bm = BlockModel(nx=1, ny=1, cell_m=2.5, columns=[[p]])
    moved = bm.take_from_top(0, 1.0)[0]
    for f in fields(Parcel):
        if f.name in ("z0_m", "z1_m"):
            continue
        assert getattr(moved, f.name) == getattr(bm.columns[0][0], f.name), f.name


def test_species_mass_is_conserved_by_apply_transfers():
    """Volume conservation is already asserted and it is not enough: the defect conserved thickness
    exactly while destroying a third of the coarse. Assert the second moment too."""
    ...  # build a two-column model, run 300 transfers, assert
    #     sum(thickness * coarse_fraction) invariant to 1e-12 relative
```

Expected numbers for the second test, from the verifier's 300-transfer harness reproduced here:
thickness 179.3318 invariant in both the buggy and fixed builds, coarse species mass 60.8174 to
40.1255 buggy (-34.0 percent) and 60.8174 to 60.8174 fixed.

### Pipeline, artifact and app

* **Pipeline.** Add to `data-pipeline/pipeline/bake.py`, next to the existing mass residual, a
  species-mass gate:
  `species_mass_residual_rel = |sum_cells(thickness * coarse) - (placed_coarse_volume - overrun_coarse_volume)| / placed_coarse_volume`,
  tolerance `1e-6`. **The overrun term is required and is not cosmetic**, see 1B below.
* **Artifact.** `field.json.coarse` changes in every one of the 22 scenarios. Expected
  thickness-weighted mean after the fix: 0.33 plus or minus 0.02 against 0.35 placed, with the
  residual explained entirely by the overrun sink. **If it does not land there, there is a second
  leak and this plan is wrong about the cause.** That is the acceptance test for the fix.
  `manifest.gate` gains `species_mass_residual_rel`.
* **App.** The pile's coarse-fraction colouring changes visibly on the Tool page; the Benchmark page
  gains one invariant row. `docs/methods/18_material.md` loses the sentence quoted above and gains
  the real one.

**Effort: half a day** including a full 22-scenario re-bake and the coarse-field re-measurement.

## 1B. SHIP: the overrun is a species-mass leak with no sink

`facesegregation.segregate_face` renormalises the coarse profile to sum to `1 - overrun` while the
fine profile sums to 1 (lines near the end of the function). The volume is still placed on the face
via `pl.added_m`, so the deposited mixture carries less coarse than the load did and the missing
coarse lands nowhere. Volume is conserved; species is not.

Magnitude on the reference case: with `REFERENCE_DROP_M = 11.0` and a drop of about 11 m, the cap
term gives `overrun = min(0.25, 0.30 * g * (1 - exp(-0.5)))`, roughly 0.05 of the coarse at typical
intensity, so about 0.017 of the 0.14 deficit. Second-order against the split defect but it must be
named, otherwise the gate in 1A cannot close.

**Decision for this release: declare it, do not relocate it.** Add `overrun_coarse_m3` to the load
result and carry it into the manifest as an explicit sink so the species books balance with a named
term. Placing the overrun in the cells beyond the toe is the physically correct answer (Young and
Rogers: coarse "may also roll beyond the floor of the bench, especially at higher bench heights") but
it changes pile geometry and needs its own validation pass. Recorded as follow-up, not done here.

## 1C. SHIP: the two bulk densities disagree by 2.89 percent

`blocks.py` line 84: `BlockModel.over(..., bulk_density_t_m3: float = 1.9)`.
`material.py`: `Material.loose_density_t_m3 = 2.70 / 1.38 = 1.9565`.

Every tonnage the product reports comes from the first; every volume-to-mass conversion in the
material chain uses the second. 2.89 percent, on cut tonnages, VRR weights, the block export and the
volume reconciliation. That is larger than the entire self-weight compaction effect this plan
declines to model (0.5 to 1.5 percent), which makes it indefensible to leave while writing a limits
paragraph about precision.

Fix: `over()` takes the density from the material rather than defaulting to a literal.

```python
@classmethod
def over(cls, terrain: Terrain, *, material: Material | None = None,
         bulk_density_t_m3: float | None = None) -> BlockModel:
    """One density, taken from the material chain. A literal here disagreed with
    Material.loose_density_t_m3 by 2.89 percent, which is larger than the self-weight compaction
    the engine explicitly declines to model."""
    if bulk_density_t_m3 is None:
        bulk_density_t_m3 = (material or DEFAULT_MATERIAL).loose_density_t_m3
```

Test: `test_the_block_model_density_is_the_material_loose_density`.

**Effort: one hour, plus the re-bake shared with 1A.** Every `t` in `cuts.json` scales by
`1.9565 / 1.9 = 1.0297`; `manifest.material.loose_density_t_m3` already reads 1.957, so the manifest
becomes true of the tonnages for the first time.

## 1D. DO NOT SHIP: self-weight compaction and a spatially varying density field

### The reason, in the product's own discretisation

`data/derived/single/volume.json` gives `dz_m = 0.5`, `nz = 28`. I re-integrated the settlement over
all 2886 occupied columns of `field.json` under four modulus conventions:

| convention | mass-weighted strain | max settlement | median | columns settling more than one 0.5 m voxel |
|---|---|---|---|---|
| M = 1.346 E50, K0 = 1 - sin45 | 0.72 % | 0.145 m | 0.021 m | **0** |
| M = E50, K0 = 1 - sin45 | 0.97 % | 0.195 m | 0.029 m | **0** |
| M = E50, K0 = 1 - sin37 | 0.83 % | 0.166 m | 0.025 m | **0** |
| M = E50, sigma3 = sigma_v | 0.52 % | 0.103 m | 0.015 m | **0** |
| dossier's own figure | 1.48 % | 0.301 m | 0.045 m | **0** |

Modulus law: `E50 = 14.3 MPa (sigma3 / 100 kPa)^0.518`, fitted to 121 large-triaxial rows of the open
Ovalle et al. rockfill database (Zenodo 3625778), refit independently this session to 14.252 and
0.5178, R-squared 0.714 on logs.

**Every column of the reference pile settles by less than one vertical voxel under every convention,
including the dossier's softest.** The tallest settles 0.29 to 0.60 of a voxel; the median settles
0.03 to 0.09 of a voxel. The effect is unrepresentable on the grid the product computes on. That is
the whole argument and it does not need the VRR noise-floor comparison, which the dossier led with.

### Supporting facts, verified

* Maximum vertical stress in the pile is **263.2 kPa** (13.71 m at 1.957 t/m3), reproduced exactly.
  Clastic yield for uncompacted quarry rockfill is at about **800 kPa** (Maurer, Ovalle and Saez).
  The pile lives entirely in the stiff pre-yield rearrangement branch, a factor of three below the
  stress at which rockfill compressibility becomes interesting.
* The effect is smaller than two uncertainties already in the engine: `COMPACTION_BAND = (0.05, 0.15)`
  at `material.py` line 48, and the 2.89 percent density inconsistency that 1C fixes.
* Reclaim on the reference case is **24 cuts totalling 21 137.4 t**, five at 3000 t and the rest
  decaying geometrically to 12.3 t (verified from `cuts.json`), which is 13.6 percent of the pile.
  The effective sample size behind `var_out` is 8.69, not 24, so the VRR seed noise floor is roughly
  plus or minus 84 percent relative, wider than the plus or minus 49 percent the dossier quoted. The
  compaction perturbation is at most plus 1.13 percent relative. Two orders below.

### What measurement would change this

1. **A first-loading oedometric modulus measured on ROM at 50 to 300 kPa.** The crest crosses one
   voxel if the real constrained modulus is **1.7 times softer** than the E50 surrogate (on the
   dossier's basis) or **3.5 times softer** (on mine). The median column needs 11 to 23 times softer.
   A factor of two, which is the plausible E50-to-oedometric error, does not change the answer.
2. **Wetting collapse.** Oldecop and Alonso show the rockfill compressibility index is a function of
   relative humidity, so a pile wetted under load collapses. This is the one mechanism that could
   break the verdict, it is unquantified here, and it is spatially patchy and transient rather than a
   monotonic depth gradient, so it is a different and more interesting model. **Not researched.
   Flagged as the live falsifier.**
3. **Time.** Sowers-type logarithmic creep over months. Method 18 already lists "time is not
   modelled" and this pass did not quantify it.

### Exact wording for the limits section

Replace the "Compaction is a scalar, not a field" paragraph in `docs/methods/18_material.md`:

> **Compaction is a scalar, not a field, and self-weight compaction is not modelled at all.**
> Rockfill compresses under its own weight by grain rearrangement until a clastic yield stress at
> which particle breakage opens a much softer branch, measured at about 800 kPa on uncompacted
> quarry rockfill (Maurer, Ovalle and Saez). The reference pile peaks at 13.71 m, which is a maximum
> vertical stress of 263.2 kPa, a factor of three below that yield, so it sits entirely in the stiff
> branch. Integrating a constrained modulus fitted here to 121 large-triaxial tests from the open
> Ovalle et al. rockfill database (`E50 = 14.3 MPa (sigma3/100 kPa)^0.518`, Zenodo 3625778) gives a
> mass-weighted volumetric strain of 0.7 to 1.5 percent depending on the modulus convention, a
> density field spanning about 1.97 to 2.02 t/m3, and a crest settlement of 0.10 to 0.30 m.
>
> It is not modelled because **all 2886 occupied columns settle by less than one 0.5 m voxel, and the
> median column settles 45 mm, nine percent of one voxel.** The effect is below the grid the product
> computes on, everywhere, with no exceptions. It is also smaller than the 5 to 15 percent published
> band on the traffic-compaction scalar that IS modelled. Adding a per-voxel density field would
> replace a stated limit with a false precision.
>
> What would change this: a first-loading oedometric modulus measured on run-of-mine rock at 50 to
> 300 kPa coming out more than about twice as soft as the triaxial surrogate used here, or a wetting-
> collapse model. The second is the real gap. Oldecop and Alonso show rockfill compressibility depends
> on relative humidity, so a pile wetted under load collapses further, and that collapse is transient
> and patchy rather than a depth gradient. It is not researched here and it is not claimed either way.

Add to `docs/methods/01_relaxation.md`, "Where it fails", replacing the bare sentence "Self-weight
compaction and particle degradation from re-handling are not modelled at all":

> Self-weight compaction is not modelled, and the reason is quantified in
> [method 18](18_material.md): every column of the reference pile settles by less than one 0.5 m
> voxel. Particle degradation from re-handling is not modelled either, and unlike compaction that one
> is not negligible, see [method 4](04_segregation.md).

## 1E. DO NOT SHIP the number, SHIP the limit: handling degradation

### What survives

The **direction and the spatial correlation** are real and they matter. Every dozer operator in
`bedblend/dozer.py` works the crest and the platform; toe material arrives by avalanche through
`relax.cascade`. Handling degradation therefore strips coarse preferentially from exactly the places
that kinetic sieving also leaves fine. Same sign, same places. The reported toe-minus-apex coarse
delta is a **lower bound on nothing and an upper bound on the sieving attribution**: it cannot be
attributed to kinetic sieving alone.

### What does not survive

The magnitude, minus 0.03 to minus 0.16 over a build, rests on three stacked conversions and the
dossier flags only two. The unflagged one is the weakest: it equates a 1 m diameter triaxial specimen
sheared to failure under 100 to 200 kPa sustained confinement with a dozer blade pushing material a
few metres at near-zero confinement, and takes Marsal `Bg = 6 to 8 percent` from the first as the
damage of the second. Those are not comparable energy inputs. The second conversion divides `Bg`
uniformly across 8 to 10 sieve classes, which is wrong twice over: `Bg` is the NET transfer out of the
classes that shrank, so it undercounts gross boundary crossings, and the Tavares size effect the same
dossier cites says coarse breaks first, so crossings are not uniform across boundaries. The third,
4 to 8 transfer events per parcel, is inferred from `mean_displacement_m = 19.52` divided by a cell
hop, not counted.

Publishing minus 0.03 to minus 0.16 into `docs/methods/04_segregation.md` would be **the same
false-precision failure this plan refuses for compaction**. The standard has to be applied in both
directions.

### Ship instead: the diagnostic that would make the number real

Add `n_transfers: int = 0` to `Parcel`, incremented in `apply_transfers` alongside `displacement_m`.
Free, one line each, covered by the field-iterating test in 1A. Report the tonnage-weighted mean and
the distribution in the manifest. That converts the weakest of the three conversions from an
inference into a measurement, and it is a provenance number in its own right: "this material has been
picked up and put down 5.2 times on average" is a statement the product should be able to make.

### Exact wording for the limits section

Add to `docs/methods/04_segregation.md`, "Where it fails":

> **Handling degradation is not modelled, and it is confounded with the result.** Every time a dozer
> pushes material, some of it breaks. The engine moves material with a blade dozens of times per
> build, and the operators work the crest and the platform while toe material arrives by avalanche, so
> degradation strips coarse from the crest preferentially. That has **the same sign** as kinetic
> sieving and it acts in **the same places**. The reported toe-minus-apex coarse delta therefore
> cannot be attributed to sieving alone; part of it is breakage the model does not know about.
>
> The magnitude is not stated here because it is not known. Published breakage indices for rockfill
> are measured in large triaxial cells sheared to failure under sustained confinement, which is not
> what a blade pass does, and no source found measures the size-distribution shift per dozer pass on
> a stockpile. The engine now counts transfers per parcel, which is the missing half of the
> measurement; the other half is a `Bg` measured for a blade pass at near-zero confinement. Until
> both exist, the direction is stated and the magnitude is not.

---

# Part 2. The segregation number, the DEM lane, and what actually runs

## 2A. The finding that outranks the calibration

**The product's flagship segregation claim describes code the product never calls.**

Verified this session by grep across `data-pipeline/`, `frontend/src/`, `scripts/` and `tests/`: the
identifier `sr`, the class `FlowingLayer` and the function `segregation_number` appear **nowhere**
outside the vendored `bedblend` package itself. There is no `Sr` axis in
`data-pipeline/pipeline/scenarios.py`. `build.py` line 466 calls `facesegregation.segregate_face`,
which has no `Sr`.

Consequences, all three of them documentation defects about the product's own headline:

1. `docs/methods/04_segregation.md` header says `bedblend/facesegregation.py`, then transcribes Gray
   and Thornton equations (3.10), (3.11), (3.18) and (3.19), which live in `bedblend/segregation.py`.
   The doc describes one file and points at another.
2. The same doc's "What the magnitude is" paragraph reports a measured `Sr` response, "toe-minus-apex
   coarse-fraction delta runs -0.010 at Sr = 0, +0.037 at 0.5, +0.067 at 1.0, and saturates near
   +0.09". **No shipped code path accepts an `Sr`, so that curve cannot be reproduced by the
   pipeline.** It is either from a retired build or from an offline experiment that is not in the
   repo. Either way it is unreproducible as published.
3. `docs/methods/07_dem-calibration.md` opens with "The Gray-Thornton segregation number `Sr` is the
   only free quantity in the live segregation model. Everything else in it is geometry." False. The
   live model is `facesegregation.segregate_face`, whose composition comes from three fitted
   constants with no source: `1 + 2.2 g (v - 0.5)` for coarse, `1 - 1.6 g (v - 0.5)` for fine, and
   the overrun `min(0.25, 0.30 g (1 - exp(-drop / 22)))`. Its own docstring says so honestly ("The
   functional forms are the simplest curves that reproduce those statements ... a defensible
   operational model, not a validated constitutive one"), but method 7 contradicts it.

Fixing the calibration of a parameter that is not in the running model is worth nothing. Fixing which
model runs is worth the whole method.

## 2B. SHIP: wire the Gray-Thornton march into the live face path

### The design, and the split of claims it enforces

The published sources make two different kinds of statement and the current code blends them into one
set of invented curves. Separate them:

* **Mass distribution down the face is operational and is measured.** "This cascade of material
  typically aggregates more at the bottom of the dumping area under normal conditions and less near
  the top crest of the dump" (Young and Rogers, Minerals 2021, 11, 636, section 3.3). Keep the
  existing `base[k] = 0.35 + 0.65 * s_k` shape as the **deposition schedule**: how much mass stops in
  each bin. It is a geometry statement with a source.
* **Composition is constitutive and comes from the solver.** Which species is in the material that
  stops at bin k is Gray and Thornton, integrated by `FlowingLayer`, not a fitted curve.

That is the honest structure and it removes all three unsourced constants.

### The new signature

`bedblend/facesegregation.py`:

```python
def segregate_face(
    *,
    drop_m: float,
    face_angle_deg: float,
    mat: Material,
    n_bins: int = 12,
    sr: float | None = None,
    layer_over_d: float = LAYER_OVER_D,      # 8.3
    nz: int = NZ_DEFAULT,                    # 32, from bedblend.segregation
) -> FaceSegregation:
```

`sr=None` means derive it from the geometry with `segregation_number_from_geometry` below. `sr=0.0`
is the C02 negative control and must return exactly the material's own split in every bin, tested
with `==`, not `approx`.

### The march

```
L      = drop_m / sin(face_angle_deg)          path length down the face, m
phi0   = 1 - mat.coarse_fraction               FINE fraction; phi is the SMALL species
layer  = FlowingLayer(phi0, sr, nz)
mass_k = base_k / sum(base)                    deposition schedule, normalised, minus the overrun
for k in 0 .. n_bins-1:
    layer.advance(1.0 / n_bins)                x is non-dimensionalised by L, so the whole face is x in [0,1]
    phi_dep, _ = layer.split_base(mass_k / remaining_mass)
    coarse_at_bin_k = 1 - phi_dep
    remaining_mass -= mass_k
overrun composition = 1 - layer.mean_phi       what never stopped, an OUTPUT not a fitted cap
```

`FlowingLayer.advance` already sub-steps at `CFL = 0.4` with a Godunov flux for the convex
`F(phi) = -Sr phi (1 - phi)`, and `split_base` already conserves species mass exactly. Both are
tested in `tests/test_segregation.py`. Nothing new has to be written in the solver, only the coupling.

Coarse-at-the-toe stops being a rule and becomes an output, which is what the current docstring
already claims and the current code does not deliver.

### The segregation number, derived rather than guessed

```python
LAYER_OVER_D = 8.3      # flowing-layer thickness in mean grain diameters
S_OVER_D     = 0.13     # percolation length scale in mean grain diameters
PROFILE_K    = 2.3      # exponential velocity-profile decay constant of the same layer


def segregation_number_from_geometry(
    *, d50_mm: float, drop_m: float, repose_deg: float,
    layer_over_d: float = LAYER_OVER_D,
    s_over_d: float = S_OVER_D,
    profile_k: float = PROFILE_K,
) -> float:
    """Sr for THIS face geometry, from Fan et al.'s measured percolation length scale.

    Sr = k S L / delta^2,  with  L = drop / sin(repose),  S = s_over_d * d50,  delta = layer_over_d * d50.

    Sr IS NOT A MATERIAL PROPERTY. It is L / L_seg with L_seg = H U / q, so the same ore on a taller
    face or in a thinner flowing layer has a different Sr. Anything that publishes a single number
    without the geometry that produced it is making the same category of error as anchoring on the
    plotting normalisation Sr = 1.
    """
```

**The factor `k = 2.3` is the correction the dossier got wrong and it is load-bearing.** Fan's control
parameter `Lambda = S L / delta^2` (his eq. 3.3) equals `Sr` only under the ansatz `gammadot = U /
delta`. Fan fits an exponential velocity profile `f(z) = exp(k z / delta)` with `k = 2.3` for the same
layer, from the same 10-percent-of-surface-velocity cutoff that defines `delta` and gives
`delta / d = 8.3`. Reducing Fan's eq. (3.5) to the x-marching plug-flow form `FlowingLayer` actually
solves gives a coefficient of `k * Lambda`, not `Lambda`. Taking `delta` from that convention while
discarding the `k` that comes with it is the error, and it is a factor of 2.3.

### Constants and their sources

| symbol | value | source |
|---|---|---|
| `q = (B/c) g cos(zeta)` | eq. (3.11) | Gray and Thornton (2005), Proc. R. Soc. A 461(2057), 1447-1473, doi:10.1098/rspa.2004.1420 |
| `Sr = q L / (H U)` | eq. (3.19) | same |
| `F(phi) = -Sr phi (1 - phi)`, Godunov | eq. (3.18) reduced | same, already in `segregation.py` |
| `S / d = 0.13` | 0.17 to 0.19 mm on 1.4 mm beads, feed-rate independent over 12x | Fan et al. (2014), arXiv:1401.7387, eq. (2.10) `w_pl = S gammadot (1 - c_l)`, Table 1 |
| `delta / d = 8.3` | "the flowing layer is only a few particle diameters thick (< 10 d_l)" | same, section 2.4 |
| `k = 2.3` | `f(z) = exp(k z / delta)`, 10 percent surface-velocity cutoff | same |
| `Lambda = S L / delta^2` | measured 0.78 and 0.40 | same, eq. (3.3) and figure 5 caption |
| cross-check law | eq. (4.9) with `A = 0.108, B = 0.3744, C = 0.2712, E = 2.0957`, dry buoyancy `B_dry = B / rho_hat = 0.7125`, packing `a = 9` in eq. (8.2) | Trewhela, Ancey and Gray (2021), JFM 916 A55, doi:10.1017/jfm.2021.227 |
| mass distribution `0.35 + 0.65 s` | "aggregates more at the bottom ... less near the top crest" | Young and Rogers (2021), Minerals 11, 636, section 3.3 |
| overrun exists | coarse "may also roll beyond the floor of the bench, especially at higher bench heights" | same |

Fan's journal reference was not re-verified in this session; **the arXiv record is the verified
identifier and the doc must cite it that way** until someone checks the DOI.

### The number, and why it ships as a BAND

Evaluated at StockTwin defaults (`d50 = 120 mm`, `repose = 37 deg`, drop 11 m, so `L = 18.28 m`,
`S = 0.0156 m`, `delta = 0.996 m`), reproduced this session:

```
Fan route,      Sr = 2.3 * 0.0156 * 18.28 / 0.996^2      =  0.66
Trewhela route, Sr = 2.3 * 0.321                          =  0.74
Fan's own two heap runs, k * Lambda                       =  1.79 and 0.92
Wiederseiner chute over its own 0.70 m window             =  1.16 to 1.69
```

**Ship `Sr = 0.7` as the default and `[0.3, 1.8]` as the published band.** The two derivation routes
are NOT independent, both are linear in the same shear-rate ansatz, so their 11 percent agreement is a
common-mode artefact and must not be quoted as an error bar. The band comes from the spread across
three geometries: bounded heap (Fan), chute (Wiederseiner), and the two scaling-law routes.

**`Sr = 1`, the current anchor, sits inside that band.** The dossier's headline that it is "roughly
three times too high" does not survive. What survives is that `Sr = 1` was never evidence: it is the
plotting normalisation in every figure of Gray and Thornton 2005, and figure 4's caption says so.

### The control the App exposes

**Not a bare `Sr` slider.** `Sr` scales as `delta^-2` and `delta`, the flowing-layer thickness on a
dumped ROM face, is the entire uncertainty: `delta = 0.5 m` gives `Sr = 2.6`, `1.0 m` gives `0.66`,
`1.5 m` gives `0.29`. Expose `layer_over_d`, the flowing-layer thickness in grain diameters, default
8.3 labelled as Fan's measurement on 1 to 3 mm glass spheres extrapolated 40x to 120 mm angular rock,
with the derived `Sr` and its band shown as a read-out. That puts the reader's hand on the quantity
that actually decides the answer.

### Tests

In `tests/test_segregation.py` and `tests/test_material_segregation.py`:

```
test_zero_segregation_number_leaves_every_bin_at_the_material_split   # exact ==, the C02 control
test_the_face_composition_comes_from_the_march_not_from_a_fitted_curve
test_segregation_number_from_geometry_reproduces_fan_heap_runs        # Lambda 0.78 -> 1.79, 0.40 -> 0.92, 1e-3
test_the_derived_segregation_number_lands_in_the_published_band       # 0.3 <= Sr <= 1.8 at defaults
test_the_flowing_layer_thickness_dominates_the_segregation_number     # halving delta quadruples Sr
test_species_mass_is_conserved_down_the_face_including_the_overrun    # 1e-12 relative
test_coarse_still_ends_up_at_the_toe                                  # sign, kept from the existing suite
test_a_taller_face_segregates_more                                    # kept, now through L rather than a fitted h term
test_a_single_sized_material_cannot_segregate                         # kept
```

The existing tests `test_a_steeper_face_segregates_more` and
`test_coarse_overruns_the_toe_and_more_so_from_a_higher_bench` must be re-derived rather than kept:
under the new model the angle enters only through `L = drop / sin(theta)`, so a **steeper** face gives
a SHORTER path and therefore LESS segregation, which is the opposite of the current fitted term. That
is a real change of claim and it must be argued in the doc, not slipped in: the published statement
that steeper faces "create faster material flow down the face, increasing trajectory segregation" is
about trajectory segregation on impact, which is a different mechanism from kinetic sieving in the
flowing layer, and the current code conflates them. **Either keep an explicit, separately labelled
trajectory term with its own source, or drop the angle dependence and say why.** Decide this before
implementing; do not let the test suite decide it by inertia.

### Pipeline, artifact and app

* **Pipeline.** `bake.py` line 529 keeps writing `"seg": r.segregation_index` but the value now comes
  from a solver. Add `segregation: {sr, sr_band, layer_over_d, s_over_d, path_m, d50_mm}` to the
  manifest so the number is auditable. Add an `Sr` axis to `scenarios.py` if and only if the doc's
  response curve is to be re-published; otherwise delete that paragraph rather than leave it
  unreproducible.
* **Artifact.** `field.json.coarse` changes shape again, on top of the 1A fix. Re-bake all 22.
* **App.** `docs/methods/04_segregation.md` header corrected to name both files and say which does
  what; the response-curve paragraph either regenerated or deleted; the new control on the Tool page.
  `frontend/src/lib/contract.types.ts` declares `config.sr`, `MatrixRow.sr` and
  `MatrixRow.toe_apex_grade_delta`; note that **no `matrix.json` exists anywhere in the repo** and
  `loadMatrix` is exported and never called, so that whole interface is unproduced and unconsumed. Out
  of scope here, logged in 2D.

**Effort: two to three days** for the coupling, the tests, the doc rewrite and the re-bake. The solver
is already written and already tested; this is wiring, not physics.

## 2C. DO NOT SHIP: the DEM calibration lane. Delist method 7.

### The honest reason, which is not the one the dossier gives

The dossier's reason, "the planned lane cannot run", is **false and must not be written into the
docs**. conda-forge does host `pychrono`: the feedstock exists, win-64 build configs exist for Python
3.10 through 3.14, and `conda-forge/win-64/pychrono-10.0.0` is a 4.5 MB package whose only declared
dependencies are `eigen`, `python` and `chrono` (534 MB). No CUDA, no cuBLAS, no MKL, no openmpi.
`environment-dem.yml` lists conda-forge before projectchrono, so that is the build conda would take.
The real cost is about 0.54 GB, not 1.32 GB. The only genuine blocker is that conda is not installed
on this host, which is a 75 MB Miniforge away.

**The docs currently say "PyChrono is published only on conda-forge and has no pip wheel". That
sentence is correct and must be left alone.** The dossier's proposed edit, that conda-forge does not
host it, would inject a new falsehood into three files.

The real reasons to delist:

1. **A DEM would re-measure, worse, what three published experiments already bound.** Fan's bounded
   heap is the same geometry, validated against a physical experiment with up to a million particles.
   A mine-scale in-house heap is about 12 100 spheres and would be less constrained, not more.
2. **The dominant uncertainty is not one a DEM can settle.** `Sr` scales as `delta^-2` and `delta` on
   a real dumped ROM face is unmeasured. A simulated heap reproduces whatever `delta` its own
   kinematics produce, which is circular. The measurement that resolves this is a camera on a real
   face, not a solver.
3. **The solver is the infinite-Peclet limit and the sources are not.** Wiederseiner reports
   `Pe = 11 to 19`, Fan `19 to 28`, Trewhela `5.7` at the base rising to `430` at the surface, and
   Wiederseiner states there is "no sharp separation ... but a continuous transition". Fitting a
   shock-capturing `D = 0` solver to a measured diffuse profile is ill-posed: it has no parameter that
   can widen the interface, so it trades profile width against `Sr` and the fitted value depends on
   the loss function. A DEM run would inherit exactly this. **If a fit is ever done, fit the shock
   POSITION (the depth where phi crosses 0.5), not the profile shape.** The proper fix is a different
   model, Gray and Chugunov's advection-diffusion form, which is a separate research question.
4. **Wiederseiner's own section IV contradicts the bridge the calibration rests on.** Their fitted
   percolation rate "is bell-shaped with a maximum reached at gammadot_bar = 1.4 s^-1. This contrasts
   with early observations by Bridgwater et al., who found that the percolation rate q is proportional
   to the shear rate." `q = S gammadot` is the assumption both derivation routes share.

### Also record, because it will bite someone

`pip install pychrono` **succeeds and installs the wrong software**: PyPI hosts an unrelated project
of that name at version 1.1.0, a 10 837-byte pure-Python timing-decorator library. Anyone reading "no
pip wheel" and trying pip anyway gets a silent success and a broken import. Similarly `yade` 0.1.3 on
PyPI is unrelated to the real Yade. This belongs in the delisting doc.

### Exact wording for `docs/methods/07_dem-calibration.md`

Replace the whole file:

> # Method 7: the discrete-element calibration heap
>
> **Family:** segregation · **Rung:** SOTA · **Tier:** precompute · **Status: DELISTED**
>
> ## The decision
>
> This method is delisted. It has no engine, no artifact and no evaluation, and it will not get one.
> `environment-dem.yml` is removed. Under the vertical-acceptance contract a method name in a selector
> with no engine behind it is forbidden, and that applies to a lane that is planned as much as to one
> that is half built.
>
> ## Why, given the environment can in fact be built
>
> The original kill criterion was environmental: if the DEM environment could not be built on the
> host, delist. **That criterion did not fire.** conda-forge publishes PyChrono, including a win-64
> build for Python 3.10 through 3.14, and it is a 4.5 MB package on top of a 534 MB `chrono`, with no
> CUDA and no MPI in its dependency graph. The only obstacle is that conda is not installed here,
> which is a 75 MB Miniforge away. The lane is delisted on merit instead, for three reasons.
>
> **It would re-measure, worse, what is already published.** Fan et al. measured the percolation
> length scale in a quasi-two-dimensional bounded heap, the same geometry, by DEM validated against a
> physical experiment with up to a million particles. An in-house heap at mine scale is about twelve
> thousand spheres. It would be less constrained, not more.
>
> **It cannot settle the quantity that dominates the answer.** The segregation number scales as the
> inverse square of the flowing-layer thickness, and that thickness on a real dumped run-of-mine face
> is unmeasured. A simulated heap reproduces whatever thickness its own kinematics produce, so
> calibrating against it is circular. The measurement that would resolve it is a camera on a real
> cascading load, not a solver.
>
> **The fit would be ill-posed.** This product's solver is the zero-diffusivity limit, which produces
> a sharp shock. Every experimental source reports a Peclet number between about 6 and 430 and a
> continuous transition rather than a sharp separation. A shock-capturing solver fitted to a diffuse
> profile has no free parameter that can widen the interface, so it trades interface width against the
> segregation number and the answer depends on the loss function. If a fit is ever attempted, fit the
> shock POSITION and not the profile shape. The proper fix is a different model, the Gray and Chugunov
> advection-diffusion form, and that is a separate research question rather than a calibration.
>
> ## What the product uses instead
>
> A segregation number derived from the geometry of the face being modelled, defaulting to `Sr = 0.7`
> with a published band of `0.3` to `1.8`. See [method 4](04_segregation.md) for the derivation, the
> three experiments that bound it, and why the flowing-layer thickness rather than the number itself
> is exposed as the control. The product does not describe its segregation as DEM-calibrated anywhere,
> and never did.
>
> ## A trap worth recording
>
> `pip install pychrono` succeeds and installs the wrong software. PyPI hosts an unrelated project of
> that name at version 1.1.0, a ten-kilobyte timing-decorator library. `yade` on PyPI is likewise
> unrelated to the real Yade. PyChrono is a conda package.
>
> ## References
>
> Gray, J.M.N.T. and Thornton, A.R. (2005). doi:10.1098/rspa.2004.1420, figure 4 caption: "The
> segregation number Sr = 1 which implies that all of the solutions segregate fully at x = 1." A
> plotting normalisation, not a measurement.
>
> Fan, Y. et al. (2014), arXiv:1401.7387. Percolation length scale in a bounded heap.
>
> Wiederseiner, S. et al. (2011), doi:10.1063/1.3536658. Chute measurements, Peclet 11 to 19, and the
> observation that the fitted percolation rate is bell-shaped in shear rate rather than proportional
> to it.

## 2D. Also fix, cheap, same release

Real defects confirmed by grep in this session, all of which mislead a reader into thinking work
exists that does not:

* **No `stlab` package exists anywhere in the repository.** Stale references in
  `data-pipeline/pipeline/__init__.py` line 1, `data-pipeline/README.md` lines 1-9, `data/README.md`
  line 18 (`data-pipeline/stlab/io/contract.py`), and `frontend/src/lib/contract.types.ts` line 4
  (`data-pipeline/stlab/core/trace.py`). The real package is `pipeline` and the modules are
  `assay.py`, `bake.py`, `kill_es.py`, `scenarios.py`, `io/`.
* **`data-pipeline/pipeline/calibrate.py` does not exist** and is referenced by method 7. Removed with
  the delisting.
* **`matrix.json` is never written and never read.** `loadMatrix` in `frontend/src/lib/artifacts.ts`
  line 31 is exported and called nowhere; `MatrixRow` is dead in both directions. Same for
  `loadTrace` and `loadMetrics`: neither `trace.json` nor `metrics.json` exists under
  `data/derived/*/`. Either produce them or delete the loaders and their types.
* **`docs/methods/04_segregation.md` line 3** names `bedblend/facesegregation.py` while the equations
  quoted are from `bedblend/segregation.py`.

---

# Part 3. The depth-averaged mu(I) slump

## 3A. DO NOT SHIP the solver

Three independent reasons, each sufficient, all confirmed by the verifier against primary full text.

1. **It is ill-posed in the state the product lives in.** The Barker et al. (2015) criterion gives
   `C(I = 0) = mu_s^2 > 0` for every published parameter set, so a pile at rest is unconditionally in
   the Hadamard-unstable regime: refine the 2.5 m grid and grid-scale noise grows faster and at
   shorter wavelength. Barker and Gray (2017), verbatim: "Purely static material when I = 0 and
   regions of large deformation are most likely to be ill posed." A StockTwin pile is at `I = 0` for
   essentially all of its modelled life.
2. **The depth-averaged viscosity is negative at the product's face angle for the best-posed
   parameter sets.** `nu(zeta)` diverges as `zeta` approaches `zeta_1`, is zero at `zeta_2`, and is
   negative outside `[zeta_1, zeta_2]`. With the standard glass-bead angles (20.9, 32.76) a 37 degree
   face is above `zeta_2` and `nu < 0` outright. Gray and Edwards, verbatim: the theory "cannot be
   used outside the valid range of angles without additional regularization".
3. **The scissors, which is the cleanest kill and which the dossier missed.** Applying the Barker
   criterion to the carborundum pair (`mu_s = 0.603`, `mu_2 = 1.091`), the one whose angles bracket 37
   degrees, gives an **empty well-posed band**: `C > 0` at every inertial number, and since the
   criterion depends on `I` only through `I / I_0`, that holds for any `I_0`. The sand pair is well
   posed only over a narrow window. **No published parameter set makes both a 37 degree face
   admissible to the depth-averaged theory and the local rheology well posed.**

Supporting: no mu(I) parameter set exists for run-of-mine rock (every published triple is 0.14 to
1 mm against the product's 50 to 500 mm); `L` is a joint grain-and-bed-roughness property measured by
a chute staircase with no stockpile analogue; and Lagree, Staron and Popinet showed the full continuum
"systematically underestimate[s] the run-out" close to arrest with errors "reaching 10 percent", which
is the only phase StockTwin records.

Effort avoided: three to five weeks.

## 3B. DO NOT SHIP the two-angle hysteresis either

The dossier and the verifier both recommend building the discretised `theta_start` / `theta_stop` rule
as the cheap alternative. **I am overruling that, on the criterion this plan was given: an effect
smaller than the model's own discretisation is a DO NOT SHIP.**

Recomputed this session for a 12.5 m face at `cell_m = 2.5`, `dz_m = 0.5`, all three published
hysteresis bands:

| band | source | hold angle | toe moves | in cells | per-cell drop changes | in voxels | cone volume, fixed footprint |
|---|---|---|---|---|---|---|---|
| 1.2 deg | glass beads, measured | 38.2 | 0.703 m | **0.28** | 0.0834 m | **0.17** | +4.43 % |
| 1.6 deg | carborundum, measured | 38.6 | 0.930 m | **0.37** | 0.1118 m | **0.22** | +5.94 % |
| 3.0 deg | sand, ESTIMATED not measured | 40.0 | 1.691 m | **0.68** | 0.2139 m | **0.43** | +11.35 % |

Sub-cell and sub-voxel in every case, including the one that is an estimate rather than a measurement.
And note the dossier's claim that carborundum is "THE ONLY ANGULAR-MATERIAL TRIPLE PUBLISHED" is false:
Edwards et al. 2019 Table 3 publishes glass and sand triples too, so the band is 1.2 to 3.0, not a
single 1.6, and the widest value is the estimated one.

Two further reasons, both from the product's own code:

* **The band sits inside a tolerance the engine already accepts.** `relax.py` sets
  `STABLE_TOL_DEG = 4.0`, and the comment block that sets it is headed "THE TOLERANCE IS PHYSICAL,
  NOT NUMERICAL" and cites the 34-to-60-degree published spread for ore repose angles. A 1.2 to 3.0
  degree correction is inside it by construction.
* **The engine already carries a larger, better-sourced hysteresis.** `settle()` holds the fresh
  truck-dumped heap at `FRESH_HEAP_SLOPE = 2.0`, that is 63.4 degrees, and relaxes it to 37: a **26.4
  degree band**, sourced to Young and Rogers 2021 figure 11 from fleet-management field data on real
  dumps ("At the time of dumping, heaps maintain an approximate 2:1 slope ... Over time the slope
  decreases to that of the natural angle of repose of the material"). Adding a second, ten-times
  smaller hysteresis measured on 300 micron silicon carbide, on top of one measured on real dumped
  rock, is not an improvement.

The one quantity that is not sub-discretisation is pile volume on a fixed footprint, +4.4 to
+11.4 percent. That is an effect of the ANGLE, not of the rheology, and the product already exposes
the repose angle as a control spanning 34 to 60 degrees, which is a far wider range.

## 3C. The one experiment worth running, and it is not a feature

There is a coupling the geometry argument does not cover: `cascade()` returns the ordered avalanche
path, and method 4 marches along it, so a two-threshold trigger changes **which** cells topple and in
**what order**, and therefore changes the segregation result even if the final surface is
geometrically indistinguishable. That is unquantified.

Settle it with one bounded experiment rather than a shipped feature, **after** Part 1 and Part 2 land:
run the reference case on a throwaway branch with `hold_deg = repose_deg + 1.6` in `cascade()`, and
measure the change in the toe-minus-apex coarse delta and in VRR against the seed band. Record the
result, null or not, in the method 6 delisting. **If both move less than the seed band, the delisting
is evidenced rather than argued, and the question is closed.** Half a day, and it is the difference
between a documented decision and an opinion.

## 3D. What measurement would reopen mu(I)

Quantified, so the answer is testable rather than a matter of taste:

* **A hysteresis band wider than 4.6 degrees**, measured on run-of-mine material, moves the toe of a
  12.5 m face by one full 2.5 m cell. **Wider than 6.6 degrees** moves the per-cell drop by one 0.5 m
  voxel. The widest published value is 3.0 and that one is an estimate. A chute campaign on ROM
  measuring `zeta_1`, `zeta_2`, `zeta_3` and `L` is the experiment; without it every number is a
  glass-bead value wearing a mining label.
* **A grid refinement to `cell_m <= 0.9 m`** makes the 1.6 degree toe motion resolvable. The product
  ships 2.5 m and the truckload support (Neufeld, Lyall and Deutsch: 2.5 m cells at half a load) is
  the reason, so this is not on any roadmap.
* **Segregation-induced fingering on the reclaim face** is the one application where the
  depth-averaged viscous term has a genuine job, because Woodhouse et al. showed the coupled
  size-segregation model is ill-posed without it. That is a different question from face geometry, it
  couples to method 4, and it needs its own research pass. Explicitly out of scope here.

## 3E. Exact wording for `docs/methods/06_mu-i-slump.md`

Replace the whole file:

> # Method 6: the depth-averaged reclaim-face slump
>
> **Family:** segregation · **Rung:** SOTA · **Tier:** precompute · **Status: DELISTED**
>
> ## The decision
>
> Not implemented, and it will not be. This is a delisting with reasons, not a deferral. It was
> researched in full against the primary literature and the conclusion is that the model is
> inadmissible for this product's state and that its one surviving prediction is smaller than this
> product's own discretisation.
>
> ## Why the model is inadmissible here
>
> **It is ill-posed where the pile lives.** The Barker et al. (2015) criterion gives `C(I = 0) =
> mu_s^2 > 0` for every published parameter set, so material at rest is unconditionally in the
> Hadamard-unstable regime: refining the grid makes grid-scale noise grow faster and at shorter
> wavelength. Barker and Gray (2017) put it plainly: "Purely static material when I = 0 and regions of
> large deformation are most likely to be ill posed." A stockpile is at `I = 0` for essentially all of
> its modelled life.
>
> **The depth-averaged viscosity is negative at this product's face angle.** `nu(zeta)` diverges as
> `zeta` approaches `zeta_1`, is zero at `zeta_2`, and is negative outside that interval. With the
> standard glass-bead angles a 37 degree face is above `zeta_2` and the viscosity is negative
> outright. Gray and Edwards state that the theory "cannot be used outside the valid range of angles
> without additional regularization".
>
> **No parameter set satisfies both conditions at once.** The two published sets whose angles bracket
> 37 degrees, carborundum and sand, are the worst posed: the carborundum pair has an EMPTY well-posed
> band, `C > 0` at every inertial number, independently of `I_0`. The glass-bead sets that are best
> posed put 37 degrees outside their admissible range. There is no published parameter set for which a
> 37 degree face is both admissible to the depth-averaged theory and well posed in the local rheology.
> There is also no mu(I) parameter set published for run-of-mine rock at all: every triple is for
> grains between 0.14 and 1 mm, against 50 to 500 mm here.
>
> ## Why the one surviving prediction does not reach the grid
>
> Of four candidate predictions, three are refuted by the sources themselves. The deposited angle does
> not depend on flow rate for a sidewall-free heap (Ray and Khakhar measured it "nearly constant for a
> ten-fold increase of the mass flow rate"). The deposit does not remember the flow that made it
> (Edwards et al.: deposit thickness equals `h_stop` for all initial thicknesses). The viscous term
> does not reshape the face (Gray and Edwards' own abstract: "a granular front propagating down a rough
> inclined plane is completely unaffected by the rheology"), and scaled to run-of-mine grain size its
> smoothing length is 0.21 to 1.32 m, which is 0.08 to 0.53 of one 2.5 m cell.
>
> What survives is the static-to-dynamic hysteresis: a face can be TRIGGERED at a steeper angle than
> the one it RELAXES to. The published bands are 1.2 degrees (glass beads, measured), 1.6 degrees
> (carborundum, measured) and 3.0 degrees (sand, estimated rather than measured). On a 12.5 m face,
> against this product's 2.5 m cells and 0.5 m vertical voxels:
>
> | band | toe moves | in cells | per-cell drop changes | in voxels |
> |---|---|---|---|---|
> | 1.2 deg | 0.703 m | 0.28 | 0.083 m | 0.17 |
> | 1.6 deg | 0.930 m | 0.37 | 0.112 m | 0.22 |
> | 3.0 deg | 1.691 m | 0.68 | 0.214 m | 0.43 |
>
> Sub-cell and sub-voxel in every case. The band is also inside `STABLE_TOL_DEG = 4.0`, the tolerance
> the relaxation verifier already accepts and which is set from the 34-to-60-degree published spread
> for ore repose angles.
>
> ## What the product uses instead, and why it is better sourced
>
> [Method 1](01_relaxation.md) already models a two-stage hysteresis, and a much larger one: a
> truck-dumped heap is emplaced at roughly 2:1, that is 63.4 degrees, and slumps to 37, a band of 26.4
> degrees. That comes from fleet-management field data on real mine dumps (Young and Rogers, Minerals
> 2021, 11, 636, figure 11: "At the time of dumping, heaps maintain an approximate 2:1 slope ... Over
> time the slope decreases to that of the natural angle of repose of the material"). Adding a
> ten-times-smaller hysteresis measured on 300 micron silicon carbide on top of one measured on real
> dumped rock would not be an improvement.
>
> ## What would reopen this
>
> A chute campaign on run-of-mine material measuring a hysteresis band **wider than 4.6 degrees**,
> which is the width at which the toe of a 12.5 m face moves one full cell, or **wider than 6.6
> degrees**, which is where the per-cell drop moves one voxel. The widest published value is 3.0 and
> it is an estimate. Alternatively a refinement of the height field to 0.9 m cells or finer, which is
> not planned: the 2.5 m cell is the truckload support this product is built on.
>
> A separate question that this delisting does NOT cover: segregation-induced fingering on the reclaim
> face. That is the one application where the depth-averaged viscous term has a real job, because the
> coupled size-segregation model is ill-posed without it (Woodhouse et al. 2012). It couples to
> [method 4](04_segregation.md) and would need its own research pass.
>
> ## References
>
> Gray, J.M.N.T. and Edwards, A.N. (2014). A depth-averaged mu(I)-rheology for shallow granular
> free-surface flows. J. Fluid Mech. 755, 503-534. doi:10.1017/jfm.2014.450
>
> Barker, T., Schaeffer, D.G., Bohorquez, P. and Gray, J.M.N.T. (2015). Well-posed and ill-posed
> behaviour of the mu(I)-rheology for granular flow. J. Fluid Mech. 779, 794-818.
> doi:10.1017/jfm.2015.412
>
> Barker, T. and Gray, J.M.N.T. (2017). Partially regularised mu(I)-rheology for granular flow. J.
> Fluid Mech. 828, 5-32.
>
> Edwards, A.N. et al. (2019). Frictional hysteresis and particle deposition in granular free-surface
> flows. J. Fluid Mech. 875, 1058-1095. Table 3 carries the three hysteresis triples quoted above.
>
> Ray, S. and Khakhar, D.V. (2025). J. Fluid Mech. 1008 A38. The heap angle is independent of feed
> rate over a tenfold range.
>
> Lagree, P.-Y., Staron, L. and Popinet, S. (2011). "Close to arrest however, continuum simulations
> systematically underestimate the run-out", error reaching 10 percent.
>
> Young, A. and Rogers, W.P. (2021). Minerals 11, 636, figure 11. The 2:1 emplacement slope.

---

# Release plan

## bedblend 0.06.001, patch, defects only

* `take_from_top` uses `dataclasses.replace`; the field-iterating guard test.
* `Parcel.n_transfers` counter, incremented in `apply_transfers`.
* Tests: 3 new. Target 119 tests, ruff clean.
* CHANGELOG entry states the measured consequence: 40.2 percent of coarse species mass destroyed in a
  shipped artifact with every gate green, and why no gate caught it.

## bedblend 0.07.000, minor, behaviour and API

* `BlockModel.over` takes the density from `Material`; the 1.9 literal is gone.
* `segregate_face` marches a `FlowingLayer`; new `sr` and `layer_over_d` arguments;
  `segregation_number_from_geometry` added; the three unsourced fitted constants removed.
* The face-angle claim resolved explicitly (see 2B) rather than inherited.
* Overrun accounted as a named species sink.
* Tests: about 9 new or re-derived.
* CHANGELOG states that tonnages move by +2.97 percent and that the segregation composition now comes
  from the published solver rather than from fitted curves.

## StockTwin 0.06.000

* `requirements.txt`: `bedblend==0.7.0`.
* `bake.py`: `species_mass_residual_rel` gate, the `segregation` manifest block, the overrun sink.
* Re-bake all 22 scenarios. **Acceptance: thickness-weighted coarse fraction lands at 0.33 plus or
  minus 0.02 against 0.35 placed on the reference case, with the residual explained by the overrun.
  If it does not, stop and find the second leak.**
* Docs: method 6 delisted (full text above), method 7 delisted (full text above), method 4 header and
  limits rewritten, method 18 compaction paragraph rewritten, method 1 "where it fails" rewritten.
* Delete `environment-dem.yml`. Fix the `stlab` references in four files. Resolve `matrix.json`,
  `trace.json` and `metrics.json`: produce them or delete their loaders and types.
* App: the flowing-layer-thickness control with its derived `Sr` read-out; one new invariant row on
  Benchmark; the mean-transfers-per-parcel provenance number.

## Not doing, recorded so it is not re-proposed

Depth-averaged mu(I) solver (3 to 5 weeks). Two-angle frictional hysteresis (sub-discretisation).
PyChrono DEM lane (delisted on merit). Per-voxel self-weight density field (sub-voxel everywhere).
A quantified degradation model (the calibration does not exist). Relocating the overrun mass beyond
the toe (correct, but it changes geometry and needs its own pass).

---

# Summary table

| Topic | Decision | Effort | What it changes about a number the product reports |
|---|---|---|---|
| **Parcel split loses `coarse_fraction`** (dossier 3) | **SHIP** | 0.5 d | `field.json.coarse`, thickness-weighted mean **0.2093 to about 0.33** against 0.35 placed. Restores 40.2 % of the coarse species mass. New gate `species_mass_residual_rel`. |
| **Transfer counter on `Parcel`** (dossier 3) | **SHIP** | 1 h | New provenance number: mean transfers per parcel, currently only inferable from `mean_displacement_m = 19.52`. Prerequisite for any degradation calibration. |
| **Bulk density reconciliation** (dossier 3) | **SHIP** | 1 h | Every tonnage **+2.97 %** (1.9 to 1.9565 t/m3). Cut tonnages, VRR weights, block export, volume reconciliation. Makes `manifest.material` true of the tonnages. |
| **Overrun as a named species sink** (dossier 3) | **SHIP** | 2 h | Closes the species-mass gate; about 0.017 of the coarse-fraction deficit. |
| **Wire Gray-Thornton into the live face** (dossier 2) | **SHIP** | 2-3 d | Face composition now solved, not fitted: removes the unsourced 2.2, 1.6 and 0.30 constants. `Sr` becomes a real, derived quantity, default **0.7**, band **0.3 to 1.8**. Toe-minus-apex coarse delta changes. Makes the product's SOTA segregation claim true of the running code. |
| **Flowing-layer-thickness control** (dossier 2) | **SHIP** | 0.5 d | Replaces a bare dimensionless knob with the quantity that dominates the answer: `Sr` scales as `delta^-2`, 0.29 at 1.5 m to 2.6 at 0.5 m. |
| **Doc and contract defects** (dossier 2) | **SHIP** | 0.5 d | No number changes. `stlab` phantom package in 4 files, `calibrate.py` phantom, `matrix.json` / `trace.json` / `metrics.json` unproduced, method 4 header pointing at the wrong file, method 4's unreproducible `Sr` response curve. |
| **DEM calibration lane** (dossier 2) | **DO NOT SHIP, delist method 7** | 0 (2 h doc) | Nothing. Removes the false claim that `Sr` is "the only free quantity in the live model" and the implication that a DEM would settle it. `environment-dem.yml` deleted. |
| **Calibrated single `Sr` value** (dossier 2) | **DO NOT SHIP** | n/a | Would have moved toe-minus-apex from +0.067 to +0.019 on a claim of 19 % precision. The real spread across three published geometries is 0.3 to 1.8 and `Sr = 1` is inside it. Ships as a band instead. |
| **Self-weight compaction / density field** (dossier 3) | **DO NOT SHIP, state the limit** | 0 (2 h doc) | Nothing. Would have been 0.5 to 1.5 % strain, 1.970 to 2.023 t/m3, at most +1.13 % relative on VRR against a plus or minus 84 % seed band. **All 2886 columns settle less than one 0.5 m voxel; the median settles 45 mm.** |
| **Quantified degradation model** (dossier 3) | **DO NOT SHIP, state the limit directionally** | 0 (1 h doc) | Nothing numeric. Adds the honest statement that the reported toe-minus-apex delta is confounded with breakage of the same sign in the same places, so it cannot be attributed to kinetic sieving alone. |
| **Depth-averaged mu(I) slump** (dossier 1) | **DO NOT SHIP, delist method 6** | 0 (2 h doc); 3-5 weeks avoided | Nothing. Ill-posed at `I = 0`; negative viscosity at 37 degrees for the best-posed parameter sets; no set satisfies both at once. |
| **Two-angle frictional hysteresis** (dossier 1) | **DO NOT SHIP** | 0 | Nothing resolvable. Toe moves **0.28 to 0.68 cells**, per-cell drop **0.17 to 0.43 voxels**, band 1.2 to 3.0 deg inside `STABLE_TOL_DEG = 4.0`, against an existing 26.4 deg field-sourced hysteresis. |
| **Hysteresis avalanche-ordering experiment** (dossier 1) | **RUN ONCE, do not ship** | 0.5 d | Measures whether a two-threshold trigger changes the segregation result through the avalanche path even when the surface is geometrically identical. Result, null or not, goes in the method 6 delisting. |

---

# Appendix A. What was reproduced in this session

Against the actual artifacts and the installed `bedblend 0.6.0`, not copied from the dossiers.

| Claim | Reproduced |
|---|---|
| Parcel split destroys `coarse_fraction` | Executed: 2.00 m parcel at 0.35 split at 1.00 m, moved slice 0.0000, coarse mass 0.700 to 0.350 |
| Baked coarse deficit | `field.json`: 2886 occupied cells, thickness-weighted coarse **0.2093**, range 0.0000 to 0.4509, 43 cells exactly zero, against 0.35 placed |
| Grid | `field.json`: `nx = ny = 60`, `cell_m = 2.5`. `volume.json`: `dz_m = 0.5`, `nz = 28` |
| Max overburden | 13.71 m at 1.957 t/m3 = **263.2 kPa** |
| Settlement | 4 modulus conventions, mass-weighted strain 0.52 to 0.97 %, max settlement 0.103 to 0.195 m, median 0.015 to 0.029 m, **0 columns over one 0.5 m voxel in every case** (dossier's softer 1.48 % / 0.301 m also under one voxel) |
| E50 refit | Zenodo 3625778, n = 121: 14.252 MPa, exponent 0.5178, R-squared 0.714 on logs |
| Reclaim | `cuts.json`: **24 cuts, 21 137.4 t total**, five at 3000 t then decaying to 12.3 t, mean 880.7 t. The dossier's "24 cuts of 3000 t" prose is wrong; its arithmetic used the real tonnages |
| Density inconsistency | `blocks.py:84` literal 1.9 against `Material.loose_density_t_m3 = 2.70 / 1.38 = 1.9565`, **2.89 %** |
| Hysteresis geometry | 12.5 m face: 1.2 / 1.6 / 3.0 deg gives toe 0.703 / 0.930 / 1.691 m (0.28 / 0.37 / 0.68 cells), drop 0.083 / 0.112 / 0.214 m (0.17 / 0.22 / 0.43 voxels), cone volume +4.43 / +5.94 / +11.35 % |
| Falsifier angles | Toe moves one 2.5 m cell at **4.57 deg**; per-cell drop moves one 0.5 m voxel at **6.64 deg** |
| `Sr` with Fan's `k = 2.3` | StockTwin defaults: Fan route **0.66**, Trewhela route **0.74**; Fan's own heap runs `k * Lambda` = **1.79** and **0.92** |
| No `Sr` in the product | grep across `data-pipeline/`, `frontend/src/`, `scripts/`, `tests/`: zero hits outside vendored `bedblend` |
| No `stlab`, no `calibrate.py`, no `matrix.json` | Confirmed; `pipeline/` holds only `assay.py`, `bake.py`, `kill_es.py`, `scenarios.py`, `io/`, `data/`. `loadMatrix` exported, called nowhere. No `trace.json` or `metrics.json` under `data/derived/*/` |
| Engine constants | `relax.py`: `STABLE_TOL_DEG = 4.0`, `FRESH_HEAP_SLOPE = 2.0`. `material.py`: `COMPACTION_BAND = (0.05, 0.15)`, `d50_mm = 120.0`, `coarse_fraction = 0.35`, `repose_dry_deg = 37.0`. `facesegregation.py`: `REFERENCE_DROP_M = 11.0`, `FAST_FLOW_ANGLE_DEG = 35.0`. `segregation.py`: `NZ_DEFAULT = 32`, `CFL = 0.4` |

**Not re-verified in this session** and carried on the verifiers' word: the primary-literature
quotations and equation numbers (both verifiers extracted the PDFs and matched verbatim), the
conda-forge `pychrono` feedstock facts, and the PyPI `pychrono` 1.1.0 name squat. Fan et al.'s journal
DOI was not checked; **arXiv:1401.7387 is the verified identifier and the docs must cite it that
way.**
