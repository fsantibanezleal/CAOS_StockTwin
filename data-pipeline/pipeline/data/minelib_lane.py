"""The REAL lane: published MineLib block models, fetched at runtime and never redistributed.

THE LICENCE POSTURE, first, because it constrains everything below. MineLib (Espinoza, Goycoolea,
Moreno and Newman, "MineLib: a library of open pit mining problems", Ann. Oper. Res. 206, 93-114,
2013, doi:10.1007/s10479-012-1258-3) publishes its instances for academic use and does NOT grant
redistribution. So:

* no `.blocks`, `.prec` or `.upit` file is ever committed to this repository (a CI guard greps the
  tracked file list, and a frontend test walks the artifact tree, so a breach fails the build twice);
* nothing is bundled into the built site;
* CI never fetches an instance, so a mirror going away cannot turn into a red build that pressures
  someone into vendoring a copy;
* the browser fetches into memory for the session when a reader picks a real case, and discards it;
* this module caches to a directory OUTSIDE the repository, defaulting to `STLAB_CACHE` and then to
  the platform temp directory, so a local bake cannot accidentally stage an instance for commit.

WHAT THE REAL LANE IS FOR. Everything else in this product is a model of a stream. The real lane is
the only place a published grade distribution, with its real skew and its real spatial structure,
drives the pile. The claim it supports is narrow and it is stated narrowly on the Experiments page:
that the ordering of stacking methods by variance reduction survives being driven by a real orebody's
grade distribution rather than a Gaussian one. It is NOT a validation of the pile physics, because
MineLib publishes block models, not truck logs or pile surveys. `wip/stocktwin/datasets-2026-08-01.md`
records the search that established no open truck-dump log exists.
"""
from __future__ import annotations

import os
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from bedblend.schema import TruckDump

_MIRROR_A = "https://raw.githubusercontent.com/ampl/colab.ampl.com/master/authors/eduardosalaz/minelib/data"
_MIRROR_B = "https://raw.githubusercontent.com/qarth/whattle/master/test/minelib"


@dataclass(frozen=True)
class MinelibInstance:
    """A published instance and the column semantics needed to read it.

    MineLib's `.blocks` format fixes only the first four columns (id, x, y, z); the rest are
    instance-specific and are described by the instance's own `.blocks.info`. Guessing would read a
    block value as a grade and produce a plausible wrong stream, so each instance declares its
    columns here and the parser refuses anything it was not told about.
    """

    id: str
    name: str
    url: str
    grade_col: int
    tonnage_col: int
    n_blocks: int
    grade_unit: str
    note_en: str
    note_es: str


INSTANCES: dict[str, MinelibInstance] = {
    "kd": MinelibInstance(
        id="kd", name="KD", url=f"{_MIRROR_B}/kd/kd.blocks",
        grade_col=7, tonnage_col=4, n_blocks=14153, grade_unit="percent Cu",
        note_en="14,153 blocks with an explicit copper grade column and per-block tonnage. The "
                "largest MineLib instance that publishes a grade directly rather than only a value.",
        note_es="14.153 bloques con columna explícita de ley de cobre y tonelaje por bloque. La "
                "instancia más grande de MineLib que publica ley directa y no solo valor.",
    ),
    "newman1": MinelibInstance(
        id="newman1", name="Newman 1", url=f"{_MIRROR_A}/newman1/newman1.blocks",
        grade_col=5, tonnage_col=6, n_blocks=1060, grade_unit="percent Cu",
        note_en="1,060 blocks. Small enough to fetch instantly, and its grade distribution is much "
                "more skewed than KD's, which is the point of carrying two.",
        note_es="1.060 bloques. Suficientemente pequeña para descargarse al instante, y su "
                "distribución de ley es mucho más asimetrica que la de KD, que es el motivo de llevar dos.",
    ),
}


def cache_dir() -> Path:
    """A cache outside the repository. Never a path under the working tree."""
    env = os.environ.get("STLAB_CACHE")
    root = Path(env) if env else Path(tempfile.gettempdir()) / "stlab-cache"
    d = root / "minelib"
    d.mkdir(parents=True, exist_ok=True)
    return d


def fetch(inst: MinelibInstance, *, refresh: bool = False) -> Path:
    """Download the instance to the out-of-repo cache and return its path."""
    dest = cache_dir() / f"{inst.id}.blocks"
    if dest.exists() and not refresh:
        return dest
    with urllib.request.urlopen(inst.url, timeout=60) as r:  # noqa: S310 - fixed https mirrors
        data = r.read()
    dest.write_bytes(data)
    return dest


def parse_blocks(text: str, inst: MinelibInstance) -> dict[str, np.ndarray]:
    """Parse the declared columns. Rows that do not carry them are counted, not coerced."""
    grades: list[float] = []
    tonnes: list[float] = []
    z: list[float] = []
    skipped = 0
    for line in text.splitlines():
        t = line.strip()
        if not t or t.startswith("id"):
            continue
        f = t.split()
        need = max(inst.grade_col, inst.tonnage_col, 3)
        if len(f) <= need:
            skipped += 1
            continue
        try:
            g = float(f[inst.grade_col])
            w = float(f[inst.tonnage_col])
            zz = float(f[3])
        except ValueError:
            skipped += 1
            continue
        if w <= 0:
            skipped += 1
            continue
        grades.append(g)
        tonnes.append(w)
        z.append(zz)
    if not grades:
        raise ValueError(
            f"{inst.id}: no usable row. The mirror's column layout does not match the declared "
            f"grade column {inst.grade_col} and tonnage column {inst.tonnage_col}."
        )
    return {
        "grade": np.asarray(grades, dtype=np.float64),
        "tonnes": np.asarray(tonnes, dtype=np.float64),
        "z": np.asarray(z, dtype=np.float64),
        "n_skipped": np.asarray([skipped], dtype=np.int64),
    }


def load(instance_id: str, *, refresh: bool = False) -> dict[str, np.ndarray]:
    inst = INSTANCES[instance_id]
    return parse_blocks(fetch(inst, refresh=refresh).read_text(encoding="utf-8", errors="replace"), inst)


def real_truck_log(n_dumps: int, seed: int, instance_id: str = "kd",
                   *, tonnes_per_truck: float = 220.0, cycle_s: float = 90.0,
                   coarse_mean: float = 0.35, coarse_sd: float = 0.08,
                   blocks: dict[str, np.ndarray] | None = None) -> list[TruckDump]:
    """Turn a published block model into a truck stream by mining it bench by bench.

    The ORDER is what carries the structure, so it is not shuffled: benches leave top-down (descending
    z, the way a pit is mined) and within a bench the file order is kept, which is the model's own
    spatial sweep. A shuffled block model would have the right histogram and no autocorrelation at
    all, and autocorrelation is the thing that decides whether a blending bed helps.

    Each block is split into whole truck loads. Grades are used as published; nothing is rescaled.
    """
    inst = INSTANCES[instance_id]
    b = blocks if blocks is not None else load(instance_id)
    order = np.lexsort((np.arange(b["z"].shape[0]), -b["z"]))
    rng = np.random.default_rng((seed * 2246822519 + 0xB10C) & 0xFFFFFFFF)

    out: list[TruckDump] = []
    for i in order:
        if len(out) >= n_dumps:
            break
        n_loads = max(1, int(round(float(b["tonnes"][i]) / tonnes_per_truck)))
        cu = float(b["grade"][i])
        for _ in range(n_loads):
            if len(out) >= n_dumps:
                break
            k = len(out)
            out.append(TruckDump(
                event_id=k,
                t_s=k * cycle_s,
                truck_id=f"T{(k % 12) + 1:02d}",
                source_id=f"{inst.id.upper()}-Z{int(b['z'][i]):03d}",
                tonnes=tonnes_per_truck,
                grade_cu_pct=cu,
                grade_au_gpt=0.0,          # MineLib publishes no gold column; a zero is not a guess
                coarse_frac=float(np.clip(coarse_mean + coarse_sd * rng.normal(), 0.05, 0.95)),
                moisture_pct=3.0,
                x_m=0.0,
                y_m=0.0,
            ))
    if len(out) < n_dumps:
        raise ValueError(
            f"{inst.id} holds {len(out)} truck loads, fewer than the {n_dumps} requested; the stream "
            "is not wrapped, because wrapping would fabricate a periodicity the orebody does not have"
        )
    return out


def lane_provenance(instance_id: str, seed: int) -> dict:
    inst = INSTANCES[instance_id]
    return {
        "lane": "real",
        "engine": "minelib",
        "source_doi": "10.1007/s10479-012-1258-3",
        "licence": "academic use, no redistribution",
        "instance": inst.id,
        "instance_name": inst.name,
        "n_blocks": inst.n_blocks,
        "grade_unit": inst.grade_unit,
        "fetched_at_runtime": True,
        "redistributed": False,
        "seed": seed,
        "synthetic": False,
        "coarse_fraction_is_synthetic": True,
        "note_en": inst.note_en,
        "note_es": inst.note_es,
    }
