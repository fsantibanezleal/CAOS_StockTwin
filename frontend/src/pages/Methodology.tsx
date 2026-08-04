import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

import {
  FigDozer,
  FigPlan,
  FigProfiles,
  FigReclaim,
  FigRelaxation,
  FigRouting,
  FigSegregation,
  FigTrafficability,
} from '../figures/method';

/**
 * The method, in the order material moves through it.
 *
 * Every claim here is traceable to a primary source or to a measurement made on this engine. Where a
 * functional form is the simplest curve reproducing a published verbal statement rather than a fitted
 * model, the page says so, because a defensible operational model presented as a validated
 * constitutive one is the overclaim that matters most in this subject.
 *
 * EVERY SECTION CARRIES THE SAME FIVE THINGS, in this order: prose that states the mechanism, the
 * governing relations as captioned equations with every symbol defined and its units, an
 * assumptions-and-limits block, a hand-authored theme-aware figure, and the references that section
 * actually cites. An audit found the page at two paragraphs and no equation in most sections, with
 * one references row at the end of the last tab listing every id on the page, which tells a reader
 * nothing about which source supports which claim.
 *
 * The content is TRANSCRIBED from the method dossiers on disk, not recalled: the numbers below (37
 * degrees, 0.50 gradient, 446 pairs at 55.9, 4.43 m of blade excursion, 30 of 1296 cells, 19.2
 * percent refusals, 7.34 m of displacement, the 13-46 m envelope) are the measurements those
 * dossiers record against this engine.
 */
export default function Methodology() {
  const es = useShellLang() === 'es';
  const t = (en: string, s: string) => (es ? s : en);

  /** A symbol glossary under an equation. Every symbol, with its units. */
  const syms = (rows: [string, string, string][]) => (
    <ul className="measure st-syms">
      {rows.map(([tex, en, s]) => (
        <li key={tex}>
          <InlineMath tex={tex} /> {t(en, s)}
        </li>
      ))}
    </ul>
  );

  const sections = [
    {
      id: 's0',
      label: t('Terrain and trafficability', 'Terreno y transitabilidad'),
      content: (
        <>
          <p className="measure">
            {t(
              'The state is a current elevation and the ORIGINAL ground, kept separately. On any sloping site those two answers diverge immediately, and a view that draws only the surface shows a hillside as though it were a stockpile. Two fields are derived from the surface: the CREST of the working level, and TRAFFICABILITY.',
              'El estado es una elevación actual y el terreno ORIGINAL, guardados por separado. En cualquier sitio con pendiente esas dos respuestas divergen de inmediato, y una vista que dibuja solo la superficie muestra una ladera como si fuera un acopio. De la superficie se derivan dos campos: la CRESTA del nivel de trabajo y la TRANSITABILIDAD.',
            )}
          </p>
          <p className="measure">
            {t(
              'Only one of the five published stockpile fill types is a flat pad. The other four are sidehill, valley, cross-valley and ridge-crest. Measured at the equipment limit over 30 m of relief, buildable ground runs from 100 percent on the flat to 72 percent in a valley or along a ridge, before a single load is placed. Relief and difficulty are not the same thing: a sidehill with 29.6 m of relief is 100 percent buildable, because a uniform 13.6 degree slope is comfortably inside a truck limit, while a valley with almost the same relief starts with 28 percent of its ground already too steep to drive on.',
              'Solo uno de los cinco tipos publicados de relleno de acopio es una plataforma plana. Los otros cuatro son ladera, valle, valle transversal y cresta. Medido al límite del equipo sobre un relieve de 30 m, el terreno construible va de 100 por ciento en plano a 72 por ciento en un valle o sobre una cresta, antes de colocar una sola carga. Relieve y dificultad no son lo mismo: una ladera con 29,6 m de desnivel es 100 por ciento construible, porque una pendiente uniforme de 13,6 grados está cómodamente dentro del límite de un camión, mientras que un valle con casi el mismo desnivel parte con el 28 por ciento de su terreno ya demasiado empinado para conducir.',
            )}{' '}
            <Cite id="young2021" paren /> <Cite id="baffinland2017" paren />
          </p>
          <p className="measure">
            {t(
              'Standing is a CENTRAL DIFFERENCE, not a steepest-neighbour test, and that distinction quietly disabled the whole model once. Marking a cell undrivable when ANY of its eight neighbours is steep is correct for an angle-of-repose check and wrong for trafficability: on a pile at repose it condemns the entire perimeter, the entire crest and the toe of every face, because each of those cells has one steep neighbour. Measured on a clean 8 m platform with a correctly graded ramp cut into it, 30 of 1296 cells came out reachable, and the ramp cells themselves read as impassable while their along-ramp gradient was exactly at the limit, because the spoil beside them was not. With the central difference the same platform came out at 1286 of 1296.',
              'Pararse es una DIFERENCIA CENTRAL, no una prueba del vecino más empinado, y esa distinción una vez deshabilitó silenciosamente todo el modelo. Marcar una celda como no transitable cuando CUALQUIERA de sus ocho vecinos es empinado es correcto para una revisión de ángulo de reposo y errado para transitabilidad: en una pila en reposo condena todo el perímetro, toda la cresta y el pie de cada cara, porque cada una de esas celdas tiene un vecino empinado. Medido en una plataforma limpia de 8 m con una rampa correctamente graduada, resultaron alcanzables 30 de 1296 celdas, y las celdas de la rampa se leían como intransitables aunque su gradiente a lo largo estaba exactamente en el límite, porque el material a su lado no lo estaba. Con la diferencia central la misma plataforma resultó en 1286 de 1296.',
            )}
          </p>
          <p className="measure">
            {t(
              'Reaching is a separate, PER-STEP test, asked by the flood fill and by the router with the same rule so that reachable and routable cannot disagree and strand a load the mask promised was servable. A gentle shelf on the far side of a six-metre step is standable and unreachable, and only the per-step test says so. The goal cell is exempt, because a truck spots AT the crest and a crest is by definition steep on one side; requiring the discharge cell to be flat would make it impossible to ever tip over an edge, which is the entire edge-dumping campaign.',
              'Llegar es una prueba distinta, POR PASO, que hacen el llenado por inundación y el ruteador con la misma regla, para que alcanzable y ruteable no puedan discrepar y dejar varada una carga que la máscara prometió servible. Una repisa suave al otro lado de un escalón de seis metros es estable e inalcanzable, y solo la prueba por paso lo dice. La celda de destino está exenta, porque un camión se posiciona EN la cresta y una cresta es por definición empinada de un lado; exigir que la celda de descarga sea plana haría imposible descargar por un borde, que es toda la campaña de descarga de borde.',
            )}
          </p>

          <Equation
            tex="g_{\max}=\dfrac{\tan\theta_r}{1.5}\approx 0.50 \quad (27^{\circ}), \qquad \theta_r = 37^{\circ}"
            caption={t(
              'The fact the whole product rests on: fresh material stands at its angle of repose and a haul truck climbs about two thirds of that, so a truck never stands on fresh material. Everywhere it can go, it can go because the original ground was drivable or the dozer made it drivable.',
              'El hecho sobre el que descansa todo el producto: el material fresco se para en su ángulo de reposo y un camión de extracción sube unos dos tercios de eso, así que un camión nunca se para sobre material fresco. Adonde puede ir, puede ir porque el terreno original era transitable o el bulldozer lo hizo transitable.',
            )}
          />
          {syms([
            ['\\theta_r', 'angle of repose of the loose material, degrees; 37 dry, 43 wet', 'ángulo de reposo del material suelto, grados; 37 en seco, 43 húmedo'],
            ['g_{\\max}', 'maximum gradient a laden haul truck will climb, dimensionless rise over run', 'gradiente máximo que sube un camión cargado, adimensional, altura sobre distancia'],
          ])}

          <Equation
            tex="g(c)=\left\lVert\left(\dfrac{\partial z}{\partial x},\;\dfrac{\partial z}{\partial y}\right)\right\rVert \le g_{\max} \qquad\text{and}\qquad \dfrac{\lvert z_b-z_a\rvert}{\operatorname{run}(a,b)} \le g_{\max}"
            caption={t(
              'Left: can a truck STAND at cell c, the magnitude of the local surface gradient by central differences. Right: can it GET from a to b, tested per step by both the flood fill and the A-star router, where the run is the cell size for an orthogonal step and its square root of two for a diagonal.',
              'Izquierda: si un camión puede PARARSE en la celda c, la magnitud del gradiente local de la superficie por diferencias centrales. Derecha: si puede IR de a a b, evaluado por paso tanto por el llenado por inundación como por el ruteador A*, donde la distancia es el tamaño de celda para un paso ortogonal y su raíz de dos para uno diagonal.',
            )}
          />
          {syms([
            ['z', 'surface elevation, m', 'cota de superficie, m'],
            ['g(c)', 'local gradient magnitude at cell c, dimensionless', 'magnitud del gradiente local en la celda c, adimensional'],
            ['\\operatorname{run}(a,b)', 'horizontal distance between the centres of a and b, m: 2.5 orthogonal, 3.54 diagonal', 'distancia horizontal entre los centros de a y b, m: 2,5 ortogonal, 3,54 diagonal'],
          ])}

          <Callout variant="honest" title={t('Two defects a flat pad cannot reveal', 'Dos defectos que un terreno plano no puede revelar')}>
            {t(
              'Building on a sidehill exposed both. The dozer selected material by ELEVATION, which is right on a flat pad and catastrophic on a slope: on a hillside the high ground IS the hill, and the blade drove a cell 4.43 m below original ground. And the relaxation treated elevation as free-floating and eroded bedrock. Only placed material can move now, and the original ground is a floor for every operation. The limit itself is one number for one machine class: real trafficability depends on the surface, the weather, the tyre and the load, and a laden truck climbing differs from an empty one descending. The model uses one limit in both directions, and there is no traffic at all, so trucks never queue, pass or wait.',
              'Construir en ladera expuso ambos. El bulldozer elegía material por COTA, lo cual es correcto en plano y catastrófico en pendiente: en una ladera el terreno alto ES el cerro, y la hoja llevó una celda 4,43 m bajo el terreno original. Y la relajación trataba la cota como libre y erosionaba la roca in situ. Ahora solo el material colocado puede moverse, y el terreno original es un piso para toda operación. El límite mismo es un número para una clase de máquina: la transitabilidad real depende de la superficie, el clima, el neumático y la carga, y un camión cargado subiendo difiere de uno vacío bajando. El modelo usa un límite en ambos sentidos, y no hay tráfico alguno, así que los camiones nunca hacen cola, se adelantan ni esperan.',
            )}
          </Callout>

          <FigTrafficability t={t} />
          <Refs ids={['young2021', 'baffinland2017']} label="Refs" />
        </>
      ),
    },
    {
      id: 's1',
      label: t('The dump plan', 'El plan de descarga'),
      content: (
        <>
          <p className="measure">
            {t(
              'Where every load is supposed to go, before any load goes anywhere. A yard is divided into rectangular AREAS, one per declared material class. Each area is divided into BENCHES with a designed top elevation and a designed volume. Each bench is filled by repeated LIFTS, and each lift is a set of ordered TIP POSITIONS. Each area reserves an ACCESS corridor with a width and an entrance. The plan is what makes the rest of the product honest: a truck that arrives at an arbitrary point on an arbitrary part of the pad is not a stockpile operation, it is a particle emitter.',
              'Dónde se supone que va cada carga, antes de que ninguna vaya a ninguna parte. Un patio se divide en ÁREAS rectangulares, una por clase de material declarada. Cada área se divide en BANCOS con una cota superior y un volumen de diseño. Cada banco se llena por CAPAS repetidas, y cada capa es un conjunto ordenado de POSICIONES DE DESCARGA. Cada área reserva un corredor de ACCESO con un ancho y una entrada. El plan es lo que hace honesto al resto del producto: un camión que llega a un punto arbitrario de una parte arbitraria de la plataforma no es una operación de acopio, es un emisor de partículas.',
            )}
          </p>
          <p className="measure">
            {t(
              'A bench is filled in LIFTS, and that is the correction that mattered most. A dump is of the order of a metre thick and a bench is tens of metres tall, so covering the area once gets nowhere near the designed volume. The first version emitted exactly one paddock lattice and one set of edge sweeps per bench and then declared the programme complete: on the reference scenario that was 332 tips against a design of 1360, so 228 of 560 offered loads were refused with the area reported as built out while the pile stood at 10.8 m of a designed 36. The area is now covered repeatedly, each pass laid on the one below, until the designed volume is met, and the ring phase of each lift is rotated so successive lifts do not drop every load on the seam left by the one beneath.',
              'Un banco se llena en CAPAS, y esa es la corrección que más importó. Una descarga tiene del orden de un metro de espesor y un banco decenas de metros de alto, así que cubrir el área una vez no se acerca al volumen de diseño. La primera versión emitía exactamente una retícula de playa y un conjunto de barridos de borde por banco y declaraba el programa completo: en el escenario de referencia eso fueron 332 descargas contra un diseño de 1360, así que 228 de 560 cargas ofrecidas se rechazaron con el área reportada como terminada mientras la pila estaba a 10,8 m de un diseño de 36. Ahora el área se cubre repetidamente, cada pasada sobre la anterior, hasta alcanzar el volumen de diseño, y la fase de anillo de cada capa se rota para que capas sucesivas no dejen cada carga sobre la junta de la de abajo.',
            )}
          </p>
          <p className="measure">
            {t(
              'Paddock rows work AWAY FROM THE ACCESS: the rows furthest from the entrance are filled first, so the truck never crosses material it has already placed. Filling the near rows first walls the machine out of its own dump area, and that was the measured cause of a large block of refusals. Within a row the order is serpentine, because the truck that finishes a row is at its far end and the next row starts from there. That also matters physically: consecutive loads come from consecutive trucks and therefore from nearby material in the pit, so the serpentine order is what puts correlated grades next to each other rather than scattering them. Edge sweeps seed at the far corner, so the crest advances back toward the way out, which is also how a tip head is actually worked.',
              'Las filas de playa se trabajan ALEJÁNDOSE DEL ACCESO: las filas más lejanas a la entrada se llenan primero, para que el camión nunca cruce material que ya colocó. Llenar primero las filas cercanas deja a la máquina fuera de su propia área de descarga, y esa fue la causa medida de un bloque grande de rechazos. Dentro de una fila el orden es serpenteante, porque el camión que termina una fila está en su extremo lejano y la siguiente parte de ahí. Eso también importa físicamente: las cargas consecutivas vienen de camiones consecutivos y por lo tanto de material cercano en el rajo, así que el orden serpenteante es lo que pone leyes correlacionadas una al lado de otra en vez de dispersarlas. Los barridos de borde se siembran en la esquina lejana, para que la cresta avance de vuelta hacia la salida, que es también como se trabaja realmente una cabeza de descarga.',
            )}
          </p>
          <p className="measure">
            {t(
              'The dozer cadence follows published practice: material is dozed up the pile after two rows. And the berm HAS GAPS. A continuous berm along every crest cell is not a berm, it is a wall: measured, refusals went UP the more the dozer ran, 62 percent at one pass per 10 loads against 33 percent at one per 40, because every pass raised a longer wall. With gaps, refusals fall to 19.2 percent.',
              'La cadencia del bulldozer sigue la práctica publicada: se empuja el material pila arriba después de dos filas. Y la berma TIENE HUECOS. Una berma continua sobre cada celda de cresta no es una berma, es un muro: medido, los rechazos SUBÍAN cuanto más corría el bulldozer, 62 por ciento con una pasada cada 10 cargas contra 33 por ciento cada 40, porque cada pasada levantaba un muro más largo. Con huecos, los rechazos caen a 19,2 por ciento.',
            )}{' '}
            <Cite id="moraga2017" paren /> <Cite id="baffinland2017" paren />
          </p>

          <Equation
            tex="V_{\text{bench}} = W L H u, \qquad n_{\text{tips}} = \operatorname{round}\!\left(\dfrac{V_{\text{bench}}}{V_{\text{load}}}\right)"
            caption={t(
              'A bench is not a box: its sides stand at the angle of repose, so the solid is a frustum and it holds well under the prismatic volume. The utilisation is a blunt but honest constant and a parameter rather than a literal, because the true figure depends on the repose angle and the bench aspect ratio, which the design layer deliberately does not know about.',
              'Un banco no es una caja: sus lados se paran en el ángulo de reposo, así que el sólido es un tronco de pirámide y contiene bastante menos que el volumen prismático. La utilización es una constante burda pero honesta y es un parámetro y no un literal, porque la cifra verdadera depende del ángulo de reposo y de la relación de aspecto del banco, que la capa de diseño deliberadamente no conoce.',
            )}
          />
          {syms([
            ['W, L, H', 'bench width, length and height, m', 'ancho, largo y alto del banco, m'],
            ['u', 'swell utilisation, dimensionless, default 0.55', 'utilización por esponjamiento, adimensional, por defecto 0,55'],
            ['V_{\\text{load}}', 'loose volume of one truck load, m3', 'volumen suelto de una carga de camión, m3'],
          ])}

          <Equation
            tex="d_{\text{inset}} = \dfrac{h_{\text{lift}}}{\tan\theta_r}, \qquad h_{\text{lift}} = 1.5\ \text{m}"
            caption={t(
              'Each lift is laid on a footprint inset from the one below by the run its own face needs at the angle of repose. Without the inset, successive lifts stack vertically and the relaxation has to demolish each one as it is placed.',
              'Cada capa se coloca sobre una huella retranqueada respecto de la de abajo por la distancia que su propia cara necesita en el ángulo de reposo. Sin el retranqueo, las capas sucesivas se apilan verticalmente y la relajación tiene que demoler cada una a medida que se coloca.',
            )}
          />
          {syms([
            ['h_{\\text{lift}}', 'lift thickness, m', 'espesor de capa, m'],
            ['d_{\\text{inset}}', 'horizontal inset of the next lift footprint, m', 'retranqueo horizontal de la huella de la capa siguiente, m'],
          ])}

          <Callout variant="honest" title={t('The plan is generated once and the pile grows away from it', 'El plan se genera una vez y la pila crece alejándose de él')}>
            {t(
              'A real operation re-plans. This one does not, and the refusal rate is reported rather than hidden for exactly that reason: it is the honest measure of a plan laid out once against a pile that moves. The 19.2 percent figure is a property of the plan, not a bug in the router.',
              'Una operación real replanifica. Esta no, y la tasa de rechazo se reporta en vez de ocultarse exactamente por eso: es la medida honesta de un plan trazado una vez contra una pila que se mueve. El 19,2 por ciento es una propiedad del plan, no un error del ruteador.',
            )}
          </Callout>

          <FigPlan t={t} />
          <Refs ids={['moraga2017', 'baffinland2017', 'young2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's2',
      label: t('Trucks, routes and spotting', 'Camiones, rutas y posicionamiento'),
      content: (
        <>
          <p className="measure">
            {t(
              'A truck is an entity with a position, a heading, a cycle state, a payload with its source dig block, and the two polylines the product must be able to draw: the approach and the departure. Routes are solved by A-star over the trafficable surface using true travel distance, so a diagonal step costs the square root of two rather than one.',
              'Un camión es una entidad con posición, rumbo, estado de ciclo, carga con su bloque de origen, y las dos polilíneas que el producto debe poder dibujar: la aproximación y la salida. Las rutas se resuelven con A* sobre la superficie transitable usando distancia real de viaje, de modo que un paso diagonal cuesta raíz de dos y no uno.',
            )}
          </p>
          <p className="measure">
            {t(
              'Reachability is answered by a flood fill rather than by repeated routing, and that is a measured decision rather than an aesthetic one. Choosing where a truck can spot means asking whether many candidate positions are reachable, and answering that with one A-star solve per candidate is quadratic: it was measured taking a build from 40 seconds to over 500. One flood fill answers it for every cell on the pad at once, after which a single A-star produces the path that is actually drawn.',
              'La alcanzabilidad se responde con un llenado por inundación y no con ruteos repetidos, y esa es una decisión medida y no estética. Elegir dónde puede posicionarse un camión significa preguntar si muchas posiciones candidatas son alcanzables, y responder eso con un A* por candidato es cuadrático: se midió llevando una construcción de 40 segundos a más de 500. Un llenado responde por todas las celdas de la plataforma a la vez, tras lo cual un solo A* produce la ruta que efectivamente se dibuja.',
            )}
          </p>
          <p className="measure">
            {t(
              'SPOTTING is where the physics enters. It resolves the discharge heading, and the terrain wins over the plan: when a crest is in range the heading is taken from the face normal, because the deposit runs perpendicular to the tangent of the dump location and the plan was written before the face moved. With no face the load lands BEHIND the truck, since a rear-dump reverses into position, lifts its tray and lets the material run out over the tail.',
              'El POSICIONAMIENTO es donde entra la física. Resuelve el rumbo de descarga, y el terreno le gana al plan: cuando hay cresta cerca, el rumbo se toma de la normal de la cara, porque el depósito corre perpendicular a la tangente del punto de descarga y el plan se escribió antes de que la cara se moviera. Sin cara, la carga cae DETRÁS del camión, porque un camión de descarga trasera retrocede para posicionarse, levanta la tolva y deja correr el material por la cola.',
            )}{' '}
            <Cite id="young2021" paren />
          </p>
          <p className="measure">
            {t(
              'The alternative spot has to be inside the dump area, and without that constraint the offset is a licence to tip in the haul road. Measured on the reference scenario before the constraint existed: 284 of 402 placed loads landed outside their own area, the road silted up, the loading point was buried under material nobody planned to put there, and from that moment the flood fill returned nothing reachable anywhere on the pad and every remaining load was refused.',
              'El punto alternativo debe estar dentro del área de descarga, y sin esa restricción el desplazamiento es una licencia para descargar en el camino. Medido en el escenario de referencia antes de que la restricción existiera: 284 de 402 cargas colocadas cayeron fuera de su propia área, el camino se colmató, el punto de carguío quedó sepultado bajo material que nadie planificó poner ahí, y desde ese momento el llenado no devolvió nada alcanzable en toda la plataforma y todas las cargas restantes fueron rechazadas.',
            )}
          </p>

          <Equation
            tex="f(n) = g(n) + h(n), \qquad g(n)=\sum_{i} \operatorname{run}(c_{i-1},c_i), \qquad h(n)=\lVert n - \text{goal}\rVert_2"
            caption={t(
              'The A-star cost over the trafficable mask. The step cost is true travel distance, so a diagonal costs 3.54 m against an orthogonal 2.5, and the heuristic is straight-line distance, which is admissible because no step is ever cheaper than the straight line it covers.',
              'El costo A* sobre la máscara transitable. El costo por paso es distancia real de viaje, así que una diagonal cuesta 3,54 m contra 2,5 de una ortogonal, y la heurística es la distancia en línea recta, que es admisible porque ningún paso cuesta menos que la recta que cubre.',
            )}
          />
          {syms([
            ['g(n)', 'accumulated travel distance from the loading point to n, m', 'distancia de viaje acumulada desde el punto de carguío hasta n, m'],
            ['h(n)', 'straight-line distance from n to the goal, m; admissible, so the solve is optimal', 'distancia en línea recta de n al destino, m; admisible, así que la solución es óptima'],
          ])}

          <Equation
            tex="\delta = \lVert p_{\text{actual}} - p_{\text{planned}} \rVert_2"
            caption={t(
              'The spotting offset, recorded on every load. A planned tip often cannot be occupied; the operator spots at the nearest workable point, which is exactly what happens on site, and the deviation is the planned-against-actual dump location comparison a fleet-management export supports. Measured on the reference case: 101 of 158 loads land exactly as planned, mean deviation 4.2 m.',
              'El desplazamiento de posicionamiento, registrado en cada carga. Un punto planificado a menudo no se puede ocupar; el operador se posiciona en el punto transitable más cercano, que es exactamente lo que ocurre en terreno, y la desviación es la comparación entre ubicación planificada y real que permite un export de despacho. Medido en el caso de referencia: 101 de 158 cargas caen exactamente donde se planificaron, con desviación media de 4,2 m.',
            )}
          />
          {syms([
            ['p_{\\text{planned}}', 'the tip position the plan asked for, pad metres', 'la posición de descarga que pidió el plan, metros de plataforma'],
            ['p_{\\text{actual}}', 'where the truck could actually stand, pad metres', 'donde el camión realmente pudo pararse, metros de plataforma'],
            ['\\delta', 'the recorded deviation, m; reported, never smoothed away', 'la desviación registrada, m; se reporta, nunca se suaviza'],
          ])}

          <Callout variant="note" title={t('Refusal is a result, not an error', 'El rechazo es un resultado, no un error')}>
            {t(
              'A tip that cannot be reached is refused and recorded with a reason. Refusals are the honest measure of a plan laid out once against a pile that grows away from it, and they are reported in the manifest, in the app and on this page rather than being smoothed away. There is no traffic model: trucks do not queue, pass or wait for each other, and the fleet exists only so that consecutive loads carry different truck identities. Cycle time is not modelled at all.',
              'Una descarga que no se puede alcanzar se rechaza y se registra con una razón. Los rechazos son la medida honesta de un plan trazado una vez contra una pila que crece alejándose, y se reportan en el manifiesto, en la app y en esta página en vez de suavizarse. No hay modelo de tráfico: los camiones no hacen cola, no se adelantan ni se esperan, y la flota existe solo para que cargas consecutivas lleven identidades de camión distintas. El tiempo de ciclo no se modela en absoluto.',
            )}
          </Callout>

          <FigRouting t={t} />
          <Refs ids={['young2021', 'baffinland2017']} label="Refs" />
        </>
      ),
    },
    {
      id: 's3',
      label: t('The dump geometry, calibrated', 'La geometría de descarga, calibrada'),
      content: (
        <>
          <p className="measure">
            {t(
              'Two regimes, because the source describes two. A paddock heap on flat ground takes the form of an elliptical frustum sized by the truck itself, emplaced at roughly a 2:1 slope which settles to the natural angle of repose over time. An edge dump cascades down the face, and which of four measured profiles it forms is decided by DISTANCE TO THE LIVE CREST, measured on the terrain at the moment the truck arrives, not by the label the plan attached to the tip.',
              'Dos regímenes, porque la fuente describe dos. Un montón de playa sobre terreno plano toma la forma de un tronco elíptico dimensionado por el propio camión, colocado con una pendiente cercana a 2:1 que se asienta hasta el ángulo de reposo natural con el tiempo. Un volcado de borde cae en cascada por la cara, y cuál de cuatro perfiles medidos forma lo decide la DISTANCIA A LA CRESTA VIVA, medida sobre el terreno en el momento en que llega el camión, no la etiqueta que el plan puso en la descarga.',
            )}{' '}
            <Cite id="young2021" paren />
          </p>
          <p className="measure">
            {t(
              'The edge operator is calibrated against 28 dumps surveyed by UAV photogrammetry rather than assumed. Width is fitted to the MEASURED width per type rather than to the truck, because material spreads as it descends: the measurements give 11 to 23 m against a 7.3 m tray, and the source explains the widest type as additional face material aggregating with the dump mass as it cascades. Using the bed width produced dumps a third of the measured width and a crest that advanced far too slowly for the volume being placed.',
              'El operador de borde se calibra contra 28 descargas levantadas por fotogrametría con UAV, no se supone. El ancho se ajusta al ancho MEDIDO por tipo y no al del camión, porque el material se expande al descender: las mediciones dan 11 a 23 m contra una tolva de 7,3 m, y la fuente explica el tipo más ancho como material adicional de la cara que se agrega a la masa mientras cae. Usar el ancho de tolva producía descargas de un tercio del ancho medido y una cresta que avanzaba demasiado lento para el volumen colocado.',
            )}{' '}
            <Cite id="young2022" paren /> <Cite id="young2021b" paren />
          </p>
          <p className="measure">
            {t(
              'A dump is placed as a mass distribution over cells rather than as a solid, and the placement records the fractional position along the run-out for every cell it touches. That return value is what couples this method to the segregation solver: the solver marches along the same coordinate this operator wrote, so the two are coupled through a value rather than through a shared assumption. Every edge dump runs perpendicular to the crest tangent, taken from the terrain, because a dump that ran along the crest instead of over it would not cascade at all and the direction of every deposit would look arbitrary rather than determined.',
              'Una descarga se coloca como una distribución de masa sobre celdas y no como un sólido, y la colocación registra la posición fraccional a lo largo del recorrido para cada celda que toca. Ese valor de retorno es lo que acopla este método con el solucionador de segregación: el solucionador marcha sobre la misma coordenada que escribió este operador, así que ambos se acoplan por un valor y no por un supuesto compartido. Cada descarga de borde corre perpendicular a la tangente de la cresta, tomada del terreno, porque una descarga que corriera a lo largo de la cresta en vez de sobre ella no cascadearía, y la dirección de cada depósito parecería arbitraria en vez de determinada.',
            )}
          </p>
          <p className="measure">
            {t(
              'Among the three at-crest types the source is explicit that position alone does not determine which forms, and that its own hypothesis about uneven tray loading was never tested, so the choice is drawn from their measured frequencies with a fixed seed. The frequencies are real; the selection is admittedly stochastic, and the page says so rather than presenting a coin flip as a mechanism.',
              'Entre los tres tipos de cresta la fuente es explícita en que la posición sola no determina cuál se forma, y en que su propia hipótesis sobre carga despareja de la tolva nunca se probó, así que la elección se toma de sus frecuencias medidas con una semilla fija. Las frecuencias son reales; la selección es reconocidamente estocástica, y la página lo dice en vez de presentar un lanzamiento de moneda como un mecanismo.',
            )}{' '}
            <Cite id="young2022" paren />
          </p>

          <Equation
            tex="m(s,w) = A(s)\, B(w), \qquad s\in[0,1], \qquad \sum_{\text{cells}} m = V_{\text{load}}"
            caption={t(
              'A load as a separable mass distribution: one shape function along the run-out and one across it, normalised so the placed volume is exactly the load volume. For a sloughed heap the mass is biased downslope by a slough extent of 0.85, which is what makes the toe of a cascading dump reach further than its crest.',
              'Una carga como una distribución de masa separable: una función de forma a lo largo del recorrido y otra a lo ancho, normalizada para que el volumen colocado sea exactamente el de la carga. Para un montón desmoronado la masa se sesga ladera abajo con una extensión de arrastre de 0,85, que es lo que hace que el pie de una descarga en cascada llegue más lejos que su cresta.',
            )}
          />
          {syms([
            ['s', 'fractional position along the run-out, from the tray to the far end, dimensionless', 'posición fraccional a lo largo del recorrido, de la tolva al extremo lejano, adimensional'],
            ['w', 'offset across the run-out, m', 'desplazamiento transversal al recorrido, m'],
            ['A, B', 'the along and across shape functions, m3 per m', 'las funciones de forma longitudinal y transversal, m3 por m'],
          ])}

          <Equation
            tex="V_{\text{frustum}} = \dfrac{H}{6}\left(A_{\text{base}} + 4A_{\text{mid}} + A_{\text{top}}\right)"
            caption={t(
              'The designed volume of a bench by the prismatoid rule, which is exact for a frustum. This replaced a blunt swell factor: the sides of a bench stand at the angle of repose, so the solid is a frustum and the prismatic volume overstates it by a margin that depends on the aspect ratio.',
              'El volumen de diseño de un banco por la regla del prismatoide, que es exacta para un tronco. Esto reemplazó un factor de esponjamiento burdo: los lados de un banco se paran en el ángulo de reposo, así que el sólido es un tronco y el volumen prismático lo sobrestima por un margen que depende de la relación de aspecto.',
            )}
          />
          {syms([
            ['A_{\\text{base}}, A_{\\text{mid}}, A_{\\text{top}}', 'cross-sectional areas at the base, mid-height and top, m2', 'áreas de sección en la base, media altura y techo, m2'],
            ['H', 'bench height, m', 'altura del banco, m'],
          ])}

          <Callout variant="honest" title={t('Fitted to the published TABLE, not to the surfaces', 'Ajustado a la TABLA publicada, no a las superficies')}>
            {t(
              'The surveyed CAD surfaces behind those measurements are published and are cited, and the profile functions were calibrated against the tabulated envelope rather than against the point clouds. Fitting to the surfaces directly would be a stronger calibration and it has not been done: a stated gap, not one discovered later. All twenty-eight surveyed dumps also came from one class of machine, so whether the geometry scales to a different truck is untested.',
              'Las superficies CAD levantadas tras esas mediciones están publicadas y se citan, y las funciones de perfil se calibraron contra la envolvente tabulada y no contra las nubes de puntos. Ajustar directamente a las superficies sería una calibración más fuerte y no se ha hecho: una brecha declarada, no descubierta después. Las veintiocho descargas levantadas vinieron además de una sola clase de máquina, así que si la geometría escala a otro camión está sin probar.',
            )}
          </Callout>

          <FigProfiles t={t} />
          <Refs ids={['young2021', 'young2022', 'young2021b']} label="Refs" />
        </>
      ),
    },
    {
      id: 's4',
      label: t('Relaxation to the angle of repose', 'Relajación al ángulo de reposo'),
      content: (
        <>
          <p className="measure">
            {t(
              'The toppling rule is the Bak, Tang and Wiesenfeld sandpile automaton, used here purely as a mass-conserving relaxation solver. Their model describes the STATISTICS of avalanche sizes under self-organized criticality, in which the critical slope is a free parameter and the interesting result is a power law. None of that is claimed. Here the critical slope is IMPOSED as the material angle of repose, taken from published handbook ranges, and avalanche statistics are out of scope.',
              'La regla de derrumbe es el autómata de arena de Bak, Tang y Wiesenfeld, usado aquí solo como solucionador de relajación conservativo. Su modelo describe las ESTADÍSTICAS de tamaños de avalancha bajo criticalidad autoorganizada, donde la pendiente crítica es un parámetro libre y el resultado interesante es una ley de potencias. Nada de eso se afirma. Aquí la pendiente crítica se IMPONE como el ángulo de reposo del material, tomado de rangos de manual publicados, y las estadísticas de avalancha quedan fuera de alcance.',
            )}{' '}
            <Cite id="bak1987" paren /> <Cite id="wartsila2024" paren />
          </p>
          <p className="measure">
            {t(
              'A cell topples exactly to its repose surface in one step. Giving away a total split over its over-steep neighbours satisfies every constraint simultaneously and overshoots none. The admissible drop scales with the horizontal distance between cell centres, because repose is a SLOPE: using one drop for both the orthogonal and the diagonal neighbours is the mistake that makes a relaxed cone come out square.',
              'Una celda se derrumba exactamente hasta su superficie de reposo en un paso. Entregar un total repartido sobre sus vecinos demasiado empinados satisface todas las restricciones a la vez y no sobrepasa ninguna. La caída admisible escala con la distancia horizontal entre centros de celda, porque el reposo es una PENDIENTE: usar una sola caída para vecinos ortogonales y diagonales es el error que hace que un cono relajado salga cuadrado.',
            )}
          </p>
          <p className="measure">
            {t(
              'The ordering matters and is not an implementation detail. The highest unstable cell topples first, so the returned transfers come out in downslope order, and that order IS the avalanche path the segregation solver marches along. The relaxation, the segregation and the lot ledger are coupled through this function return value rather than through three separate assumptions about what an avalanche does.',
              'El orden importa y no es un detalle de implementación. La celda inestable más alta se derrumba primero, así que las transferencias devueltas salen en orden ladera abajo, y ese orden ES el camino de avalancha que recorre el solucionador de segregación. La relajación, la segregación y el registro de lotes se acoplan por el valor de retorno de esta función y no por tres supuestos separados sobre lo que hace una avalancha.',
            )}
          </p>
          <p className="measure">
            {t(
              'Four invariants are enforced by the test suite rather than asserted in prose: mass is conserved to machine precision, because every transfer subtracts and adds the same float; after convergence no local slope exceeds the imposed repose angle beyond a nanometre; a steeper material builds a measurably taller cone from the same spike; and the first transfer of a cascade leaves the apex. The last one is the negative control that catches a solver relaxing from the wrong end.',
              'Cuatro invariantes los hace cumplir la suite de pruebas y no la prosa: la masa se conserva a precisión de máquina, porque cada transferencia resta y suma el mismo flotante; tras converger ninguna pendiente local supera el ángulo de reposo impuesto más allá de un nanómetro; un material más empinado construye un cono medible más alto desde el mismo pico; y la primera transferencia de una cascada sale del ápice. La última es el control negativo que atrapa a un solucionador que relaja desde el extremo equivocado.',
            )}
          </p>

          <Equation
            tex="T=\sum_k \max\!\left(0,\; d_k-T\right) \;\Longrightarrow\; T=\frac{1}{k+1}\sum_{i=1}^{k} d_i, \qquad t_k=\max(0,\,d_k-T)"
            caption={t(
              'The water-filling equation that resolves a topple in one step, and the share each over-steep neighbour receives. Solved over the k largest excesses, it is the unique split that satisfies every repose constraint at once without overshooting any of them.',
              'La ecuación de llenado que resuelve un derrumbe en un paso, y la parte que recibe cada vecino demasiado empinado. Resuelta sobre los k mayores excesos, es el único reparto que satisface todas las restricciones de reposo a la vez sin sobrepasar ninguna.',
            )}
          />
          {syms([
            ['T', 'total height the cell gives away in one topple, m', 'altura total que la celda entrega en un derrumbe, m'],
            ['d_k', 'height excess of neighbour k over its repose constraint, m', 'exceso de altura del vecino k sobre su restricción de reposo, m'],
            ['t_k', 'height transferred to neighbour k, m', 'altura transferida al vecino k, m'],
            ['k', 'number of over-steep neighbours, counted largest excess first', 'número de vecinos demasiado empinados, contados de mayor exceso primero'],
          ])}

          <Equation
            tex="D_{\perp} = \Delta x \tan\theta_r, \qquad D_{\diagup} = \sqrt{2}\,\Delta x \tan\theta_r, \qquad d_k = h_c - h_k - D_k"
            caption={t(
              'The admissible drop to an orthogonal and to a diagonal neighbour. At 2.5 m cells and 37 degrees these are 1.88 m and 2.66 m; using the orthogonal figure for both is what makes a relaxed cone come out with square corners.',
              'La caída admisible hacia un vecino ortogonal y hacia uno diagonal. Con celdas de 2,5 m y 37 grados son 1,88 m y 2,66 m; usar la ortogonal para ambos es lo que hace que un cono relajado salga con esquinas cuadradas.',
            )}
          />
          {syms([
            ['\\Delta x', 'cell size, m; 2.5 throughout the shipped matrix', 'tamaño de celda, m; 2,5 en toda la matriz publicada'],
            ['h_c, h_k', 'surface heights of the toppling cell and of neighbour k, m', 'alturas de superficie de la celda que se derrumba y del vecino k, m'],
            ['D_{\\perp}, D_{\\diagup}', 'admissible drops, orthogonal and diagonal, m', 'caídas admisibles, ortogonal y diagonal, m'],
          ])}

          <Callout variant="honest" title={t('The defect that rendered as spikes', 'El defecto que se veía como picos')}>
            {t(
              'When a cell topples it GETS LOWER, which destabilises the cells ABOVE it. The previous solver only re-queued the cells that received material, so with a highest-first queue an uphill neighbour was checked once, came out stable, and was never looked at again after this cell dropped below it. Measured result: 446 cell pairs standing at up to 55.9 degrees against an imposed 37. Now zero, on every one of the twenty-two bakes, and the invariant is ASSERTED rather than hoped for. What the solver still cannot do: cohesive or wet material can hold local slopes above the dry repose angle, self-weight compaction and particle degradation from re-handling are not modelled, and the pad edge is a wall, so a pile that reaches the boundary is flagged rather than losing tonnes over it.',
              'Cuando una celda se derrumba QUEDA MÁS BAJA, lo que desestabiliza a las celdas de ARRIBA. El solucionador anterior solo volvía a encolar a las que recibían material, así que con una cola de mayor-primero un vecino cuesta arriba se revisaba una vez, salía estable y nunca se volvía a mirar después de que esta celda cayera por debajo. Resultado medido: 446 pares de celdas paradas hasta 55,9 grados contra 37 impuestos. Ahora cero, en cada uno de los veintidós horneados, y el invariante se ASEVERA en vez de esperarse. Lo que el solucionador aún no puede hacer: material cohesivo o húmedo puede sostener pendientes locales sobre el reposo seco, la compactación por peso propio y la degradación por remanejo no se modelan, y el borde de la plataforma es un muro, así que una pila que llega al límite se marca en vez de perder toneladas por el borde.',
            )}
          </Callout>

          <FigRelaxation t={t} />
          <Refs ids={['bak1987', 'wartsila2024']} label="Refs" />
        </>
      ),
    },
    {
      id: 's5',
      label: t('Size segregation down the face', 'Segregación por tamaño en la cara'),
      content: (
        <>
          <p className="measure">
            {t(
              'The mechanism is kinetic sieving, identified by Savage and Lun: as granular material shears, small particles preferentially fall into the void space opening beneath them and lever the large ones upward. Gray and Thornton formulated it as a binary mixture theory, and that formulation is what runs here. The engine carried the solver and never applied it in the previous product, because nothing ever formed a face for an avalanche to run down.',
              'El mecanismo es el tamizado cinético, identificado por Savage y Lun: al cortarse el material granular, las partículas pequeñas caen preferentemente en el espacio que se abre bajo ellas y empujan hacia arriba a las grandes. Gray y Thornton lo formularon como una teoría de mezcla binaria, y esa formulación es la que corre aquí. El motor llevaba el solucionador y nunca lo aplicaba en el producto anterior, porque nada formaba una cara por la que una avalancha pudiera correr.',
            )}{' '}
            <Cite id="savage1988" paren /> <Cite id="gray2005" paren />
          </p>
          <p className="measure">
            {t(
              'On a pile flank the avalanche is a shallow layer of roughly uniform thickness flowing over a static bed. Taking plug flow and marching in the downslope coordinate reduces the full three-dimensional balance to a one-dimensional scalar conservation law in depth, with zero flux at the free surface and at the base. The flux is convex, so a Godunov flux is exact for the Riemann problem at every interface and the concentration SHOCKS the theory identifies as the observed feature survive rather than being smeared by an averaged scheme. The characteristic speed is bounded, so the march is sub-stepped under a CFL condition with 32 depth cells.',
              'En el flanco de una pila la avalancha es una capa somera de espesor casi uniforme que fluye sobre un lecho estático. Tomando flujo pistón y marchando en la coordenada ladera abajo, el balance tridimensional completo se reduce a una ley de conservación escalar unidimensional en profundidad, con flujo nulo en la superficie libre y en la base. El flujo es convexo, así que un flujo de Godunov es exacto para el problema de Riemann en cada interfaz y los CHOQUES de concentración que la teoría identifica como el rasgo observado sobreviven en vez de difuminarse con un esquema promediado. La velocidad característica está acotada, así que la marcha se subdivide bajo una condición CFL con 32 celdas en profundidad.',
            )}
          </p>
          <p className="measure">
            {t(
              'The coupling to the ledger is a SHIFT, not an absolute composition, and getting that wrong was caught by a negative control. Fines drain to the BASE of the flowing layer, material that stops on the flank is drawn from that base and material that keeps travelling is drawn from the top, so the toe, fed by what travelled furthest, ends up coarse. Coarse-at-the-toe is an OUTPUT of the model, not a rule in the code. An early version wrote the composition the solver returned directly onto the lots being moved, which stamps the current truck size split onto older material an avalanche merely dislodged. What is applied is the shift away from the layer own mean: the two shifts cancel by construction, species mass is conserved, and at zero segregation number no lot is touched at all.',
              'El acoplamiento con el registro es un DESPLAZAMIENTO, no una composición absoluta, y equivocarse en eso lo atrapó un control negativo. Los finos drenan a la BASE de la capa fluyente, el material que se detiene en el flanco se toma de esa base y el que sigue viajando se toma de arriba, así que el pie, alimentado por lo que viajó más lejos, termina grueso. Grueso en el pie es una SALIDA del modelo, no una regla en el código. Una versión temprana escribía la composición que devolvía el solucionador directamente sobre los lotes movidos, lo que estampa la granulometría del camión actual sobre material más viejo que la avalancha solo desprendió. Lo que se aplica es el desplazamiento respecto de la media de la propia capa: los dos desplazamientos se cancelan por construcción, la masa de cada especie se conserva, y con número de segregación cero ningún lote se toca.',
            )}
          </p>
          <p className="measure">
            {t(
              'The magnitude is modest and that is the theory working, not the model being weak. Measured on the strong-sieving case, the toe-minus-apex coarse-fraction delta runs -0.010 at zero, +0.037 at 0.5, +0.067 at 1.0, and saturates near +0.09. The sign flips as soon as the solver is on and then the magnitude stops growing, which is exactly what the theory predicts: a layer segregates COMPLETELY within a downslope distance of order one over the segregation number, so once one avalanche is enough, raising it has nothing left to separate. Segregation on a pile is a flank effect, not a bulk one, because most of a load stays where it lands. Published guidance limits conical stockpiles to 10 to 12 m because each additional metre increases percolation segregation, so on a shorter pile a low intensity is the correct answer.',
              'La magnitud es modesta y eso es la teoría funcionando, no el modelo siendo débil. Medido en el caso de tamizado fuerte, la diferencia de fracción gruesa pie menos ápice va de -0,010 en cero, a +0,037 en 0,5 y +0,067 en 1,0, y satura cerca de +0,09. El signo se invierte apenas se enciende el solucionador y luego la magnitud deja de crecer, que es exactamente lo que predice la teoría: una capa segrega COMPLETAMENTE dentro de una distancia ladera abajo del orden de uno sobre el número de segregación, así que una vez que basta una avalancha, subirlo no deja nada por separar. La segregación en una pila es un efecto de flanco y no de volumen, porque la mayor parte de una carga queda donde cae. La guía publicada limita las pilas cónicas a 10 a 12 m porque cada metro adicional aumenta la segregación por percolación, así que en una pila más baja una intensidad baja es la respuesta correcta.',
            )}
          </p>

          <Equation
            tex="\dfrac{\partial \phi}{\partial x} + \dfrac{\partial F}{\partial z} = 0, \qquad F(\phi) = -S_r\,\phi\,(1-\phi)"
            caption={t(
              'The reduced one-dimensional conservation law solved down each avalanche path, from the Gray and Thornton binary mixture theory. The flux is convex, which is why a Godunov scheme is exact here and preserves the concentration shocks the theory calls the observed feature.',
              'La ley de conservación unidimensional reducida que se resuelve por cada camino de avalancha, desde la teoría de mezcla binaria de Gray y Thornton. El flujo es convexo, y por eso un esquema de Godunov es exacto aquí y preserva los choques de concentración que la teoría llama el rasgo observado.',
            )}
          />
          {syms([
            ['\\phi', 'volume fraction of the SMALL species, dimensionless, between 0 and 1', 'fracción volumétrica de la especie PEQUEÑA, adimensional, entre 0 y 1'],
            ['x', 'downslope coordinate along the avalanche path, dimensionless', 'coordenada ladera abajo a lo largo del camino de avalancha, adimensional'],
            ['z', 'depth through the flowing layer, dimensionless, 32 cells', 'profundidad a través de la capa fluyente, adimensional, 32 celdas'],
            ['S_r', 'the segregation number; zero means no sorting and no lot is touched', 'el número de segregación; cero significa sin clasificación y ningún lote tocado'],
          ])}

          <Equation
            tex="q = \dfrac{B}{c}\,g\cos\zeta, \qquad S_r = \dfrac{qL}{HU}"
            caption={t(
              'The mean segregation velocity and the dimensionless number that scales it, in the source own numbering. The segregation number is what says how far down a face a layer has to travel before it has separated completely.',
              'La velocidad media de segregación y el número adimensional que la escala, en la numeración de la propia fuente. El número de segregación es el que dice cuánto debe viajar una capa por una cara antes de haberse separado completamente.',
            )}
          />
          {syms([
            ['q', 'mean segregation velocity, m/s', 'velocidad media de segregación, m/s'],
            ['B', 'dimensionless magnitude of the pressure-partition perturbation', 'magnitud adimensional de la perturbación de reparto de presión'],
            ['c', 'inter-particle drag coefficient', 'coeficiente de arrastre entre partículas'],
            ['\\zeta', 'slope inclination, degrees; taken from the real face, not assumed', 'inclinación de la pendiente, grados; tomada de la cara real, no supuesta'],
            ['L, H, U', 'typical path length, flowing-layer thickness and velocity, m, m and m/s', 'longitud típica del camino, espesor de la capa fluyente y velocidad, m, m y m/s'],
          ])}

          <Callout variant="honest" title={t('What is and is not claimed', 'Lo que se afirma y lo que no')}>
            {t(
              'This is a published CONTINUUM model, not particle-scale truth. It solves no discrete elements, knows nothing of particle shape or contacts, and has exactly one free parameter. The DIRECTION of every effect is published and repeated across independent sources; the functional forms are the simplest curves reproducing those statements. It is a defensible operational model, not a validated constitutive one, and calibrating it with DEM or the corresponding laboratory test is recorded as future work rather than quietly assumed.',
              'Este es un modelo CONTINUO publicado, no verdad a escala de partícula. No resuelve elementos discretos, no sabe nada de forma ni contactos de partículas, y tiene exactamente un parámetro libre. La DIRECCIÓN de cada efecto está publicada y repetida en fuentes independientes; las formas funcionales son las curvas más simples que reproducen esas afirmaciones. Es un modelo operacional defendible, no uno constitutivo validado, y calibrarlo con DEM o con el ensayo de laboratorio correspondiente queda registrado como trabajo futuro en vez de suponerse hecho.',
            )}
          </Callout>

          <FigSegregation t={t} />
          <Refs ids={['gray2005', 'savage1988', 'gray2014']} label="Refs" />
        </>
      ),
    },
    {
      id: 's6',
      label: t('The dozer, and honesty about provenance', 'El bulldozer, y la honestidad sobre la trazabilidad'),
      content: (
        <>
          <p className="measure">
            {t(
              'Four blade operations, each conserving mass exactly and each returning how far the material it moved actually travelled: level a field of tipped heaps into a working floor, push material out over the face so the crest advances, raise the safety windrow a reversing truck feels for, and cut the access corridor into a drivable road. Without this module nothing ever finishes a bench. Paddock dumping leaves a field of separate heaps, and something has to turn that into a drivable working level with a crest to dump over. The predecessor engine had no such operator, which is why it had no mechanism by which a lift was ever completed or the next lift became reachable.',
              'Cuatro operaciones de hoja, cada una conservando masa exactamente y cada una devolviendo cuánto viajó realmente el material que movió: nivelar un campo de montones descargados en un piso de trabajo, empujar material sobre la cara para que avance la cresta, levantar el camellón de seguridad que un camión que retrocede busca con las ruedas, y cortar el corredor de acceso hasta dejarlo un camino transitable. Sin este módulo nada termina nunca un banco. La descarga en playa deja un campo de montones separados, y algo tiene que convertir eso en un nivel de trabajo transitable con una cresta por la que descargar. El motor predecesor no tenía tal operador, y por eso no tenía mecanismo por el cual una capa se completara o la siguiente se volviera alcanzable.',
            )}
          </p>
          <p className="measure">
            {t(
              'The ramp is a CUT in the fill, not a void reserved in it, and that is the single most consequential decision on this page. The obvious design reserves the access corridor in plan and keeps every tip off it; it reads as sensible and it cannot work. A corridor 25 m wide and 58 m long that has to rise to the working level needs as much material as a sizeable fraction of the lift itself, all of it shoved in sideways by a blade with a fifteen-metre reach, while the trucks that could have supplied it are forbidden from driving there. Measured on a 90 m area, the entire 1296-cell area came out unreachable at a peak of 3.2 m, because the corridor stayed a trench with 3 m walls on both sides and there was no way up out of it. So the trucks fill the whole area, corridor included, and the dozer cuts the road back into what they filled, every pass; the material is then always exactly where the blade needs it.',
              'La rampa es un CORTE en el relleno, no un vacío reservado en él, y esa es la decisión más consecuente de esta página. El diseño obvio reserva el corredor de acceso en planta y mantiene toda descarga fuera de él; se lee sensato y no puede funcionar. Un corredor de 25 m de ancho y 58 m de largo que debe subir al nivel de trabajo necesita tanto material como una fracción apreciable de la propia capa, todo empujado de lado por una hoja con quince metros de alcance, mientras los camiones que podrían haberlo suministrado tienen prohibido circular ahí. Medido en un área de 90 m, las 1296 celdas completas resultaron inalcanzables con un máximo de 3,2 m, porque el corredor siguió siendo una zanja con muros de 3 m a ambos lados y no había salida. Así que los camiones llenan toda el área, corredor incluido, y el bulldozer corta el camino de vuelta en lo que llenaron, en cada pasada; el material está entonces siempre exactamente donde la hoja lo necesita.',
            )}
          </p>
          <p className="measure">
            {t(
              'Donors are LOCAL, and that is a ledger rule as much as a geometry one. Sorting the whole area by elevation and taking the highest first builds the ramp out of the CROWN OF THE PILE: measured, that lowered the peak from 9.6 m to 5.2 m while making access no better. A dozer building a ramp shoves material in from the ground beside it, so donors are the nearest cells standing above the target and only those within push distance. The same rule holds for levelling, which matters for provenance as much as for the surface, because a dozer shoves material a short distance and provenance should smear locally rather than teleport across the pile. Two further defects in the ramp operation were measured and fixed: it only ever FILLED, so a corridor already buried level with the platform had no deficit anywhere and the ramp was never cut at all; and it graded to exactly the machine limit, so a corridor cut at 0.50230 against a limit of 0.50237 read passable, impassable, passable down its length as floating-point rounding decided. It is built at 85 percent of the limit now, which is also what a real ramp is.',
              'Los donantes son LOCALES, y esa es una regla del registro tanto como de la geometría. Ordenar toda el área por cota y tomar la más alta primero construye la rampa con la CORONA DE LA PILA: medido, eso bajó la altura de 9,6 m a 5,2 m sin mejorar el acceso. Un bulldozer que construye una rampa empuja material desde el suelo de al lado, así que los donantes son las celdas más cercanas por sobre el objetivo y solo las que están a distancia de empuje. La misma regla vale para nivelar, lo que importa para la procedencia tanto como para la superficie, porque un bulldozer empuja material una distancia corta y la procedencia debería difuminarse localmente en vez de teletransportarse por la pila. Se midieron y corrigieron otros dos defectos de la operación de rampa: solo RELLENABA, así que un corredor ya sepultado al nivel de la plataforma no tenía déficit en ninguna parte y la rampa nunca se cortaba; y graduaba exactamente al límite de la máquina, así que un corredor cortado a 0,50230 contra un límite de 0,50237 se leía transitable, intransitable, transitable a lo largo, según decidiera el redondeo de punto flotante. Ahora se construye al 85 por ciento del límite, que es también lo que es una rampa real.',
            )}
          </p>
          <p className="measure">
            {t(
              'The consequence for traceability is an honesty requirement rather than a feature. The source is direct: blade actions mix the material from its initial dumping location in intractable ways, which is why it is hard to know where material is located within the stockpile. The previous version reported provenance fractions summing to one within a part in a trillion and presented that as an answer. With a dozer in the model that precision belongs to the simulation, not to the world. Measured mean displacement is 7.34 m, and every provenance fraction now carries it attached.',
              'La consecuencia para la trazabilidad es un requisito de honestidad y no una funcionalidad. La fuente es directa: las acciones de la hoja mezclan el material desde su ubicación original de descarga de formas intratables, y por eso es difícil saber dónde está el material dentro del acopio. La versión anterior reportaba fracciones de procedencia que sumaban uno con una parte en un billón y presentaba eso como respuesta. Con un bulldozer en el modelo esa precisión pertenece a la simulación, no al mundo. El desplazamiento medio medido es 7,34 m, y cada fracción de procedencia ahora lo lleva adjunto.',
            )}{' '}
            <Cite id="young2021" paren /> <Cite id="zhao2021" paren />
          </p>

          <Equation
            tex="\operatorname{want}(c) = \min\!\left(z_0(c) + \operatorname{along}(c)\, g_{\max} f,\; z_{\text{top}}\right)"
            caption={t(
              'The ramp target profile. Cells above it are cut, never below the original ground; cells below it are filled, from the cut first and from the pile beside them second. The top is the seventy-fifth percentile of the material elevation off the corridor: the level the ramp has to reach to be useful.',
              'El perfil objetivo de la rampa. Las celdas por encima se cortan, nunca bajo el terreno original; las que están por debajo se rellenan, primero con el corte y después con la pila de al lado. El techo es el percentil setenta y cinco de la cota del material fuera del corredor: el nivel que la rampa debe alcanzar para ser útil.',
            )}
          />
          {syms([
            ['z_0(c)', 'original ground at cell c, m; a hard floor the blade never cuts below', 'terreno original en la celda c, m; un piso rígido bajo el cual la hoja nunca corta'],
            ['\\operatorname{along}(c)', 'distance from the entrance along the corridor centreline, m', 'distancia desde la entrada a lo largo del eje del corredor, m'],
            ['f', 'grade margin, 0.85, so drivability is not decided by floating-point rounding', 'margen de pendiente, 0,85, para que la transitabilidad no la decida el redondeo'],
            ['z_{\\text{top}}', 'the level the ramp must reach, m', 'el nivel que la rampa debe alcanzar, m'],
          ])}

          <Equation
            tex="\sum_e f_e = 1 \ \ \text{to } 10^{-12} \quad\text{for every cut}, \qquad \bar{\delta}_{\text{dozer}} = 7.34\ \text{m}"
            caption={t(
              'The ledger identity, checked numerically on every cut of every case, beside the displacement uncertainty that says how much that precision is worth. A ledger that loses or double-counts material still draws a convincing pile and still reports plausible grades; the only way to know it is wrong is to check the identity. The app SHOWS the sum rather than asserting it.',
              'La identidad del registro, verificada numéricamente en cada corte de cada caso, junto a la incertidumbre de desplazamiento que dice cuánto vale esa precisión. Un registro que pierde o duplica material igual dibuja una pila convincente y reporta leyes plausibles; la única forma de saber que está mal es verificar la identidad. La app MUESTRA la suma en vez de aseverarla.',
            )}
          />
          {syms([
            ['f_e', 'tonnage fraction of a cut that came from deposition event e', 'fracción de tonelaje de un corte que vino del evento de deposición e'],
            ['\\bar{\\delta}_{\\text{dozer}}', 'mean distance material was pushed by the blade, m', 'distancia media que la hoja empujó el material, m'],
          ])}

          <Callout variant="honest" title={t('The precision belongs to the simulation, not to the world', 'La precisión pertenece a la simulación, no al mundo')}>
            {t(
              'The ledger stores a discrete stack per column. A real pile has continuous mixing at every interface from rolling, avalanching and re-handling, so the model interfaces are sharper than reality. Provenance to a part in a trillion is a statement about arithmetic; the 7.34 m displacement is the statement about the pile, and it travels with every fraction so that neither can be read without the other.',
              'El registro guarda una pila discreta por columna. Una pila real tiene mezcla continua en cada interfaz por rodadura, avalancha y remanejo, así que las interfaces del modelo son más nítidas que la realidad. Una procedencia con una parte en un billón es una afirmación sobre aritmética; los 7,34 m de desplazamiento son la afirmación sobre la pila, y viaja con cada fracción para que ninguna se pueda leer sin la otra.',
            )}
          </Callout>

          <FigDozer t={t} />
          <Refs ids={['young2021', 'zhao2021', 'baffinland2017']} label="Refs" />
        </>
      ),
    },
    {
      id: 's7',
      label: t('Reclaim and the verdict', 'Recuperación y el veredicto'),
      content: (
        <>
          <p className="measure">
            {t(
              'Reclaiming makes stockpile processing similar to mining a muck pile, subject to the same methods of ore control and mine planning. The machine engages a SLAB, bounded by cut depth and width, standing on a working level with a safe face height, and it advances in sequence. Three orders: last-in-first-out, first-in-first-out, and full height. Only the last blends the lifts, and that is the whole reason the order is a modelled choice rather than an implementation detail.',
              'Recuperar hace que el procesamiento del acopio se parezca a minar una pila de tronadura, sujeto a los mismos métodos de control de leyes y planificación. La máquina engancha una LOSA, acotada por profundidad y ancho de corte, parada sobre un nivel de trabajo con una altura de cara segura, y avanza en secuencia. Tres órdenes: último en entrar primero en salir, primero en entrar primero en salir, y altura completa. Solo el último mezcla los bancos, y esa es toda la razón por la que el orden es una elección modelada y no un detalle de implementación.',
            )}{' '}
            <Cite id="young2021" paren />
          </p>
          <p className="measure">
            {t(
              'Build and reclaim are not always separate stages. Some operations fill a pile and then take it down; others reclaim from one end while trucks are still tipping at the other. Both are in the matrix, as sequential and concurrent campaigns on the same seed and geometry, because the difference is measurable and it goes the way the physics says: a cut taken part-way through the build has fewer lifts available to cross, so it blends less. A pile that blended just as well whether or not it was allowed to fill would not be blending by residence at all.',
              'Construir y recuperar no siempre son etapas separadas. Algunas operaciones llenan una pila y luego la desarman; otras recuperan por un extremo mientras los camiones siguen descargando por el otro. Ambas están en la matriz, como campañas secuencial y concurrente sobre la misma semilla y geometría, porque la diferencia es medible y va en el sentido que dice la física: un corte tomado a mitad de la construcción tiene menos bancos disponibles que cruzar, así que mezcla menos. Una pila que mezclara igual de bien tanto si se la deja llenarse como si no, no estaría mezclando por residencia en absoluto.',
            )}
          </p>
          <p className="measure">
            {t(
              'AND SOMETHING HAS TO COME FOR THE MATERIAL. A cut used to be a tonnage, a grade and a set of cells: the ore left the ledger and no vehicle on site carried it away, so the pile lost volume with no machine in the picture. That is the mirror of the build side left unmodelled. Every cut now routes a haul cycle, an EMPTY truck in from the area access corridor and a LOADED one back out, over the same trafficable surface and the same per-step gradient rule the delivering trucks obey, so a reclaim truck cannot drive anywhere a haul truck could not. The loader and the truck are two machines in two places: a loader digs the face, and a truck cannot stand on a face, so it waits on the nearest ground that is both drivable and reachable and is loaded over the side.',
              'Y ALGO TIENE QUE VENIR POR EL MATERIAL. Un corte era una tonelada, una ley y un conjunto de celdas: el mineral salía del registro y ningún vehículo en la faena se lo llevaba, así que la pila perdía volumen sin ninguna máquina en escena. Ese es el espejo del lado de la construcción, sin modelar. Ahora cada corte rutea un ciclo de acarreo, un camión VACÍO que entra por el corredor de acceso del área y uno CARGADO que sale, sobre la misma superficie transitable y la misma regla de gradiente por paso que cumplen los camiones que entregan, así que un camión de recuperación no puede circular por donde no podría uno de acarreo. El cargador y el camión son dos máquinas en dos lugares: un cargador excava la cara, y un camión no puede pararse sobre una cara, así que espera en el terreno más cercano que sea a la vez transitable y alcanzable, y se carga por el costado.',
            )}
          </p>

          <p className="measure">
            {t(
              'That constraint is the point of modelling the haulage rather than assuming it. A campaign that has cut away its own access reports a cut it cannot serve, in the same way the build reports a tip it cannot reach, and the refusal is recorded rather than smoothed away by teleporting the ore off site. The two legs are solved separately rather than one reversed, because the cut has just been taken and the face relaxed: the way out is not always the way in.',
              'Esa restricción es la razón de modelar el acarreo en vez de suponerlo. Una campaña que ha cortado su propio acceso reporta un corte que no puede servir, igual que la construcción reporta una descarga que no puede alcanzar, y el rechazo se registra en vez de suavizarse teletransportando el mineral fuera de la faena. Las dos piernas se resuelven por separado y no una invertida, porque el corte acaba de tomarse y la cara se relajó: la salida no siempre es la entrada.',
            )}
          </p>

          <p className="measure">
            {t(
              'The ratio is never shown alone. The ideal is typically three to four times better than any real bed achieves, so a ratio quoted without its bound reads far more flattering than it is; the only quantified anchor found for a real bed reports a mixing effect of 5 to 7.5 for beds of 200 to 600 layers. And the source count is not configured: it is MEASURED as the effective number of distinct dig blocks each cut actually drew from, by the inverse participation ratio over its provenance fractions, because a cut that is 95 percent one block and traces of four others is averaging one source and counting keys would say five.',
              'La razón nunca se muestra sola. El ideal suele ser tres a cuatro veces mejor que lo que logra cualquier cama real, así que una razón citada sin su cota se lee mucho más favorable de lo que es; el único anclaje cuantificado encontrado para una cama real reporta un efecto de mezcla de 5 a 7,5 para camas de 200 a 600 capas. Y el conteo de fuentes no se configura: se MIDE como el número efectivo de bloques de extracción distintos de los que cada corte efectivamente tomó, por la razón de participación inversa sobre sus fracciones de procedencia, porque un corte que es 95 por ciento un bloque y trazas de otros cuatro promedia una fuente y contar claves diría cinco.',
            )}{' '}
            <Cite id="schramm2021" paren /> <Cite id="kumral2006" paren />
          </p>
          <p className="measure">
            {t(
              'What sits downstream of the pile is exposed as three live knobs rather than as fixed assumptions, because those are the decisions a plant actually makes about a pile it did not build: how many consecutive cuts the surge capacity averages before the mill sees them, what cutoff the reclaimed stream is screened at, and how large a share of a cut a dig block needs before it counts as an independent source. Each recomputes the verdict from the cut ledger in the browser, and the bound moves with them, because averaging k cuts multiplies the effective source count by k and that is arithmetic rather than a convenience.',
              'Lo que está aguas abajo de la pila se expone como tres controles en vivo y no como supuestos fijos, porque esas son las decisiones que una planta realmente toma sobre una pila que no construyó: cuántos cortes consecutivos promedia la capacidad de tolva antes de que la planta los vea, con qué ley de corte se harnea el flujo recuperado, y qué participación necesita un bloque en un corte para contar como fuente independiente. Cada uno recalcula el veredicto desde el registro de cortes en el navegador, y la cota se mueve con ellos, porque promediar k cortes multiplica por k el conteo efectivo de fuentes y eso es aritmética y no una conveniencia.',
            )}
          </p>

          <Equation
            tex="\mathrm{VRR}=\frac{\sigma^2_{\text{out}}}{\sigma^2_{\text{in}}},\qquad N_{\text{eff}}=\frac{1}{\sum_b f_b^{2}},\qquad \mathrm{VRR}_{\text{ideal}}=\frac{1}{N_{\text{eff}}},\qquad \eta=\frac{\mathrm{VRR}_{\text{ideal}}}{\mathrm{VRR}}"
            caption={t(
              'The ratio, the effective independent-source count measured from provenance, the bound it gives, and the efficiency against that bound. The efficiency is not capped: above one it says the source count is being underestimated, which is a diagnostic, so it is withheld rather than clamped.',
              'La razón, el conteo efectivo de fuentes independientes medido desde la procedencia, la cota que da, y la eficiencia contra esa cota. La eficiencia no se recorta: sobre uno dice que el conteo de fuentes está subestimado, lo que es un diagnóstico, así que se omite en vez de recortarse.',
            )}
          />
          {syms([
            ['\\sigma^2_{\\text{in}}', 'variance of the placed load grades, dimensionless', 'varianza de las leyes de las cargas colocadas, adimensional'],
            ['\\sigma^2_{\\text{out}}', 'tonnage-weighted variance of the reclaimed cut grades', 'varianza ponderada por tonelaje de las leyes de los cortes recuperados'],
            ['f_b', 'fraction of a cut tonnage from dig block b, summing to one', 'fracción del tonelaje de un corte desde el bloque b, sumando uno'],
            ['N_{\\text{eff}}', 'effective independent sources per cut, measured not configured', 'fuentes efectivas independientes por corte, medidas y no configuradas'],
            ['\\eta', 'efficiency against the ideal bound; withheld above 1.05', 'eficiencia contra la cota ideal; se omite sobre 1,05'],
          ])}

          <Equation
            tex="\gamma(h)=\dfrac{1}{2\,\lvert N(h)\rvert}\sum_{(i,j)\in N(h)}\left(g_i-g_j\right)^2"
            caption={t(
              'The experimental semivariogram of the incoming stream against a cumulative tonnage coordinate, computed in the browser from the load log. Its range is a CONSEQUENCE of how long the shovel dwells in one dig block, not a setting: consecutive trucks load from the same block, so consecutive grades are similar. The predecessor took this range as an input, which had the causality backwards.',
              'El semivariograma experimental del flujo entrante contra una coordenada de tonelaje acumulado, calculado en el navegador desde el registro de cargas. Su alcance es CONSECUENCIA de cuánto permanece la pala en un bloque, no un parámetro: los camiones consecutivos cargan del mismo bloque, así que las leyes consecutivas se parecen. El predecesor tomaba este alcance como entrada, lo que invertía la causalidad.',
            )}
          />
          {syms([
            ['h', 'lag along the cumulative tonnage coordinate, t', 'retardo a lo largo de la coordenada de tonelaje acumulado, t'],
            ['N(h)', 'the set of load pairs separated by approximately h', 'el conjunto de pares de cargas separados aproximadamente por h'],
            ['\\gamma(h)', 'semivariance at lag h; its range measures the shovel dwell', 'semivarianza en el retardo h; su alcance mide la permanencia de la pala'],
          ])}

          <Callout variant="honest" title={t('The bound is withheld where it cannot be believed', 'La cota se omite donde no se puede creer')}>
            {t(
              'On some cases the achieved reduction comes out better than one over the measured source count, which is arithmetically impossible for genuinely independent sources. It does not mean the pile is miraculous; it means the source count taken from cut provenance is not capturing how many independent grades a cut actually averages. Until that is root-caused the efficiency is not shown, because a headline claiming several thousand percent of the ideal would be worse than no headline at all.',
              'En algunos casos la reducción lograda resulta mejor que uno sobre el conteo de fuentes medido, lo que es aritméticamente imposible para fuentes genuinamente independientes. No significa que la pila sea milagrosa; significa que el conteo de fuentes tomado de la procedencia de los cortes no está capturando cuántas leyes independientes promedia realmente un corte. Hasta encontrar la causa raíz la eficiencia no se muestra, porque un titular que reclame varios miles por ciento del ideal sería peor que ningún titular.',
            )}
          </Callout>

          <FigReclaim t={t} />
          <Refs ids={['young2021', 'schramm2021', 'kumral2006', 'moraga2022']} label="Refs" />
        </>
      ),
    },
  ];

  const pair = (a: number, b: number) => (
    <SubTabs
      tabs={[
        { id: sections[a].id, label: sections[a].label, content: sections[a].content },
        { id: sections[b].id, label: sections[b].label, content: sections[b].content },
      ]}
      ariaLabel={t('Subsections', 'Subsecciones')}
    />
  );

  const grouped = [
    { id: 'site', label: t('The site', 'El sitio'), content: pair(0, 1) },
    { id: 'haul', label: t('The truck', 'El camión'), content: pair(2, 3) },
    { id: 'material', label: t('The material', 'El material'), content: pair(4, 5) },
    { id: 'out', label: t('Getting it out', 'Salida'), content: pair(6, 7) },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{t('Methodology', 'Metodología')}</h1>
        <p className="lede">
          {t(
            'Material passes through seven operators: the terrain that constrains it, the plan that decides where it goes, the truck that carries it, the dump that shapes it, the relaxation that settles it, the dozer that moves it again, and the reclaim that takes it out. Each is described below with the relation that governs it and the source it comes from. This is an OPERATIONAL model of how a truck-built pile is assembled and taken back down, resting on one fact, that fresh material stands at ',
            'El material pasa por siete operadores: el terreno que lo restringe, el plan que decide dónde va, el camión que lo lleva, la descarga que le da forma, la relajación que lo asienta, el bulldozer que lo mueve otra vez, y la recuperación que lo saca. Cada uno se describe abajo con la relación que lo gobierna y la fuente de la que viene. Este es un modelo OPERACIONAL de cómo se arma y se desarma una pila construida por camiones, apoyado en un hecho, que el material fresco se para en ',
          )}
          <InlineMath tex="\theta_r = 37^{\circ}" />
          {t(
            ' while a truck climbs about two thirds of that. It is NOT a validated constitutive granular model, NOT a blending optimizer, and NOT a metal accounting system: every number it produces is a consequence of the operators below and of nothing else.',
            ' mientras un camión sube unos dos tercios de eso. NO es un modelo constitutivo granular validado, NO es un optimizador de mezcla, y NO es un sistema de contabilidad metalúrgica: cada número que produce es consecuencia de los operadores de abajo y de nada más.',
          )}
        </p>
      </div>

      {/* FOUR TABS, NOT EIGHT. ADR-0071 gives a page ONE tab row and at most six siblings, and
          eight labels of this length do not fit a 1200px page: they ran past the right edge. The
          eight sections are unchanged; they are paired under the four things the material passes
          through, and the pairs are sub-tabs. */}
      <Tabs tabs={grouped} ariaLabel={t('Sections', 'Secciones')} />
    </div>
  );
}
