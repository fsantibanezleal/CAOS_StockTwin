# Method 3: the four reclaim geometries

**Family:** geometry · **Rung:** classical · **Tier:** live · `model/pile.py::Pile.reclaim`

## The parameterisation, and why it is the physics

A reclaim geometry is fixed by two numbers: what fraction of the face WIDTH the machine engages, and
how far down the column it REACHES in one cut. Together they decide how many stacked layers end up in
the cut, and the layer count is the dominant term in the variance reduction. Nothing else about the
machines matters to the grade of what they take.

| method | width | reach | machine |
|---|---|---|---|
| `fullface` | 100 % | 100 % | bridge or harrow reclaimer raking the full cross-section |
| `bucketwheel` | 33 % | 55 % | slewing bucket wheel cutting a bench |
| `end` | 100 % | 30 % | end reclaim taking the exposed end face |
| `loader` | 3 cells | 12 % | front-end loader biting the accessible face |

The most important distinction is not the machine but the DEPTH RULE. A rake engages the whole face at
once, so it takes a proportional share of EVERY lot in the column; every other machine works from the
top down, and that is exactly what makes it miss the buried layers. In the code that difference is a
single boolean, and it accounts for most of the separation between the four.

## The machine walks

A shallow-reaching machine cannot fill a cut from one station, so it advances along the pile until the
cut is complete, exactly as it would on a pad. Returning one undersized cut per station instead would
produce thousands of tiny cuts, which is not what the plant receives, and would make the reclaimed
stream look far more variable than it is purely as an artefact of the model's step size.

## The equations

    g_cut = sum_i m_i g_i / sum_i m_i
    f_e   = sum_(i : e_i = e) m_i / sum_i m_i
    sum_e f_e = 1
    N_layers = |{ e : f_e > 0 }|

The layer count is MEASURED from the ledger, not predicted from the geometry, and the App shows both
side by side so a disagreement is visible.

## A result that came out against expectation

The naive ordering was full-face, bucket wheel, end, loader. Measured, the loader came out AHEAD of
end reclaim. The reason is geometric: a loader taking shallow scattered bites must walk many stations
to fill one cut, and that walk averages along the pile, while the end reclaimer fills its cut in one or
two stations and averages nothing longitudinally. It is reported as it came out, with the explanation,
rather than by tuning the parameterisation until the order matched intuition.

## References

Zhao, S., Lu, T.F., Koch, B. and Hurdsman, A. (2015). 3D stockpile modelling and quality calculation
for continuous stockpile management. Int. J. Miner. Process. 140, 32-42. doi:10.1016/j.minpro.2015.04.012
