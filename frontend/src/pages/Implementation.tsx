import { Callout, Equation, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';

/** ADR-0017 section 2: at least eight tabs, the exact algorithm steps and constants, the live and
 *  precompute boundary, the artifact contract, and a real deployment tab. Not "stack: React and Vite". */
export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Implementación' : 'Implementation'}</h1>
        <p className="lede">
          {es
            ? 'Como esta construido: los tres carriles y por qué están separados, los dos contratos de datos, las diez etapas con nombre de la tuberia, la compuerta medida que decide que corre en vivo, el determinismo qué hace reproducible cada traza, y el despliegue. Cada número de esta página es un presupuesto medido o una constante del codigo, no una aspiración.'
            : 'How it is built: the three lanes and why they are separate, the two data contracts, the ten named pipeline stages, the measured gate that decides what runs live, the determinism that makes every trace reproducible, and the deploy. Every number on this page is a measured budget or a constant in the code, not an aspiration.'}
        </p>
      </div>

      <SubTabs orientation="vertical" ariaLabel={es ? 'Implementación' : 'Implementation'} tabs={[
        { id: 'arch', label: es ? 'Arquitectura' : 'Architecture', content: <Arch es={es} /> },
        { id: 'lanes', label: es ? 'Los tres carriles' : 'The three lanes', content: <Lanes es={es} /> },
        { id: 'contract1', label: es ? 'Contrato 1, ingesta' : 'Contract 1, ingestion', content: <C1 es={es} /> },
        { id: 'contract2', label: es ? 'Contrato 2, artefacto' : 'Contract 2, artifact', content: <C2 es={es} /> },
        { id: 'stages', label: es ? 'Las diez etapas' : 'The ten stages', content: <Stages es={es} /> },
        { id: 'gate', label: es ? 'La compuerta de carril' : 'The lane gate', content: <Gate es={es} /> },
        { id: 'perf', label: es ? 'Rendimiento' : 'Performance', content: <Perf es={es} /> },
        { id: 'determinism', label: es ? 'Determinismo' : 'Determinism', content: <Determinism es={es} /> },
        { id: 'deploy', label: es ? 'Despliegue' : 'Deployment', content: <Deploy es={es} /> },
      ]} />
    </div>
  );
}

function Arch({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'La forma del repositorio' : 'The shape of the repository'}</h2>
      <p>
        {es
          ? 'El repositorio es el producto; el sitio web es una superficie companera y un consumidor de sus salidas. Un tercero debería poder clonarlo y, con comandos documentados, validar datos por el contrato de ingesta, construir la matriz de casos, hornear cada caso, evaluar cada método y reproducir el benchmark publicado, sin abrir el navegador ni una vez.'
          : 'The repository is the product; the website is a companion surface and one consumer of its outputs. A third party should be able to clone it and, with documented commands, validate data through the ingestion contract, build the case matrix, bake every case, evaluate every method and reproduce the published benchmark, without opening the browser once.'}
      </p>
      <div className="codeblock">{`CAOS_StockTwin/
  data-pipeline/stlab/
    model/      the shared analytic core, mirrored by the TypeScript live lane
      heightfield.py   method 1, the priority-cascade relaxation
      segregation.py   method 4, the Gray-Thornton conservation law
      pile.py          method 8, the lot ledger, deposition and reclaim
      stacking.py      method 2, the five deposition paths
      blending.py      methods 9, 10, 11, VRR, variograms, the 1/N bound
      rtd.py           method 12, the residence-time distribution
      stream.py        the exponential-covariance grade stream
      run.py           the driver: simulate, measure, variograms, regime
    io/         contract.py (CONTRACT 1), schema.py, formats.py
    core/       rng.py, trace.py, manifest.py (CONTRACT 2), gate.py
    stages/     the ten named pipeline stages
    cases/      the seventeen-case matrix with its kill criteria
    pipeline.py the orchestrator and CLI
  frontend/src/
    engine/     the TypeScript mirror of model/, plus the GENERATED case registry
    pages/      App, Introduction, Methodology, Implementation, Experiments, Benchmark, Focus
    viz/        the 3-D pile, the uPlot wrapper, the Sankey, the panels
    lib/        the artifact fetchers and the TypeScript mirror of CONTRACT 2
  data/derived/ the committed traces, metrics and manifests
  tests/        the invariant suite
  docs/         the wiki, authored as each unit lands`}</div>
      <p>
        {es
          ? 'El registro de casos del navegador se genera desde las definiciones en Python por scripts/export_cases.py, y la integración continua vuelve a ejecutarlo y falla si el archivo generado quedo desactualizado. Duplicar a mano diecisiete casos con sus razones, bandas esperadas y criterios de descarte en un segundo lenguaje divergiria en la primera edición, y la divergencia sería invisible: el navegador estaría corriendo un experimento distinto del que horneo la tuberia mientras ambos reportan los mismos identificadores.'
          : 'The browser’s case registry is generated from the Python definitions by scripts/export_cases.py, and continuous integration re-runs it and fails if the generated file is stale. Hand-mirroring seventeen cases with their reasons, expected bands and kill criteria into a second language would drift on the first edit, and the drift would be invisible: the browser would be running a different experiment from the one the pipeline baked while both reported the same ids.'}
      </p>
      <Refs ids={['espinoza2013', 'oreblocks']} label="Refs" />
    </>
  );
}

function Lanes({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Tres carriles, con dependencias e implementaciones separadas' : 'Three lanes, with separate dependencies and implementations'}</h2>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'carril' : 'lane'}</th>
            <th>{es ? 'dependencias' : 'dependencies'}</th>
            <th>{es ? 'que corre' : 'what runs'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'En vivo' : 'Live'}</td>
            <td className="st-mono">npm</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'todo el ciclo de la pila: relajación, apilado, recuperación, libro mayor, segregación, VRR, variogramas, residencia. Se recalcula con cada cambio de control.' : 'the whole pile loop: relaxation, stacking, reclaim, ledger, segregation, VRR, variograms, residence. Recomputed on every control change.'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'Fuera de línea' : 'Offline'}</td>
            <td className="st-mono">requirements-precompute.txt</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'el horneado canónico: bandas de 31 semillas, generación del cuerpo mineralizado con oreblocks, simulación gaussiana secuencial con GSTools, entrenamiento y exportación de sustitutos.' : 'the canonical bake: 31-seed bands, ore-body generation with oreblocks, sequential Gaussian simulation with GSTools, surrogate training and export.'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'Elementos discretos' : 'Discrete element'}</td>
            <td className="st-mono">environment-dem.yml</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'la calibración del número de segregación contra un monticulo bidisperso. Separado porque PyChrono solo se publica en conda-forge y el carril principal debe seguir siendo instalable con pip.' : 'the segregation-number calibration against a bidisperse heap. Separate because PyChrono is published only on conda-forge and the main lane must stay pip-installable.'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'Replay' : 'Replay'}</td>
            <td className="st-mono">-</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'la traza compacta comprometida y su manifiesto: el primer dibujo y las páginas de resumen entre casos.' : 'the committed compact trace and its manifest: first paint and the cross-case summary pages.'}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {es
          ? 'Por qué el carril en vivo es TypeScript y no Pyodide. Los dos algoritmos criticos son una relajación de campo de alturas y una resolución hiperbolica por columna, ambos triviales sobre arreglos tipados, y ambos deben responder dentro de un presupuesto de 100 ms en cada movimiento de un control. Un arranque en frio de Pyodide más el marshalling por cuadro no puede cumplirlo. El carril Pyodide de SimLab es correcto para su problema y equivocado para este, y la compuerta registra el tiempo medido que justifica la elección, de modo que la decisión es evidencia y no preferencia.'
          : 'Why the live lane is TypeScript and not Pyodide. The two hot algorithms are a height-field relaxation and a per-column hyperbolic solve, both trivial over typed arrays, and both must answer inside a 100 ms budget on every control move. A Pyodide cold start plus per-frame marshalling cannot meet that. SimLab’s Pyodide lane is right for its problem and wrong for this one, and the gate records the measured runtime that justifies the choice, so the decision is evidence rather than preference.'}
      </p>
      <p>
        {es
          ? 'Las bandas multi-semilla son la única excepción a la regla de que el navegador recalcula todo. Producir una banda de 31 semillas requiere 31 simulaciones completas; hacerlo en cada movimiento de un control sería exactamente la bomba de computo que la regla de no autoreproducción existe para evitar. Las bandas se hornean fuera de línea y el resultado en vivo de una semilla se dibuja contra ellas.'
          : 'The multi-seed bands are the single exception to the rule that the browser recomputes everything. Producing a 31-seed band needs 31 full simulations; doing that on every control move would be exactly the compute bomb the no-autoplay rule exists to prevent. The bands are baked offline and the live single-seed result is drawn against them.'}
      </p>
      <Refs ids={['oreblocks', 'muller2022']} label="Refs" />
    </>
  );
}

function C1({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Contrato 1, ingesta: la puerta de trae-tus-propios-datos' : 'Contract 1, ingestion: the bring-your-own-data gate'}</h2>
      <p>
        {es
          ? 'Un lector con un export real de despacho debe poder cargarlo por el mismo lector que usa el producto internamente y obtener una respuesta clara sobre que se acepto, que se descarto y que se conservo pero es sospechoso. Sin eso, un producto solo reproduce sus propios casos horneados y la promesa de aplicarlo a datos propios queda vacia.'
          : 'A reader with a real dispatch export must be able to load it through the same reader the product uses internally, and get a clear answer about what was accepted, what was thrown out, and what was kept but is suspicious. Without that a product only replays its own baked cases and the apply-this-to-your-data claim is empty.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'columna' : 'column'}</th>
            <th>{es ? 'unidad' : 'unit'}</th>
            <th>{es ? 'regla' : 'rule'}</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['timestamp', 's', es ? 'requerida, numérica, no decreciente' : 'required, numeric, non-decreasing'],
            ['tonnes', 't', es ? 'requerida, rechaza fuera de [1, 500]' : 'required, reject outside [1, 500]'],
            ['grade_cu_pct', '% Cu', es ? 'requerida, rechaza fuera de [0, 20]' : 'required, reject outside [0, 20]'],
            ['grade_au_gpt', 'g/t Au', es ? 'opcional, por defecto 0, rechaza fuera de [0, 200]' : 'optional, default 0, reject outside [0, 200]'],
            ['coarse_frac', '-', es ? 'opcional, por defecto 0,35, rechaza fuera de [0, 1]' : 'optional, default 0.35, reject outside [0, 1]'],
            ['moisture_pct', '%', es ? 'opcional, por defecto 3, rechaza sobre 30, marca sobre 20' : 'optional, default 3, reject above 30, flag above 20'],
            ['size_p80_mm', 'mm', es ? 'opcional, rechaza fuera de [1, 2000]' : 'optional, reject outside [1, 2000]'],
            ['dump_easting / northing', 'm', es ? 'opcional, rechaza fuera de la losa declarada' : 'optional, reject outside the declared pad'],
          ].map(([c, u, r]) => (
            <tr key={c}>
              <td className="st-mono" style={{ textAlign: 'left' }}>{c}</td>
              <td>{u}</td>
              <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {es
          ? 'La politica de valores atipicos, en palabras y no solo en codigo. Una fila que falla un rango duro se rechaza, con la razón registrada y contada; nada se corrige en silencio, porque una fila corregida parece dato y no lo es. Una fila que falla una verificación blanda se marca: se acepta, se cuenta, se lleva al manifiesto y se dibuja con un indicador. Las verificaciones blandas son dos: una ley a más de cuatro sigmas robustas de la mediana del archivo, y humedad sobre 20 por ciento, que se marca porque el ángulo de reposo seco deja de ser valido para manejo humedo.'
          : 'The outlier policy, in words and not only in code. A row failing a hard range is rejected, with the reason recorded and counted; nothing is silently coerced, because a coerced row looks like data and is not. A row failing a soft check is flagged: accepted, counted, carried into the manifest, and rendered with a marker. There are two soft checks: a grade more than four robust sigmas from the file’s median, and moisture above 20 percent, flagged because the dry angle of repose stops being valid for wet handling.'}
      </p>
      <Equation
        tex="\hat\sigma = 1.4826 \cdot \mathrm{median}\big(|g_i - \mathrm{median}(g)|\big)"
        caption={es
          ? 'La escala robusta usada por la verificación de valores atipicos. Una desviación estandar comun estaría inflada por los mismos atipicos que se buscan, así que una fila groseramente equivocada podría esconderse tras el ancho que ella misma creo. El factor 1,4826 hace de la MAD un estimador consistente de sigma para datos normales.'
          : 'The robust scale used by the outlier check. A plain standard deviation would be inflated by the very outliers being looked for, so a grossly wrong row could hide behind the width it created. The 1.4826 factor makes the MAD a consistent estimator of sigma for normal data.'} />
      <Callout variant="note" title={es ? 'La tabla se genera del codigo' : 'The table is generated from the code'}>
        {es
          ? 'La tabla de arriba se produce a partir de la misma estructura que aplica el contrato. Documentación escrita aparte del codigo que describe deriva; teniendo una sola fuente, la página no puede discrepar de la puerta.'
          : 'The table above is produced from the same structure that enforces the contract. Documentation written separately from the code it describes drifts; with a single source the page cannot disagree with the gate.'}
      </Callout>
      <Refs ids={['zhao2021']} label="Refs" />
    </>
  );
}

function C2({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Contrato 2, artefacto: el manifiesto y la traza compacta' : 'Contract 2, artifact: the manifest and the compact trace'}</h2>
      <p>
        {es
          ? 'La traza lleva los eventos y la geometría: las descargas, los cortes con sus fracciones de procedencia, unas pocas instantaneas de altura y el campo final. NO lleva los veredictos. La razón de reducción, los variogramas, la eficiencia contra la cota y la recomendación se recalculan en el navegador a partir de esos eventos.'
          : 'The trace carries the events and the geometry: the dumps, the cuts with their provenance fractions, a handful of height snapshots and the final field. It does not carry the verdicts. The reduction ratio, the variograms, the efficiency against the bound and the recommendation are all recomputed in the browser from those events.'}
      </p>
      <p>
        {es
          ? 'Esa separación es la razón por la que los numeros de la página son auditables: un lector cambia un control, ve moverse la métrica y sabe que fue derivada y no consultada. Una traza que enviara una razón de reducción horneada sería una diapositiva, y su número sería infalsable.'
          : 'That separation is why the numbers on the page are auditable: a reader changes a control, watches the metric move, and knows it was derived rather than looked up. A trace that shipped a baked reduction ratio would be a slide, and its number would be unfalsifiable.'}
      </p>
      <div className="codeblock">{`{
  "schema": "stocktwin.trace/v1",
  "case_id": "G01_chevron", "seed": 42,
  "pad":    { "nx": 64, "ny": 24, "cell_m": 3.0, "repose_deg": 37.0, ... },
  "config": { "stacking": "chevron", "reclaim": "fullface", "n_passes": 24, "sr": 1.0 },
  "events": [ { "id": 0, "t": 0.0, "t_t": 220.4, "cu": 0.61, "cf": 0.34, "x": .., "y": .. }, ... ],
  "cuts":   [ { "id": 0, "t": .., "t_t": 900.0, "cu": 0.604, "n": 19,
                "srcs": [[12, 0.081], [13, 0.077], ...] }, ... ],
  "snapshots": [ { "t_s": .., "h": [ ... nx*ny ... ] }, ... ],
  "final":  { "h": [...], "cf": [...], "cu": [...] },
  "starved": false
}`}</div>
      <p>
        {es
          ? 'El manifiesto es función pura de parámetros y semilla: sin reloj de pared, sin nombre de host, sin rutas absolutas. Un manifiesto qué cambia en cada rehorneado hace inutil la historia git de la evidencia científica, porque un cambio real deja de distinguirse de una reejecución. Lleva el caso y por qué está en la matriz, el hash y el tamaño del artefacto, el veredicto de carril con sus presupuestos, las marcas que levanto la ingesta, las métricas medidas con su banda, la procedencia y el comando exacto que lo regenera.'
          : 'The manifest is a pure function of parameters and seed: no wall-clock, no host name, no absolute paths. A manifest that changes on every re-bake makes the git history of the scientific evidence useless, because a real change stops being distinguishable from a re-run. It carries the case and why it is in the matrix, the artifact hash and size, the lane verdict with its budgets, the flags the ingestion gate raised, the measured metrics with their band, the provenance, and the exact command that regenerates it.'}
      </p>
      <Equation
        tex="\text{sha256}\big(\mathrm{json}(\text{trace},\ \text{sorted keys},\ \text{compact})\big)"
        caption={es
          ? 'El hash de contenido, calculado sobre la codificación JSON canónica. La etapa de validación lo recalcula sobre el arbol horneado y falla si difiere del manifiesto, de modo que dos horneados del mismo caso son demostrablemente identicos.'
          : 'The content hash, computed over the canonical JSON encoding. The validate stage recomputes it over the baked tree and fails if it differs from the manifest, so two bakes of the same case are provably identical.'} />
      <p>
        {es
          ? 'Un espejo TypeScript de este esquema vive en el frontend, así que una divergencia entre el escritor Python y el lector del navegador rompe la compilación en vez de manifestarse como un panel vacio en producción.'
          : 'A TypeScript mirror of this schema lives in the frontend, so a drift between the Python writer and the browser reader fails the build rather than showing up as an empty panel in production.'}
      </p>
    </>
  );
}

function Stages({ es }: { es: boolean }) {
  const rows: Array<[string, string, string]> = es ? [
    ['ingest', 'filas crudas -> descargas validadas', 'aplica el contrato 1; rechaza, marca y cuenta'],
    ['preprocess', 'descargas -> unidades canonicas', 'reloj monotono; rellena tamano faltante con la mediana del propio archivo'],
    ['dataset', 'corpus -> particiones', 'por semilla Y estructura de entrada; los 17 casos quedan retenidos'],
    ['features', 'particiones -> matriz de diseno', 'alcance y meseta del variograma, pasadas, Sr, toneladas por capa, uno-en-N de metodos'],
    ['calibrate', 'monticulo DEM o distancias publicadas -> Sr', 'busqueda en grilla del Sr cuyo perfil continuo mejor ajusta; publica el residual'],
    ['train', 'entrenamiento -> puntos de control', 'la regresion linea base y el perceptron, sobre el corpus identico'],
    ['infer', 'caso, semilla -> resultado medido', 'la simulacion completa mas variogramas, residencia y efecto de mezcla'],
    ['evaluate', 'resultados -> matriz e invariantes', 'la matriz completa, la auditoria de invariantes y los veredictos de control'],
    ['export', 'resultados -> artefactos', 'traza, metricas y manifiesto; hash de contenido y veredicto de carril'],
    ['validate', 'arbol horneado -> reporte de release', 'completitud, integridad de hashes, invariantes y honestidad de carril'],
  ] : [
    ['ingest', 'raw rows -> validated dumps', 'applies contract 1; rejects, flags and counts'],
    ['preprocess', 'dumps -> canonical units', 'monotone clock; fills a missing size split from the file’s own median'],
    ['dataset', 'corpus -> splits', 'by seed and input structure; all 17 cases are held out'],
    ['features', 'splits -> design matrix', 'variogram range and sill, passes, Sr, tonnes per layer, one-hot methods'],
    ['calibrate', 'DEM heap or published distances -> Sr', 'grid-searches the Sr whose continuum profile best fits; publishes the residual'],
    ['train', 'training rows -> checkpoints', 'the regression baseline and the perceptron, on the identical corpus'],
    ['infer', 'case, seed -> measured result', 'the full simulation plus variograms, residence and mixing effect'],
    ['evaluate', 'results -> matrix and invariants', 'the complete matrix, the invariant audit and the control verdicts'],
    ['export', 'results -> artifacts', 'trace, metrics and manifest; content hash and lane verdict'],
    ['validate', 'baked tree -> release report', 'completeness, hash integrity, invariants and lane honesty'],
  ];
  return (
    <>
      <h2>{es ? 'Las diez etapas con nombre' : 'The ten named stages'}</h2>
      <p>
        {es
          ? 'Cada etapa es una función pura, determinista, sembrada, tipada y probable de forma independiente, con un contrato explícito hacia la siguiente. Ninguna es un no-op ni imprime un comando que pretende ejecutar. calibrate es la única etapa de dominio insertada más alla de la lista congelada del arquetipo, y es donde se resuelve y se registra la calibración del número de segregación.'
          : 'Each stage is a pure, deterministic, seeded, typed and independently testable function with an explicit contract to the next. None is a no-op and none prints a command it pretends to run. calibrate is the one domain stage inserted beyond the archetype’s frozen list, and it is where the segregation-number calibration is settled and recorded.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'etapa' : 'stage'}</th>
            <th>{es ? 'contrato' : 'contract'}</th>
            <th>{es ? 'qué hace aquí' : 'what it does here'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a}>
              <td className="st-mono" style={{ textAlign: 'left' }}>{a}</td>
              <td className="st-mono" style={{ whiteSpace: 'normal', textAlign: 'left', fontSize: '0.72rem' }}>{b}</td>
              <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="codeblock">{`python -m stlab.pipeline                        # every case, canonical bake
python -m stlab.pipeline G01_chevron --seed 7
python -m stlab.pipeline G01_chevron --output build/smoke --band-seeds 3
python -m stlab.pipeline --validate-only`}</div>
      <Callout variant="honest" title={es ? 'Las pruebas escriben solo a un sandbox' : 'Tests write only to a sandbox'}>
        {es
          ? 'El horneado canónico es una operación explícita de release y las pruebas deben pasar --output. No es una regla de estilo: en otro repositorio de esta línea una corrida de pytest sobrescribio un horneado comprometido y dos releases lo enviaron. Una prueba de esta suite verifica que la corrida de humo no toco el arbol canónico.'
          : 'The canonical bake is an explicit release operation and tests must pass --output. That is not a style rule: in another repository on this line a pytest run overwrote a committed bake and two releases shipped it. One test in this suite asserts that the smoke run did not touch the canonical tree.'}
      </Callout>
    </>
  );
}

function Gate({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'La compuerta medida de carril' : 'The measured lane gate'}</h2>
      <p>
        {es
          ? 'Un método corre en vivo solo si la medicion lo permite. El veredicto y los numeros van al manifiesto, y la integración continua falla si un carril esta mal etiquetado. Un método marcado como en vivo cuyo tiempo medido supera el presupuesto es un fallo de construcción, no una advertencia.'
          : 'A method runs live only if the measurement allows it. The verdict and the numbers go into the manifest, and continuous integration fails on a mislabelled lane. A method tagged live whose measured runtime breaches its budget is a build failure, not a warning.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr><th>{es ? 'presupuesto' : 'budget'}</th><th>{es ? 'valor' : 'value'}</th><th>{es ? 'de donde sale' : 'where it comes from'}</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="st-mono">run_ms</td><td className="st-mono">100 ms</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'el presupuesto de control a redibujo. Por encima, la App deja de sentirse como un instrumento y empieza a sentirse como un formulario.' : 'the slider-to-redraw budget. Above it the App stops feeling like an instrument and starts feeling like a form submission.'}
            </td>
          </tr>
          <tr>
            <td className="st-mono">frame_ms</td><td className="st-mono">8 ms</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'sesenta cuadros por segundo dejan 16,7 ms para todo, y el renderizador necesita al menos la mitad. Una relajación sobre presupuesto se mueve a un worker.' : 'sixty frames a second leaves 16.7 ms for everything, and the renderer needs at least half. A relaxation over budget moves into a worker.'}
            </td>
          </tr>
          <tr>
            <td className="st-mono">trace_bytes</td><td className="st-mono">2 MB</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'un paquete estático en una descarga fria desde la red de distribución.' : 'a static bundle on a cold content-delivery-network fetch.'}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {es
          ? 'El tiempo medido se usa para la decision pero deliberadamente no se almacena: el manifiesto comprometido debe ser función pura de parámetros y semilla, y un reloj de pared ensuciaria git en cada reejecución. Se registran el veredicto, los presupuestos y el tamaño deterministico; el tiempo en vivo se mide de nuevo en el navegador, donde de verdad importa, y la App lo muestra como un indicador.'
          : 'The measured runtime is used for the decision but deliberately not stored: the committed manifest must be a pure function of parameters and seed, and a wall-clock would dirty git on every re-run. The verdict, the budgets and the deterministic byte count are recorded instead; the live runtime is measured again in the browser, where it actually matters, and the App shows it as a readout.'}
      </p>
    </>
  );
}

function Perf({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Rendimiento: tres solucionadores antes de que uno fuera lo bastante rápido' : 'Performance: three solvers before one was fast enough'}</h2>
      <p>
        {es
          ? 'La relajación de la pila paso por tres implementaciones. Las dos primeras eran correctas e inutilizables, y por la misma razón de fondo: los barridos simultaneos permiten que una celda reciba de varios vecinos a la vez y sobrepase al vecino que acababa de alimentar, de modo que el par intercambia material de ida y vuelta. Un cono que debería relajarse en unos ocho pasos tomaba más de cien barridos y decenas de miles de transferencias, y un solo caso tardaba ochenta segundos.'
          : 'The pile relaxation went through three implementations. The first two were correct and unusable, both for the same underlying reason: simultaneous sweeps let a cell receive from several neighbours at once and overshoot above the neighbour it had just fed, so the pair traded material back and forth. A cone that should relax in about eight steps took over a hundred sweeps and tens of thousands of transfers, and a single case took eighty seconds.'}
      </p>
      <ol>
        <li>
          {es
            ? 'Una cascada por prioridad en vez de barridos. Procesar primero la celda inestable mas alta y aplicar su transferencia de inmediato hace que la relajación descienda monotonamente y elimina el intercambio de ida y vuelta. Además entrega las transferencias en orden ladera abajo, que es exactamente lo que necesita el solucionador de segregación, así que la corrección mejoro también el acoplamiento físico.'
            : 'A priority cascade instead of sweeps. Processing the highest unstable cell first and applying its transfer immediately makes the relaxation march monotonically downhill and removes the ping-pong entirely. It also delivers the transfers in downslope order, which is exactly what the segregation solver needs, so the fix improved the physical coupling as well as the speed.'}
        </li>
        <li>
          {es
            ? 'Fusionar lotes del mismo evento al empujar. Cada transferencia parte el lote que queda a medias, de modo que una columna acumulaba miles de astillas del mismo evento y toda la simulación se volvia cuadratica. Fusionar dos lotes del mismo evento es exactamente sin perdida para la procedencia.'
            : 'Coalescing same-event lots on push. Every transfer splits the straddling lot, so a column accumulated thousands of slivers of the same event and the whole simulation went quadratic. Merging two lots of the same event is exactly lossless for provenance.'}
        </li>
        <li>
          {es
            ? 'Precomputar la tabla de vecinos por geometría de losa. Reservar una lista nueva de ocho tuplas por celda, en cada barrido, en cada una de varios cientos de descargas, dominaba todo lo que la ciencia estaba haciendo.'
            : 'Precomputing the neighbour table per pad geometry. Allocating a fresh eight-element list per cell, on every sweep, on every one of several hundred dumps, dominated everything the science was doing.'}
        </li>
        <li>
          {es
            ? 'Y una carga de camion no es una fuente puntual. Descargar 220 toneladas sobre una celda de dos metros pone un pico de treinta metros que la relajación luego debe demoler; repartirlo sobre un disco de nueve metros es a la vez más rápido y lo que de verdad ocurre.'
            : 'And a truck load is not a point source. Dropping 220 tonnes on a two-metre cell puts a thirty-metre spike on the pad that the relaxation then has to demolish; spreading it over a nine-metre disc is both faster and what actually happens.'}
        </li>
      </ol>
      <Callout variant="honest" title={es ? 'El número que se muestra es el medido' : 'The number shown is the measured one'}>
        {es
          ? 'La App muestra el tiempo de cálculo en vivo como un indicador junto a las métricas. No es decoración: es la evidencia de que el carril esta correctamente etiquetado, y si un día sube por encima del presupuesto será visible en la página antes de que nadie tenga que medirlo.'
          : 'The App shows the live compute time as a readout beside the metrics. That is not decoration: it is the evidence that the lane is correctly labelled, and if it ever rises above the budget it will be visible on the page before anyone has to go and measure it.'}
      </Callout>
    </>
  );
}

function Determinism({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Determinismo' : 'Determinism'}</h2>
      <p>
        {es
          ? 'Una corrida es función pura de parámetros y semilla. No es una comodidad: la traza comprometida es la fuente de verdad, así que una corrida que no sea reproducible hace irreproducible cada artefacto y no verificable cada número de la aplicación. La aleatoriedad oculta es el fallo que este contrato existe para atrapar.'
          : 'A run is a pure function of parameters and seed. That is not a convenience: the committed trace is the source of truth, so a run that is not reproducible makes every artifact unreproducible and every number in the app unverifiable. Hidden randomness is the failure this contract exists to catch.'}
      </p>
      <ul>
        <li>{es ? 'Un flujo de numeros aleatorios sembrado por preocupación, derivado con un hash del nombre de la preocupación en vez de sumando uno, para que dos preocupaciones no compartan flujo si alguien las reordena.' : 'One seeded stream per concern, derived with a hash of the concern’s name rather than by adding one, so two concerns cannot share a stream if someone reorders them.'}</li>
        <li>{es ? 'El generador del carril en vivo es un xorshift de 32 bits más Box-Muller, escrito a mano en ambos lenguajes. Ni random de Python ni el generador de numpy pueden reproducirse bit a bit en un navegador, y la prueba entre carriles exige que si puedan.' : 'The live lane’s generator is a 32-bit xorshift plus Box-Muller, written out by hand in both languages. Neither Python’s random nor numpy’s Generator can be reproduced bit for bit in a browser, and the cross-lane test requires that they can.'}</li>
        <li>{es ? 'Los ajustes usan busqueda en grilla y no metodos de gradiente, porque un camino de convergencia diferiria entre lenguajes.' : 'Fits use grid search rather than gradient methods, because a convergence path would differ between languages.'}</li>
        <li>{es ? 'Sin reloj de pared, sin Math.random, sin iteración sobre un mapa sin orden en ninguna parte del motor.' : 'No wall-clock, no Math.random, and no iteration over an unordered map anywhere in the engine.'}</li>
      </ul>
      <p>
        {es
          ? 'Una prueba verifica que la misma configuración produce una traza identica; otra, que la misma semilla produce el mismo flujo; y una tercera, que el arbol canónico no se toco durante la corrida de humo.'
          : 'One test asserts that the same configuration produces an identical trace; another, that the same seed produces the same stream; and a third, that the canonical tree was not touched during the smoke run.'}
      </p>
    </>
  );
}

function Deploy({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Despliegue' : 'Deployment'}</h2>
      <p>
        {es
          ? 'Un sitio estático en GitHub Pages sobre un dominio propio, sin backend. Tres operaciones separadas que nunca se mezclan: el horneado canónico escribe los artefactos y es una decisión explícita de release; la construcción web copia esos artefactos ya auditados y compila el paquete; el despliegue verifica los hashes comprometidos y publica. Un despliegue nunca entrena, nunca recalcula el benchmark y nunca reescribe evidencia científica.'
          : 'A static site on GitHub Pages over a custom domain, no backend. Three separate operations that never merge: the canonical bake writes the artifacts and is an explicit release decision; the web build copies those already-audited artifacts and compiles the bundle; the deploy verifies the committed hashes and publishes. A deployment never trains, never recomputes the benchmark and never rewrites scientific evidence.'}
      </p>
      <div className="codeblock">{`# 1. the canonical bake (an explicit release operation)
python -m stlab.pipeline

# 2. the web build; copy-data.mjs only COPIES data/derived into public/
cd frontend && npm ci && npm run build     # tsc --noEmit, vite build, then spa-404.mjs

# 3. the two-step Pages go-live, both required
#    a. DNS: stocktwin CNAME fsantibanezleal.github.io, DNS-only
#    b. gh api --method PUT .../pages -f cname=stocktwin.fasl-work.com`}</div>
      <Callout variant="note" title={es ? 'El archivo CNAME por si solo no basta' : 'The CNAME file alone is not enough'}>
        {es
          ? 'Con Pages basado en Actions, el archivo public/CNAME NO fija el dominio personalizado: el dominio llega a GitHub y devuelve 404. Hay que fijarlo por la API, sin https_enforced hasta que exista el certificado, y volver a ejecutar el despliegue. Además, spa-404.mjs copia el index construido a 404.html para que un enlace profundo a /focus/<caso> sobreviva a una recarga.'
          : 'Under Actions-based Pages the public/CNAME file does not set the custom domain: the domain reaches GitHub and 404s. It has to be set through the API, without https_enforced until the certificate exists, and the deploy re-run. Separately, spa-404.mjs copies the built index to 404.html so a deep link to /focus/<case> survives a refresh.'}
      </Callout>
    </>
  );
}
