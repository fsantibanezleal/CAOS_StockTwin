"""Seeded determinism: the single RNG factory.

A run must be a pure function of ``(params, seed)``. Never use a global or implicit generator anywhere
in the pipeline; always thread one made here. Hidden randomness is what makes a committed replay trace
unreproducible, and ADR-0054 makes the trace the source of truth, so it would quietly invalidate every
number the product shows.

Two generators live in this repository on purpose. ``make_rng`` is numpy's, used by the offline stages
where quality matters and portability does not. ``stlab.model.stream._Gauss`` is a hand-written
xorshift plus Box-Muller, used wherever the TypeScript live lane has to reproduce the same numbers bit
for bit, which numpy cannot do in a browser.
"""
from __future__ import annotations

import numpy as np


def make_rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(int(seed))


def derive(seed: int, tag: str) -> int:
    """A stable sub-seed for one concern, so streams stay independent and reproducible.

    Deriving with a hash of the tag rather than ``seed + 1``, ``seed + 2`` keeps two concerns from
    accidentally sharing a stream when a caller reorders them.
    """
    h = 2166136261
    for ch in tag:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return (int(seed) ^ h) & 0xFFFFFFFF
