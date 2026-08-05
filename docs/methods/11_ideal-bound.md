# Method 11: the 1/N independent-source bound

**Family:** blending · **Rung:** classical · **Tier:** live

## The derivation

If the `N` independent sources a reclaim cut averages were independent draws from the input
distribution, the cut mean would have variance `var_in / N`. So

`N` is NOT the raw count of layers the cut crossed, and that distinction is the whole honesty of the
bound. It is the EFFECTIVE source count, the inverse participation ratio of the tonnage fractions in
the cut: a cut drawing 95 percent of its tonnage from one dig block and traces of four others is
averaging one source, not five, and counting keys would say five.

    VRR_ideal = 1 / N              E_ideal = sigma_in / sigma_out = sqrt(N)

This is DERIVED from first principles here and labelled as derived.

## Why it is not attributed to De Wet

The literature cites a De Wet (1994) design equation for the relationship between layer count and
homogenization. It could not be verified: Bulk Solids Handling 14(1) p. 93 is not available online, and
in the one paper that quotes it the equation is a rasterised image that did not survive text
extraction. It is therefore NOT reproduced or attributed. De Wet is cited only for the qualitative
claim that more layers blend better, which three independent sources confirm.

## The number this bound exists to prevent

Real beds do not reach the ideal. Schramm reports a mixing effect of 5 to 7.5 for beds of 200 to 600
layers, where the ideal `sqrt(N)` would be 14.1 to 24.5. Real blending therefore recovers roughly a
quarter to a third of the ideal benefit, because successive layers are autocorrelated, a cut does not
sample every layer equally, and segregation biases what each cut contains.

A simulator that reported the `1/N` curve as its result would inflate the benefit by an order of
magnitude. The product therefore plots achieved against ideal rather than achieved alone, and reports

    efficiency = VRR_ideal / VRR_achieved

as a first-class metric.

The floor is the 1/N bound computed from the EFFECTIVE source count, the inverse participation ratio
of the tonnage fractions in a cut rather than the raw count of layers crossed. A cut drawing 95
percent of its tonnage from one dig block and traces of four others is averaging one source, not
five. The efficiency, ideal over achieved, is NOT capped: a value above one is arithmetically
impossible for independent sources, so it says the effective source count is underestimated, and
both the bound and the efficiency are WITHHELD above 1.05 rather than clamped, because clamping
would hide exactly that diagnostic.

## The control that proves the implementation

C01, the perfect mixer: a single-cell pad has no geometry, so a cut is the tonnage-weighted mean of the
whole pile and the achieved ratio must contain `1/N` inside its multi-seed band. If it does not, the
ratio implementation is wrong and every number in the product is in doubt.

## References

Schramm, R. (2021). Design of blending beds. AT MINERALS PROCESSING 06/2021.

Bond, J.E., Coursaux, R. and Worthington, R.L. (2000). Blending systems and control technologies for
cement raw materials. IEEE Industry Applications Magazine 6(6), 49-59.
