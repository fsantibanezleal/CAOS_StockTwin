"""Make ``pipeline`` importable without installing anything.

This repo declares no package, so the bake is reached by putting ``data-pipeline/`` on the path
rather than by an editable install.

Belt and braces for CI and for a local clone that has not been installed."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "data-pipeline"))
