# oreblocks, a runnable example

```python
from oreblocks import BlockGrid, Econ, block_values, build_precedence, make_deposit, solve_upit

grid = BlockGrid(nx=16, ny=16, nz=8, dx=6.0, dy=6.0, dz=6.0)
dep = make_deposit(grid, "porphyry", seed=42, peak_grade=0.022, background=0.0008)
econ = Econ(price=8500.0, mining_cost=2.5, processing_cost=12.0, recovery=0.88)
upit = solve_upit(block_values(dep, econ), build_precedence(grid))

print(f"{upit.n_in_pit} of {grid.n_blocks} blocks in the pit, value {upit.pit_value:,.0f}")
```

This example is executed by `scripts/check_framework_examples.py`, so it cannot rot into an incantation that no longer runs.
