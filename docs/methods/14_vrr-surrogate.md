# Method 14: the learned variance-reduction surrogate

**Family:** blending · **Rung:** beyond the published state of this problem · **Tier:** precompute to live
**Status: TRAINED OFFLINE, NOT SHIPPED IN THIS RELEASE**

## The question it answers

Given how variable the feed is, and how the pile will be built and reclaimed, what variance reduction
will result. A surrogate trained over a swept corpus answers that instantly, without running the
simulation. The inputs are what a planner KNOWS before building: the stream's variogram range and
normalised sill, the stacking method, the pass count, the reclaim method, the segregation number, the
tonnes per layer and the pad aspect.

## The target is log10 of the ratio

The ratio spans two orders of magnitude and is bounded below by zero. Regressing it directly makes the
loss dominated by the worst-blending configurations and lets the model predict a negative variance
ratio, which is not a number. In log space the target is unbounded, roughly symmetric, and a fixed
relative error costs the same everywhere.

The categorical variables are one-hot, not ordinal: encoding five stacking methods as 0 to 4 would tell
the model that chevcon is "more" than chevron, which is meaningless and which a linear baseline would
happily fit.

## The refutation, and the kill criterion

Kumral (2006) already fits a MULTIPLE REGRESSION over stockpile parameters and optimises the reduction
ratio with it. That is the nearest prior art, and a learned model that does not beat it adds nothing.
Both are therefore trained on the identical corpus and scored on the identical held-out set, with a
bootstrap band on the held-out error, and the criterion is explicit:

    ship  iff  RMSE_MLP  <  the 5th percentile of the regression's bootstrap RMSE band

If it does not clear that, the honest report is a negative result on the Benchmark page and the network
stays only as a demonstration of the in-browser learned lane, labelled as such.

## Honest status

The corpus generator, the regression baseline and the perceptron are implemented in the offline lane.
The refutation has NOT been run and its verdict has NOT been published, so the method does not appear
as a tab in the App and the Benchmark page says why. An unmeasured model displayed beside measured ones
is a defect, not a feature.

## Why numpy and not a deep-learning framework

A six-to-sixteen-to-one perceptron over a few thousand rows. Backpropagation for that is thirty lines,
it trains in under a second on a laptop CPU, it is exactly reproducible from a seed, and it adds no
dependency to a lane that has to stay installable.

## References

Kumral, M. (2006). J. S. Afr. Inst. Min. Metall. 106(3), 229-236.
