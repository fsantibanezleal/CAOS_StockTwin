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
    # WHICH AXIS THIS SCENARIO VARIES. The matrix is organised by the thing being changed, because a
    # flat list of cases does not say what is being compared with what; the app groups the selector
    # by this and the reader can see the design of the experiment rather than a pile of names.
    category: str = "physics"

    # Site
    pad_nx: int = 56
    pad_ny: int = 56
    cell_m: float = 2.5
    shovel_xy: tuple[float, float] = (120.0, 122.0)

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
            # THE ENTRANCE IS THE MIDDLE OF THE OPEN EDGE, not a corner. Areas run along +x from
            # the origin and sit at y0 = 0, so the (x1, y0) corner this used to pick is wedged
            # between the area and the pad boundary with the pile itself between it and every
            # approach. Measured on a 90 m area: no truck could reach the entrance at all. The +y
            # edge is the one that faces open ground, and the shovel now sits past it.
            a.access_xy = self.access_xy or ((a.x0_m + a.x1_m) / 2.0, a.y1_m)
        return p

    def truck(self) -> TruckSpec:
        return TruckSpec()


SINGLE = Scenario(
    id="single",
    category="reference",
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
    n_loads=2200,
    tags=("basic", "physics"),
)


YARD = Scenario(
    id="yard",
    category="yard",
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
    pad_nx=124,
    pad_ny=56,
    shovel_xy=(155.0, 122.0),
    n_areas=3,
    area_width_m=90.0,
    area_length_m=90.0,
    gap_m=25.0,
    # ORDERED LOW TO HIGH, because route_to_area walks the threshold ladder upward and sends
    # the lowest grades to classes[0]. Listing them high-first put "high grade" on the pile
    # holding 0.32 and "low grade" on the pile holding 0.82, which the sector chart showed
    # immediately and no table would have.
    classes=("low grade", "mid grade", "high grade"),
    n_loads=3600,
    block_sd=0.20,
    n_trucks=6,
    n_cuts=30,
    tags=("core", "sectors", "routing"),
)


SIDEHILL = Scenario(
    id="sidehill",
    category="landform",
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
    pad_nx=56,
    pad_ny=56,
    shovel_xy=(120.0, 122.0),
    n_areas=1,
    area_width_m=90.0,
    area_length_m=90.0,
    classes=("ROM",),
    n_loads=2200,
    fill=FillType.SIDEHILL,
    relief_m=18.0,
    roughness_m=0.5,
    tags=("topography", "sidehill"),
)


VALLEY = Scenario(
    id="valley",
    category="landform",
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
    n_loads=2200,
    fill=FillType.VALLEY,
    relief_m=26.0,
    roughness_m=0.6,
    tags=("topography", "valley"),
)


RIDGE = Scenario(
    id="ridge",
    category="landform",
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
    n_loads=2200,
    fill=FillType.RIDGE_CREST,
    relief_m=24.0,
    roughness_m=0.5,
    tags=("topography", "ridge"),
)


SHORT_DWELL = Scenario(
    id="short_dwell",
    category="feed",
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
    n_loads=2200,
    loads_per_block=4,
    tags=("stream", "contrast"),
)



# ---------------------------------------------------------------------------------------------
# THE REST OF THE MATRIX.
#
# Six scenarios is a demonstration, not an experiment. What follows varies one thing at a time
# along the axes that actually change the answer, so a reader can see WHAT WAS COMPARED WITH WHAT
# rather than a list of names: the landform (all five published fill types, not three), the feed
# structure that decides whether a stockpile can help at all, the yard layout and its routing, and
# the operating choices a planner actually controls.
#
# Each one still has to say why it is here and what result would mean the code is wrong.
# ---------------------------------------------------------------------------------------------

CROSS_VALLEY = Scenario(
    id="cross_valley",
    category="landform",
    title_en="Cross-valley fill, confined across the axis",
    title_es="Relleno transversal, confinado a traves del eje",
    summary_en=(
        "The fifth published fill type, and the one that behaves least like the other four. The "
        "ground falls along one axis and rises across it, so the fill is held on two opposite sides "
        "while draining along the third."
    ),
    summary_es=(
        "El quinto tipo publicado de relleno, y el que menos se parece a los otros cuatro. El "
        "terreno baja en un eje y sube en el otro, de modo que el relleno queda contenido en dos "
        "lados opuestos mientras drena a lo largo del tercero."
    ),
    reason=(
        "The taxonomy has five members and a product that ships three is choosing which physics to "
        "show. This one is the awkward case: confinement and drainage at right angles, so the crest "
        "advances along one axis and the toe runs away along the other."
    ),
    kill_criterion=(
        "Buildable ground before any load is placed must differ measurably from both the flat pad "
        "and the valley. If the three report the same fraction the landform is not entering the "
        "calculation and the fill type is a label."
    ),
    n_loads=2200,
    fill=FillType.CROSS_VALLEY,
    relief_m=24.0,
    roughness_m=0.5,
    tags=("topography", "cross-valley"),
)


LONG_DWELL = Scenario(
    id="long_dwell",
    category="feed",
    title_en="Long shovel dwell, strongly correlated feed",
    title_es="Permanencia larga de la pala, alimentacion muy correlacionada",
    summary_en=(
        "The opposite end of the axis from the short-dwell case: the shovel stays in one dig block "
        "for sixty loads. Every other parameter is identical to the reference. This is the feed a "
        "stockpile can do least about, because whole regions of the pile share one grade."
    ),
    summary_es=(
        "El extremo opuesto del caso de permanencia corta: la pala permanece sesenta cargas en un "
        "mismo bloque. Todo lo demas es identico a la referencia. Es la alimentacion con la que un "
        "acopio menos puede ayudar, porque regiones enteras de la pila comparten una sola ley."
    ),
    reason=(
        "Two points define a line and three define a trend. With the reference at twenty loads per "
        "block and the short-dwell case at four, this is the third point, and it is the one that "
        "shows the blending benefit collapsing rather than merely weakening."
    ),
    kill_criterion=(
        "The measured stream range must be LONGER than the reference case built with the same seed "
        "and geometry, and the variance reduction worse. If a longer dwell does not hurt, the "
        "stream model is not carrying the dig sequence."
    ),
    n_loads=2200,
    loads_per_block=60,
    tags=("stream", "contrast"),
)


TRENDING = Scenario(
    id="trending",
    category="feed",
    title_en="Trending feed, grade drifting through the campaign",
    title_es="Alimentacion con tendencia, ley que deriva durante la campana",
    summary_en=(
        "Grade drifts steadily from the first bench to the last, which is what a real dig sequence "
        "through a zoned ore body produces. A drift is not noise: no amount of mixing removes it, "
        "and a stockpile built through one delivers a reclaim stream that drifts too."
    ),
    summary_es=(
        "La ley deriva de forma sostenida desde el primer banco hasta el ultimo, que es lo que "
        "produce una secuencia real a traves de un cuerpo zonificado. Una deriva no es ruido: "
        "ninguna mezcla la elimina, y el flujo recuperado tambien deriva."
    ),
    reason=(
        "Variance reduction is measured against the input variance, and a trend inflates that "
        "denominator without being the kind of variability blending can address. It is the standard "
        "way the metric flatters a bed, and the product should show it rather than avoid it."
    ),
    kill_criterion=(
        "Variance reduction must come out BETTER than the reference case while the reclaim stream "
        "still visibly drifts. A number that improves while the problem gets worse is the point of "
        "the scenario; if the number does not improve, the trend is not reaching the input."
    ),
    n_loads=2200,
    bench_trend=0.35,
    tags=("stream", "trend"),
)


YARD_FIVE = Scenario(
    id="yard_five",
    category="yard",
    title_en="Five-area yard, finer ore-control classes",
    title_es="Patio de cinco areas, clases de control de leyes mas finas",
    summary_en=(
        "The same routed campaign split five ways instead of three. Finer classes mean tighter "
        "piles and a better-defined product, and they also mean more misroutes, longer hauls and "
        "more areas competing for the same fleet."
    ),
    summary_es=(
        "La misma campana enrutada dividida en cinco clases en vez de tres. Clases mas finas dan "
        "pilas mas ajustadas y un producto mejor definido, y tambien mas errores de ruteo, "
        "transportes mas largos y mas areas compitiendo por la misma flota."
    ),
    reason=(
        "How many stockpiles to run is the decision an ore-control engineer actually makes, and it "
        "is a trade rather than an optimisation. Three against five, same ore, same fleet, is the "
        "comparison that shows the trade instead of asserting it."
    ),
    kill_criterion=(
        "Within-area grade spread must be TIGHTER than the three-area yard, because that is the "
        "only thing finer classes buy. If it is not, the router is not separating and the extra "
        "areas cost without returning."
    ),
    pad_nx=228,
    pad_ny=56,
    shovel_xy=(265.0, 122.0),
    n_areas=5,
    gap_m=20.0,
    classes=("very low", "low grade", "mid grade", "high grade", "very high"),
    n_loads=5000,
    block_sd=0.22,
    tags=("core", "sectors", "routing"),
)


SHORT_BENCH = Scenario(
    id="short_bench",
    category="operations",
    title_en="Short benches, more lifts",
    title_es="Bancos bajos, mas levantes",
    summary_en=(
        "The same tonnage into the same footprint, built as four nine-metre lifts instead of two "
        "eighteens. More lifts mean more paddock campaigns, more dozer work and a shorter cascade "
        "down every face."
    ),
    summary_es=(
        "El mismo tonelaje en la misma huella, construido como cuatro levantes de nueve metros en "
        "vez de dos de dieciocho. Mas levantes significan mas campanas de paddock, mas trabajo de "
        "bulldozer y una cascada mas corta en cada cara."
    ),
    reason=(
        "Bench height is the main lever a dump designer has and it drives the physics directly: "
        "run-out down a face is the horizontal component of the bench slope, and percolation "
        "segregation only becomes significant above roughly ten to twelve metres of drop."
    ),
    kill_criterion=(
        "The spread of the coarse fraction must be NARROWER than the reference case. A nine-metre "
        "bench cascades about fourteen metres, at the bottom of the measured envelope; if "
        "segregation is unchanged it is not being driven by the face at all."
    ),
    n_loads=2200,
    bench_height_m=9.0,
    n_benches=4,
    tags=("operations", "bench"),
)


TALL_BENCH = Scenario(
    id="tall_bench",
    category="operations",
    title_en="Tall benches, long cascade",
    title_es="Bancos altos, cascada larga",
    summary_en=(
        "One twenty-eight-metre lift. The longest face the footprint can carry, which is the "
        "condition under which kinetic sieving does the most work and the toe ends up most "
        "different from the crest."
    ),
    summary_es=(
        "Un solo levante de veintiocho metros. La cara mas larga que la huella puede sostener, que "
        "es la condicion en la que el cribado cinetico hace mas trabajo y el pie termina lo mas "
        "distinto posible de la cresta."
    ),
    reason=(
        "The other end of the bench-height lever, and the case that tests the access mechanic "
        "hardest: a lift of twenty-eight metres needs roughly sixty-five metres of ramp at the "
        "working gradient, which is most of the area."
    ),
    kill_criterion=(
        "Zero pairs over repose and no cell below its original ground, at a peak measurably above "
        "the reference case. A tall bench that does not stand taller means the loads are not "
        "reaching the working level and the ramp is failing silently."
    ),
    n_loads=2200,
    bench_height_m=28.0,
    n_benches=1,
    tags=("operations", "bench"),
)


NARROW_RAMP = Scenario(
    id="narrow_ramp",
    category="operations",
    title_en="Narrow access ramp",
    title_es="Rampa de acceso angosta",
    summary_en=(
        "A twelve-metre corridor instead of twenty-five: single-lane access with no room to pass. "
        "The ramp still has to be cut and maintained out of the fill, but there is far less of it "
        "to work with."
    ),
    summary_es=(
        "Un corredor de doce metros en vez de veinticinco: acceso de una pista sin lugar para "
        "cruzarse. La rampa igual debe cortarse y mantenerse en el relleno, pero hay mucho menos "
        "con que trabajar."
    ),
    reason=(
        "Ramp width is a dump-design parameter with a real cost: every metre of corridor is "
        "capacity the footprint does not hold. Whether a narrow ramp actually costs placement is a "
        "measurement, not an assumption."
    ),
    kill_criterion=(
        "The refusal rate must be no better than the reference case. A narrower way in cannot make "
        "access easier, and if it does the corridor is not the thing controlling access."
    ),
    n_loads=2200,
    ramp_width_m=12.0,
    tags=("operations", "access"),
)


SELDOM_DOZED = Scenario(
    id="seldom_dozed",
    category="operations",
    title_en="Dozer on a long cadence",
    title_es="Bulldozer con cadencia larga",
    summary_en=(
        "One dozer pass every hundred and twenty loads instead of every forty. The blade is what "
        "turns a field of tipped heaps into a floor a truck can cross, so its cadence is the pace "
        "at which the working level becomes usable again."
    ),
    summary_es=(
        "Una pasada de bulldozer cada ciento veinte cargas en vez de cada cuarenta. La hoja es lo "
        "que convierte un campo de montones en un piso que un camion puede cruzar, asi que su "
        "cadencia marca el ritmo al que el nivel de trabajo vuelve a ser utilizable."
    ),
    reason=(
        "Dozer availability is a real operating constraint and the source is explicit that the "
        "machine works on a cadence rather than continuously. It is also the cheapest lever on "
        "placement rate, which makes it worth quantifying."
    ),
    kill_criterion=(
        "The refusal rate must rise against the reference case. Less blade work that placed MORE "
        "loads would mean the cadence is not connected to access at all."
    ),
    n_loads=2200,
    loads_per_dozer_pass=120,
    tags=("operations", "dozer"),
)


SCENARIOS: list[Scenario] = [
    SINGLE,
    SHORT_DWELL,
    LONG_DWELL,
    TRENDING,
    YARD,
    YARD_FIVE,
    SIDEHILL,
    VALLEY,
    CROSS_VALLEY,
    RIDGE,
    SHORT_BENCH,
    TALL_BENCH,
    NARROW_RAMP,
    SELDOM_DOZED,
]


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
