# Method 9: the variance reduction ratio

**Family:** blending · **Rung:** classical · **Tier:** live in the browser · `bedblend/blending.py`, `frontend/src/lib/scenario.ts`

## The definition, and the direction of the inequality

    VRR = var_out / var_in            LOWER IS BETTER

That is the definition in Loubser and de Korte, following Kumral, and their own results confirm the
direction, for CONVEYOR-STACKED beds: cone shell 0.232 against chevcon 0.121, with the text concluding that chevcon delivers much
better consistency.

The reciprocal convention also circulates in secondary sources, and this product's own plan was
originally written against it. Building on the wrong direction would have inverted every number and
made the recommendation layer advise the worse stacking method with apparent confidence. The direction
is pinned by a test and the formula is rendered next to the value on every surface.

## The tonnage base

Both variances are computed on a TONNAGE base, which is Kumral's explicit requirement: input and output
must be compared over identical weights or volumes.

    sigma^2 = sum_i m_i (g_i - g_bar)^2 / sum_i m_i
    g_bar   = sum_i m_i g_i / sum_i m_i

It is easy to violate by accident, because cuts are typically an order of magnitude larger than the
dumps that fed them, and a count-weighted variance would be wrong by roughly that factor.

## The mixing effect

    E = sigma_in / sigma_out = 1 / sqrt(VRR)

Provided because the only quantified anchor for a REAL bed is published in this form: a mixing effect
of 5 to 7.5 for beds of 200 to 600 layers. Converting the product's own result into the anchor's units
is what makes the comparison honest rather than approximate.

## Always with a band

A point number with no interval is a defect on this product line, and here it would also be an
inflation: the ratio of a single realisation is itself a random variable, and quoting whichever draw
looks best overstates what a bed achieves. Every baked case carries a 5th-to-95th percentile band over
31 seeds, and the live single-seed result is drawn against it.

## References

Loubser, Z. and de Korte, J. (2015). doi:10.17159/2411-9717/2015/v115n8a15

Kumral, M. (2006). Bed blending design incorporating multiple regression modelling and genetic
algorithms. J. S. Afr. Inst. Min. Metall. 106(3), 229-236.

Robinson, G.K. (2004). How much would a blending stockpile reduce variation? Chemom. Intell. Lab. Syst.
74(1), 121-133. doi:10.1016/j.chemolab.2004.03.010
