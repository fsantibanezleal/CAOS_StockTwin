# PyChrono, configuration that matters

A separate conda environment, `environment-dem.yml`, because PyChrono has no
pip wheel. It is deliberately outside both venvs: a heavy engine that cannot install must not be able
to break the lane that runs the tests.
