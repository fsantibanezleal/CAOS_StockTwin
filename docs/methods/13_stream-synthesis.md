# Method 13: geostatistical stream synthesis

**Family:** data · **Rung:** classical · **Tier:** precompute and live · `model/stream.py`, `engine/stream.ts`

## Why the input is not white noise

The whole question a blending bed answers is how much of the input's variability survives, and that
depends on the input's AUTOCORRELATION, not just its variance. If consecutive trucks are strongly
correlated, the layers a cut crosses are not independent samples and the bed recovers far less than the
`1/N` bound promises. A white-noise input would make every bed look excellent and would hide the single
most important effect in the domain.

Marques and Costa make exactly this point: they drive their blending-pile simulator with
geostatistically simulated grades so that in-situ variability reaches the pile, validated on two large
Vale iron mines.

## The model

A stationary Gaussian process in cumulative tonnage with an exponential covariance,

    C(h) = sill * exp(-3 h / a)

which has its practical range at `a`. On evenly spaced samples this has an exact one-step recursion,

    z[k+1] = rho z[k] + sqrt(1 - rho^2) e[k],      rho = exp(-3 dh / a)

so it is generated exactly rather than approximately, in one pass, with no matrix factorisation. That
matters because the same generator has to run in the browser and produce identical results to the
offline lane.

## The five structures

`stationary`, `short_range`, `long_range`, `trending`, `bimodal`. The long-range and trending cases are
the ones a product wanting to look good would quietly omit, and they ship as headline cases: the first
shows a bed that barely helps, the second shows a mean that moves so that variance reduction on the
whole record becomes a misleading summary.

A second, independent correlated field drives the size distribution, because size and grade are not the
same geological variable and coupling them would bake in a correlation the data does not have.

## The richer offline lane

For the controlled cases, sequential Gaussian simulation over a three-dimensional ore body through
GSTools, and for the real lane, published MineLib block models with real copper grades. The exponential
process here is the live lane's exact, cheap, honestly-labelled equivalent.

## References

Marques, D.M. and Costa, J.F.C.L. (2013). An algorithm to simulate ore grade variability in blending
and homogenization piles. Int. J. Miner. Process. 120, 48-55. doi:10.1016/j.minpro.2013.01.003

Muller, S., Schuler, L., Zech, A. and Hesse, F. (2022). GSTools v1.3: a toolbox for geostatistical
modelling in Python. Geosci. Model Dev. 15, 3161-3182. doi:10.5194/gmd-15-3161-2022
