# PyChrono, a runnable example

```python
# Calibration tier, run by hand in the DEM conda environment, never in CI:
#   conda env create -f environment-dem.yml
#   conda run -n stocktwin-dem python data-pipeline/pipeline/stages/calibrate.py
#
# The stage measures the downslope distance over which a bidisperse heap separates, and converts it
# to Sr through equation (3.19), Sr = q L / (H U). The residual against the continuum solver is
# published on the Benchmark page whichever way it falls.
print("see data-pipeline/pipeline/stages/calibrate.py; not executed here")
```
