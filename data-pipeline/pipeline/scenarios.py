"""The scenarios this product ships, and the artifacts they bake.

TWO SCENARIOS, DECIDED WITH FELIPE ON 2026-08-02.

  BASIC, ``single``: one working stock. Trucks appear near the pile, spot, discharge and leave. The
  haul from the pit is out of frame; what is on screen is the stock and the machines working it. This
  is the case for reading the physics, because nothing else is competing for attention.

  CORE, ``yard``: a multi-area stockyard. This is the full application. Loads are ROUTED to an area by
  their ore-control class, several areas are under construction at once, and the sector view finally
  has something to compare. Routing by class is what an operation actually does: "the low SMR ore was
  sent to one stockpile and the high SMR ore was sent to another stockpile. One high SMR stockpile and
  one low SMR stockpile were built at a time" (Neufeld, Lyall and Deutsch, CCG Report 8 paper 306,
  2006).

WHY THE SIMULATION IS BAKED RATHER THAN RUN IN THE BROWSER. The v2 engine routes every load over the
trafficable surface, floods the pad for reachability, and relaxes after every operation. That is
seconds per hundred loads, which is fine offline and unusable in a page. So the heavy part runs here
and ships as an event log with terrain snapshots.

WHAT IS NOT BAKED, and this is the part that matters. The VERDICTS are not in the artifact. Variance
reduction, variograms, the efficiency against the ideal bound, the sector rollups and their confidence
intervals are all recomputed in the browser from the events. A trace that shipped a baked ratio would
be a slide, and its number would be unfalsifiable.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from bedblend.design import DumpPlan, rectangular_yard
from bedblend.terrain import Terrain, TruckSpec
from bedblend.topography import FillType, ground


@dataclass(frozen=True)
class Scenario:
    """One runnable configuration, with the reason it is in the product.

    ``kill_criterion`` is what turns a scenario from a demonstration into a test: it states in advance
    what result would mean the code is wrong, and the bake gate fails on it.
    """

    id: str
    title_en: str
    title_es: str
    summary_en: str
    summary_es: str
    reason: str
    kill_criterion: str

    # Site
    pad_nx: int = 72
    pad_ny: int = 72
    cell_m: float = 2.5
    shovel_xy: tuple[float, float] = (170.0, 20.0)

    # Yard
    n_areas: int = 1
    # NARROW AND TALL, not broad and flat. A wide footprint spreads the same tonnage into a sheet:
    # the crest barely rises, the cascade has no face worth the name, and the pile is dull to watch
    # and weak to measure. A compact area with tall benches builds UPWARD, which is what a real ROM
    # stockpile does and what makes the two construction phases legible.
    # FOOTPRINT AND BENCH HEIGHT ARE COUPLED THROUGH THE RAMP, and the coupling is unforgiving. A
    # lift of H metres needs roughly H/0.5 metres of ramp at the equipment gradient, and that ramp
    # has to fit beside the pile inside the same footprint. Measured while trying to make the piles
    # narrower and taller: 55 m with 22 m benches refused 79 percent of its tips and stalled at
    # 7.8 m; 70 m with 14 m benches refused 69 percent and stalled at 6.7 m. 90 m with 18 m benches
    # is what actually builds, and it is the configuration these numbers were verified on.
    area_width_m: float = 90.0
    area_length_m: float = 90.0
    gap_m: float = 20.0
    # BENCH HEIGHT IS NOT COSMETIC. Run-out down the face is the horizontal component of the bench
    # slope, so it scales directly with this: an 8 m bench cascades about 12 m, which sits BELOW the
    # 13 to 46 m envelope measured off a 30 m dump crest. It also sits below the 10 to 12 m threshold
    # at which percolation segregation becomes significant, so a short bench produces a geometry that
    # is correct for itself and comparable to nothing. 18 m puts both in range.
    bench_height_m: float = 18.0
    n_benches: int = 2
    classes: tuple[str, ...] = ("ROM",)
    access_xy: tuple[float, float] | None = None

    # Plan
    row_spacing_m: float = 10.0
    tip_spacing_m: float = 8.0
    loads_per_dozer_pass: int = 40
    ramp_width_m: float = 25.0
    # How much of a bench goes down as paddock base layer before the edge campaign starts. The base
    # layer is ONE lift of heaps, roughly a couple of metres over the footprint, which against an 18 m
    # bench is about a sixth of its volume. The earlier 0.35 was a guess and it starved the edge
    # campaign: on a tall bench it consumed the entire load budget in paddock dumps and no face was
    # ever formed to cascade over.
    paddock_frac: float = 0.18

    # Fleet and material
    n_trucks: int = 4
    repose_deg: float = 37.0
    n_loads: int = 240
    loads_per_block: int = 20
    mean_grade: float = 0.62
    block_sd: float = 0.16
    bench_trend: float = 0.0
    seed: int = 20260802

    # Reclaim
    cut_tonnes: float = 3000.0
    n_cuts: int = 24

    # ONE FRAME PER PLACED LOAD. `snapshot_every=1` in the engine, and this is the cap rather than
    # the target. A stockpile is built one truck at a time and that is the unit the reader is
    # watching: with a frame every fourth load the pile jumps and the truck on screen is not the one
    # that made the bump. Frames are stored at a coarse stride (see `_half`) precisely so that one
    # per load is affordable.
    # DETAIL. Two dozen frames is a slideshow and the pile jumps. Frames are stored at half grid
    # resolution, ample for watching a surface grow, which keeps the artifact small.
    n_snapshots: int = 4000

    # Ground. Only one of the five published fill types is a flat pad, so the site is a property of
    # the scenario rather than an assumption of the engine.
    fill: FillType = FillType.HEAPED
    relief_m: float = 0.0
    roughness_m: float = 0.0

    tags: tuple[str, ...] = field(default_factory=tuple)

    def terrain(self) -> Terrain:
        if self.fill is FillType.HEAPED and self.relief_m <= 0 and self.roughness_m <= 0:
            return Terrain.flat(self.pad_nx, self.pad_ny, self.cell_m)
        return ground(
            self.fill, self.pad_nx, self.pad_ny, self.cell_m,
            relief_m=self.relief_m, roughness_m=self.roughness_m, seed=self.seed,
        )

    def plan(self) -> DumpPlan:
        p = rectangular_yard(
            n_areas=self.n_areas,
            area_width_m=self.area_width_m,
            area_length_m=self.area_length_m,
            bench_height_m=self.bench_height_m,
            n_benches=self.n_benches,
            gap_m=self.gap_m,
            classes=list(self.classes),
        )
        p.row_spacing_m = self.row_spacing_m
        p.tip_spacing_m = self.tip_spacing_m
        p.loads_per_dozer_pass = self.loads_per_dozer_pass
        for a in p.areas:
            a.ramp_width_m = self.ramp_width_m
            # Equipment enters each area from the side the pit is on, so the crest advances back
            # toward the way out instead of burying it.
            a.access_xy = self.access_xy or (a.x1_m, a.y0_m)
        return p

    def truck(self) -> TruckSpec:
        return TruckSpec()


SINGLE = Scenario(
    id="single",
    title_en="One working stock",
    title_es="Un acopio en operacion",
    summary_en=(
        "A single ROM stockpile on a prepared pad. Trucks arrive at the stock, spot against the "
        "working face, discharge and leave. The haul from the pit is out of frame so that the "
        "construction itself is legible: the base layer goes down as paddock heaps, the dozer turns "
        "them into a floor, and the upper lift then advances a crest."
    ),
    summary_es=(
        "Un solo acopio ROM sobre una plataforma preparada. Los camiones llegan al acopio, se ubican "
        "contra la cara de trabajo, descargan y se retiran. El transporte desde el rajo queda fuera "
        "de cuadro para que la construccion sea legible: la capa base se coloca como montones de "
        "paddock, el bulldozer los convierte en piso, y el banco superior avanza una cresta."
    ),
    reason=(
        "The reference case for the physics. One area, one material class, nothing competing for "
        "attention, so the two construction phases and the four dump profiles can actually be seen."
    ),
    kill_criterion=(
        "Zero cell pairs may stand steeper than the imposed angle of repose at the end of the build, "
        "and mass must be conserved to 1e-6 of the volume placed. The predecessor finished with 446 "
        "over-steep pairs, the worst at 55.9 degrees against an imposed 37, which is what the pile "
        "rendered as spikes."
    ),
    n_areas=1,
    classes=("ROM",),
    n_loads=560,
    tags=("basic", "physics"),
)


YARD = Scenario(
    id="yard",
    title_en="Multi-area stockyard",
    title_es="Patio de acopios multi-area",
    summary_en=(
        "The full application. Three named areas hold material of different declared classes, loads "
        "are routed to an area by their ore-control estimate, and several areas are under "
        "construction at once. This is where the sector view earns its place: each area reports one "
        "grade, the raw field underneath shows how stratified it really is, and the reclaim sequence "
        "decides which of the two the plant experiences."
    ),
    summary_es=(
        "La aplicacion completa. Tres areas nombradas contienen material de clases declaradas "
        "distintas, las cargas se enrutan a un area segun su estimacion de control de leyes, y varias "
        "areas se construyen a la vez. Aqui la vista por sector se justifica: cada area reporta una "
        "ley, el campo crudo debajo muestra cuan estratificada esta en realidad, y la secuencia de "
        "recuperacion decide cual de las dos recibe la planta."
    ),
    reason=(
        "Routing by declared class is what an operation actually does, and it is the only "
        "configuration in which a sector rollup can be compared against anything. A single-area yard "
        "has one sector, so the raw-versus-sector comparison has nothing to say."
    ),
    kill_criterion=(
        "Every load must land in the area its class routes it to, the per-area rollups must differ by "
        "more than their own 95 percent intervals, and the repose and mass invariants of the single "
        "case must still hold across all three areas."
    ),
    pad_nx=136,
    pad_ny=80,
    shovel_xy=(330.0, 20.0),
    n_areas=3,
    area_width_m=90.0,
    area_length_m=90.0,
    gap_m=25.0,
    # ORDERED LOW TO HIGH, because route_to_area walks the threshold ladder upward and sends
    # the lowest grades to classes[0]. Listing them high-first put "high grade" on the pile
    # holding 0.32 and "low grade" on the pile holding 0.82, which the sector chart showed
    # immediately and no table would have.
    classes=("low grade", "mid grade", "high grade"),
    n_loads=900,
    block_sd=0.20,
    n_trucks=6,
    n_cuts=30,
    tags=("core", "sectors", "routing"),
)


SIDEHILL = Scenario(
    id="sidehill",
    title_en="Sidehill fill on real topography",
    title_es="Acopio en ladera sobre topografia real",
    summary_en=(
        "The same stockpile built against a hillside instead of on a prepared pad. Only one of the "
        "five published stockpile fill types is flat ground; the rest are sidehill, valley, "
        "cross-valley and ridge-crest fill. Relief is not scenery here: it decides which ground "
        "equipment can occupy before a single load is placed, so the plan, the access and the shape "
        "of the finished pile all change."
    ),
    summary_es=(
        "El mismo acopio construido contra una ladera en vez de sobre una plataforma preparada. Solo "
        "uno de los cinco tipos publicados de relleno de acopio es terreno plano; los demas son "
        "ladera, valle, valle transversal y cresta. El relieve no es decoracion: define que terreno "
        "puede ocupar el equipo antes de colocar una sola carga, de modo que el plan, los accesos y "
        "la forma final del acopio cambian."
    ),
    reason=(
        "Building on relief is what exposed two defects a flat pad physically cannot reveal: a dozer "
        "that selected material by elevation and so excavated the hill, and a relaxation that treated "
        "elevation as free-floating and eroded bedrock. The case exists so those stay fixed."
    ),
    kill_criterion=(
        "No cell may end below its ORIGINAL ground elevation, because that is excavation nobody "
        "performed. The repose invariant must hold on the placed material while leaving natural "
        "ground steeper than repose untouched, and material volume must be measured against the "
        "original surface rather than against zero."
    ),
    pad_nx=72,
    pad_ny=72,
    shovel_xy=(170.0, 20.0),
    n_areas=1,
    area_width_m=90.0,
    area_length_m=90.0,
    classes=("ROM",),
    n_loads=560,
    fill=FillType.SIDEHILL,
    relief_m=18.0,
    roughness_m=0.5,
    tags=("topography", "sidehill"),
)


VALLEY = Scenario(
    id="valley",
    title_en="Valley fill, confined on two sides",
    title_es="Relleno de valle, confinado en dos lados",
    summary_en=(
        "The same campaign tipped into a valley. Confinement changes the answer: the ground holds "
        "the material on two sides, so the same tonnage stands markedly higher than it does "
        "free-standing on a pad, and the working face runs along the valley rather than out in "
        "every direction."
    ),
    summary_es=(
        "La misma campana descargada en un valle. El confinamiento cambia la respuesta: el terreno "
        "sostiene el material por dos lados, de modo que el mismo tonelaje se para bastante mas "
        "alto que libre sobre una plataforma, y la cara de trabajo corre a lo largo del valle."
    ),
    reason=(
        "Confinement is why the fill taxonomy exists at all. A valley holds the same tonnage higher "
        "and narrower than a pad does, which changes the drop height, and drop height is one of the "
        "three drivers of size segregation. It is the cleanest contrast against the flat case."
    ),
    kill_criterion=(
        "The pile must stand HIGHER than the flat-pad case built from the same load budget, because "
        "that is what confinement means. If it does not, the ground is not constraining the "
        "material and the topography is decoration."
    ),
    n_areas=1,
    classes=("ROM",),
    n_loads=560,
    fill=FillType.VALLEY,
    relief_m=26.0,
    roughness_m=0.6,
    tags=("topography", "valley"),
)


RIDGE = Scenario(
    id="ridge",
    title_en="Ridge crest fill, shedding both ways",
    title_es="Relleno en cresta, vertiendo a ambos lados",
    summary_en=(
        "Built along a ridge, where the ground falls away on both sides. Every edge dump has two "
        "faces to choose between, and material that overruns a toe is gone down a hillside rather "
        "than sitting at the foot of the pile."
    ),
    summary_es=(
        "Construido a lo largo de una cresta, donde el terreno cae por ambos lados. Cada descarga "
        "de borde tiene dos caras entre las que elegir, y el material que pasa el pie se va ladera "
        "abajo en vez de quedar al pie de la pila."
    ),
    reason=(
        "The opposite of the valley: instead of holding material in, the ground sheds it. Access is "
        "tightest here because the buildable ground is a strip, which makes it the clearest "
        "demonstration that the plan has to follow the landform."
    ),
    kill_criterion=(
        "Buildable ground before any load is placed must be measurably lower than on a flat pad, "
        "and no cell may end below its original ground. A ridge that behaves like a pad has not "
        "been modelled."
    ),
    n_areas=1,
    classes=("ROM",),
    n_loads=560,
    fill=FillType.RIDGE_CREST,
    relief_m=24.0,
    roughness_m=0.5,
    tags=("topography", "ridge"),
)


SHORT_DWELL = Scenario(
    id="short_dwell",
    title_en="Short shovel dwell, decorrelated feed",
    title_es="Permanencia corta de la pala, alimentacion descorrelacionada",
    summary_en=(
        "The same stockpile fed by a shovel that moves between dig blocks every few loads instead "
        "of every twenty. Nothing about the pile changes; only the ORDER the grades arrive in. That "
        "is the whole control an operation has over how much a stockpile can help it."
    ),
    summary_es=(
        "El mismo acopio alimentado por una pala que cambia de bloque cada pocas cargas en vez de "
        "cada veinte. Nada de la pila cambia; solo el ORDEN en que llegan las leyes. Ese es todo el "
        "control que una operacion tiene sobre cuanto puede ayudarle un acopio."
    ),
    reason=(
        "The causal claim of the whole product, isolated. Grade autocorrelation is a consequence of "
        "the dig sequence rather than a property of the ore, so changing ONLY the shovel dwell must "
        "move the measured stream range and the blending result, everything else held fixed."
    ),
    kill_criterion=(
        "The measured stream range must be substantially SHORTER than the reference case built with "
        "the same seed and geometry. If the dwell does not move the range, the stream model is not "
        "causal and the product is claiming something it does not do."
    ),
    n_areas=1,
    classes=("ROM",),
    n_loads=560,
    loads_per_block=4,
    tags=("stream", "contrast"),
)


SCENARIOS: list[Scenario] = [SINGLE, YARD, SIDEHILL, VALLEY, RIDGE, SHORT_DWELL]


def by_id(scenario_id: str) -> Scenario:
    for s in SCENARIOS:
        if s.id == scenario_id:
            return s
    raise KeyError(f"unknown scenario {scenario_id!r}; have {[s.id for s in SCENARIOS]}")


def route_to_area(grade: float, thresholds: list[float], classes: tuple[str, ...]) -> str:
    """Which area a load goes to, from its ore-control estimate.

    The rule is a threshold ladder, which is exactly the published practice: a silica-to-magnesia
    ratio of 1.75 splits high from low, with a further split of the high class by nickel grade. What
    matters for the model is that the decision is made BEFORE the load is placed and from the
    ESTIMATE, not from the truth, so a misclassified load ends up in the wrong pile and stays there.
    """
    for k, t in enumerate(thresholds):
        if grade < t:
            return classes[k]
    return classes[-1]


def class_thresholds(scn: Scenario) -> list[float]:
    """Grade cut-offs that split the incoming stream into the scenario's classes.

    Placed at even quantiles of the generated distribution so every area actually receives material.
    A threshold ladder that starves one area would make the sector comparison vacuous.
    """
    n = len(scn.classes)
    if n <= 1:
        return []
    # Normal quantiles for an even split, using the block distribution the dig sequence draws from.
    z = {2: [0.0], 3: [-0.4307, 0.4307], 4: [-0.6745, 0.0, 0.6745]}.get(
        n, [(-1.0 + 2.0 * (k + 1) / n) for k in range(n - 1)]
    )
    return [scn.mean_grade + scn.block_sd * q for q in z]
