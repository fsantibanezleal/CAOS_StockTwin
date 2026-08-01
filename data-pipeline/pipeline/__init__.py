"""stlab, the StockTwin offline engine and shared analytic core (ADR-0057, ADR-0069).

StockTwin simulates a physical open-pit stockpile: haul trucks deposit lots onto a pad, the pile
relaxes to its angle of repose, granular size segregation redistributes the material along each
avalanche path, and a reclaimer takes cuts that blend the layers back together. Every reclaimed tonne
keeps a fractional record of the deposition events it came from.

What lives where:

* ``model/``   the shared pure-Python analytic core, used by the offline stages and mirrored by the
              TypeScript live engine. This is the science.
* ``stages/``  the offline pipeline, one module per named stage.
* ``io/``      the two data contracts: ingestion (raw to pipeline) and the typed inter-stage objects.
* ``core/``    determinism, the compact trace, the manifest, and the measured lane gate.
* ``cases/``   the coverage matrix: stacking geometry, reclaim method, input variability, segregation
              regime, and the three controls.

The scope guardrail, repeated wherever a reader might miss it: this is stockpile pedagogy. It is not
in-plant metal accounting, it is not a comminution or flotation model, it does not solve the blending
linear program, and it emits no plant setpoint.
"""

__version__ = "0.01.000"  # display X.XX.XXX; PEP 440 form in pyproject.toml (0.1.0)
