import { Callout, Cite, Equation, InlineMath, Refs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

/**
 * The method, in the order material moves through it.
 *
 * Every claim here is traceable to a primary source or to a measurement made on this engine. Where a
 * functional form is the simplest curve reproducing a published verbal statement rather than a fitted
 * model, the page says so, because a defensible operational model presented as a validated
 * constitutive one is the overclaim that matters most in this subject.
 */
export default function Methodology() {
  const es = useShellLang() === 'es';
  const tabs = [
    {
      id: 's0',
      label: es ? 'Terreno y transitabilidad' : 'Terrain and trafficability',
      content: (
        <>

        <p>
          {es
            ? 'El estado es una elevacion actual y el terreno ORIGINAL, guardados por separado. En cualquier sitio con pendiente esas dos respuestas divergen de inmediato, y una vista que dibuja solo la superficie muestra una ladera como si fuera un acopio. De la superficie se derivan dos campos: la CRESTA del nivel de trabajo y la TRANSITABILIDAD.'
            : 'The state is a current elevation and the ORIGINAL ground, kept separately. On any sloping site those two answers diverge immediately, and a view that draws only the surface shows a hillside as though it were a stockpile. Two fields are derived from the surface: the CREST of the working level, and TRAFFICABILITY.'}
        </p>
        <p>
          {es
            ? 'Solo uno de los cinco tipos publicados de relleno de acopio es una plataforma plana. Los otros cuatro son ladera, valle, valle transversal y cresta. Medido al limite del equipo sobre un relieve de 30 m, el terreno construible va de 100 por ciento en plano a 72 por ciento en un valle o sobre una cresta, antes de colocar una sola carga.'
            : 'Only one of the five published stockpile fill types is a flat pad. The other four are sidehill, valley, cross-valley and ridge-crest. Measured at the equipment limit over 30 m of relief, buildable ground runs from 100 percent on the flat to 72 percent in a valley or along a ridge, before a single load is placed.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <Callout variant="honest" title={es ? 'Dos defectos que un terreno plano no puede revelar' : 'Two defects a flat pad cannot reveal'}>
          {es
            ? 'Construir en ladera expuso ambos. El bulldozer elegia material por ELEVACION, lo cual es correcto en plano y catastrofico en pendiente: en una ladera el terreno alto ES el cerro, y la hoja llevo una celda 4,43 m por debajo del terreno original. Y la relajacion trataba la elevacion como libre y erosionaba la roca in situ. Ahora solo el material colocado puede moverse, y el terreno original es un piso.'
            : 'Building on a sidehill exposed both. The dozer selected material by ELEVATION, which is right on a flat pad and catastrophic on a slope: on a hillside the high ground IS the hill, and the blade drove a cell 4.43 m below original ground. And the relaxation treated elevation as free-floating and eroded bedrock. Only placed material can move now, and the original ground is a floor.'}
        </Callout>
        </>
      ),
    },
    {
      id: 's1',
      label: es ? 'El plan de descarga' : 'The dump plan',
      content: (
        <>

        <p>
          {es
            ? 'Areas nombradas con un programa de bancos, mas un corredor de acceso reservado donde no se descarga nada. Las posiciones de descarga de paddock se generan sobre una retícula serpenteante de filas espaciadas; las de borde avanzan en barridos radiales desde un punto semilla. Las filas se ordenan de la mas lejana al acceso hacia la mas cercana, para que el camion nunca deba cruzar material que ya coloco.'
            : 'Named areas with a bench schedule, plus a reserved access corridor on which nothing is tipped. Paddock tip positions are generated on a serpentine lattice of evenly spaced rows; edge tips advance in radial sweeps from a seed point. Rows are ordered furthest-from-access first, so the truck never has to cross material it has already placed.'}
        </p>
        <p>
          {es
            ? 'La cadencia del bulldozer sigue la practica publicada: se empuja el material despues de dos filas. Y la berma TIENE HUECOS. Una berma continua sobre cada celda de cresta no es una berma, es un muro: medido, los rechazos SUBIAN cuanto mas corria el bulldozer, 62 por ciento con una pasada cada 10 cargas contra 33 por ciento cada 40. Con huecos, los rechazos caen a 19,2 por ciento.'
            : 'The dozer cadence follows published practice: material is dozed up the pile after two rows. And the berm HAS GAPS. A continuous berm along every crest cell is not a berm, it is a wall: measured, refusals went UP the more the dozer ran, 62 percent at one pass per 10 loads against 33 percent at one per 40. With gaps, refusals fall to 19.2 percent.'}
        </p>
        </>
      ),
    },
    {
      id: 's2',
      label: es ? 'Camiones, rutas y posicionamiento' : 'Trucks, routes and spotting',
      content: (
        <>

        <p>
          {es
            ? 'Un camion es una entidad con posicion, rumbo, estado de ciclo, carga con su bloque de origen, y las dos polilineas que el producto debe poder dibujar: la aproximacion y la salida. Las rutas se resuelven con A* sobre la superficie transitable usando distancia real de viaje, de modo que un paso diagonal cuesta raiz de dos y no uno.'
            : 'A truck is an entity with a position, a heading, a cycle state, a payload with its source dig block, and the two polylines the product must be able to draw: the approach and the departure. Routes are solved by A* over the trafficable surface using true travel distance, so a diagonal step costs the square root of two rather than one.'}
        </p>
        <p>
          {es
            ? 'El POSICIONAMIENTO es donde entra la fisica. Resuelve el rumbo de descarga, y el terreno le gana al plan: cuando hay cresta cerca, el rumbo se toma de la normal de la cara, porque el deposito corre perpendicular a la tangente del punto de descarga y el plan se escribio antes de que la cara se moviera. Sin cara, la carga cae DETRAS del camion, porque un camion de descarga trasera retrocede para posicionarse.'
            : 'SPOTTING is where the physics enters. It resolves the discharge heading, and the terrain wins over the plan: when a crest is in range the heading is taken from the face normal, because the deposit runs perpendicular to the tangent of the dump location and the plan was written before the face moved. With no face the load lands BEHIND the truck, since a rear-dump reverses into position.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <Callout variant="note" title={es ? 'El plan propone, el sitio dispone' : 'The plan proposes, the site disposes'}>
          {es
            ? 'Un punto planificado a menudo no se puede ocupar. El operador se posiciona en el punto transitable mas cercano, que es exactamente lo que ocurre en terreno, y la desviacion se registra. Medido: 101 de 158 cargas caen exactamente donde se planificaron, con una desviacion media de 4,2 m. Esa brecha es la comparacion entre ubicacion planificada y real que un export de despacho permite hacer.'
            : 'A planned tip often cannot be occupied. The operator spots at the nearest workable point, which is exactly what happens on site, and the deviation is recorded. Measured: 101 of 158 loads land exactly as planned, mean deviation 4.2 m. That gap is the planned-against-actual dump location comparison a dispatch export supports.'}
        </Callout>
        </>
      ),
    },
    {
      id: 's3',
      label: es ? 'La geometría de descarga, calibrada' : 'The dump geometry, calibrated',
      content: (
        <>

        <p>
          {es
            ? 'Dos regimenes, porque la fuente describe dos. Un monton de paddock sobre terreno plano toma la forma de un tronco eliptico dimensionado por el propio camion, colocado con una pendiente inicial cercana a 2:1 que se asienta hasta el angulo de reposo con el tiempo. Un volcado de borde cae en cascada por la cara.'
            : 'Two regimes, because the source describes two. A paddock heap on flat ground takes the form of an elliptical frustum sized by the truck itself, emplaced at roughly a 2:1 slope which settles to the natural angle of repose over time. An edge dump cascades down the face.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p>
          {es
            ? 'El operador de borde se calibra contra las 28 descargas medidas, no se supone. El ancho se ajusta al ancho MEDIDO por tipo y no al del camion, porque el material se expande al descender: las mediciones dan 11 a 23 m contra una tolva de 7,3 m, y la fuente explica el tipo mas ancho como material adicional de la cara que se agrega a la masa mientras cae.'
            : 'The edge operator is calibrated against the 28 measured dumps rather than assumed. Width is fitted to the MEASURED width per type rather than to the truck, because material spreads as it descends: the measurements give 11 to 23 m against a 7.3 m bed, and the source explains the widest type as additional face material aggregating with the dump mass as it cascades.'}
          {' '}<Cite id="young2022" paren />
        </p>
        <p>
          {es
            ? 'Que tipo se forma lo decide la distancia a la cresta. Entre los tres tipos de cresta la fuente es explicita en que la posicion sola no lo determina y en que su hipotesis sobre carga despareja de la tolva nunca se probo, asi que la eleccion se toma de sus frecuencias medidas con una semilla fija. Las frecuencias son reales; la seleccion es reconocidamente estocastica.'
            : 'Which type forms is decided by distance to the crest. Among the three at-crest types the source is explicit that position alone does not determine it and that its hypothesis about uneven tray loading was never tested, so the choice is drawn from their measured frequencies with a fixed seed. The frequencies are real; the selection is admittedly stochastic.'}
          {' '}<Cite id="young2022" paren />
        </p>
        </>
      ),
    },
    {
      id: 's4',
      label: es ? 'Relajación al ángulo de reposo' : 'Relaxation to the angle of repose',
      content: (
        <>

        <p>
          {es
            ? 'La regla de derrumbe es la del automata de arena de Bak, Tang y Wiesenfeld, usada aqui solo como solucionador de relajacion conservativo: la pendiente critica se IMPONE como el angulo de reposo del material en vez de ser un parametro libre, y las estadisticas de avalancha quedan fuera de alcance. Una celda entrega un total T repartido como '
            : 'The toppling rule is the Bak, Tang and Wiesenfeld sandpile automaton, used here purely as a mass-conserving relaxation solver: the critical slope is IMPOSED as the material angle of repose rather than being a free parameter, and avalanche statistics are out of scope. A cell gives away a total T split as '}
          <InlineMath tex="t_k=\max(0,\,d_k-T)" />
          {es ? ' sobre sus vecinos demasiado empinados, de modo que ninguna restriccion se sobrepasa.' : ' over its over-steep neighbours, so no constraint is overshot.'}
          {' '}<Cite id="bak1987" paren />
        </p>
        <Equation
          tex="T=\sum_k \max\!\left(0,\; d_k-T\right) \;\Longrightarrow\; T=\frac{1}{k+1}\sum_{i=1}^{k} d_i"
          caption={es ? 'La ecuación de llenado que resuelve el derrumbe en un paso' : 'The water-filling equation that resolves a topple in one step'}
        />
        <Callout variant="honest" title={es ? 'El defecto que se veía como picos' : 'The defect that rendered as spikes'}>
          {es
            ? 'Cuando una celda se derrumba QUEDA MAS BAJA, lo que desestabiliza a las celdas de ARRIBA. El solucionador anterior solo volvia a encolar a las que recibian material, asi que con una cola de mayor-primero un vecino cuesta arriba se revisaba una vez, salia estable, y nunca se volvia a mirar despues de que esta celda cayera por debajo. Resultado medido: 446 pares de celdas paradas hasta 55,9 grados contra 37 impuestos. Ahora cero, y el invariante se ASEVERA en cada bake.'
            : 'When a cell topples it GETS LOWER, which destabilises the cells ABOVE it. The previous solver only re-queued the cells that received material, so with a highest-first queue an uphill neighbour was checked once, came out stable, and was never looked at again after this cell dropped below it. Measured result: 446 cell pairs standing at up to 55.9 degrees against an imposed 37. Now zero, and the invariant is ASSERTED on every bake.'}
        </Callout>
        </>
      ),
    },
    {
      id: 's5',
      label: es ? 'Segregación por tamaño en la cara' : 'Size segregation down the face',
      content: (
        <>

        <p>
          {es
            ? 'El motor tenia un solucionador de cribado cinetico y nunca lo aplicaba, porque en el producto anterior nada formaba una cara por la que una avalancha pudiera correr. Ahora el grueso corre al pie y el fino queda cerca de la cresta, con parte del grueso rodando MAS ALLA del pie. Tres impulsores publicados, todos cantidades que el motor ya tenia: altura de caida, angulo de la cara y dispersion de tamanos.'
            : 'The engine carried a kinetic sieving solver and never applied it, because in the previous product nothing ever formed a face for an avalanche to run down. Coarse now runs to the toe and fines stay near the crest, with part of the coarse rolling BEYOND the toe. Three published drivers, all of them quantities the engine already had: drop height, face angle and size spread.'}
          {' '}<Cite id="gray2005" paren /> <Cite id="savage1988" paren />
        </p>
        <p>
          {es
            ? 'Un material de un solo tamano o una descarga en plano no segregan en absoluto, que es el caso degenerado que demuestra que el modelo no esta pintando un gradiente sobre todo. La guia publicada limita los acopios conicos a 10 a 12 m porque cada metro adicional aumenta la segregacion por percolacion, asi que en una pila mas baja una intensidad baja es la respuesta correcta.'
            : 'A single-sized material or a tip on flat ground produces no sorting whatsoever, which is the degenerate case proving the model is not painting a gradient on everything. Published guidance limits conical stockpiles to 10 to 12 m because each additional metre increases percolation segregation, so on a shorter pile a low intensity is the correct answer.'}
        </p>
        <Callout variant="note" title={es ? 'Lo que se afirma y lo que no' : 'What is and is not claimed'}>
          {es
            ? 'La DIRECCION de cada efecto esta publicada y repetida en fuentes independientes. Las formas funcionales son las curvas mas simples que reproducen esas afirmaciones. Es un modelo operacional defendible, no uno constitutivo validado, y calibrarlo con DEM o con el ensayo de laboratorio correspondiente queda registrado como trabajo futuro en vez de suponerse hecho.'
            : 'The DIRECTION of every effect is published and repeated across independent sources. The functional forms are the simplest curves reproducing those statements. This is a defensible operational model, not a validated constitutive one, and calibrating it with DEM or the corresponding laboratory test is recorded as future work rather than quietly assumed.'}
        </Callout>
        </>
      ),
    },
    {
      id: 's6',
      label: es ? 'El bulldozer, y la honestidad sobre la trazabilidad' : 'The dozer, and honesty about provenance',
      content: (
        <>

        <p>
          {es
            ? 'El bulldozer nivela el piso, empuja material sobre la cara, levanta bermas y desplaza material lateralmente. La fuente es directa: esas acciones mezclan el material desde su ubicacion original de descarga de formas intratables, y por eso es dificil saber donde esta el material dentro del acopio.'
            : 'The dozer levels the floor, pushes material over the face, raises berms and displaces material laterally. The source is direct: those actions mix the material from its initial dumping location in intractable ways, which is why it is hard to know where material is located within the stockpile.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <p>
          {es
            ? 'Consecuencia, y es un requisito de honestidad y no una funcionalidad: la version anterior reportaba fracciones de procedencia que sumaban uno con 1e-12 de tolerancia y presentaba eso como respuesta. Con un bulldozer en el modelo esa precision pertenece a la simulacion, no al mundo. El desplazamiento medio medido es de 7,34 m, y la procedencia ahora lo lleva adjunto.'
            : 'Consequence, and it is an honesty requirement rather than a feature: the previous version reported provenance fractions summing to one within 1e-12 and presented that as an answer. With a dozer in the model that precision belongs to the simulation, not to the world. Measured mean displacement is 7.34 m, and provenance now carries it attached.'}
        </p>
        </>
      ),
    },
    {
      id: 's7',
      label: es ? 'Recuperación y el veredicto' : 'Reclaim and the verdict',
      content: (
        <>

        <p>
          {es
            ? 'Recuperar hace que el procesamiento del acopio se parezca a minar una pila de tronadura, sujeto a los mismos metodos de control de leyes y planificacion. La maquina engancha una LOSA, acotada por profundidad de corte y ancho, parada sobre un nivel de trabajo con una altura de cara segura, y avanza en secuencia. Tres ordenes: ultimo en entrar primero en salir, primero en entrar primero en salir, y altura completa. Solo el ultimo mezcla los bancos.'
            : 'Reclaiming makes stockpile processing similar to mining a muck pile, subject to the same methods of ore control and mine planning. The machine engages a SLAB, bounded by cut depth and width, standing on a working level with a safe face height, and it advances in sequence. Three orders: last-in-first-out, first-in-first-out, and full height. Only the last blends the lifts.'}
          {' '}<Cite id="young2021" paren />
        </p>
        <Equation
          tex="\mathrm{VRR}=\frac{\sigma^2_{\text{out}}}{\sigma^2_{\text{in}}},\qquad \mathrm{VRR}_{\text{ideal}}=\frac{1}{N},\qquad \eta=\frac{\mathrm{VRR}_{\text{ideal}}}{\mathrm{VRR}}"
          caption={es ? 'La razón, la cota de N capas independientes, y la eficiencia contra ella' : 'The ratio, the N-independent-layer bound, and the efficiency against it'}
        />
        <p>
          {es
            ? 'La razon nunca se muestra sola. El ideal es tipicamente tres a cuatro veces mejor que lo que logra cualquier cama real, asi que una razon citada sin su cota se lee mucho mas favorable de lo que es. Y N no se configura: se mide como el numero medio de bloques de origen distintos de los que cada corte efectivamente tomo.'
            : 'The ratio is never shown alone. The ideal is typically three to four times better than any real bed achieves, so a ratio quoted without its bound reads far more flattering than it is. And N is not configured: it is measured as the mean number of distinct source blocks each cut actually drew from.'}
          {' '}<Cite id="schramm2021" paren /> <Cite id="kumral2006" paren />
        </p>
        <Refs
          ids={['young2021', 'young2022', 'moraga2017', 'bak1987', 'gray2005', 'savage1988', 'schramm2021', 'kumral2006']}
          label="Refs"
        />
        </>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Metodología' : 'Methodology'}</h1>
        <p className="lede">
          {es
            ? 'El material pasa por siete operadores: el terreno que lo restringe, el plan que decide donde va, el camion que lo lleva, la descarga que le da forma, la relajacion que lo asienta, el bulldozer que lo mueve otra vez, y la recuperacion que lo saca. Cada uno se describe abajo con su fuente.'
            : 'Material passes through seven operators: the terrain that constrains it, the plan that decides where it goes, the truck that carries it, the dump that shapes it, the relaxation that settles it, the dozer that moves it again, and the reclaim that takes it out. Each is described below with its source.'}
        </p>
      </div>

      <Tabs tabs={tabs} ariaLabel={es ? 'Secciones' : 'Sections'} />
    </div>
  );
}
