// ADR-0058: the in-app Architecture modal. Five tabs, each pairing ONE hand-authored theme-aware SVG
// with a bilingual explanation, opened by the always-visible header button.
//
// The SVGs live in public/svg/tech/ and are FETCHED AND INLINED by the shell, which is why every
// colour in them is a CSS variable token: an <img> would not inherit the variables and a single
// hardcoded hex would break one theme.
//
// The depth here is meant to be complete rather than a teaser. A reader who opens the modal and reads
// every tab should come away knowing the system as well as reading the repository wiki.

import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  title_en: 'How StockTwin works',
  title_es: 'Como funciona StockTwin',
  tabs: [
    {
      id: 'app',
      en: 'The app',
      es: 'La aplicacion',
      svg: 'svg/tech/01-the-app.svg',
      body_en:
        'StockTwin simulates a physical stockpile end to end: haul trucks deposit loads onto a pad, the pile relaxes to its angle of repose, granular size segregation redistributes material along every avalanche path, and a reclaimer takes cuts that blend the stacked layers back together. Every reclaimed tonne keeps a fractional record of the deposition events it came from.\n\n'
        + 'It answers three questions. How much does the pile homogenize the feed, measured as the variance reduction ratio and always shown against the independent-layer bound. Where did this reclaimed tonne come from, answered by the per-cell lot ledger. And how much is size segregation biasing the cut, answered by a published continuum model rather than by a rule of thumb.\n\n'
        + 'The design-build flow behind it: a deep research pass persisted as dated dossiers, a plan validated before any code, then unit by unit the engine, its invariant tests and its documentation page in the same commit. Nothing in the docs is recalled from memory; it is transcribed from the dossiers at build time.\n\n'
        + 'What it is NOT: in-plant metal accounting, a comminution or flotation model, or a blending optimizer. It exposes the state an optimizer would consume and emits no plant setpoint.',
      body_es:
        'StockTwin simula una pila de acopio de extremo a extremo: los camiones descargan sobre una losa, la pila se relaja hasta su angulo de reposo, la segregacion granular por tamano redistribuye el material a lo largo de cada avalancha, y un recuperador toma cortes que vuelven a mezclar las capas apiladas. Cada tonelada recuperada conserva el registro fraccionario de los eventos de deposicion de los que proviene.\n\n'
        + 'Responde tres preguntas. Cuanto homogeniza la pila la alimentacion, medido como razon de reduccion de varianza y siempre mostrado contra la cota de capas independientes. De donde vino esta tonelada recuperada, que responde el libro mayor de lotes por celda. Y cuanto sesga la segregacion por tamano lo que contiene el corte, que responde un modelo continuo publicado y no una regla practica.\n\n'
        + 'El flujo de diseno detras: una pasada profunda de investigacion persistida en dosieres fechados, un plan validado antes de escribir codigo, y luego unidad por unidad el motor, sus pruebas de invariantes y su pagina de documentacion en el mismo commit. Nada en la documentacion se escribe de memoria: se transcribe de los dosieres al construir.\n\n'
        + 'Lo que NO es: contabilidad metalurgica de planta, un modelo de conminucion o flotacion, ni un optimizador de mezcla. Expone el estado que consumiria un optimizador y no emite ninguna consigna de planta.',
    },
    {
      id: 'lanes',
      en: 'The lanes',
      es: 'Los carriles',
      svg: 'svg/tech/02-lanes.svg',
      body_en:
        'Three lanes with SEPARATE dependencies and separate implementations.\n\n'
        + 'LIVE, in the browser, TypeScript: the whole pile loop. The relaxation cascade, the five stacking geometries, the four reclaim geometries, the lot ledger, the Gray-Thornton segregation solver, the variance reduction ratio, the variograms and the residence-time distribution all run on every control change. The live lane is TypeScript and not Pyodide because the two hot algorithms are a height-field relaxation and a per-column hyperbolic solve, both of which must answer inside a 100 ms slider budget that a Pyodide cold start plus per-frame marshalling cannot meet.\n\n'
        + 'OFFLINE, precompute, Python: the canonical bake. Ore-body generation, sequential Gaussian simulation of the controlled cases, the multi-seed credible bands over 31 seeds, the depth-averaged reclaim-face solve, the discrete-element calibration heap, surrogate training and export. Producing a 31-seed band live on every slider move would be a compute bomb, so the bands are baked and the live single-seed result is drawn against them.\n\n'
        + 'REPLAY: the committed compact trace plus its manifest. First paint, and whatever the live lane cannot do.\n\n'
        + 'The lane is decided by MEASUREMENT, not by intent: the gate records the measured runtime and byte size, writes the verdict into the manifest, and the build fails on a mislabelled lane.',
      body_es:
        'Tres carriles con dependencias e implementaciones SEPARADAS.\n\n'
        + 'EN VIVO, en el navegador, TypeScript: todo el ciclo de la pila. La cascada de relajacion, las cinco geometrias de apilado, las cuatro de recuperacion, el libro mayor de lotes, el solucionador de segregacion de Gray y Thornton, la razon de reduccion de varianza, los variogramas y la distribucion de tiempo de residencia se recalculan con cada cambio de control. El carril en vivo es TypeScript y no Pyodide porque los dos algoritmos criticos son una relajacion de campo de alturas y una resolucion hiperbolica por columna, y ambos deben responder dentro de un presupuesto de 100 ms que un arranque en frio de Pyodide mas el marshalling por cuadro no puede cumplir.\n\n'
        + 'FUERA DE LINEA, precomputo, Python: el horneado canonico. Generacion del cuerpo mineralizado, simulacion gaussiana secuencial de los casos controlados, las bandas de credibilidad sobre 31 semillas, la resolucion promediada en profundidad de la cara de recuperacion, el monticulo de calibracion por elementos discretos, y el entrenamiento y exportacion de los sustitutos. Producir una banda de 31 semillas en vivo con cada movimiento del control seria una bomba de computo, asi que las bandas se hornean y el resultado en vivo de una semilla se dibuja contra ellas.\n\n'
        + 'REPLAY: la traza compacta comprometida mas su manifiesto. El primer dibujo, y todo lo que el carril en vivo no pueda hacer.\n\n'
        + 'El carril se decide por MEDICION, no por intencion: la compuerta registra el tiempo y el tamano medidos, escribe el veredicto en el manifiesto, y la construccion falla si un carril esta mal etiquetado.',
    },
    {
      id: 'web',
      en: 'The web app',
      es: 'La aplicacion web',
      svg: 'svg/tech/03-web-flow.svg',
      body_en:
        'A static single-page application with no backend. The App route runs the engine live on the controls; the five documentation routes are prose; the focus route renders outside the shell because the header and footer are exactly the chrome it exists to escape.\n\n'
        + 'The build has three separate steps that never merge. The canonical bake writes the traces and manifests into data/derived and is an explicit release operation. The web build copies those already-audited artifacts into the site and compiles the bundle; a TypeScript mirror of the artifact schema means a drift between the Python writer and the browser reader fails the build. Deployment verifies the committed artifacts and publishes; a deployment is never an experiment.\n\n'
        + 'The case registry is GENERATED from the Python definitions, and continuous integration fails if the generated file is stale. Hand-mirroring seventeen cases into a second language would drift on the first edit, and the drift would be invisible: the browser would simply be running a slightly different experiment from the one the pipeline baked.\n\n'
        + 'Every verdict the page shows is recomputed in the browser from the trace events. The trace deliberately carries no baked variance reduction ratio, so a reader can change a control, watch the number move, and know it was derived rather than looked up.',
      body_es:
        'Una aplicacion de pagina unica estatica, sin backend. La ruta App ejecuta el motor en vivo sobre los controles; las cinco rutas de documentacion son prosa; la ruta de foco se dibuja fuera del shell porque el encabezado y el pie son exactamente el cromo del que existe para escapar.\n\n'
        + 'La construccion tiene tres pasos separados que nunca se mezclan. El horneado canonico escribe las trazas y manifiestos en data/derived y es una operacion explicita de release. La construccion web copia esos artefactos ya auditados al sitio y compila el paquete; un espejo TypeScript del esquema del artefacto hace que una divergencia entre el escritor Python y el lector del navegador rompa la construccion. El despliegue verifica los artefactos comprometidos y publica; un despliegue nunca es un experimento.\n\n'
        + 'El registro de casos se GENERA desde las definiciones en Python, y la integracion continua falla si el archivo generado esta desactualizado. Duplicar a mano diecisiete casos en un segundo lenguaje divergiria en la primera edicion, y la divergencia seria invisible: el navegador simplemente estaria corriendo un experimento distinto del que horneo la tuberia.\n\n'
        + 'Cada veredicto que muestra la pagina se recalcula en el navegador a partir de los eventos de la traza. La traza deliberadamente no lleva una razon de reduccion de varianza horneada, de modo que un lector puede mover un control, ver moverse el numero y saber que fue derivado y no consultado.',
    },
    {
      id: 'science',
      en: 'The science',
      es: 'La ciencia',
      svg: 'svg/tech/04-the-science.svg',
      body_en:
        'Block model to dig sequence to truck stream to pile to reclaim cut, with the equations at each step.\n\n'
        + 'THE STREAM. A stationary Gaussian process in cumulative tonnage with an exponential covariance, C(h) = sill exp(-3h/a), generated exactly by a one-step recursion. Autocorrelation is the point: if consecutive trucks are correlated, the layers a cut crosses are not independent samples, and a white-noise input would make every bed look excellent while hiding the dominant effect in the domain.\n\n'
        + 'THE PILE. A height field relaxes until no local slope exceeds the imposed angle of repose. A cell topples exactly to its repose surface in one step by giving away t_k = max(0, d_k - T) with T solving T = sum_k max(0, d_k - T). The highest unstable cell topples first, so the ordered transfers ARE the avalanche path.\n\n'
        + 'THE SEGREGATION. Gray and Thornton (2005) equation (3.20): on a flank, plug flow reduces the model to a one-dimensional conservation law in depth, dphi/dx + d/dz[-Sr phi(1-phi)] = 0, with no flux at the surface or the base, solved with a Godunov flux so the concentration shocks survive. Fines drain to the base of the flowing layer and are deposited first, so the toe ends up coarse as an OUTPUT rather than a rule.\n\n'
        + 'THE LEDGER. Every cell holds an ordered stack of lots; a reclaim cut pops according to the geometry and reports the fraction of its tonnage from each deposition event. The fractions sum to one, checked numerically on every cut.\n\n'
        + 'THE VALUE. VRR = var_out / var_in on a tonnage base, lower is better, always against the derived bound 1/N. Real beds recover roughly a quarter to a third of that ideal, and the product shows the gap rather than the flattering half of it.',
      body_es:
        'Modelo de bloques a secuencia de extraccion a flujo de camiones a pila a corte recuperado, con las ecuaciones en cada paso.\n\n'
        + 'EL FLUJO. Un proceso gaussiano estacionario en tonelaje acumulado con covarianza exponencial, C(h) = meseta exp(-3h/a), generado exactamente por una recursion de un paso. La autocorrelacion es el punto: si camiones consecutivos estan correlacionados, las capas que cruza un corte no son muestras independientes, y una entrada de ruido blanco haria que toda cama pareciera excelente ocultando el efecto dominante del dominio.\n\n'
        + 'LA PILA. Un campo de alturas se relaja hasta que ninguna pendiente local supera el angulo de reposo impuesto. Una celda cae exactamente a su superficie de reposo en un paso cediendo t_k = max(0, d_k - T) con T que resuelve T = suma_k max(0, d_k - T). La celda inestable mas alta cae primero, de modo que las transferencias ordenadas SON el camino de la avalancha.\n\n'
        + 'LA SEGREGACION. Ecuacion (3.20) de Gray y Thornton (2005): en un flanco, el flujo tapon reduce el modelo a una ley de conservacion unidimensional en profundidad, dphi/dx + d/dz[-Sr phi(1-phi)] = 0, sin flujo en la superficie ni en la base, resuelta con un flujo de Godunov para que sobrevivan los choques de concentracion. Los finos drenan a la base de la capa fluyente y se depositan primero, de modo que el pie queda grueso como SALIDA y no como regla.\n\n'
        + 'EL LIBRO MAYOR. Cada celda guarda una pila ordenada de lotes; un corte extrae segun la geometria y reporta la fraccion de su tonelaje proveniente de cada evento de deposicion. Las fracciones suman uno, verificado numericamente en cada corte.\n\n'
        + 'EL VALOR. VRR = var_salida / var_entrada sobre base de tonelaje, menor es mejor, siempre contra la cota derivada 1/N. Las camas reales recuperan aproximadamente entre un cuarto y un tercio de ese ideal, y el producto muestra la brecha en vez de solo la mitad halagadora.',
    },
    {
      id: 'contracts',
      en: 'The data contracts',
      es: 'Los contratos de datos',
      svg: 'svg/tech/05-data-contracts.svg',
      body_en:
        'CONTRACT 1, ingestion: the bring-your-own-data gate. A truck dump log declares its columns, units and ranges, with an explicit outlier policy. A row failing a hard range is REJECTED with a stated reason; a row failing a soft check is FLAGGED, kept, counted and rendered with a marker; nothing is silently coerced, because a coerced row looks like data and is not. Rows out of time order and dumps outside the pad extent are rejected. The table shown on the Implementation page is GENERATED from the code that enforces the contract, so documentation and behaviour cannot drift apart.\n\n'
        + 'CONTRACT 2, artifact: the manifest and the compact trace. The manifest is a pure function of parameters and seed, with no wall-clock and no absolute path, so a re-bake that changes nothing changes no bytes and the git history of the evidence stays readable. It carries the case and why it is in the matrix, the artifact hash and size, the lane verdict with its budgets, the flags the ingestion gate raised, and the measured metrics with their multi-seed band.\n\n'
        + 'THE CASES ARE THE VALIDATION DESIGN. Seventeen cases in five categories: stacking geometry, reclaim method, input variability, segregation regime, and three controls with numerical kill criteria. Each case states its scientific reason, its expected behaviour, and what result would mean the code is wrong. Every case is held out of surrogate training, and the splits are by seed AND input structure, because splitting by seed alone would leak the shape of the stream.\n\n'
        + 'THE REAL LANE. MineLib block models carry real copper grades. MineLib grants academic download only with no redistribution, so the instances are fetched at runtime into browser memory and appear nowhere in the repository or the built bundle.',
      body_es:
        'CONTRATO 1, ingesta: la puerta de trae-tus-propios-datos. Un registro de descargas de camion declara sus columnas, unidades y rangos, con una politica explicita de valores atipicos. Una fila que falla un rango duro se RECHAZA con una razon declarada; una que falla una verificacion blanda se MARCA, se conserva, se cuenta y se dibuja con un indicador; nada se corrige en silencio, porque una fila corregida parece dato y no lo es. Se rechazan las filas fuera de orden temporal y las descargas fuera de la losa. La tabla que muestra la pagina de Implementacion se GENERA desde el codigo que aplica el contrato, de modo que documentacion y comportamiento no pueden divergir.\n\n'
        + 'CONTRATO 2, artefacto: el manifiesto y la traza compacta. El manifiesto es funcion pura de parametros y semilla, sin reloj ni rutas absolutas, de modo que un rehorneado que no cambia nada no cambia ningun byte y la historia de la evidencia sigue siendo legible. Lleva el caso y por que esta en la matriz, el hash y tamano del artefacto, el veredicto de carril con sus presupuestos, las marcas que levanto la ingesta, y las metricas medidas con su banda multi-semilla.\n\n'
        + 'LOS CASOS SON EL DISENO DE VALIDACION. Diecisiete casos en cinco categorias: geometria de apilado, metodo de recuperacion, variabilidad de entrada, regimen de segregacion, y tres controles con criterios numericos de descarte. Cada caso declara su razon cientifica, su comportamiento esperado y que resultado significaria que el codigo esta mal. Todos quedan fuera del entrenamiento de los sustitutos, y las particiones son por semilla Y estructura de entrada, porque particionar solo por semilla filtraria la forma del flujo.\n\n'
        + 'EL CARRIL REAL. Los modelos de bloques de MineLib llevan leyes de cobre reales. MineLib otorga solo descarga academica sin redistribucion, asi que las instancias se descargan en tiempo de ejecucion a la memoria del navegador y no aparecen en el repositorio ni en el paquete construido.',
    },
  ],
};
