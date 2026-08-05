import { Callout, Cite, Equation, InlineMath, Refs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

import { FigPipeline } from '../figures/method';

export default function Introduction() {
  const es = useShellLang() === 'es';
  const t = (en: string, s: string) => (es ? s : en);

  /** The symbols every page of this product uses, defined once, with units. */
  const GLOSSARY: [string, string, string][] = [
    ['\\theta_r', 'angle of repose of the loose material, degrees. 37 dry, 43 wet', 'ángulo de reposo del material suelto, grados. 37 en seco, 43 húmedo'],
    ['g_{\\max}', 'maximum gradient a laden haul truck climbs, dimensionless. About 0.50, or 27 degrees', 'gradiente máximo que sube un camión cargado, adimensional. Cerca de 0,50, o 27 grados'],
    ['z_0', 'ORIGINAL ground elevation, m. A hard floor no operation may cut below', 'cota del terreno ORIGINAL, m. Un piso rígido bajo el cual ninguna operación puede cortar'],
    ['z', 'current surface elevation, m. Ground plus whatever material stands on it', 'cota actual de superficie, m. Terreno más el material que esté sobre él'],
    ['\\Delta x', 'cell size of the height field, m. 2.5 throughout the shipped matrix', 'tamaño de celda del campo de alturas, m. 2,5 en toda la matriz publicada'],
    ['g_i', 'grade of load or cut i, dimensionless mass fraction', 'ley de la carga o corte i, fracción másica adimensional'],
    ['\\sigma^2_{\\text{in}}', 'variance of the grades arriving, over placed loads', 'varianza de las leyes que llegan, sobre las cargas colocadas'],
    ['\\sigma^2_{\\text{out}}', 'tonnage-weighted variance of the grades leaving, over reclaim cuts', 'varianza ponderada por tonelaje de las leyes que salen, sobre los cortes'],
    ['\\mathrm{VRR}', 'variance reduction ratio, dimensionless. Lower is better; one means the pile did nothing', 'razón de reducción de varianza, adimensional. Menor es mejor; uno significa que la pila no hizo nada'],
    ['f_b', 'fraction of a cut tonnage that came from dig block b, summing to one', 'fracción del tonelaje de un corte que vino del bloque de extracción b, sumando uno'],
    ['N_{\\text{eff}}', 'effective independent sources a cut averaged, measured from provenance', 'fuentes independientes efectivas que promedió un corte, medidas desde la procedencia'],
    ['\\eta', 'refusal rate, dimensionless. The share of planned tips no truck could occupy', 'tasa de rechazo, adimensional. La fracción de descargas planificadas que ningún camión pudo ocupar'],
    ['S_r', 'segregation number, dimensionless. Zero means no size sorting anywhere', 'número de segregación, adimensional. Cero significa ninguna clasificación por tamaño'],
    ['\\phi', 'volume fraction of the small size species in a flowing layer', 'fracción volumétrica de la especie fina en una capa fluyente'],
  ];

  const tabs = [
    {
      id: 'pipeline',
      label: t('The pipeline, end to end', 'La tubería, de extremo a extremo'),
      content: (
        <>
          <p className="measure">
            {t(
              'The product is a heavy offline simulation, a compact committed artifact, and a thin live lane in the browser. The split is not an architectural preference: the engine routes every load over the trafficable surface, floods the pad for reachability, relaxes the whole height field after every operation and sorts each cascading load by size. That is tens of seconds per few hundred loads. Running it in a page would mean either a frozen tab or a model simple enough to be wrong, and the previous version of this product chose the second.',
              'El producto es una simulación pesada fuera de línea, un artefacto compacto comprometido en el repositorio, y una capa liviana en vivo en el navegador. La división no es una preferencia arquitectónica: el motor rutea cada carga sobre la superficie transitable, inunda la plataforma para calcular alcanzabilidad, relaja todo el campo de alturas tras cada operación y clasifica por tamaño cada carga en cascada. Eso son decenas de segundos por unos cientos de cargas. Correrlo en una página significaría una pestaña congelada o un modelo lo bastante simple como para estar equivocado, y la versión anterior de este producto eligió lo segundo.',
            )}
          </p>
          <p className="measure">
            {t(
              'What the artifact carries is EVENTS and GEOMETRY: the dump plan, the load log with each truck approach and departure path, the pile as a block volume, and the reclaim cuts. What it does NOT carry is the answers. Variance reduction, the independent-source bound, the sector confidence intervals and the segregation summary are all computed in the browser, from those events, every time the page loads and again on every move of a knob. A trace that shipped a baked variance-reduction ratio would be a slide: a reader could not tell a real result from a typo, and nothing in the page would fail if the number were wrong.',
              'Lo que lleva el artefacto son EVENTOS y GEOMETRÍA: el plan de descarga, el registro de cargas con la ruta de entrada y salida de cada camión, la pila como volumen de bloques, y los cortes de recuperación. Lo que NO lleva son las respuestas. La reducción de varianza, la cota de fuentes independientes, los intervalos de confianza por sector y el resumen de segregación se calculan todos en el navegador, desde esos eventos, cada vez que carga la página y otra vez con cada movimiento de un control. Una traza que enviara una razón de reducción de varianza ya horneada sería una lámina: un lector no podría distinguir un resultado real de un error de tipeo, y nada en la página fallaría si el número estuviera mal.',
            )}
          </p>

          <ol className="measure">
            <li>
              {t(
                'A dig sequence is synthesised: a shovel works one block for a run of loads, then moves, so consecutive trucks carry correlated grades. The stream range is a CONSEQUENCE of that dwell, never a setting.',
                'Se sintetiza una secuencia de extracción: una pala trabaja un bloque durante una tanda de cargas y luego se mueve, así que camiones consecutivos llevan leyes correlacionadas. El alcance del flujo es CONSECUENCIA de esa permanencia, nunca un parámetro.',
              )}
            </li>
            <li>
              {t(
                'A multi-element assay is generated around each copper grade from shared latent geological factors, so the nine variables move together the way a porphyry system makes them move.',
                'Se genera un ensayo multielemento alrededor de cada ley de cobre desde factores geológicos latentes compartidos, así que las nueve variables se mueven juntas como las hace moverse un sistema de pórfido.',
              )}
            </li>
            <li>
              {t(
                'A dump plan lays out areas, benches, lifts, tip positions and a reserved access corridor, ordered furthest-from-access first.',
                'Un plan de descarga dispone áreas, bancos, capas, posiciones de descarga y un corredor de acceso reservado, ordenado desde lo más lejano al acceso.',
              )}
            </li>
            <li>
              {t(
                'For each load: the pad is flooded for reachability, the truck is routed to the nearest workable spot inside its area, and the offset from the planned position is recorded. A tip that cannot be reached is REFUSED, with a reason.',
                'Por cada carga: se inunda la plataforma para alcanzabilidad, se rutea el camión al punto transitable más cercano dentro de su área, y se registra el desplazamiento respecto de la posición planificada. Una descarga que no se puede alcanzar se RECHAZA, con una razón.',
              )}
            </li>
            <li>
              {t(
                'The load is placed with the measured profile its distance to the live crest selects, running perpendicular to the crest tangent.',
                'La carga se coloca con el perfil medido que selecciona su distancia a la cresta viva, corriendo perpendicular a la tangente de la cresta.',
              )}
            </li>
            <li>
              {t(
                'The whole field is relaxed to the angle of repose, highest cell first, and the downslope order of those transfers IS the avalanche path.',
                'Todo el campo se relaja al ángulo de reposo, celda más alta primero, y el orden ladera abajo de esas transferencias ES el camino de la avalancha.',
              )}
            </li>
            <li>
              {t(
                'Kinetic sieving is solved down that path, with diffusive remixing opposing it, and the material laid down at each point along the face carries the size split the solver gives it.',
                'El tamizado cinético se resuelve por ese camino, con el remezclado difusivo oponiéndose, y el material depositado en cada punto de la cara lleva la granulometría que le da el solucionador.',
              )}
            </li>
            <li>
              {t(
                'On cadence the dozer levels the floor, pushes the crest out, raises a gapped berm and cuts the ramp back into the fill, recording how far every tonne travelled.',
                'Según la cadencia el bulldozer nivela el piso, empuja la cresta, levanta una berma con huecos y corta la rampa de vuelta en el relleno, registrando cuánto viajó cada tonelada.',
              )}
            </li>
            <li>
              {t(
                'A reclaim campaign cuts slabs through the lifts, in sequence, either after the build or concurrently with it.',
                'Una campaña de recuperación corta losas a través de las capas, en secuencia, ya sea después de la construcción o en paralelo con ella.',
              )}
            </li>
            <li>
              {t(
                'The gate asserts the invariants on the ARTIFACT, not on the code, and the case is shipped or withdrawn.',
                'La compuerta asevera los invariantes sobre el ARTEFACTO, no sobre el código, y el caso se publica o se retira.',
              )}
            </li>
          </ol>

          <FigPipeline t={t} />

          <h2>{t('The governing relations', 'Las relaciones que gobiernan')}</h2>

          <Equation
            tex="g_{\max} = \dfrac{\tan\theta_r}{1.5} \approx 0.50, \qquad \theta_r = 37^{\circ}"
            caption={t(
              'The fact the product turns on. Fresh material stands at its angle of repose and a haul truck climbs about two thirds of that, so a truck never stands on fresh material. Everything else, the plan, the ramp and the dozer, exists because of this inequality.',
              'El hecho sobre el que gira el producto. El material fresco se para en su ángulo de reposo y un camión sube unos dos tercios de eso, así que un camión nunca se para sobre material fresco. Todo lo demás, el plan, la rampa y el bulldozer, existe por esta desigualdad.',
            )}
          />

          <Equation
            tex="\mathrm{VRR}=\dfrac{\sigma^2_{\text{out}}}{\sigma^2_{\text{in}}}, \qquad \mathrm{VRR}_{\text{ideal}}=\dfrac{1}{N_{\text{eff}}}, \qquad N_{\text{eff}}=\dfrac{1}{\sum_b f_b^{2}}"
            caption={t(
              'What the pile is FOR, and the bound it is judged against. The effective source count is measured from cut provenance by the inverse participation ratio, not configured and not counted: a cut that is 95 percent one dig block and traces of four others is averaging one source.',
              'PARA QUÉ está la pila, y la cota contra la que se juzga. El conteo efectivo de fuentes se mide desde la procedencia de los cortes por la razón de participación inversa, no se configura ni se cuenta: un corte que es 95 por ciento un bloque y trazas de otros cuatro promedia una fuente.',
            )}
          />

          <Equation
            tex="\max_{(i,j)\,\text{adj}} \arctan\!\left(\dfrac{\lvert z_i - z_j\rvert}{\Delta x}\right) \le \theta_r \qquad\text{and}\qquad \eta = 1 - \dfrac{n_{\text{placed}}}{n_{\text{offered}}}"
            caption={t(
              'The invariant every bake must satisfy, and the number it is honest about. Zero cell pairs may stand over the angle of repose, on all twenty-two scenarios. The refusal rate is reported rather than suppressed, because it is the real measure of a plan laid out once against a pile that grows away from it.',
              'El invariante que todo horneado debe satisfacer, y el número sobre el que es honesto. Cero pares de celdas pueden quedar sobre el ángulo de reposo, en los veintidós escenarios. La tasa de rechazo se reporta en vez de suprimirse, porque es la medida real de un plan trazado una vez contra una pila que crece alejándose.',
            )}
          />

          <h2>{t('Symbols', 'Símbolos')}</h2>
          <ul className="measure st-syms">
            {GLOSSARY.map(([tex, en, s]) => (
              <li key={tex}>
                <InlineMath tex={tex} /> {t(en, s)}
              </li>
            ))}
          </ul>

          <Callout variant="honest" title={t('What the split costs', 'Lo que cuesta la división')}>
            {t(
              'Because the simulation is baked, no control in the app can change what was BUILT. Repose angle, bench height, truck gradient limit and dozer cadence are readouts, honestly labelled as fixed by the bake, and changing one means re-running the offline pipeline. What is live is everything downstream of the built pile, and it is exposed as continuous knobs rather than hidden behind assumptions.',
              'Como la simulación está horneada, ningún control de la app puede cambiar lo que se CONSTRUYÓ. Ángulo de reposo, altura de banco, límite de gradiente del camión y cadencia del bulldozer son lecturas, honestamente etiquetadas como fijadas por el horneado, y cambiar una significa volver a correr la tubería fuera de línea. Lo que sí está en vivo es todo lo que está aguas abajo de la pila construida, y se expone como controles continuos en vez de esconderse tras supuestos.',
            )}
          </Callout>
          <Refs ids={['young2021', 'gray2005', 'bak1987', 'sillitoe2010']} label="Refs" />
        </>
      ),
    },
    {
      id: 's0',
      label: es ? 'El objeto, dicho con precisión' : 'The object, said precisely',
      content: (
        <>

        <p className="measure">
          {es
            ? 'Un acopio construido por camiones es el INVERSO de un rajo. El rajo corta bancos hacia abajo; el acopio agrega bancos hacia arriba, con las mismas primitivas: un nivel de trabajo, una cara parada en el angulo de reposo, una berma, un talud global mas tendido que la cara, y una rampa de ancho y pendiente definidos que da acceso al nivel siguiente. La recuperacion lo invierte otra vez, retirando material en un orden planificado como se mina una pila de tronadura.'
            : 'A truck-built stockpile is the INVERSE of an open pit. The pit cuts benches downward; the stockpile adds lifts upward, with the same primitives: a working level, a face standing at the angle of repose, a berm, an overall slope flatter than the face, and a ramp of defined width and gradient giving access to the next level. Reclaim inverts it again, removing material in a planned order the way a muck pile is mined.'}
          {' '}<Cite id="moraga2017" paren />
        </p>
        <p className="measure">
          {es
            ? 'Esa geometria tiene una consecuencia que gobierna todo lo demas: el material recien colocado se para en su angulo de reposo, alrededor de 37 grados, y un camion de extraccion trabaja hasta unos 27. Medido directamente sobre un monton asentado, TODAS sus celdas son intransitables. Un camion nunca se para sobre material fresco; se para sobre piso nivelado o sobre el terreno original y descarga SOBRE el monton. Por eso el bulldozer no es decorado y por eso un acopio no puede alimentarse repetidamente en un solo punto.'
            : 'That geometry has one consequence which governs everything else: freshly placed material stands at its angle of repose, about 37 degrees, and a haul truck works to roughly 27. Measured directly on a settled heap, EVERY one of its cells is undrivable. A truck never stands on fresh material; it stands on levelled floor or original ground and tips ONTO the heap. That is why the dozer is not scenery, and why a stockpile cannot be fed repeatedly at one point.'}
        </p>
        <Callout variant="note" title={es ? 'El punto de alimentación no es arbitrario' : 'The feeding point is not arbitrary'}>
          {es
            ? 'Un evento de descarga en un sistema de despacho real localiza la carga por el NOMBRE y la ALTURA DE BANCO de un poligono de descarga, no por una coordenada suelta. Las areas estan predefinidas y nombradas; los niveles son bancos. Esa es la razon operacional de que exista un plan de descarga.'
            : 'A dump event in a real fleet-management system locates the load by the NAME and BENCH HEIGHT of a dump location polygon, not by a bare coordinate. Areas are predefined and named; levels are benches. That is the operational reason a dump plan exists at all.'}
          {' '}<Cite id="young2021" paren />
        </Callout>
        <Refs ids={['moraga2017', 'young2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's1',
      label: es ? 'Como se construye un banco' : 'How a bench gets built',
      content: (
        <>

        <p className="measure">
          {es
            ? 'La construccion ocurre en dos fases, y no son variantes una de otra. Primero una serie de descargas de paddock forma la capa base sobre terreno plano: montones con forma de tronco eliptico, dimensionados por el propio camion, colocados en filas espaciadas de forma pareja. El bulldozer los convierte en piso. Luego una campana de descarga de borde construye la capa superior: un grupo semilla de cargas crea la primera cresta, y desde ahi la cresta avanza en barridos radiales hasta llenar el volumen disenado del banco.'
            : 'Construction happens in two phases, and they are not variants of one another. First a series of paddock dumps forms the base layer on flat ground: heaps shaped like elliptical frustums, sized by the truck itself, laid on evenly spaced rows. The dozer turns them into a floor. Then an edge-dumping campaign builds the upper layer: a seed cluster of loads creates the first crest, and from there the crest advances in radial sweeps until the designed volume for the bench is filled.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p className="measure">
          {es
            ? 'Un volcado de borde no cae en un punto. Cae en una franja que corre CARA ABAJO, perpendicular a la tangente de la cresta en el punto de descarga, con un ancho del orden del ancho del camion y un largo igual a la componente horizontal del talud del banco. El material se acumula mas en el pie y menos cerca de la cresta, y el material grueso y redondeado puede rodar mas alla del pie, sobre todo en bancos altos.'
            : 'An edge dump does not land at a point. It lands as a streak running DOWN THE FACE, perpendicular to the tangent of the crest at the dump location, about as wide as the truck and as long as the horizontal component of the bench slope. Material aggregates more at the toe and less near the crest, and round, coarse material can roll beyond the toe entirely, especially at greater bench heights.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <Refs ids={['young2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's2',
      label: es ? 'Cuatro formas medidas, no una supuesta' : 'Four measured shapes, not one assumed',
      content: (
        <>

        <p className="measure">
          {es
            ? 'Veintiocho descargas reales de un CAT 793F, relevadas por fotogrametria con dron, se clasifican en cuatro perfiles: oval, cometa, rectangular y monton derrumbado. Cual se forma lo decide la posicion del camion respecto de la cresta: descargar lejos de la cresta produce un monton derrumbado; descargar contra la cresta produce cometa, oval o rectangular. Los rangos medidos son 13 a 46 m de largo, 11 a 23 m de ancho y 0,37 a 2,03 m de espesor.'
            : 'Twenty-eight real CAT 793F dumps, surveyed by UAV photogrammetry, classify into four profiles: oval, comet, rectangular and sloughed heap. Which one forms is decided by the truck position relative to the crest: dumping far from the crest produces a sloughed heap, while dumping against the crest produces a comet, an oval or a rectangle. The measured ranges are 13 to 46 m long, 11 to 23 m wide and 0.37 to 2.03 m thick.'}
          {' '}<Cite id="young2022" paren /> <Cite id="young2021b" paren />
        </p>
        <Callout variant="honest" title={es ? 'Lo que este producto NO modela' : 'What this product does NOT model'}>
          {es
            ? 'Chevron, windrow y cono son geometrias de APILADOR DE CORREA, no de camion. De los cinco tipos de acopio pre-chancado, solo el mezclado-entrada-mezclado-salida es un chevron, y el software de acopios existente esta orientado a sistemas de correa. Los camiones no construyen una cama chevron. Ofrecer esas geometrias junto a camiones es un error de categoria, y una version anterior de este producto lo cometia.'
            : 'Chevron, windrow and cone shell are CONVEYOR-STACKER geometries, not truck geometries. Of the five pre-crusher stockpile types, only blended-in-blended-out is a chevron, and existing stockpile software is tailored to conveyor systems. Trucks do not build a chevron bed. Offering those geometries alongside trucks is a category error, and an earlier version of this product made it.'}
          {' '}<Cite id="young2021" paren />
        </Callout>
        <Refs ids={['young2022', 'young2021b', 'young2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's3',
      label: es ? 'Por que vale la pena rastrear cada carga' : 'Why tracking every load is worth anything',
      content: (
        <>

        <p className="measure">
          {es
            ? 'La linea base de la industria es explicita y humilde: el modelo de bloques de un acopio grande hoy en operacion es UN solo valor homogeneizado con la ley promedio movil. Un numero para toda la pila. Todo lo que este producto muestra por encima de ese numero es su valor.'
            : 'The industry baseline is explicit and humbling: the block model in place for a large stockpile today is ONE large homogenized block value carrying the rolling average grade. One number for the whole pile. Everything this product shows above that number is its value.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p className="measure">
          {es
            ? 'El argumento cuantificado: si cada camion se muestrea, la densidad de muestreo iguala la capacidad del camion, 100 a 400 t por muestra, contra 175.000 t por muestra en una campana convencional de acopio. Tres ordenes de magnitud.'
            : 'The quantified case: if each truck is sampled, the sampling density equals the truck capacity, 100 to 400 t per sample, against 175,000 t per sample for a conventional stockpile campaign. Three orders of magnitude.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p className="measure">
          {es
            ? 'Y la ley ya llega incierta. La mala clasificacion de mineral a esteril, o de esteril a mineral, solo por error de muestreo esta comunmente entre 5 y 20 por ciento en minas de metales base y preciosos, con 9 a 19 por ciento adicional de perdida por movimiento de tronadura y dilucion. Un modelo que muestra una ley nitida por celda esconde un error conocido en vez de reportarlo.'
            : 'And the grade already arrives uncertain. Misclassification of ore to waste or waste to ore from sampling error alone is commonly between 5 and 20 percent at base and precious metal mines, with a further 9 to 19 percent ore loss from blast movement and dilution. A model showing a crisp grade per cell hides a known error rather than reporting it.'}
          {' '}<Cite id="young2021" paren /> <Cite id="zhao2021" paren />
        </p>
        <Refs ids={['young2021', 'zhao2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's4',
      label: es ? 'Qué NO es' : 'What it is not',
      content: (
        <>

        <ul className="measure">
          <li>
            {es
              ? 'No es contabilidad metalurgica de planta: sin balance de metal, sin balance de masa de planta, sin libro de produccion.'
              : 'Not in-plant metal accounting: no metal balance, no plant mass balance, no production ledger.'}
          </li>
          <li>
            {es
              ? 'No es un modelo de chancado ni de flotacion. Esos son otros productos de la linea.'
              : 'Not a comminution or flotation model. Those are other products in the line.'}
          </li>
          <li>
            {es
              ? 'No es un optimizador de mezcla. Expone el campo de leyes por celda y el estado del frente de recuperacion que un optimizador consumiria, y no resuelve el programa lineal.'
              : 'Not a blending optimizer. It exposes the per-cell grade field and the reclaim-face state an optimizer would consume, and does not solve the linear program.'}
          </li>
          <li>{es ? 'No emite ninguna consigna de planta.' : 'It emits no plant setpoint.'}</li>
        </ul>
        </>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Introducción' : 'Introduction'}</h1>
        <p className="lede">
          {es ? (
            <>
              Entre el rajo y la planta el mineral se acopia. Un acopio ROM no es un balde ni una
              superficie que aparece: es una obra de tierra PLANIFICADA, construida banco a banco por
              camiones que deben poder llegar a donde van. Como se construye y como se recupera
              deciden cuanta de la variabilidad de entrada llega a la planta, medida por{' '}
              <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />, donde
              menor es mejor. StockTwin simula esa mecanica, mide el resultado y muestra el trabajo.
            </>
          ) : (
            <>
              Between the pit and the plant, ore is buffered in stockpiles. A ROM stockpile is not a
              bucket, and it is not a surface that appeared: it is a PLANNED earthwork, built lift by
              lift by trucks that must be able to reach where they are going. How it is built and how
              it is reclaimed decide how much of the input variability reaches the plant, measured by{' '}
              <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />, where
              lower is better. StockTwin simulates that mechanics, measures the result, and shows the
              working.
            </>
          )}
        </p>
      </div>

      <Tabs tabs={tabs} ariaLabel={es ? 'Secciones' : 'Sections'} />
    </div>
  );
}
