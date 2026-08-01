# Method 2: the five stacking geometries

**Family:** geometry · **Rung:** classical · **Tier:** live · `model/stacking.py`, `engine/stacking.ts`

## What it computes

Given the pad, the number of stacker passes and which dump this is, WHERE the material lands.
Everything else about how a pile blends follows from that answer, which is why these are five named
geometries and not one function with a spread parameter.

## The five

* **Chevron.** The stacker travels the full length along the centre line, back and forth, laying
  gable-section layers on one another. Many thin layers, strong toe bias, because every layer
  avalanches down the same two flanks.
* **Windrow.** The same longitudinal travel with the deposition axis slewing laterally between passes,
  building parallel cords stacked pyramidally.
* **Cone shell.** Successive cones at a stepping position, each shelling over the last. Few effective
  layers per cut.
* **Strata.** Inclined layers built against one flank, the stacker stepping laterally as the pile grows.
* **Chevcon.** Chevron travel combined with the stepping of cone shell, producing inclined layers.

## The equation

The chevron path is a triangular wave in the normalised dump index over the usable span:

    x(k) = x0 + Lambda( (k / (n - 1)) * P ) * (x1 - x0)
    Lambda(s) = s mod 2            when (s mod 2) <= 1
              = 2 - (s mod 2)      otherwise

Windrow adds a lateral offset per cord; chevcon advances the origin of the travel window as the build
progresses; strata leans the deposition axis across the pad.

Tonnes per layer, the quantity that decides whether layers are independent:

    t_layer = T_total / P

Compared against the input variogram range: once the range exceeds one layer, the layers a cut crosses
are not independent samples and the bed recovers far less than the ideal.

## The measured result, and a finding

Measured on this engine at seed 42: chevron 0.061, strata 0.083, chevcon 0.096, windrow 0.111, cone
shell 0.147. The ordering the literature agrees on, chevcon better than cone shell, is reproduced. But
chevron comes out BETTER than chevcon, which at first reading contradicts Loubser and de Korte.

It does not. Their comparison is on a CIRCULAR yard, where continuous operation forces the stacker
around the ring and chevron is not an available method. On a linear bed every chevron layer spans the
whole length, so a cut at any station samples layers from across the entire build; chevcon's layers are
laid inside a travelling window and are correlated with one another. Chevcon crosses MORE layers per
cut (29.8 against 19.5) and still blends worse, which is the clearest demonstration in the product that
layer count alone is not the answer.

## Where it fails

The geometries are deposition PATHS, not machine models: travel speed, boom slew rate and the discrete
nature of a stacker's motion are folded into the pass count. A real chevcon pattern on a circular yard
has a geometry this linear pad cannot represent, and the product says so rather than implying the
comparison is like for like.

## References

Schramm, R. (2021). Design of blending beds. AT MINERALS PROCESSING 06/2021.

Loubser, Z. and de Korte, J. (2015). Investigation of factors influencing blending efficiency on
circular stockpiles through modelling and simulation. J. S. Afr. Inst. Min. Metall. 115(8), 773-780.
doi:10.17159/2411-9717/2015/v115n8a15

Pavloudakis, F.F. and Agioutantis, Z. (2003). Simulation of bulk solids blending in longitudinal
stockpiles. Int. J. Surf. Min. Reclam. Environ. 17(2), 98-112. doi:10.1076/ijsm.17.2.98.14127
