"""The SYNTHETIC lane: drive the truck stream from a seeded three-dimensional ore body.

WHY THIS EXISTS. The live lane's exponential process is exact and reproducible, but its
autocorrelation is a parameter someone typed. A real truck stream's autocorrelation is not typed: it
falls out of where the ore body puts grade, where the pit boundary cuts it, and the order the benches
and faces are mined in. Those three things interact. A porphyry mined top-down gives a rising trend
because the high-grade core is deep; a vein gives runs of ore and waste as the faces cross it; a
layered deposit gives a near-periodic signal. None of that is expressible as one range parameter, and
a bed evaluated only against a one-parameter process is evaluated against the easy case.

So this lane builds a deposit with `oreblocks` (Apache-2.0, concept DOI 10.5281/zenodo.21512088),
solves an economic pit, walks the extraction top-down, and emits one truck per load from whichever
loading face is active. The stream's structure is then a CONSEQUENCE, and the app measures its
variogram rather than being told it.

WHAT IT DOES NOT CLAIM. `oreblocks` deposits are labelled synthetic by the package itself and by
every artifact here. They are of the MineLib nature, not samples of any real mine. The lane exists to
give the bed a harder and more structured input than an AR(1), not to stand in for a real orebody;
that is the `minelib_lane`'s job.

The size distribution is NOT in a block model. Rather than invent a grade-size correlation the data
does not support, the coarse fraction is drawn from an independent seeded field and labelled as
synthetic in the manifest. See `docs/methods/09_synthetic_lane.md`.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from bedblend.schema import TruckDump

ARCHETYPE_NOTES: dict[str, dict[str, str]] = {
    "porphyry": {
        "en": "A deep high-grade core under a low-grade cap. Mined top-down the stream trends upward "
              "over the life of the pit, so variance reduction measured over the whole record is a "
              "misleading summary and the app says so.",
        "es": "Un nucleo profundo de alta ley bajo una cubierta de baja ley. Extraido de arriba hacia "
              "abajo el flujo tiene deriva creciente durante la vida del rajo, de modo que medir la "
              "reducción de varianza sobre todo el registro es un resumen engañoso, y la aplicación lo "
              "indica.",
    },
    "vein": {
        "en": "Steep narrow high-grade structures. A face either crosses a vein or does not, so the "
              "stream arrives in runs: long correlation at the face scale with sharp transitions.",
        "es": "Estructuras angostas y empinadas de alta ley. Una frente cruza una veta o no, de modo "
              "que el flujo llega en rachas: correlación larga a escala de frente con transiciones bruscas.",
    },
    "layered": {
        "en": "Stratiform grade banding. Bench-by-bench mining samples the bands almost periodically, "
              "which is the case where a naive exponential variogram fit is worst.",
        "es": "Bandeamiento estratiforme de ley. La mineria banco a banco muestrea las bandas de forma "
              "casi periodica, que es el caso donde peor ajusta un variograma exponencial ingenuo.",
    },
    "core_halo": {
        "en": "A high-grade core inside a broad halo. Faces near the centre and faces on the rim differ "
              "strongly, so the stream's structure depends on the face rotation, not only on geology.",
        "es": "Un nucleo de alta ley dentro de una aureola amplia. Las frentes centrales y las de borde "
              "difieren mucho, de modo que la estructura del flujo depende de la rotación de frentes, no "
              "solo de la geología.",
    },
}


@dataclass(frozen=True)
class SyntheticLaneSpec:
    archetype: str = "porphyry"
    # THE BLOCK SIZE IS A SCIENTIFIC CHOICE, not a performance one. A truck load is 220 t. At the
    # 10 m blocks a block model usually carries, one block is 2,700 t, so twelve consecutive trucks
    # would leave the same block with exactly the same grade and the stream would be a staircase with
    # a period nothing in the deposit put there. At 6 m a block is 583 t, under three loads, and the
    # step is shorter than the shortest structure any claim here rests on.
    nx: int = 32
    ny: int = 32
    nz: int = 12
    block_m: float = 6.0
    density: float = 2.7
    peak_grade: float = 0.022          # mass fraction; 2.2 percent Cu at the core
    background: float = 0.0008
    noise: float = 0.35
    n_faces: int = 3
    #: sub-block heterogeneity, as a fraction of the block grade. A block model is already a smoothed
    #: estimate, so the variance inside a block is real and is not in the model. It is small and it is
    #: declared rather than tuned: the stream's structure has to come from the deposit.
    within_block_cv: float = 0.08
    tonnes_per_truck: float = 220.0
    truck_spread: float = 0.06
    cycle_s: float = 90.0
    coarse_mean: float = 0.35
    coarse_sd: float = 0.08
    # UPIT economics. Chosen so the pit is a real subset of the model rather than the whole block:
    # a pit that takes everything would make the extraction sequence meaningless.
    price: float = 8500.0              # USD/t Cu
    mining_cost: float = 2.5           # USD/t
    processing_cost: float = 12.0      # USD/t
    recovery: float = 0.88


def _require():
    try:
        import oreblocks  # noqa: F401
    except ModuleNotFoundError as exc:  # pragma: no cover - exercised by the offline-lane CI job
        raise ModuleNotFoundError(
            "the synthetic lane needs the oreblocks engine: pip install -r requirements-offline.txt"
        ) from exc
    return oreblocks


def build_deposit(spec: SyntheticLaneSpec, seed: int):
    """Deposit, economic pit mask, and the block values, all a pure function of (spec, seed)."""
    ob = _require()
    grid = ob.BlockGrid(nx=spec.nx, ny=spec.ny, nz=spec.nz,
                        dx=spec.block_m, dy=spec.block_m, dz=spec.block_m)
    dep = ob.make_deposit(grid, spec.archetype, seed=seed, peak_grade=spec.peak_grade,
                          background=spec.background, density=spec.density, noise=spec.noise)
    econ = ob.Econ(price=spec.price, mining_cost=spec.mining_cost,
                   processing_cost=spec.processing_cost, recovery=spec.recovery)
    prec = ob.build_precedence(grid)
    upit = ob.solve_upit(ob.block_values(dep, econ), prec)
    return dep, econ, upit


def synthetic_truck_log(n_dumps: int, seed: int, spec: SyntheticLaneSpec | None = None) -> list[TruckDump]:
    """Emit ``n_dumps`` truck loads by walking the extraction sequence of a seeded ore body.

    The walk is deterministic: the pit is the exact max-closure solution, the extraction order is
    `oreblocks`' seeded top-down sweep, and the face a given truck loads at rotates on a fixed cycle.
    Two calls with the same arguments produce identical logs, which the determinism test asserts.
    """
    spec = spec or SyntheticLaneSpec()
    ob = _require()
    dep, econ, upit = build_deposit(spec, seed)
    in_pit = upit.in_pit

    pit_t = float(dep.tonnage[in_pit].sum())
    if pit_t <= 0:
        raise ValueError(
            f"the {spec.archetype} pit at seed {seed} is empty; the economics exclude every block, "
            "so there is no dig sequence to draw a stream from"
        )
    want_t = n_dumps * spec.tonnes_per_truck
    # The stream walks the pit; asking for more tonnage than the pit holds would silently wrap and
    # repeat the sequence, which would fabricate a periodicity the deposit does not have.
    frac = min(1.0, want_t / pit_t)

    rng = np.random.default_rng((seed * 2654435761 + 0x5EED) & 0xFFFFFFFF)

    # Walk the extraction in tonnage steps and take the blocks that leave BETWEEN two steps. Those
    # blocks are the real material a shovel loaded in that interval, in the deposit's own spatial
    # sweep, so the grade a truck carries is a block grade rather than a jittered face average. Using
    # the face mean instead would replace the deposit's structure with the dispersion of whatever
    # jitter was chosen, which is the failure this lane exists to avoid.
    n_steps = max(2, min(n_dumps // 3, 64))
    prev = np.zeros(dep.grid.n_blocks, dtype=bool)
    order: list[int] = []
    face_of: dict[int, str] = {}
    for s in range(1, n_steps + 1):
        state = ob.extraction_state(dep, in_pit, frac * s / n_steps, seed=seed)
        new = np.nonzero(state.extracted & ~prev)[0]
        prev = state.extracted
        if new.size == 0:
            continue
        # label each block with the loading face nearest to it on its own bench, which is what a
        # dispatch record's source field actually carries
        faces = ob.loading_faces(dep, state, econ, n_faces=spec.n_faces, seed=seed)
        if faces:
            bx = (new % dep.grid.nx).astype(np.float64)
            by = ((new // dep.grid.nx) % dep.grid.ny).astype(np.float64)
            fx = np.array([f.x for f in faces])
            fy = np.array([f.y for f in faces])
            near = np.argmin((bx[:, None] - fx[None, :]) ** 2 + (by[:, None] - fy[None, :]) ** 2, axis=1)
            for b, j in zip(new.tolist(), near.tolist(), strict=True):
                face_of[b] = f"F{faces[j].face_id:02d}-L{faces[j].level:02d}"
        order.extend(new.tolist())
        if len(order) * float(dep.tonnage[new[0]]) > n_dumps * spec.tonnes_per_truck * 1.2:
            break

    out: list[TruckDump] = []
    for b in order:
        if len(out) >= n_dumps:
            break
        block_t = float(dep.tonnage[b])
        block_cu = 100.0 * float(dep.grade[b])          # mass fraction to percent Cu
        n_loads = max(1, int(round(block_t / spec.tonnes_per_truck)))
        for _ in range(n_loads):
            if len(out) >= n_dumps:
                break
            ev = len(out)
            out.append(TruckDump(
                event_id=ev,
                t_s=ev * spec.cycle_s,
                truck_id=f"T{(ev % 12) + 1:02d}",
                source_id=face_of.get(b, f"B{b:06d}"),
                tonnes=max(20.0, spec.tonnes_per_truck * (1.0 + spec.truck_spread * rng.normal())),
                grade_cu_pct=max(0.0, block_cu * (1.0 + spec.within_block_cv * rng.normal())),
                grade_au_gpt=max(0.0, 0.12 + 0.05 * rng.normal()),
                coarse_frac=min(0.95, max(0.05, spec.coarse_mean + spec.coarse_sd * rng.normal())),
                moisture_pct=3.0,
                x_m=0.0,
                y_m=0.0,
            ))
    if len(out) < n_dumps:
        raise ValueError(
            f"the {spec.archetype} pit at seed {seed} yielded {len(out)} loads, fewer than the "
            f"{n_dumps} requested; the sequence is not wrapped, because wrapping would fabricate a "
            "periodicity the deposit does not have"
        )
    return out


def lane_provenance(spec: SyntheticLaneSpec, seed: int) -> dict:
    """What the manifest records, so a reader can rebuild this exact stream from the artifact alone."""
    note = ARCHETYPE_NOTES.get(spec.archetype, {"en": "", "es": ""})
    return {
        "lane": "synthetic",
        "engine": "oreblocks",
        "engine_doi": "10.5281/zenodo.21512088",
        "licence": "Apache-2.0",
        "archetype": spec.archetype,
        "grid": [spec.nx, spec.ny, spec.nz],
        "block_m": spec.block_m,
        "seed": seed,
        "synthetic": True,
        "coarse_fraction_is_synthetic": True,
        "note_en": note["en"],
        "note_es": note["es"],
    }
