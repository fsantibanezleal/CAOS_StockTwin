# Method 10: the experimental variogram

**Family:** blending · **Rung:** classical · **Tier:** live

## What it computes

Matheron's experimental semivariogram of the incoming and reclaimed streams:

    gamma(h) = (1 / 2 N(h)) * sum over pairs separated by h of (z_i - z_j)^2

## The lag is in TONNES, not seconds

A stockpile's input is a one-dimensional lot in Gy's sense, and its heterogeneity is a function of mass
along the stream, not of how long the trucks took. Using clock time would make the variogram depend on
how busy the shift was, which is an operational fact about the fleet rather than a geological fact
about the ore.

## The model fit

A nugget-plus-spherical model,

    gamma(h) = c0 + c (1.5 h/a - 0.5 (h/a)^3)   for h < a,     c0 + c   beyond

fitted by a grid search on the range with a weighted linear least squares in the nugget and sill for
each candidate. A grid search rather than a gradient method: the parameter is one-dimensional and
bounded, the objective is cheap, and a deterministic search gives identical results in the Python and
TypeScript lanes where an optimiser's convergence path would not.

## Why it earns its place

The fitted range, compared against the tonnes laid down per lift, is what decides whether the
layers a cut crosses are independent. It is the single most useful diagnostic in the product for
explaining why one configuration blends and another does not.

## Where it fails

Lags with few pairs are noisy, and the tail of any experimental variogram is unreliable. The product
returns the pair count per lag alongside the value so a reader can see which points to trust, and the
fit weights by pair count and ignores lags with fewer than five pairs.

## References

Isaaks, E.H. and Srivastava, R.M. An Introduction to Applied Geostatistics. Oxford University Press.

Pitard, F.F. (2019). Theory of Sampling and Sampling Practice, 3rd edition. CRC Press.
