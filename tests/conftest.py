"""Make ``stlab`` importable whether or not ``pip install -e .`` has run.

Belt and braces for CI and for a local clone that has not been installed."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "data-pipeline"))
