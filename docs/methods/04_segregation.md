# Method 4: kinetic size segregation as a conservation law

**Family:** segregation · **Rung:** SOTA · **Tier:** live · `model/segregation.py`, `engine/segregation.ts`

## The mechanism

Kinetic sieving, identified by Savage and Lun: as granular material shears, small particles
preferentially fall into the void space opening beneath them and lever the large ones upward. Gray and
Thornton formulated it as a binary mixture theory, and that formulation is what runs live here.

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

## Symbols

`phi` volume fraction of the SMALL species, dimensionless; `phi_s`, `phi_l` the small and large
fractions, summing to one; `w_s`, `w_l`, `w` normal velocities of each species and of the bulk, m/s;
`q` the mean segregation velocity, m/s; `B` the dimensionless magnitude of the pressure-partition
perturbation; `c` an inter-particle drag coefficient; `zeta` the slope inclination; `L`, `H`, `U` the
typical path length, flowing-layer thickness and velocity; `Sr` the segregation number.

## The coupling, and why it is a SHIFT

Fines drain to the BASE of the flowing layer. Material that stops on the flank is drawn from that base
and material that keeps travelling is drawn from the top, so the toe, fed by what travelled furthest,
ends up coarse. Coarse-at-the-toe is an OUTPUT of the model, not a rule in the code.

An early version wrote the composition the solver returned directly onto the lots being moved. That is
wrong: an avalanche also carries whatever the load dislodged, which came from earlier dumps with their
own size distributions, and writing an absolute composition stamps the current truck's size split onto
older material. What the solver produces is a REDISTRIBUTION, so what is applied to the ledger is the
SHIFT away from the layer's own mean; the two shifts cancel by construction, species mass is conserved,
and at `Sr = 0` no lot is touched. The negative control caught the original error by a quarter of the
full range.

## What the magnitude is, and why it is right

Measured on the strong-sieving case, the toe-minus-apex coarse-fraction delta runs -0.010 at `Sr = 0`,
+0.037 at 0.5, +0.067 at 1.0, and saturates near +0.09. The sign flips as soon as the solver is on, and
then the magnitude stops growing. That is what the theory says should happen: a layer segregates
COMPLETELY within a downslope distance of order `1/Sr`, so once one avalanche is enough, raising `Sr`
has nothing left to separate. The absolute magnitude is modest because most of a load stays where it
lands: segregation on a pile is a flank effect, not a bulk one.

## Where it fails

A published CONTINUUM model, not particle-scale truth. It solves no discrete elements, knows nothing of
particle shape or contacts, and has exactly one free parameter.

## References

Gray, J.M.N.T. and Thornton, A.R. (2005). A theory for particle size segregation in shallow granular
free-surface flows. Proc. R. Soc. A 461(2057), 1447-1473. doi:10.1098/rspa.2004.1420

Savage, S.B. and Lun, C.K.K. (1988). Particle size segregation in inclined chute flow of dry
cohesionless granular solids. J. Fluid Mech. 189, 311-335. doi:10.1017/S002211208800103X

Gray, J.M.N.T. (2018). Particle segregation in dense granular flows. Annu. Rev. Fluid Mech. 50(1),
407-433. doi:10.1146/annurev-fluid-122316-045201
