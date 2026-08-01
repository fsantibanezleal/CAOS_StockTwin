# bedblend, a runnable example

```python
import bedblend as bb

pad = bb.PadSpec(nx=24, ny=16, cell_m=3.0)
dumps = bb.generate_stream(n_dumps=120, seed=7)
cfg = bb.RunConfig(pad=pad, stacking="chevron", reclaim="fullface",
                   n_passes=12, sr=1.0, cut_tonnes=600.0)

result = bb.simulate(cfg, dumps)
m = result.metrics
print(f"{len(result.cuts)} cuts, VRR {m.vrr:.3f} against the 1/N ideal {m.vrr_ideal:.3f}")
print(f"{m.n_layers_mean:.1f} layers per cut")

# every reclaimed tonne traces back to the loads that made it
first = result.cuts[0]
print(f"cut 0 drew on {len(first.sources)} deposition events, "
      f"fractions summing to {sum(first.sources.values()):.6f}")
```

This example is executed by `scripts/check_framework_examples.py`, so it cannot rot into an incantation that no longer runs.
