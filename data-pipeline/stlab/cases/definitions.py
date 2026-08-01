"""The coverage matrix: seventeen cases in five categories, three of them controls.

ADR-0069 clause 4 requires each case to carry a category, a scientific reason for inclusion, fixed
seeds, ground truth or an explicit non-scoreable label, a leakage-safe split assignment, and an
expected behaviour with a kill criterion. Every field below exists because that clause demands it, and
the ``kill_criterion`` in particular is the one that turns a case from a demonstration into a test:
it says what result would mean the code is wrong.

THE FIVE AXES, and why each is a separate axis rather than a variant of another.

* **G, stacking geometry.** The primary axis. Which build method was used decides how many layers a cut
  crosses, and that is the dominant term in everything downstream.
* **R, reclaim method.** Independent of the build: the same pile reclaimed two ways gives two different
  answers. Held at chevron so the comparison is clean; G01 is the full-face reference of this axis
  rather than being duplicated as an R01, because a duplicated row is padding, not coverage.
* **V, input variability.** The autocorrelation of the incoming stream, which decides whether the
  layers a cut crosses are independent enough for the bed to help at all. V02 and V03 are the cases a
  product wanting to look good would quietly omit, so they ship as headline cases.
* **S, segregation regime.** Whether kinetic sieving is strong enough to bias what each cut contains,
  and whether the coarse and fine species have different enough repose angles to stratify.
* **C, controls.** Three, each with a numerical kill criterion. Without them a plausible wrong answer
  is indistinguishable from a right one.

SPLITS. The learned surrogates are trained on a swept corpus, not on these cases. Every case here is
assigned ``holdout``, and the corpus generator is forbidden from using their ``(structure, seed)``
pairs. Splitting by seed alone would leak the input structure, so the split is by seed AND structure.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..io.schema import PadSpec, TruckDump
from ..model.run import RunConfig
from ..model.stream import generate_stream

CATEGORIES: dict[str, str] = {
    "stacking-geometry": "How the pile was built",
    "reclaim-method": "How the pile was taken back",
    "input-variability": "What the incoming stream looked like",
    "segregation-regime": "How strongly the material sorted itself",
    "control": "Controls with numerical kill criteria",
}


@dataclass(frozen=True)
class Case:
    """One case: everything needed to reproduce it, and everything needed to score it."""

    id: str
    category: str
    reason: str
    expected_band: str
    kill_criterion: str
    real_or_synthetic: str = "synthetic"
    split: str = "holdout"

    # build and reclaim
    stacking: str = "chevron"
    reclaim: str = "fullface"
    n_passes: int = 24
    reclaim_rate: float = 1.0
    cut_tonnes: float = 900.0
    start_fraction: float = 0.35

    # material and segregation
    sr: float = 1.0
    repose_deg: float = 37.0
    repose_coarse_deg: float = 37.0

    # incoming stream
    structure: str = "stationary"
    range_t: float = 4000.0
    n_dumps: int = 320
    coarse_sd: float = 0.08

    # pad
    nx: int = 64
    ny: int = 24
    cell_m: float = 3.0

    tags: tuple[str, ...] = field(default_factory=tuple)

    def pad(self) -> PadSpec:
        return PadSpec(nx=self.nx, ny=self.ny, cell_m=self.cell_m,
                       repose_deg=self.repose_deg, repose_coarse_deg=self.repose_coarse_deg)

    def config(self, seed: int) -> RunConfig:
        return RunConfig(
            case_id=self.id, pad=self.pad(), stacking=self.stacking, reclaim=self.reclaim,
            n_passes=self.n_passes, sr=self.sr, reclaim_rate=self.reclaim_rate,
            start_fraction=self.start_fraction, cut_tonnes=self.cut_tonnes, seed=seed,
        )

    def dumps(self, seed: int) -> list[TruckDump]:
        return generate_stream(n_dumps=self.n_dumps, seed=seed, structure=self.structure,
                               range_t=self.range_t, coarse_sd=self.coarse_sd)

    def as_params_dict(self) -> dict:
        return {
            "stacking": self.stacking, "reclaim": self.reclaim, "n_passes": self.n_passes,
            "sr": self.sr, "repose_deg": self.repose_deg,
            "repose_coarse_deg": self.repose_coarse_deg, "structure": self.structure,
            "range_t": self.range_t, "n_dumps": self.n_dumps, "reclaim_rate": self.reclaim_rate,
            "cut_tonnes": self.cut_tonnes, "nx": self.nx, "ny": self.ny, "cell_m": self.cell_m,
        }


_STACK = "stacking-geometry"
_RECL = "reclaim-method"
_VAR = "input-variability"
_SEG = "segregation-regime"
_CTL = "control"

CASES: list[Case] = [
    # ---------------------------------------------------------------- G, stacking geometry
    Case(
        "G01_chevron", _STACK,
        "The reference longitudinal bed. Many thin gable layers on one centre line; also serves as the "
        "full-face reference of the reclaim axis, so that axis carries no duplicated row.",
        "VRR clearly below cone shell and above chevcon; layers crossed per cut close to the pass count",
        "If VRR(G01) is not below VRR(G03), the layer accounting or the reclaim geometry is wrong",
        stacking="chevron", tags=("reference", "fullface-reference"),
    ),
    Case(
        "G02_windrow", _STACK,
        "The same longitudinal travel with the deposition axis slewing across three cords, so the toe "
        "bias is spread over several crests instead of two flanks.",
        "VRR near chevron; a smaller toe-minus-apex coarse delta than chevron at the same Sr",
        "If the segregation index is not below chevron's, the lateral spreading is not reaching the ledger",
        stacking="windrow",
    ),
    Case(
        "G03_coneshell", _STACK,
        "Stepping cones, each shelling over the last. The method the literature reports as unsuitable "
        "when homogenization matters, and the published anchor at VRR 0.232.",
        "VRR in the 0.2 to 0.35 band, consistent with the published cone shell floor",
        "If VRR lands below 0.15 this method is blending far better than any published result, which "
        "means the cut is crossing layers the geometry should not expose",
        stacking="coneshell", tags=("anchored",),
    ),
    Case(
        "G04_strata", _STACK,
        "Inclined layers built against one flank. Intermediate blending, and the case that shows layer "
        "inclination is an operating variable in its own right.",
        "VRR between chevron and cone shell",
        "If VRR is outside the chevron-to-cone-shell interval, the lean is not producing inclined layers",
        stacking="strata",
    ),
    Case(
        "G05_chevcon", _STACK,
        "Chevron travel with the pattern advancing along the pile. The best-blending industrial method "
        "and the second published anchor, at VRR 0.121 with about a ten to one variance reduction "
        "reported for chevcon reclaimed full-face.",
        "The lowest VRR of the five, at or below about 0.15",
        "If VRR(G05) is not the lowest of the five geometries, the ordering the whole literature agrees "
        "on has not been reproduced and the engine is wrong",
        stacking="chevcon", tags=("anchored", "best"),
    ),

    # ---------------------------------------------------------------- R, reclaim method
    Case(
        "R02_bucketwheel", _RECL,
        "A slewing bucket wheel cutting a bench: a third of the width, upper half of each column. It "
        "crosses the exposed layers and misses the rest.",
        "VRR above full-face and below end reclaim",
        "If VRR(R02) is at or below VRR(G01) the bench is somehow crossing more layers than a full-face "
        "cut, which is geometrically impossible",
        reclaim="bucketwheel",
    ),
    Case(
        "R03_end", _RECL,
        "End reclaim working the exposed end face, which over-represents the most recently stacked "
        "material.",
        "VRR well above full-face; the reclaimed stream visibly lags the input rather than averaging it",
        "If VRR(R03) is below VRR(R02) the recency bias is not reaching the ledger",
        reclaim="end",
    ),
    Case(
        "R04_loader", _RECL,
        "Scattered front-end loader bites from the top of a few accessible columns. Fewest layers, least "
        "spatial averaging, and the real run-of-mine pad case rather than the blending-bed ideal.",
        "The worst VRR of the reclaim axis, plausibly close to 1 (little or no blending)",
        "If VRR(R04) is the best of the reclaim axis the cell selection is wrong",
        reclaim="loader",
    ),

    # ---------------------------------------------------------------- V, input variability
    Case(
        "V01_short_range", _VAR,
        "Grade correlation range much shorter than the tonnage in one layer, so successive layers are "
        "nearly independent. This is the case where the independent-layer bound is nearly attainable.",
        "Blending efficiency against the 1/N bound the highest of the four V cases",
        "If the efficiency here is not the highest of V01 to V04, the variogram range is not reaching "
        "the simulation",
        structure="short_range", stacking="chevron",
    ),
    Case(
        "V02_long_range", _VAR,
        "Correlation range longer than the whole pile, so every layer carries nearly the same grade and "
        "the bed has almost nothing to average. Ships as a headline case rather than being buried, "
        "because it is the honest one.",
        "VRR close to 1 and efficiency far below V01; the bed barely helps",
        "If VRR here is comparable to V01 the input autocorrelation is being ignored somewhere",
        structure="long_range", stacking="chevron", tags=("honest",),
    ),
    Case(
        "V03_trending", _VAR,
        "A linear grade drift across the shift on top of the correlated field. The mean moves, so "
        "variance reduction on the whole record becomes a misleading summary of what the plant sees.",
        "VRR may look acceptable while the reclaimed mean drifts; the drift must be visible on the "
        "stream plot",
        "If the reclaimed mean does not drift with the input, the trend is not being generated",
        structure="trending", stacking="chevron", tags=("honest",),
    ),
    Case(
        "V04_bimodal", _VAR,
        "Two ore types arriving in runs, as they would from two dig faces. The reclaimed histogram stays "
        "bimodal even when the VRR looks respectable, which is why the distribution has to be shown and "
        "not only its second moment.",
        "Reclaimed grade histogram visibly bimodal despite a VRR below 0.4",
        "If the reclaimed histogram is unimodal the mixture is not surviving into the cuts and the "
        "generator is wrong",
        structure="bimodal", stacking="chevron", tags=("honest",),
    ),

    # ---------------------------------------------------------------- S, segregation regime
    Case(
        "S01_strong_sieving", _SEG,
        "A wide size distribution with a high segregation number, so kinetic sieving drives coarse to "
        "the toe strongly enough to bias what each reclaim cut contains.",
        "A large positive toe-minus-apex coarse-fraction delta; cut composition varying with the "
        "reclaim front position",
        "If the segregation index is near zero at Sr = 4 the flowing-layer solver is not coupled to "
        "the ledger",
        sr=4.0, coarse_sd=0.16, stacking="chevron", tags=("segregation",),
    ),
    Case(
        "S02_stratifying", _SEG,
        "The Makse regime: the coarse species has the larger angle of repose, which is the published "
        "condition under which a poured bidisperse mixture spontaneously stratifies into alternating "
        "layers rather than merely segregating.",
        "Alternating coarse and fine bands visible in the cutaway; a larger segregation index than S01 "
        "at the same Sr is NOT expected, the signature is the layering, not the magnitude",
        "If the cutaway shows no alternation at a five degree repose difference, the coarse repose "
        "angle is not being used",
        sr=2.0, repose_deg=34.0, repose_coarse_deg=39.0, coarse_sd=0.16,
        stacking="coneshell", tags=("segregation", "makse"),
    ),

    # ---------------------------------------------------------------- C, controls
    Case(
        "C01_perfect_mixer", _CTL,
        "The degenerate bound: a single-cell pad with no geometry at all, so a reclaim cut is a "
        "tonnage-weighted mean of everything in the pile. The achieved VRR must equal the "
        "independent-layer bound.",
        "Achieved VRR equal to 1/N within the multi-seed band",
        "If the achieved VRR differs from 1/N by more than the band, the VRR implementation is wrong "
        "and every number in the product is suspect",
        nx=1, ny=1, cell_m=40.0, n_passes=1, stacking="coneshell", reclaim="fullface",
        structure="short_range", n_dumps=240, cut_tonnes=2400.0, tags=("control",),
    ),
    Case(
        "C02_no_segregation", _CTL,
        "The negative control: the segregation number set to zero, which makes the Gray-Thornton "
        "equation degenerate to pure tracer advection. Any size sorting produced by the SOLVER is then "
        "leaking in from somewhere it should not.",
        "Every lot in the pile still carries exactly the coarse fraction of the truck it came from. "
        "The aggregate toe-minus-apex delta is NOT expected to be zero: different dumps carry "
        "different size distributions and land in different places, so the geometry alone produces a "
        "small spatial pattern. Measured at Sr = 0 it is about -0.01, against about +0.44 at Sr = 1, "
        "so the solver contribution is two orders of magnitude larger than the geometric one.",
        "A lot whose coarse fraction differs from its source dump's by more than 1e-12 at Sr = 0 means "
        "the solver is modifying the size split when it has been switched off",
        sr=0.0, coarse_sd=0.16, stacking="chevron", tags=("control",),
    ),
    Case(
        "C03_starvation", _CTL,
        "The boundary: reclaim runs at three times the stacking rate, so the pile is driven empty. A "
        "buffer model that has never been driven to its boundary has not been tested there.",
        "The pile empties, the run reports starvation, and no tonnage is negative or NaN",
        "A NaN, a negative tonnage, or a run that does not report starvation is a hard failure",
        reclaim_rate=3.0, start_fraction=0.15, stacking="chevron", tags=("control", "edge"),
    ),
]
