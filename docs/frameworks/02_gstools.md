# GSTools

**Lane:** offline · **Install:** `pip install gstools`

## What it is

A geostatistical toolbox for Python: spatial random fields, variogram estimation, covariance models and
kriging. Muller, Schuler, Zech and Hesse, Geosci. Model Dev. 15, 3161-3182, 2022,
doi:10.5194/gmd-15-3161-2022.

## Why it is here

For the controlled cases the input variogram must be SWEPT rather than inherited from a deposit
archetype: short range against long range, low sill against high. That is what makes the
theory-versus-simulation comparison meaningful, because the analytic bound assumes uncorrelated layers
and the only way to demonstrate why real beds fall short is to dial the correlation range from much
shorter than a layer to longer than the pile.

The live lane's exponential-covariance process is exact and cheap but one-dimensional; GSTools supplies
the three-dimensional field for the offline lane.

## Runnable example

```python
import gstools as gs

model = gs.Exponential(dim=3, var=0.03, len_scale=40.0)
srf = gs.SRF(model, seed=42)
field = srf.structured([range(40), range(40), range(12)])
```
