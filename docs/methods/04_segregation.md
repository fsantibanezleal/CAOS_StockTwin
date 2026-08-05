# Method 4: kinetic size segregation as a conservation law

**Family:** segregation · **Rung:** SOTA · **Tier:** precomputed · `bedblend/segregation.py`, `bedblend/facesegregation.py`

## The mechanism

Kinetic sieving, identified by Savage and Lun: as granular material shears, small particles
preferentially fall into the void space opening beneath them and lever the large ones upward. Gray and
Thornton formulated it as a binary mixture theory, and that formulation is what runs live here.

**That last sentence was false until engine 0.07.000 and it is worth saying so.** The solver existed,
in `bedblend/segregation.py`, with the Godunov flux and the conservative deposition split described
below and a passing test suite of its own. Nothing in any shipped path called it. What ran was three
fitted curves with six constants in the coupling module next door, and this page described the solver
anyway. Every check passed: the tests, because the solver's own tests exercised the solver directly;
the documentation audit, because every surface described the same solver and the audit only compared
surfaces to each other. The directions the curves encoded were published and correct, which is exactly
why it survived for as long as it did. `scripts/check_method_ladder.py` now walks the import graph from
the bake and fails if a method rated SOTA names a module nothing invokes.

## The equations, with the source's own numbering

Percolation velocities relative to the bulk, and the mean segregation velocity:

    w_l - w = + q phi_s                                                    (3.10)
    w_s - w = - q phi_l                                                    (3.10)
    q = (B / c) g cos(zeta)                                                (3.11)

Substituting into the small-particle mass balance and non-dimensionalising with the standard avalanche
scalings:

    dphi/dt + d(phi u)/dx + d(phi v)/dy + d(phi w)/dz
        - Sr d/dz[ phi (1 - phi) ] = 0                                     (3.18)
    Sr = q L / (H U)                                                       (3.19)

On a pile flank the avalanche is a shallow layer of roughly uniform thickness flowing over a static
bed. Taking plug flow and marching in the downslope coordinate reduces (3.18) to a one-dimensional
scalar conservation law in depth, with zero flux at the free surface and the base:

    dphi/dx + dF/dz = 0,      F(phi) = -Sr phi (1 - phi)

`F` is convex, so a Godunov flux is exact for the Riemann problem at every interface and the
concentration SHOCKS Gray and Thornton identify as the observed feature survive rather than being
smeared by a Lax-Friedrichs average. The characteristic speed is bounded by `Sr`, so the march is
sub-stepped at `dx <= CFL dz / Sr` with 32 depth cells.

### Diffusive remixing, and why the 2005 model alone is not enough

Gray and Chugunov's successor paper adds the one term the 2005 formulation leaves out, the random
collisional remixing that opposes the sieving:

    dphi/dx + dF/dz = d/dz[ Dr dphi/dz ],      Pe = Sr / Dr

**The measurement that forced it.** Without remixing the hyperbolic flux separates the species
completely and then stops. On this engine's reference material the on-face sorting index reads 0.5162
at `Sr = 1.5` and 0.5162 at `Sr = 15`: identical to four decimals across a tenfold range. Every
scenario in the product would have reported the same segregation whatever its drop height or face
angle, which is a model that has stopped listening. With the remixing term the index rises
monotonically across the whole operating range instead of pinning at the ceiling.

The shocks are kept, because they are a real feature of the 2005 solution; what the remixing adds is
that a shock has a finite thickness, and that is what stops the answer being binary. The term is
carried on the same interfaces as the segregation flux with the same no-flux walls, so the scheme
stays exactly conservative and the species-mass test passes unchanged rather than to a looser
tolerance. Being parabolic it has its own stability limit, `dz^2 / (2 Dr)`, and the sub-step honours
whichever of the two limits binds. At `Sr = 0` the diffusivity is zero too, so the negative control is
still an exactly passive tracer rather than an approximately passive one.

## Symbols

`phi` volume fraction of the SMALL species, dimensionless; `phi_s`, `phi_l` the small and large
fractions, summing to one; `w_s`, `w_l`, `w` normal velocities of each species and of the bulk, m/s;
`q` the mean segregation velocity, m/s; `B` the dimensionless magnitude of the pressure-partition
perturbation; `c` an inter-particle drag coefficient; `zeta` the slope inclination; `L`, `H`, `U` the
typical path length, flowing-layer thickness and velocity; `Sr` the segregation number.

## Where Sr comes from, and one place the sources disagree

`Sr = q L / (H U)` needs the flowing layer's geometry, and the engine derives it rather than setting
it. The layer's velocity comes from the depth-averaged momentum balance on a slope,
`U = sqrt(2 g (sin t - mu cos t) L)`, with `mu` the tangent of the DYNAMIC friction angle, taken as the
material's repose angle less the published start-stop hysteresis. Its thickness comes from flux
conservation, `H = Q / U`, floored at a few particle diameters. The percolation velocity scales on the
shear rate, `q = kappa (U/H) d`. Then

    Sr = q L / (H U) = kappa d L / H^2

and **U has cancelled**: how fast the layer runs does not change how much it sieves per metre of slope,
because a slower layer takes longer over the same path.

**Which regime binds, measured rather than assumed.** For run-of-mine rock at a 120 mm d50 the
flux-limited thickness `Q/U` comes out between 0.09 and 0.35 m across every drop and angle the product
runs, against a grain floor of 0.60 m. The layer is GRAIN-limited in every case and never flux-limited,
so `H` is constant and `Sr` is proportional to the path length `L = drop / sin(t)` alone.

### The disagreement

That makes kinetic sieving rise with the drop height, which is the published direction, and **fall
gently with the face angle**, because a steeper face is a shorter run from crest to toe. The sources
say the opposite about angle: steeper faces "create faster material flow down the face, increasing
trajectory segregation".

Both are right, about different mechanisms. Trajectory segregation is BALLISTIC and Gray-Thornton's
equation does not contain it. The fitted curve this page used to describe had merged the two, so it
made a single index rise with angle and read as agreement with the source; it agreed because it had no
way to disagree. The engine now reports them separately: the on-face sieving index, and the material
thrown clear of the toe, which grows with angle and is almost pure coarse. A reader can check each
against the source it came from.

A face standing below the material's dynamic friction angle does not avalanche, so it does not sort,
and the model says so. The old angle term was a ramp from 28 degrees with nothing physical underneath
it and gave a stable slope a segregation gradient anyway.

## What the coupling writes to the ledger

Fines drain to the BASE of the flowing layer. Material that stops on the flank is drawn from that base
and material that keeps travelling is drawn from the top, so the toe, fed by what travelled furthest,
ends up coarse. Coarse-at-the-toe is an OUTPUT of the model, not a rule in the code.

The march deposits into `n_bins` stations from crest to toe, and each cell of the placement takes the
local coarse fraction of the station it falls in. That composition belongs to the NEW parcel only: the
ledger stores parcels, so recording a size split for the material a truck just tipped cannot restamp
the older material underneath it. Species mass is conserved exactly by `split_base`, which is a test
rather than a comment, and at `Sr = 0` every station receives the load's own unsorted split.

HOW MUCH is laid down at each station is not solved, it is observed: "this cascade of material
typically aggregates more at the bottom of the dumping area ... and less near the top crest". That
published mass distribution is imposed and the sieving is not, and the two are kept apart so the claim
about each can be checked on its own.

## What the magnitude is, measured on the shipped artifacts

Across 22 scenarios, the per-load drop that forms a face has a median of 1.54 m and a maximum of
11.06 m, so the product runs at `Sr` between about 0.04 and 1.84 with a median near 0.25. That is the
responsive part of the curve, well below the ceiling, which is the reason the remixing term matters.

The resulting on-face sorting index has a median of 0.097 and a maximum of 0.367. On the finished
piles the cell coarse fraction spans 0.256 at the 5th percentile to 0.608 at the 95th, reaching 0.98
in toe cells and 0.08 in fine-rich crest cells, with the mean at 0.365 against the 0.35 that was
placed. The fitted curves it replaced produced 0.332 to 0.400: a band so narrow that the segregation
half of the product had almost nothing to show.

The overrun is small at these drop heights, a median of 0.2 percent of the load, and it is what the
model says it should be: nearly pure coarse, at a median 0.87 coarse fraction.

## Where it fails

A published CONTINUUM model, not particle-scale truth. It solves no discrete elements and knows
nothing of particle shape or contacts.

**Two anchored constants, both named and neither fitted to this material.** `PERCOLATION_COEFFICIENT`,
the ratio of the percolation velocity to the shear rate times the particle diameter, set so that `Sr`
for a reference dump lands inside the range of the source's worked examples; and `PECLET_DEFAULT`, the
ratio of sieving to remixing, held at the middle of the range Gray and Chugunov fit against chute
experiments. These are what the DEM calibration lane exists to measure, and it has not been run for
this release. See method 7.

**Trajectory segregation is not modelled**, only reported as an overrun magnitude driven by the
published drivers. Its composition comes from the solver, since what overruns is whatever is still
travelling in the layer at the toe, but the amount is an operational estimate.

## References

Gray, J.M.N.T. and Thornton, A.R. (2005). A theory for particle size segregation in shallow granular
free-surface flows. Proc. R. Soc. A 461(2057), 1447-1473. doi:10.1098/rspa.2004.1420

Savage, S.B. and Lun, C.K.K. (1988). Particle size segregation in inclined chute flow of dry
cohesionless granular solids. J. Fluid Mech. 189, 311-335. doi:10.1017/S002211208800103X

Gray, J.M.N.T. and Chugunov, V.A. (2006). Particle-size segregation and diffusive remixing in
shallow granular avalanches. J. Fluid Mech. 569, 365-398. doi:10.1017/S0022112006002977

Gray, J.M.N.T. (2018). Particle segregation in dense granular flows. Annu. Rev. Fluid Mech. 50(1),
407-433. doi:10.1146/annurev-fluid-122316-045201
