# Method 12: the residence-time distribution

**Family:** traceability · **Rung:** classical · **Tier:** live in the browser · `frontend/src/lib/scenario.ts`

## What it computes

A stockpile is not only a blender: it is a buffer between the pit and the plant, and its residence-time
distribution is decided entirely by its geometry and its reclaim rule.

    tau         = sum_i m_i (t_out,i - t_in,i) / sum_i m_i
    sigma^2/tau^2 = the dimensionless spread

The dimensionless spread is zero for ideal plug flow and one for an ideal perfectly mixed tank, which
places the pile on the scale process engineers already think in.

## The references are walked, not approximated

A freshly built cone reclaimed from its face behaves close to last-in-first-out; a properly bedded
chevron reclaimed full-face behaves close to first-in-first-out. Neither is exact, and the honest answer
is the SHAPE of the distribution rather than a label.

Both references are computed for the SAME event sequence by walking an explicit inventory queue, so
they remain exact when the stacking and reclaim rates are not constant. The pile's actual character is
then placed between two curves it could have had:

    p = (tau_measured - tau_LIFO) / (tau_FIFO - tau_LIFO)   in [0, 1]

## The label is descriptive, and says so

The band shown in the UI is a descriptive band over `p`. There is no published threshold that makes 0.6
"mostly first-in-first-out", and the interface states that rather than implying a standard exists.

## Where the abstraction comes from

FIFO, LIFO and blended is the industry's own three-way abstraction: mine-planning software exposes
stockpile reclaim as exactly those three rules. It is not an invention of this product.

## References

Moraga, C., Kracht, W. and Ortiz, J.M. (2022). Process simulation to determine blending and residence
time distribution in mineral processing plants. Minerals Engineering 187, 107807.
doi:10.1016/j.mineng.2022.107807
