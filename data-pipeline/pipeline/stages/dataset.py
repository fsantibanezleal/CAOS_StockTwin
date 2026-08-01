"""Stage 3, dataset: leakage-safe splits for the learned tier.

THE LEAKAGE THIS PREVENTS. The surrogates predict a blending outcome from the run's parameters. If a
training row and a test row shared a generator seed they would share the exact grade sequence, and the
model would be scored on data it had memorised. Splitting by seed alone is not enough either: the
INPUT STRUCTURE (short range, long range, trending, bimodal) determines the shape of the whole stream,
so a model trained on every structure and tested on the same structures learns the four shapes rather
than the physics. The split is therefore by seed AND structure.

The seventeen showcase cases are held out entirely and never contribute a training row, which is what
lets the Benchmark page report them as evidence rather than as a fit.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..core.rng import derive


@dataclass(frozen=True)
class Split:
    train: list[dict]
    val: list[dict]
    test: list[dict]

    def counts(self) -> dict[str, int]:
        return {"train": len(self.train), "val": len(self.val), "test": len(self.test)}


def run(corpus: list[dict], *, seed: int = 7) -> Split:
    """Partition a swept corpus so that no (seed, structure) pair appears on both sides.

    Deterministic: the group assignment is a hash of the group key, not a shuffle, so the same corpus
    always splits the same way whatever order the rows arrive in.
    """
    train: list[dict] = []
    val: list[dict] = []
    test: list[dict] = []
    for row in corpus:
        key = f"{row['seed']}|{row['structure']}"
        bucket = derive(seed, key) % 10
        (test if bucket < 2 else val if bucket < 3 else train).append(row)
    return Split(train=train, val=val, test=test)


def assert_no_leak(split: Split) -> None:
    """Raise if any (seed, structure) group straddles the split. A test calls this."""
    def keys(rows: list[dict]) -> set[str]:
        return {f"{r['seed']}|{r['structure']}" for r in rows}
    tr, va, te = keys(split.train), keys(split.val), keys(split.test)
    overlap = (tr & te) | (tr & va) | (va & te)
    if overlap:
        raise AssertionError(f"split leaks {len(overlap)} (seed, structure) groups: {sorted(overlap)[:5]}")
