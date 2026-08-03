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
    pad_nx: int = 60
    pad_ny: int = 60
    cell_m: float = 2.5
    shovel_xy: tuple[float, float] = (135.0, 138.0)

    # Yard
    n_areas: int = 1
    # NARROW AND TALL, and it is now affordable to be. A broad footprint spreads the same tonnage
    # into a sheet: the crest barely rises, the cascade has no face worth the name, and the pile is
    # dull to watch and weak to measure. Height is placed volume over footprint, so a 90 m square
    # needs about 1700 placed loads to stand 25 m and a 60 m square needs 760, and the second is
    # both the better picture and a third of the compute.
    #
    # FOOTPRINT AND BENCH HEIGHT ARE COUPLED THROUGH THE RAMP. A lift of H metres needs about
    # H / 0.43 metres of ramp run at the working gradient, and the corridor spans the area, so a
    # 60 m area serves roughly 26 m of lift. That is the constraint the geometry below is sized to,
    # and it is why an earlier attempt at 55 m with 22 m benches refused 79 percent of its tips: at
    # that time the corridor stopped at the area centre and served half as much.
    area_width_m: float = 90.0
    area_length_m: float = 90.0
    gap_m: float = 20.0
    bench_height_m: float = 26.0   # a 90 m square holds 90,400 m3 at repose: 766 loads, peak 26 m
    n_benches: int = 1
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
    # ORE CONTROL IS NOT PERFECT AND THE ROUTER USES THE ESTIMATE, NOT THE TRUTH. Published
    # misclassification runs 5 to 20 percent before the truck moves, and blast movement adds 9 to 19
    # percent ore loss on top. This is the standard deviation of the error on the grade estimate the
    # routing decision is made from; the load still CARRIES its true grade, so a misrouted load is a
    # real and reportable outcome rather than a bookkeeping error.
    estimate_error_sd: float = 0.0
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
            repose_deg=self.repose_deg,
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
    n_loads=900,
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
    pad_nx=148,
    pad_ny=60,
    shovel_xy=(185.0, 138.0),
    n_areas=3,
    area_width_m=90.0,
    area_length_m=90.0,
    gap_m=25.0,
    # ORDERED LOW TO HIGH, because route_to_area walks the threshold ladder upward and sends
    # the lowest grades to classes[0]. Listing them high-first put "high grade" on the pile
    # holding 0.32 and "low grade" on the pile holding 0.82, which the sector chart showed
    # immediately and no table would have.
    classes=("low grade", "mid grade", "high grade"),
    n_loads=2700,
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
    pad_nx=60,
    pad_ny=60,
    shovel_xy=(135.0, 138.0),
    n_areas=1,
    area_width_m=90.0,
    area_length_m=90.0,
    classes=("ROM",),
    n_loads=900,
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
    n_loads=900,
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
    n_loads=900,
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
    n_loads=900,
    loads_per_block=4,
    tags=("stream", "contrast"),
)



# ---------------------------------------------------------------------------------------------
# THE REST OF THE MATRIX.
#
# The axes are the things that change the answer, and each one carries SEVERAL cases rather than a
# single specimen, because one point on an axis is an illustration and three are a comparison. A
# reader should be able to hold the landform fixed and vary the feed, or hold the feed fixed and
# vary the landform, and see which of the two the result actually follows.
#
# Every case still says why it is here and what result would mean the code is wrong.
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
        "show. This is the awkward case: confinement and drainage at right angles."
    ),
    kill_criterion=(
        "Buildable ground before any load is placed must differ measurably from both the flat pad "
        "and the valley. If the three report the same fraction the landform is not entering the "
        "calculation and the fill type is a label."
    ),
    n_loads=900,
    fill=FillType.CROSS_VALLEY,
    relief_m=24.0,
    roughness_m=0.5,
    tags=("topography", "cross-valley"),
)


# STEEP_SIDEHILL IS WITHDRAWN, and the reason is recorded rather than the scenario quietly deleted.
#
# It doubled the relief of the sidehill case, to ask where a uniform slope stops being comfortable
# for a truck. The build does not converge: after the relaxation sweeps stop making progress, 22 cell
# pairs stand at up to 45.9 degrees against an imposed 37, which is nine degrees over and far outside
# the one-degree tolerance. Reducing the relief from 58 m to 44 m did not change the outcome.
#
# That is a solver limitation on steep ground and not a result, so the scenario is withdrawn rather
# than shipped with a surface the product's own invariant rejects. The question it asked is a good
# one and it is open. See the findings file.

ROUGH_GROUND = Scenario(
    id="rough_ground",
    category="landform",
    title_en="Rough ground, no prepared pad",
    title_es="Terreno rugoso, sin plataforma preparada",
    summary_en=(
        "Flat on average and rough in detail: an unprepared surface rather than a graded pad. The "
        "relief is small and the local slopes are not, which is the condition a prepared pad exists "
        "to remove."
    ),
    summary_es=(
        "Plano en promedio y rugoso en detalle: una superficie sin preparar en vez de una plataforma "
        "nivelada. El relieve es pequeno y las pendientes locales no lo son, que es justo la "
        "condicion que una plataforma preparada existe para eliminar."
    ),
    reason=(
        "Every other case assumes someone graded the ground first. This one asks what that "
        "preparation is worth, on a landform whose average is identical to the reference."
    ),
    kill_criterion=(
        "Buildable ground must be below the flat pad's 100 percent while the relief stays small. A "
        "surface that is rough and fully buildable means roughness is not reaching the slope."
    ),
    n_loads=900,
    fill=FillType.HEAPED,
    relief_m=3.0,
    roughness_m=1.6,
    tags=("topography", "rough"),
)


LONG_DWELL = Scenario(
    id="long_dwell",
    category="feed",
    title_en="Long shovel dwell, strongly correlated feed",
    title_es="Permanencia larga de la pala, alimentacion muy correlacionada",
    summary_en=(
        "The shovel stays in one dig block for sixty loads. Every other parameter is identical to "
        "the reference. This is the feed a stockpile can do least about, because whole regions of "
        "the pile share one grade."
    ),
    summary_es=(
        "La pala permanece sesenta cargas en un mismo bloque. Todo lo demas es identico a la "
        "referencia. Es la alimentacion con la que un acopio menos puede ayudar, porque regiones "
        "enteras de la pila comparten una sola ley."
    ),
    reason=(
        "Two points define a line and three define a trend. With the reference at twenty loads per "
        "block and the short-dwell case at four, this is the third point, and the one that shows "
        "the blending benefit collapsing rather than merely weakening."
    ),
    kill_criterion=(
        "The measured stream range must be LONGER than the reference built with the same seed and "
        "geometry. If a longer dwell does not hurt, the stream model is not carrying the dig "
        "sequence."
    ),
    n_loads=900,
    loads_per_block=60,
    tags=("stream", "contrast"),
)


TRENDING = Scenario(
    id="trending",
    category="feed",
    title_en="Trending feed, grade drifting through the campaign",
    title_es="Alimentacion con tendencia, ley que deriva durante la campana",
    summary_en=(
        "Grade drifts steadily from the first bench to the last, which is what a dig sequence "
        "through a zoned ore body produces. A drift is not noise: no amount of mixing removes it."
    ),
    summary_es=(
        "La ley deriva de forma sostenida desde el primer banco hasta el ultimo, que es lo que "
        "produce una secuencia a traves de un cuerpo zonificado. Una deriva no es ruido: ninguna "
        "mezcla la elimina."
    ),
    reason=(
        "Variance reduction is measured against the input variance, and a trend inflates that "
        "denominator without being the kind of variability blending can address. It is the standard "
        "way the metric flatters a bed, and the product should show it rather than avoid it."
    ),
    kill_criterion=(
        "Variance reduction must come out BETTER than the reference while the reclaim stream still "
        "visibly drifts. A number that improves while the problem gets worse is the point; if the "
        "number does not improve, the trend is not reaching the input."
    ),
    n_loads=900,
    bench_trend=0.35,
    tags=("stream", "trend"),
)


ERRATIC_FEED = Scenario(
    id="erratic_feed",
    category="feed",
    title_en="Erratic feed, high block-to-block variance",
    title_es="Alimentacion erratica, alta varianza entre bloques",
    summary_en=(
        "The dig sequence jumps between blocks of very different grade. High input variance is the "
        "condition under which a stockpile has the most to offer, and it is the case where the "
        "variance reduction ratio looks best for reasons that have nothing to do with the pile."
    ),
    summary_es=(
        "La secuencia de extraccion salta entre bloques de leyes muy distintas. La alta varianza de "
        "entrada es la condicion en la que un acopio mas puede aportar, y es el caso en que la razon "
        "de reduccion de varianza se ve mejor por razones ajenas a la pila."
    ),
    reason=(
        "The metric is a RATIO. Doubling the input spread improves it without the pile doing "
        "anything differently, and a reader who is shown only the ratio cannot tell the two apart. "
        "This case exists so the absolute output spread can be read alongside it."
    ),
    kill_criterion=(
        "Output variance must be HIGHER than the reference in absolute terms while the ratio "
        "improves. If both move the same way the metric is not a ratio of what it claims."
    ),
    n_loads=900,
    block_sd=0.34,
    tags=("stream", "variance"),
)


INTENSIVE_FEED = Scenario(
    id="intensive_feed",
    category="campaign",
    title_en="Intensive feeding, the whole budget into one area",
    title_es="Alimentacion intensiva, todo el presupuesto en una sola area",
    summary_en=(
        "Twice the campaign into the same footprint, without pause. The pile is pushed to the limit "
        "of what its own geometry can hold at repose, and past the point where the plan has tips "
        "left to offer."
    ),
    summary_es=(
        "El doble de campana en la misma huella, sin pausa. La pila se lleva al limite de lo que su "
        "propia geometria puede sostener en reposo, y mas alla del punto en que el plan tiene "
        "puntos de descarga que ofrecer."
    ),
    reason=(
        "The footprint has a geometric capacity: a square of side W holds a solid whose peak cannot "
        "exceed about 0.38 W at repose, whatever the fleet delivers. Offering twice the material is "
        "how that ceiling is demonstrated rather than asserted."
    ),
    kill_criterion=(
        "Placed volume must approach the designed frustum volume and then STOP, with the surplus "
        "reported as refused. A pile that keeps growing past its geometric capacity is not standing "
        "at repose."
    ),
    n_loads=1800,
    tags=("campaign", "capacity"),
)


INTENSIVE_DRAIN = Scenario(
    id="intensive_drain",
    category="campaign",
    title_en="Intensive draining, the pile taken back down",
    title_es="Drenaje intensivo, la pila desarmada",
    summary_en=(
        "The same pile, reclaimed hard: many small cuts rather than a few large ones, run until the "
        "pile is substantially gone. Reclaim is where the blending actually happens, and a campaign "
        "that stops at a quarter of the pile has only sampled the top of it."
    ),
    summary_es=(
        "La misma pila, recuperada con fuerza: muchos cortes pequenos en vez de pocos grandes, hasta "
        "desarmar buena parte de la pila. La recuperacion es donde ocurre la mezcla, y una campana "
        "que se detiene en un cuarto de la pila solo ha muestreado su parte superior."
    ),
    reason=(
        "A cut crosses the layers it can reach, and how many that is depends on how deep the "
        "campaign goes. Variance reduction measured over a shallow campaign is a different quantity "
        "from the same metric over a full one, and the difference is not small."
    ),
    kill_criterion=(
        "Delivered tonnage must be several times the reference campaign's, and no cut may report "
        "negative or NaN tonnage as the pile empties. A campaign that drains a pile it has already "
        "exhausted is not tracking the material."
    ),
    n_loads=900,
    cut_tonnes=900.0,
    n_cuts=90,
    tags=("campaign", "reclaim"),
)


LIGHT_DRAIN = Scenario(
    id="light_drain",
    category="campaign",
    title_en="Light draining, a few large cuts",
    title_es="Drenaje ligero, pocos cortes grandes",
    summary_en=(
        "The opposite reclaim campaign: six cuts of five thousand tonnes instead of ninety of nine "
        "hundred. Each cut is large enough to cross a lot of the pile at once, which is a different "
        "kind of mixing from taking it in thin slices."
    ),
    summary_es=(
        "La campana opuesta: seis cortes de cinco mil toneladas en vez de noventa de novecientas. "
        "Cada corte es lo bastante grande para cruzar buena parte de la pila de una vez, que es un "
        "tipo de mezcla distinto al de tomarla en rebanadas finas."
    ),
    reason=(
        "Cut size is a real operating choice and it is the one the reclaim geometry actually "
        "controls. Ninety small cuts against six large ones, on the same pile, is the comparison "
        "that says whether it matters."
    ),
    kill_criterion=(
        "The number of independent layers a cut crosses must be HIGHER than the intensive campaign's, "
        "and the variance reduction correspondingly better per cut. If cut size does not change what "
        "a cut crosses, the face is not engaging the layers."
    ),
    n_loads=900,
    cut_tonnes=5000.0,
    n_cuts=6,
    tags=("campaign", "reclaim"),
)


TWO_PHASE = Scenario(
    id="two_phase",
    category="campaign",
    title_en="Two sub-areas worked in sequence",
    title_es="Dos sub-areas trabajadas en secuencia",
    summary_en=(
        "One material class, two adjacent areas, worked one after the other rather than together. "
        "The first is finished and left; the second is started from bare ground beside it. This is "
        "how a yard grows when the fleet cannot serve two tip heads at once."
    ),
    summary_es=(
        "Una sola clase de material, dos areas contiguas, trabajadas una despues de la otra en vez "
        "de a la vez. La primera se termina y se deja; la segunda parte de terreno limpio al lado. "
        "Asi crece un patio cuando la flota no puede atender dos frentes a la vez."
    ),
    reason=(
        "Sequential and simultaneous construction put the same tonnage in the same place and produce "
        "different piles, because the grade arriving at any moment goes to whichever area is open. "
        "It is the cheapest lever an operation has over what each pile contains."
    ),
    kill_criterion=(
        "The two areas must differ measurably in mean grade, because each received a different "
        "stretch of the dig sequence. Two areas that come out the same mean the sequence is not "
        "reaching the piles."
    ),
    pad_nx=148,
    pad_ny=60,
    shovel_xy=(185.0, 138.0),
    n_areas=2,
    classes=("phase one", "phase two"),
    n_loads=1800,
    tags=("campaign", "sequencing"),
)


YARD_FIVE = Scenario(
    id="yard_five",
    category="yard",
    title_en="Five-area yard, finer ore-control classes",
    title_es="Patio de cinco areas, clases de control de leyes mas finas",
    summary_en=(
        "The same routed campaign split five ways instead of three. Finer classes mean tighter piles "
        "and a better-defined product, and they also mean more misroutes, longer hauls and more "
        "areas competing for the same fleet."
    ),
    summary_es=(
        "La misma campana enrutada dividida en cinco clases en vez de tres. Clases mas finas dan "
        "pilas mas ajustadas y un producto mejor definido, y tambien mas errores de ruteo, "
        "transportes mas largos y mas areas compitiendo por la misma flota."
    ),
    reason=(
        "How many stockpiles to run is the decision an ore-control engineer actually makes, and it "
        "is a trade rather than an optimisation. Three against five, same ore, same fleet."
    ),
    kill_criterion=(
        "Within-area grade spread must be TIGHTER than the three-area yard. If it is not, the router "
        "is not separating and the extra areas cost without returning."
    ),
    pad_nx=236,
    pad_ny=60,
    shovel_xy=(295.0, 138.0),
    n_areas=5,
    classes=("very low", "low grade", "mid grade", "high grade", "very high"),
    n_loads=4500,
    block_sd=0.22,
    tags=("core", "sectors", "routing"),
)


MISROUTED = Scenario(
    id="misrouted",
    category="yard",
    title_en="Ore-control misclassification",
    title_es="Clasificacion erronea en control de leyes",
    summary_en=(
        "The same three-area yard routed on a noisy estimate rather than a clean one. A load sent to "
        "the wrong pile lands there and stays there: the decision is made before placement and "
        "nothing corrects it afterwards."
    ),
    summary_es=(
        "El mismo patio de tres areas enrutado con una estimacion ruidosa en vez de limpia. Una "
        "carga enviada a la pila equivocada aterriza ahi y ahi se queda: la decision se toma antes "
        "de colocar y nada la corrige despues."
    ),
    reason=(
        "Published ore-control misclassification runs 5 to 20 percent before the truck moves, and "
        "blast movement adds 9 to 19 percent ore loss on top. A routing model that assumes a perfect "
        "estimate is modelling a mine that does not exist."
    ),
    kill_criterion=(
        "Within-area grade spread must be WIDER than the clean three-area yard, and the separation "
        "between area means smaller. If misclassification costs nothing, the router is not routing "
        "on the estimate."
    ),
    pad_nx=148,
    pad_ny=60,
    shovel_xy=(185.0, 138.0),
    n_areas=3,
    classes=("low grade", "mid grade", "high grade"),
    n_loads=2700,
    block_sd=0.20,
    estimate_error_sd=0.10,
    tags=("core", "sectors", "routing"),
)


SHORT_BENCH = Scenario(
    id="short_bench",
    category="operations",
    title_en="Short benches, more lifts",
    title_es="Bancos bajos, mas levantes",
    summary_en=(
        "The same footprint built as three nine-metre lifts instead of one twenty-six. More benches "
        "mean more paddock campaigns, more dozer work and a shorter cascade down every face."
    ),
    summary_es=(
        "La misma huella construida como tres levantes de nueve metros en vez de uno de veintiseis. "
        "Mas bancos significan mas campanas de paddock, mas trabajo de bulldozer y una cascada mas "
        "corta en cada cara."
    ),
    reason=(
        "Bench height is the main lever a dump designer has and it drives the physics directly: "
        "run-out down a face is the horizontal component of the bench slope, and percolation "
        "segregation only becomes significant above roughly ten to twelve metres of drop."
    ),
    kill_criterion=(
        "The spread of the coarse fraction must be NARROWER than the reference. A nine-metre bench "
        "cascades about fourteen metres, at the bottom of the measured envelope; if segregation is "
        "unchanged it is not being driven by the face at all."
    ),
    n_loads=900,
    bench_height_m=9.0,
    n_benches=3,
    tags=("operations", "bench"),
)


NARROW_RAMP = Scenario(
    id="narrow_ramp",
    category="operations",
    title_en="Narrow access ramp",
    title_es="Rampa de acceso angosta",
    summary_en=(
        "A twelve-metre corridor instead of twenty-five: single-lane access with no room to pass. "
        "The ramp still has to be cut and maintained out of the fill, with far less of it to work "
        "with."
    ),
    summary_es=(
        "Un corredor de doce metros en vez de veinticinco: acceso de una pista sin lugar para "
        "cruzarse. La rampa igual debe cortarse y mantenerse en el relleno, con mucho menos con que "
        "trabajar."
    ),
    reason=(
        "Ramp width is a dump-design parameter with a real cost: every metre of corridor is capacity "
        "the footprint does not hold. Whether a narrow ramp actually costs placement is a "
        "measurement, not an assumption."
    ),
    kill_criterion=(
        "The refusal rate must be no better than the reference. A narrower way in cannot make access "
        "easier, and if it does the corridor is not the thing controlling access."
    ),
    n_loads=900,
    ramp_width_m=12.0,
    tags=("operations", "access"),
)


SELDOM_DOZED = Scenario(
    id="seldom_dozed",
    category="operations",
    title_en="Dozer on a long cadence",
    title_es="Bulldozer con cadencia larga",
    summary_en=(
        "One access pass every sixty loads instead of every twelve. The blade is what turns a field "
        "of tipped heaps into a floor a truck can cross, so its cadence is the pace at which the "
        "working level becomes usable again."
    ),
    summary_es=(
        "Una pasada de acceso cada sesenta cargas en vez de cada doce. La hoja es lo que convierte "
        "un campo de montones en un piso que un camion puede cruzar, asi que su cadencia marca el "
        "ritmo al que el nivel de trabajo vuelve a ser utilizable."
    ),
    reason=(
        "Dozer availability is a real operating constraint and the source is explicit that the "
        "machine works on a cadence rather than continuously. It is also the cheapest lever on "
        "placement rate."
    ),
    kill_criterion=(
        "The refusal rate must rise against the reference. Less blade work that placed MORE loads "
        "would mean the cadence is not connected to access at all."
    ),
    n_loads=900,
    loads_per_dozer_pass=60,
    tags=("operations", "dozer"),
)


WET_MATERIAL = Scenario(
    id="wet_material",
    category="operations",
    title_en="Wet material, steeper repose",
    title_es="Material humedo, reposo mas empinado",
    summary_en=(
        "The same ore after rain. Capillary bridges between grains add cohesion and the material "
        "stands steeper, which makes the pile taller on the same footprint and every face harder to "
        "drive on."
    ),
    summary_es=(
        "El mismo mineral despues de la lluvia. Los puentes capilares entre granos anaden cohesion y "
        "el material se para mas empinado, lo que hace la pila mas alta sobre la misma huella y cada "
        "cara mas dificil de transitar."
    ),
    reason=(
        "Repose is not a constant. Handbook values for ores span 34 to 60 degrees and the value "
        "moves with size, moisture and time since dumping. Everything downstream, the geometry, the "
        "capacity of the footprint and the truck's gradient limit, follows it."
    ),
    kill_criterion=(
        "Peak height must RISE against the reference on the same footprint and the same load budget, "
        "because a steeper repose holds more in the same plan area. If it does not, the repose angle "
        "is not reaching the geometry."
    ),
    n_loads=900,
    repose_deg=43.0,
    tags=("operations", "material"),
)


SCENARIOS: list[Scenario] = [
    SINGLE,
    SHORT_DWELL,
    LONG_DWELL,
    TRENDING,
    ERRATIC_FEED,
    YARD,
    YARD_FIVE,
    MISROUTED,
    SIDEHILL,
    VALLEY,
    CROSS_VALLEY,
    RIDGE,
    ROUGH_GROUND,
    INTENSIVE_FEED,
    INTENSIVE_DRAIN,
    LIGHT_DRAIN,
    TWO_PHASE,
    SHORT_BENCH,
    NARROW_RAMP,
    SELDOM_DOZED,
    WET_MATERIAL,
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
