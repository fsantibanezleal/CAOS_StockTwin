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

from bedblend.run import RunConfig
from bedblend.schema import PadSpec, TruckDump
from bedblend.stream import generate_stream

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


@dataclass(frozen=True)
class Variant:
    """One named operating regime of a case: a parameter override plus what it is there to show.

    A variant is NOT a different case. It is the same experiment at a different point on the one
    knob that decides that case's category, so the case's reason, expected band and kill criterion
    all still apply. That is why a variant carries a note rather than its own kill criterion.
    """

    id: str
    label_en: str
    label_es: str
    note_en: str
    note_es: str
    overrides: dict[str, float | int | str]


def _passes_family() -> list[Variant]:
    """The layer count, for the stacking-geometry axis.

    `n_passes` IS the N of the 1/N bound, so this family sweeps the dominant term of every variance
    reduction claim the product makes. The span is deliberately wide: six passes is a pile nobody
    would call a blending bed, sixty-four is past the point where more layers stop paying.
    """
    spec = [
        (6,  "6 passes",  "6 pasadas",
         "Too few layers to blend. The bed is a stockpile with a shape, and the ratio stays near one.",
         "Muy pocas capas para mezclar. La cama es un acopio con forma y la razón se queda cerca de uno."),
        (12, "12 passes", "12 pasadas",
         "The lower end of real practice. The ratio starts to move and the gap to the ideal bound is wide.",
         "El extremo bajo de la práctica real. La razón empieza a moverse y la brecha con la cota "
         "ideal es amplia."),
        (24, "24 passes", "24 pasadas",
         "The reference regime, and the default the other axes are compared at.",
         "El régimen de referencia, y el valor con el que se comparan los otros ejes."),
        (36, "36 passes", "36 pasadas",
         "Common on a long yard. The returns are still real, but the curve is already bending away "
         "from the 1/N line rather than tracking it.",
         "Habitual en una cancha larga. El retorno sigue siendo real, pero la curva ya se aleja de "
         "la línea 1/N en vez de seguirla."),
        (48, "48 passes", "48 pasadas",
         "Diminishing returns: the layers are thin enough that the input's own autocorrelation, not the "
         "count, is what limits the result.",
         "Retornos decrecientes: las capas son tan delgadas que lo que limita el resultado es la "
         "autocorrelación del flujo, no el conteo."),
        (64, "64 passes", "64 pasadas",
         "Past the useful end. Compare the achieved ratio against the 1/N line to see how little the "
         "last twenty passes bought.",
         "Más allá del punto útil. Comparar la razón lograda contra la línea 1/N muestra lo poco que "
         "aportaron las últimas veinte pasadas."),
    ]
    return [Variant(f"p{n}", en, es, nen, nes, {"n_passes": n}) for n, en, es, nen, nes in spec]


def _cut_family() -> list[Variant]:
    """The parcel size, for the reclaim-method axis.

    A cut is the unit the plant actually receives. A small cut resolves the pile's structure and
    inherits its variability; a large one integrates over more of the face and hides it. The reclaim
    geometries separate most clearly at the small end, which is why the family starts there.
    """
    spec = [
        (300,  "300 t",  "300 t",
         "A small parcel. The reclaim geometry shows through most clearly here, because a small cut "
         "cannot integrate over enough of the face to hide it.",
         "Un parcel pequeño. La geometría de recuperación se nota al máximo, porque un corte pequeño "
         "no alcanza a integrar suficiente frente como para disimularla."),
        (600,  "600 t",  "600 t",
         "A short fleet cycle: roughly three truck loads to the plant at a time. Still small enough "
         "that a shallow-reaching machine has to walk to fill it.",
         "Un ciclo corto de flota: del orden de tres cargas de camión hacia la planta a la vez. "
         "Todavía pequeño como para que una máquina de poco alcance deba desplazarse para completarlo."),
        (900,  "900 t",  "900 t",
         "The reference parcel, and the default of the other axes.",
         "El parcel de referencia, y el valor por defecto de los otros ejes."),
        (1200, "1200 t", "1200 t",
         "A larger draw. More of the face per cut, so the machines start to look alike.",
         "Una saca mayor. Más frente por corte, así que las máquinas empiezan a parecerse."),
        (1800, "1800 t", "1800 t",
         "A shift-scale parcel. The reclaim axis is now mostly averaged away.",
         "Un parcel a escala de turno. El eje de recuperación queda casi promediado."),
        (2400, "2400 t", "2400 t",
         "Large enough that the cut spans several stations, which is a different machine duty from the "
         "one the geometry describes; read the layer count rather than the ratio here.",
         "Suficientemente grande para que el corte abarque varias estaciones, que es un servicio "
         "distinto del que describe la geometría; aquí conviene leer el conteo de capas y no la razón."),
    ]
    return [Variant(f"c{n}", en, es, nen, nes, {"cut_tonnes": float(n)}) for n, en, es, nen, nes in spec]


def _range_family() -> list[Variant]:
    """The variogram range, for the input-variability axis.

    This is the axis on which a blending bed stops working, and the reason is worth stating: layers
    only average if they are INDEPENDENT. Once the correlation range of the incoming stream exceeds
    the tonnage in one layer, consecutive layers carry the same grade and there is nothing to average.
    The family spans from far below one layer to far above the whole pile.
    """
    spec = [
        (200,   "200 t",  "200 t",
         "Correlation shorter than a single truck. The layers are effectively independent and the "
         "achieved ratio can approach the 1/N bound.",
         "Correlación más corta que un solo camión. Las capas son independientes en la práctica y la "
         "razón lograda puede acercarse a la cota 1/N."),
        (1000,  "1 kt",   "1 kt",
         "Still well inside one layer's tonnage, so consecutive layers are close to independent and "
         "the bed still recovers most of what the bound allows.",
         "Todavía bien dentro del tonelaje de una capa, así que las capas consecutivas son casi "
         "independientes y la cama aún recupera la mayor parte de lo que permite la cota."),
        (4000,  "4 kt",   "4 kt",
         "The reference structure, comparable to one layer's tonnage.",
         "La estructura de referencia, comparable al tonelaje de una capa."),
        (10000, "10 kt",  "10 kt",
         "Longer than a layer. Consecutive layers now share grade and the bed recovers noticeably less "
         "than the bound promises.",
         "Más larga que una capa. Las capas consecutivas comparten ley y la cama recupera bastante "
         "menos de lo que promete la cota."),
        (20000, "20 kt",  "20 kt",
         "Several layers per correlation length. The gap to the ideal is now the headline number.",
         "Varias capas por longitud de correlación. La brecha con lo ideal pasa a ser el número principal."),
        (40000, "40 kt",  "40 kt",
         "Longer than the whole build. Every layer carries nearly the same grade, so the bed has almost "
         "nothing to average and the ratio approaches one.",
         "Más larga que toda la construcción. Cada capa lleva casi la misma ley, la cama casi no tiene "
         "nada que promediar y la razón se acerca a uno."),
    ]
    return [Variant(f"r{n}", en, es, nen, nes, {"range_t": float(n)}) for n, en, es, nen, nes in spec]


def _sr_family() -> list[Variant]:
    """The segregation number, for the segregation-regime axis.

    Gray and Thornton's non-dimensional group. Zero is the passive-tracer limit and is the product's
    negative control; the response saturates past about one, because the flowing layer is already
    fully separated and raising Sr leaves nothing more to separate. Both ends are worth seeing.
    """
    spec = [
        (0.0, "Sr = 0",   "Sr = 0",
         "Kinetic sieving switched off. The size split rides with the material untouched, which is the "
         "negative control: any sorting visible here would be a solver artefact.",
         "Tamizado cinético apagado. La separación por tamaño viaja con el material sin tocarse, que es "
         "el control negativo: cualquier clasificación visible aquí sería un artefacto del solver."),
        (0.5, "Sr = 0.5", "Sr = 0.5",
         "Weak sieving. The toe is measurably coarser than the apex but the effect is small.",
         "Tamizado débil. El pie es medible más grueso que el ápice, pero el efecto es pequeño."),
        (1.0, "Sr = 1",   "Sr = 1",
         "The reference regime, near the knee of the response.",
         "El régimen de referencia, cerca del codo de la respuesta."),
        (2.0, "Sr = 2",   "Sr = 2",
         "Strong sieving, already close to saturated: the flowing layer separates almost completely "
         "within the first few bands of the avalanche.",
         "Tamizado fuerte, ya cerca de la saturación: la capa fluyente se separa casi por completo "
         "dentro de las primeras bandas de la avalancha."),
        (4.0, "Sr = 4",   "Sr = 4",
         "Saturated. The segregation index barely moves from Sr = 2, which is the model's own "
         "prediction and not a numerical limit.",
         "Saturado. El índice de segregación casi no se mueve respecto de Sr = 2, que es la predicción "
         "del propio modelo y no un límite numérico."),
        (8.0, "Sr = 8",   "Sr = 8",
         "Past saturation, kept so the flat top of the curve is visible rather than asserted.",
         "Pasada la saturación, incluido para que la parte plana de la curva se vea en vez de afirmarse."),
    ]
    return [Variant(f"s{str(v).replace('.', '')}", en, es, nen, nes, {"sr": v})
            for v, en, es, nen, nes in spec]


#: category -> the parametric family that category's answer actually turns on
_FAMILIES = {
    _STACK: _passes_family,
    _RECL: _cut_family,
    _VAR: _range_family,
    _SEG: _sr_family,
}


def variants_for(case: Case) -> list[Variant]:
    """The operating regimes of a case, or an empty list when it genuinely has none.

    Controls return NOTHING, on purpose. A control is a single deliberate point carrying a numerical
    kill criterion; sweeping it would destroy the property that makes it a control. ADR-0016 section
    9A sanctions exactly this and forbids the alternative, which is padding a chip count with
    fabricated regimes.
    """
    fam = _FAMILIES.get(case.category)
    return fam() if fam else []

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
        "at the same Sr is not expected, the signature is the layering, not the magnitude",
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
        "equation degenerate to pure tracer advection. Any size sorting produced by the solver is then "
        "leaking in from somewhere it should not.",
        "Every lot in the pile still carries exactly the coarse fraction of the truck it came from. "
        "The aggregate toe-minus-apex delta is not expected to be zero: different dumps carry "
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
