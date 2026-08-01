"""Stage 6, train: the learned tier, and the baseline it has to beat to be allowed to exist.

THE REFUTATION THIS STAGE EXISTS TO RUN. Kumral (2006), J. S. Afr. Inst. Min. Metall. 106(3), 229-236,
already fits a MULTIPLE REGRESSION over stockpile parameters and optimises the variance reduction ratio
with it. That is the nearest prior art, and a learned model that does not beat it adds nothing. So both
are trained here, on the identical corpus and scored on the identical held-out set, and the plan's kill
criterion applies: if the network does not beat the regression by more than the regression's own
credible band, the honest report is a negative result on the Benchmark page, and the network stays only
as a demonstration of the in-browser learned lane, labelled as such.

WHY NUMPY AND NOT TORCH. The model is a six-to-sixteen-to-one multilayer perceptron over a corpus of a
few thousand rows. Backpropagation for that is thirty lines, it trains in under a second on a laptop
CPU, it is exactly reproducible from a seed, and it adds no dependency to a lane that has to stay
installable. Reaching for a deep-learning framework here would be scaffolding, not capability.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..core.rng import make_rng


@dataclass(frozen=True)
class Regression:
    """Ordinary least squares with an intercept. The Kumral-analogue baseline."""

    coef: list[float]
    intercept: float
    feature_names: list[str]

    def predict(self, x: list[list[float]]) -> list[float]:
        a = np.asarray(x, dtype=float)
        return (a @ np.asarray(self.coef) + self.intercept).tolist()

    def as_dict(self) -> dict:
        return {"kind": "ols", "coef": self.coef, "intercept": self.intercept,
                "features": self.feature_names}


@dataclass(frozen=True)
class Mlp:
    """A single-hidden-layer perceptron with tanh activation, stored as plain lists.

    Plain lists rather than arrays so the checkpoint is diffable JSON and so the TypeScript lane can
    evaluate it directly when the ONNX runtime is unavailable, which keeps the live tier honest about
    what it is running.
    """

    w1: list[list[float]]
    b1: list[float]
    w2: list[float]
    b2: float
    x_mean: list[float]
    x_std: list[float]
    feature_names: list[str]

    def predict(self, x: list[list[float]]) -> list[float]:
        a = (np.asarray(x, dtype=float) - np.asarray(self.x_mean)) / np.asarray(self.x_std)
        hidden = np.tanh(a @ np.asarray(self.w1) + np.asarray(self.b1))
        return (hidden @ np.asarray(self.w2) + self.b2).tolist()

    def as_dict(self) -> dict:
        return {"kind": "mlp-tanh", "w1": self.w1, "b1": self.b1, "w2": self.w2, "b2": self.b2,
                "x_mean": self.x_mean, "x_std": self.x_std, "features": self.feature_names}


def fit_regression(x: list[list[float]], y: list[float], names: list[str]) -> Regression:
    a = np.asarray(x, dtype=float)
    design = np.hstack([a, np.ones((a.shape[0], 1))])
    sol, *_ = np.linalg.lstsq(design, np.asarray(y, dtype=float), rcond=None)
    return Regression(coef=sol[:-1].tolist(), intercept=float(sol[-1]), feature_names=list(names))


def fit_mlp(
    x: list[list[float]], y: list[float], names: list[str], *,
    hidden: int = 16, epochs: int = 4000, lr: float = 0.05, seed: int = 11,
) -> Mlp:
    """Full-batch gradient descent on the mean squared error. Deterministic given the seed.

    Full batch rather than minibatch: the corpus fits in memory many times over, and full-batch descent
    removes the shuffling order from the result, so two runs of the same commit produce the same
    checkpoint. A checkpoint that changes on every re-run cannot be content-hashed, and the manifest
    contract requires that it can.
    """
    a = np.asarray(x, dtype=float)
    t = np.asarray(y, dtype=float).reshape(-1, 1)
    mean = a.mean(axis=0)
    std = a.std(axis=0)
    std[std < 1e-9] = 1.0
    a = (a - mean) / std

    rng = make_rng(seed)
    n_in = a.shape[1]
    w1 = rng.normal(0.0, 1.0 / np.sqrt(n_in), size=(n_in, hidden))
    b1 = np.zeros(hidden)
    w2 = rng.normal(0.0, 1.0 / np.sqrt(hidden), size=(hidden, 1))
    b2 = np.zeros(1)
    n = a.shape[0]

    for _ in range(epochs):
        z1 = a @ w1 + b1
        h = np.tanh(z1)
        out = h @ w2 + b2
        err = out - t
        gw2 = h.T @ err / n
        gb2 = err.mean(axis=0)
        dh = (err @ w2.T) * (1.0 - h * h)
        gw1 = a.T @ dh / n
        gb1 = dh.mean(axis=0)
        w1 -= lr * gw1
        b1 -= lr * gb1
        w2 -= lr * gw2
        b2 -= lr * gb2

    return Mlp(w1=w1.tolist(), b1=b1.tolist(), w2=w2.ravel().tolist(), b2=float(b2[0]),
               x_mean=mean.tolist(), x_std=std.tolist(), feature_names=list(names))


def rmse(pred: list[float], truth: list[float]) -> float:
    p = np.asarray(pred, dtype=float)
    t = np.asarray(truth, dtype=float)
    return float(np.sqrt(np.mean((p - t) ** 2)))


def bootstrap_rmse_band(pred: list[float], truth: list[float], *, n_boot: int = 400,
                        seed: int = 23) -> tuple[float, float]:
    """A 5th to 95th percentile band on the held-out RMSE, by resampling the held-out rows.

    The kill criterion compares two models, so a single RMSE per model is not enough to decide: the
    question is whether the difference exceeds the noise. The band is what makes that decidable rather
    than a matter of which number looks smaller.
    """
    rng = make_rng(seed)
    p = np.asarray(pred, dtype=float)
    t = np.asarray(truth, dtype=float)
    n = len(p)
    if n < 8:
        r = rmse(pred, truth)
        return r, r
    draws = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, size=n)
        draws.append(float(np.sqrt(np.mean((p[idx] - t[idx]) ** 2))))
    draws.sort()
    return draws[int(0.05 * n_boot)], draws[int(0.95 * n_boot) - 1]
