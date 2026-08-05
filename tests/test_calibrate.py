"""The calibration lane, tested by recovering coefficients it was given.

A fitter that cannot recover a synthetic truth is not a fitter, it is a number generator. These tests
generate a profile at a KNOWN pair of coefficients and require the search to find them back, which is
the only check that distinguishes a working fit from a plausible one.

The grid is dropped from its default so the suite stays quick. The default resolution is for the once
per release run, and it is finer, so these tolerances are the loose end of what the fit achieves.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data-pipeline"))

from pipeline.calibrate import PE_BOUNDS, SR_BOUNDS, fit, profile_at  # noqa: E402

GRID = 12          # coarse, for speed; the recovery tolerances below are set to match


def test_it_recovers_a_segregation_number_it_was_given():
    """The load-bearing test. Synthesise at a known Sr, then find it back."""
    truth_sr, truth_pe, phi0 = 2.40, 14.0, 0.65
    synthetic = profile_at(truth_sr, phi0, 8, pe=truth_pe)

    cal = fit(synthetic, phi0=phi0, source="synthetic recovery", grid=GRID)

    assert cal.sr == pytest.approx(truth_sr, rel=0.10), (
        f"recovered Sr {cal.sr:.3f} against a true {truth_sr}"
    )
    assert cal.pe == pytest.approx(truth_pe, rel=0.20), (
        f"recovered Pe {cal.pe:.2f} against a true {truth_pe}"
    )
    assert cal.rmse < 0.02, f"a synthetic profile should fit almost exactly, got rmse {cal.rmse:.4f}"


def test_the_residual_is_the_error_bar_and_it_rises_on_data_the_model_cannot_fit():
    """A fit that reports the same residual for a good and a bad profile reports nothing."""
    phi0 = 0.65
    good = profile_at(3.0, phi0, 8, pe=12.0)
    # Coarse at the CREST and fine at the toe: the reverse of what kinetic sieving produces, so no
    # choice of coefficients can match it and the residual has to say so.
    backwards = list(reversed(good))

    a = fit(good, phi0=phi0, source="fittable", grid=GRID)
    b = fit(backwards, phi0=phi0, source="unfittable", grid=GRID)
    assert b.rmse > 10 * a.rmse, (
        f"a profile the model cannot produce fitted at rmse {b.rmse:.4f} against {a.rmse:.4f} for one it can"
    )


def test_a_fitted_profile_puts_coarse_at_the_toe():
    """The direction is the sign check: the fitted curve must sort the way the physics does."""
    prof = profile_at(3.0, 0.65, 10, pe=12.0)
    half = len(prof) // 2
    assert sum(prof[half:]) > sum(prof[:half]), "the fitted profile does not put coarse at the toe"


def test_zero_segregation_number_gives_a_flat_profile():
    """The negative control, through the calibration path rather than only through the engine."""
    prof = profile_at(0.0, 0.65, 8, pe=12.0)
    assert max(prof) - min(prof) < 1e-12, f"Sr=0 sorted something: spread {max(prof) - min(prof):.2e}"
    assert prof[0] == pytest.approx(0.35), "at Sr=0 every station gets the material's own split"


@pytest.mark.parametrize(
    ("kwargs", "why"),
    [
        ({"observed_coarse": [0.3, 0.4], "phi0": 0.65}, "two stations constrain nothing"),
        ({"observed_coarse": [0.3, 0.4, 1.4], "phi0": 0.65}, "a coarse fraction above one"),
        ({"observed_coarse": [0.3, 0.4, 0.5], "phi0": 0.0}, "phi0 of zero cannot segregate"),
        ({"observed_coarse": [0.3, 0.4, 0.5], "phi0": 1.0}, "phi0 of one cannot segregate"),
    ],
)
def test_it_refuses_input_it_cannot_fit(kwargs, why):
    """Bad input raises rather than returning a confident number. Coercion looks like data."""
    with pytest.raises(ValueError):
        fit(source="bad input", grid=4, **kwargs)


def test_the_search_stays_inside_its_declared_bounds():
    """A result outside the grid would mean the bounds are decoration."""
    cal = fit(profile_at(5.0, 0.6, 8, pe=20.0), phi0=0.6, source="bounds", grid=GRID)
    assert SR_BOUNDS[0] <= cal.sr <= SR_BOUNDS[1]
    assert PE_BOUNDS[0] <= cal.pe <= PE_BOUNDS[1]


def test_the_fit_is_deterministic():
    """The determinism contract covers the calibration too: a grid search, never an optimiser."""
    obs = profile_at(2.0, 0.65, 8, pe=10.0)
    a = fit(obs, phi0=0.65, source="determinism", grid=GRID)
    b = fit(obs, phi0=0.65, source="determinism", grid=GRID)
    assert a.as_dict() == b.as_dict()
