import { Callout, Cite, InlineMath, Refs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  const tabs = [
    {
      id: 's0',
      label: es ? 'El objeto, dicho con precisión' : 'The object, said precisely',
      content: (
        <>

        <p>
          {es
            ? 'Un acopio construido por camiones es el INVERSO de un rajo. El rajo corta bancos hacia abajo; el acopio agrega bancos hacia arriba, con las mismas primitivas: un nivel de trabajo, una cara parada en el angulo de reposo, una berma, un talud global mas tendido que la cara, y una rampa de ancho y pendiente definidos que da acceso al nivel siguiente. La recuperacion lo invierte otra vez, retirando material en un orden planificado como se mina una pila de tronadura.'
            : 'A truck-built stockpile is the INVERSE of an open pit. The pit cuts benches downward; the stockpile adds lifts upward, with the same primitives: a working level, a face standing at the angle of repose, a berm, an overall slope flatter than the face, and a ramp of defined width and gradient giving access to the next level. Reclaim inverts it again, removing material in a planned order the way a muck pile is mined.'}
          {' '}<Cite id="moraga2017" paren />
        </p>
        <p>
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
        </>
      ),
    },
    {
      id: 's1',
      label: es ? 'Como se construye un banco' : 'How a bench gets built',
      content: (
        <>

        <p>
          {es
            ? 'La construccion ocurre en dos fases, y no son variantes una de otra. Primero una serie de descargas de paddock forma la capa base sobre terreno plano: montones con forma de tronco eliptico, dimensionados por el propio camion, colocados en filas espaciadas de forma pareja. El bulldozer los convierte en piso. Luego una campana de descarga de borde construye la capa superior: un grupo semilla de cargas crea la primera cresta, y desde ahi la cresta avanza en barridos radiales hasta llenar el volumen disenado del banco.'
            : 'Construction happens in two phases, and they are not variants of one another. First a series of paddock dumps forms the base layer on flat ground: heaps shaped like elliptical frustums, sized by the truck itself, laid on evenly spaced rows. The dozer turns them into a floor. Then an edge-dumping campaign builds the upper layer: a seed cluster of loads creates the first crest, and from there the crest advances in radial sweeps until the designed volume for the bench is filled.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p>
          {es
            ? 'Un volcado de borde no cae en un punto. Cae en una franja que corre CARA ABAJO, perpendicular a la tangente de la cresta en el punto de descarga, con un ancho del orden del ancho del camion y un largo igual a la componente horizontal del talud del banco. El material se acumula mas en el pie y menos cerca de la cresta, y el material grueso y redondeado puede rodar mas alla del pie, sobre todo en bancos altos.'
            : 'An edge dump does not land at a point. It lands as a streak running DOWN THE FACE, perpendicular to the tangent of the crest at the dump location, about as wide as the truck and as long as the horizontal component of the bench slope. Material aggregates more at the toe and less near the crest, and round, coarse material can roll beyond the toe entirely, especially at greater bench heights.'}
          {' '}<Cite id="young2021" paren />
        </p>
        </>
      ),
    },
    {
      id: 's2',
      label: es ? 'Cuatro formas medidas, no una supuesta' : 'Four measured shapes, not one assumed',
      content: (
        <>

        <p>
          {es
            ? 'Veintiocho descargas reales de un CAT 793F, relevadas por fotogrametria con dron, se clasifican en cuatro perfiles: oval, cometa, rectangular y monton derrumbado. Cual se forma lo decide la posicion del camion respecto de la cresta: descargar lejos de la cresta produce un monton derrumbado; descargar contra la cresta produce cometa, oval o rectangular. Los rangos medidos son 13 a 46 m de largo, 11 a 23 m de ancho y 0,37 a 2,03 m de espesor.'
            : 'Twenty-eight real CAT 793F dumps, surveyed by UAV photogrammetry, classify into four profiles: oval, comet, rectangular and sloughed heap. Which one forms is decided by the truck position relative to the crest: dumping far from the crest produces a sloughed heap, while dumping against the crest produces a comet, an oval or a rectangle. The measured ranges are 13 to 46 m long, 11 to 23 m wide and 0.37 to 2.03 m thick.'}
          {' '}<Cite id="young2022" paren /> <Cite id="youngdata2021" paren />
        </p>
        <Callout variant="honest" title={es ? 'Lo que este producto NO modela' : 'What this product does NOT model'}>
          {es
            ? 'Chevron, windrow y cono son geometrias de APILADOR DE CORREA, no de camion. De los cinco tipos de acopio pre-chancado, solo el mezclado-entrada-mezclado-salida es un chevron, y el software de acopios existente esta orientado a sistemas de correa. Los camiones no construyen una cama chevron. Ofrecer esas geometrias junto a camiones es un error de categoria, y una version anterior de este producto lo cometia.'
            : 'Chevron, windrow and cone shell are CONVEYOR-STACKER geometries, not truck geometries. Of the five pre-crusher stockpile types, only blended-in-blended-out is a chevron, and existing stockpile software is tailored to conveyor systems. Trucks do not build a chevron bed. Offering those geometries alongside trucks is a category error, and an earlier version of this product made it.'}
          {' '}<Cite id="young2021" paren />
        </Callout>
        </>
      ),
    },
    {
      id: 's3',
      label: es ? 'Por que vale la pena rastrear cada carga' : 'Why tracking every load is worth anything',
      content: (
        <>

        <p>
          {es
            ? 'La linea base de la industria es explicita y humilde: el modelo de bloques de un acopio grande hoy en operacion es UN solo valor homogeneizado con la ley promedio movil. Un numero para toda la pila. Todo lo que este producto muestra por encima de ese numero es su valor.'
            : 'The industry baseline is explicit and humbling: the block model in place for a large stockpile today is ONE large homogenized block value carrying the rolling average grade. One number for the whole pile. Everything this product shows above that number is its value.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p>
          {es
            ? 'El argumento cuantificado: si cada camion se muestrea, la densidad de muestreo iguala la capacidad del camion, 100 a 400 t por muestra, contra 175.000 t por muestra en una campana convencional de acopio. Tres ordenes de magnitud.'
            : 'The quantified case: if each truck is sampled, the sampling density equals the truck capacity, 100 to 400 t per sample, against 175,000 t per sample for a conventional stockpile campaign. Three orders of magnitude.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p>
          {es
            ? 'Y la ley ya llega incierta. La mala clasificacion de mineral a esteril, o de esteril a mineral, solo por error de muestreo esta comunmente entre 5 y 20 por ciento en minas de metales base y preciosos, con 9 a 19 por ciento adicional de perdida por movimiento de tronadura y dilucion. Un modelo que muestra una ley nitida por celda esconde un error conocido en vez de reportarlo.'
            : 'And the grade already arrives uncertain. Misclassification of ore to waste or waste to ore from sampling error alone is commonly between 5 and 20 percent at base and precious metal mines, with a further 9 to 19 percent ore loss from blast movement and dilution. A model showing a crisp grade per cell hides a known error rather than reporting it.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <Refs ids={['young2021', 'young2022', 'youngdata2021', 'moraga2017', 'zhao2021']} label="Refs" />
        </>
      ),
    },
    {
      id: 's4',
      label: es ? 'Qué NO es' : 'What it is not',
      content: (
        <>

        <ul>
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
