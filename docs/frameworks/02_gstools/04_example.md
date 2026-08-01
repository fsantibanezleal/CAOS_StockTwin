# GSTools, a runnable example

```python
import numpy as np
import gstools as gs

# a practical range of 4000 t on the exponential model is len_scale = 4000 / 3
model = gs.Exponential(dim=1, var=0.0256, len_scale=4000.0 / 3.0)
srf = gs.SRF(model, mean=0.62, seed=7)

tonnes = np.cumsum(np.full(400, 220.0))
grade = srf.unstructured([tonnes])
print(f"{grade.size} loads, mean {grade.mean():.3f} pct Cu, sd {grade.std():.3f}")
```

This example is executed by `scripts/check_framework_examples.py`, so it cannot rot into an incantation that no longer runs.
