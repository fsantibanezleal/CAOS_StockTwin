import { useEffect, useState } from 'react';
import { Callout, Equation, InlineMath, Refs, SubTabs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

import { type Index, loadIndex } from '../lib/scenario';
import { FigDeploy, FigPipeline } from '../figures/method';

/**
 * How the thing is actually built, and where the seams are.
 *
 * The tables are READ FROM THE ARTIFACT rather than typed in, so a page claiming a number cannot
 * drift away from the bake that produced it.
 *
 * TEN ENGINE STAGES AND A DEPLOYMENT SECTION, one per real thing the pipeline does, each with the
 * relation that governs it. The page shipped with five sections, no equation, no architecture figure
 * and no deployment section at all, which meant the surface that is supposed to say HOW it is built
 * said less about the engine than the methodology page did. The sections are grouped under four
 * headings so the page still gets ONE tab row (ADR-0071 clause 5).
 *
 * NO REPOSITORY PATHS IN VISIBLE TEXT. Folder names are internal facts; a reader without the
 * repository open cannot use them, and the naming rule bans them from displayed strings. The one
 * code literal that stays is `bedblend`, because it is an installable public package.
 */
export default function Implementation() {
  const es = useShellLang() === 'es';
  const t = (en: string, s: string) => (es ? s : en);
  const [index, setIndex] = useState<Index | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex(null));
  }, []);

  const syms = (rows: [string, string, string][]) => (
    <ul className="measure st-syms">
      {rows.map(([tex, en, s]) => (
        <li key={tex}>
          <InlineMath tex={tex} /> {t(en, s)}
        </li>
      ))}
    </ul>
  );

  /* ---------------------------------------------------------------- the lanes ---------------- */

  const s0 = (
    <>
      <p className="measure">
        {t(
          'A product declares no package of its own. An internal package advertises a library nobody can install, so the stockpile physics lives in bedblend, published on PyPI and consumed pinned. This repository invokes its pipeline by path, and an integrity guard rejects any project table, editable install or module invocation, so the internal package cannot come back.',
          'Un producto no declara paquete propio. Un paquete interno anuncia una biblioteca que nadie puede instalar, así que la física del acopio vive en bedblend, publicado en PyPI y consumido con versión fija. Este repositorio invoca su tubería por ruta, y una comprobación de integridad rechaza cualquier tabla de proyecto, instalación editable o invocación como módulo, de modo que el paquete interno no puede volver.',
        )}
      </p>
      <ul className="measure">
        <li>
          <code>bedblend</code>{' '}
          {t(
            'the published engine: terrain and trafficability, dump plan, relaxation, the measured dump geometry, the dozer, the block ledger, sectors, reclaim and the blending metrics. No runtime dependencies, MIT.',
            'el motor publicado: terreno y transitabilidad, plan de descarga, relajación, la geometría de descarga medida, el bulldozer, el libro de bloques, sectores, recuperación y las métricas de mezcla. Sin dependencias en tiempo de ejecución, MIT.',
          )}
        </li>
        <li>
          {t(
            'The data pipeline: the product-specific part, holding the scenario definitions, the ingestion contract, the multi-element assay generator and the artifact writer.',
            'La tubería de datos: la parte específica del producto, con las definiciones de escenarios, el contrato de ingesta, el generador de ensayo multielemento y el escritor de artefactos.',
          )}
        </li>
        <li>
          {t(
            'The web application: React on the shared shell, three.js for the site view and the block model, uPlot for the analytical charts, and canvas for the per-cell fields.',
            'La aplicación web: React sobre el shell compartido, three.js para la vista de faena y el modelo de bloques, uPlot para los gráficos analíticos, y canvas para los campos por celda.',
          )}
        </li>
      </ul>
      <FigPipeline t={t} />
      <Callout variant="honest" title={t('Where the lane split works, and where it does not', 'Dónde funciona la división de capas y dónde no')}>
        {t(
          'It works for anything downstream of the built pile: the verdicts, the grade-tonnage curve and the surge-averaging analysis are all recomputed live from the events, so a reader can move a knob and watch the number move. It does NOT work for anything that changes what was built. Repose angle, bench height, truck gradient limit and dozer cadence would each need the offline pipeline re-run, so they are readouts labelled as fixed by the bake rather than sliders that could not respond.',
          'Funciona para todo lo que está aguas abajo de la pila construida: los veredictos, la curva ley-tonelaje y el análisis de promedio de tolva se recalculan en vivo desde los eventos, así que un lector puede mover un control y ver moverse el número. NO funciona para nada que cambie lo construido. Ángulo de reposo, altura de banco, límite de gradiente del camión y cadencia del bulldozer necesitarían volver a correr la tubería fuera de línea, así que son lecturas etiquetadas como fijadas por el horneado y no controles que no podrían responder.',
        )}
      </Callout>
      <Refs ids={['young2021']} label="Refs" />
    </>
  );

  const s1 = (
    <>
      <p className="measure">
        {t(
          'The engine routes every load over the trafficable surface, floods the pad for reachability, relaxes after every operation and sorts each cascading load by size. That is tens of seconds per few hundred loads: fine offline and unusable in a page. Running it in the browser would mean either a frozen tab or a model simple enough to be wrong, and the previous version of this product chose the second.',
          'El motor rutea cada carga sobre la superficie transitable, inunda la plataforma para calcular alcance, relaja después de cada operación y clasifica por tamaño cada carga en cascada. Eso son decenas de segundos por unos cientos de cargas: correcto fuera de línea e inutilizable en una página. Correrlo en el navegador significaría una pestaña congelada o un modelo lo bastante simple como para estar equivocado, y la versión anterior de este producto eligió lo segundo.',
        )}
      </p>
      <Equation
        tex="C_{\text{bake}} \sim n_{\text{loads}} \left( \underbrace{n_{xy}}_{\text{flood}} + \underbrace{n_{xy}\log n_{xy}}_{A^{*}} + \underbrace{n_{xy}\,s}_{\text{relax}} \right)"
        caption={t(
          'Why the simulation cannot be live. Every load pays a flood fill, a route solve and a relaxation over the whole field, and the relaxation itself sweeps until nothing moves. The measured consequence: choosing spots with one route solve per candidate rather than one flood fill took a build from 40 seconds to over 500.',
          'Por qué la simulación no puede ir en vivo. Cada carga paga un llenado por inundación, una resolución de ruta y una relajación sobre todo el campo, y la relajación misma barre hasta que nada se mueve. La consecuencia medida: elegir puntos con una resolución de ruta por candidato en vez de un llenado llevó una construcción de 40 segundos a más de 500.',
        )}
      />
      {syms([
        ['n_{\\text{loads}}', 'loads offered in the campaign; 900 in the shipped matrix', 'cargas ofrecidas en la campaña; 900 en la matriz publicada'],
        ['n_{xy}', 'cells in the height field; 3600 at 60 by 60', 'celdas del campo de alturas; 3600 en 60 por 60'],
        ['s', 'relaxation sweeps to convergence, data dependent', 'barridos de relajación hasta converger, dependiente de los datos'],
      ])}
      <Callout variant="note" title={t('What the artifact does NOT carry', 'Lo que el artefacto NO lleva')}>
        {t(
          'The trace carries EVENTS and GEOMETRY: the plan, every load with its approach and departure path, the surface, the block volume and the cuts. It does NOT carry the VERDICTS. Variance reduction, the variograms, the efficiency against the ideal bound and the per-sector intervals are all recomputed in the browser from those events. A trace shipping a baked ratio would be a slide, and its number would be unfalsifiable: a reader could not tell a real result from a typo.',
          'La traza lleva EVENTOS y GEOMETRÍA: el plan, cada carga con su ruta de aproximación y de salida, la superficie, el volumen de bloques y los cortes. No lleva los VEREDICTOS. La reducción de varianza, los variogramas, la eficiencia contra la cota ideal y los intervalos por sector se recalculan en el navegador desde esos eventos. Una traza que despachara una razón horneada sería una lámina, y su número sería infalsable: un lector no podría distinguir un resultado real de un error de tipeo.',
        )}
      </Callout>
      <Refs ids={['young2021']} label="Refs" />
    </>
  );

  /* ------------------------------------------------------------ the engine stages ------------ */

  const s2 = (
    <>
      <p className="measure">
        {t(
          'The terrain stage produces the two fields everything downstream reads: a current surface and the ORIGINAL ground, kept apart so that how high the surface is and how much material is here stay different questions. From the surface it derives the crest of the working level and the trafficable mask, and it reports the buildable fraction of the bare ground before a single load is placed.',
          'La etapa de terreno produce los dos campos que lee todo lo que sigue: una superficie actual y el terreno ORIGINAL, mantenidos aparte para que cuán alta es la superficie y cuánto material hay aquí sigan siendo preguntas distintas. De la superficie deriva la cresta del nivel de trabajo y la máscara transitable, y reporta la fracción construible del terreno desnudo antes de colocar una sola carga.',
        )}
      </p>
      <Equation
        tex="\text{buildable} = \dfrac{1}{n_{xy}}\left\lvert\left\{ c : \left\lVert \nabla z_0(c) \right\rVert \le g_{\max} \right\}\right\rvert"
        caption={t(
          'The buildable fraction of a landform, computed before anything is built. It is what makes the five fill types a measurement rather than a label: a valley and a ridge start with 28 percent of their ground already too steep to drive on, while a sidehill with 29.6 m of relief starts at 100 percent.',
          'La fracción construible de un relieve, calculada antes de construir nada. Es lo que hace de los cinco tipos de relleno una medición y no una etiqueta: un valle y una cresta parten con el 28 por ciento de su terreno ya demasiado empinado para conducir, mientras que una ladera con 29,6 m de desnivel parte en 100 por ciento.',
        )}
      />
      {syms([
        ['\\nabla z_0', 'gradient of the ORIGINAL ground, by central differences, dimensionless', 'gradiente del terreno ORIGINAL, por diferencias centrales, adimensional'],
        ['g_{\\max}', 'the truck gradient limit, 0.50', 'el límite de gradiente del camión, 0,50'],
      ])}
      {index && (
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>{t('fill type', 'tipo de relleno')}</th>
                <th>{t('relief m', 'relieve m')}</th>
                <th>{t('max slope', 'pendiente máx')}</th>
                <th>{t('buildable ground', 'terreno construible')}</th>
              </tr>
            </thead>
            <tbody>
              {index.topography.map((r) => (
                <tr key={r.fill}>
                  <td>{r.fill.replace('_', ' ')}</td>
                  <td>{r.relief_m.toFixed(1)}</td>
                  <td>{r.max_slope_deg.toFixed(0)} deg</td>
                  <td>{(r.buildable_fraction * 100).toFixed(0)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Callout variant="honest" title={t('The landforms are synthetic', 'Los relieves son sintéticos')}>
        {t(
          'They are parameterised surfaces with a relief and a roughness, not surveyed terrain. A real site has drainage, benches from previous work and a property boundary. The fill type captures the shape of the constraint, not a place. Ground water, foundation strength and settlement are not modelled at all: here the floor is rigid.',
          'Son superficies parametrizadas con un desnivel y una rugosidad, no terreno levantado. Un sitio real tiene drenaje, bancos de trabajos anteriores y un deslinde. El tipo de relleno captura la forma de la restricción, no un lugar. Agua subterránea, resistencia de fundación y asentamiento no se modelan: aquí el piso es rígido.',
        )}
      </Callout>
      <Refs ids={['young2021', 'baffinland2017']} label="Refs" />
    </>
  );

  const s3 = (
    <>
      <p className="measure">
        {t(
          'The placement stage is where a load becomes geometry. It picks the profile by distance to the live crest, resolves the discharge heading from the crest normal, writes the mass distribution over cells, and records the fractional position along the run-out for every cell it touched. That last value is the coupling to the segregation stage: the two are joined through a return value rather than through a shared assumption about what an avalanche does.',
          'La etapa de colocación es donde una carga se vuelve geometría. Elige el perfil por distancia a la cresta viva, resuelve el rumbo de descarga desde la normal de la cresta, escribe la distribución de masa sobre celdas, y registra la posición fraccional a lo largo del recorrido para cada celda que tocó. Ese último valor es el acoplamiento con la etapa de segregación: ambas se unen por un valor de retorno y no por un supuesto compartido sobre lo que hace una avalancha.',
        )}
      </p>
      <Equation
        tex="\sum_{\text{cells}} m(s,w)\,\Delta x^2 = V_{\text{load}} \quad\text{to } 10^{-9}, \qquad V_{\text{load}} = 96\ \text{m}^3"
        caption={t(
          'Placement conserves the load volume exactly, which is what lets the mass residual over a whole campaign stay at a part in a million. A shape function that integrated to the wrong volume would put the error into every downstream tonnage without ever failing a geometric check.',
          'La colocación conserva exactamente el volumen de la carga, que es lo que permite que el residuo de masa de toda una campaña se mantenga en una parte en un millón. Una función de forma que integrara al volumen equivocado metería el error en cada tonelaje aguas abajo sin fallar nunca una verificación geométrica.',
        )}
      />
      {syms([
        ['m(s,w)', 'placed thickness at run-out position s and cross-offset w, m', 'espesor colocado en la posición de recorrido s y desplazamiento transversal w, m'],
        ['V_{\\text{load}}', 'loose volume of one truck load, m3', 'volumen suelto de una carga de camión, m3'],
      ])}
      <Refs ids={['young2022', 'young2021b']} label="Refs" />
    </>
  );

  const s4 = (
    <>
      <p className="measure">
        {t(
          'The ledger stage is the one that makes provenance possible at all. Every pad cell owns an ordered stack of lots, bottom to top; a lot records which deposition event it came from, how many tonnes it is, its grades and its coarse fraction. Depositing pushes; a relaxation cascade moves material from the TOP of a source stack to the top of a destination stack, because that is what an avalanche does; reclaiming pops according to the geometry of the method.',
          'La etapa del registro es la que hace posible la procedencia. Cada celda de la plataforma tiene una pila ordenada de lotes, de abajo hacia arriba; un lote registra de qué evento de deposición vino, cuántas toneladas es, sus leyes y su fracción gruesa. Depositar apila; una cascada de relajación mueve material desde el TOPE de una pila origen al tope de una pila destino, porque eso es lo que hace una avalancha; recuperar desapila según la geometría del método.',
        )}
      </p>
      <p className="measure">
        {t(
          'One performance decision with no modelling cost: every transfer splits the straddling lot, so without intervention a column accumulates thousands of slivers of the same deposition event and the simulation goes quadratic. Lots from the SAME event are merged on push, with a tonnage-weighted coarse fraction, which is exactly lossless for provenance and exactly lossless for species mass. Lots from DIFFERENT events are never merged, because that is precisely the information the ledger exists to keep.',
          'Una decisión de rendimiento sin costo de modelado: cada transferencia parte el lote que queda a caballo, así que sin intervención una columna acumula miles de astillas del mismo evento y la simulación se vuelve cuadrática. Los lotes del MISMO evento se fusionan al apilar, con una fracción gruesa ponderada por tonelaje, lo que es exactamente sin pérdida para la procedencia y para la masa de cada especie. Los lotes de eventos DISTINTOS nunca se fusionan, porque esa es precisamente la información que el registro existe para guardar.',
        )}
      </p>
      <Equation
        tex="\sum_e f_e = 1 \quad \text{to } 10^{-12}, \qquad \forall\ \text{cuts}"
        caption={t(
          'The identity checked numerically on every cut of every case. A ledger that loses or double-counts material still draws a convincing pile and still reports plausible grades; the only way to know it is wrong is to check the identity. The app SHOWS the sum rather than asserting it.',
          'La identidad verificada numéricamente en cada corte de cada caso. Un registro que pierde o duplica material igual dibuja una pila convincente y reporta leyes plausibles; la única forma de saber que está mal es verificar la identidad. La app MUESTRA la suma en vez de aseverarla.',
        )}
      />
      {syms([
        ['f_e', 'tonnage fraction of a cut drawn from deposition event e', 'fracción de tonelaje de un corte tomada del evento de deposición e'],
      ])}
      <Callout variant="honest" title={t('Sharper interfaces than a real pile has', 'Interfaces más nítidas que las de una pila real')}>
        {t(
          'The ledger stores a discrete stack per column. A real pile has continuous mixing at every interface from rolling, avalanching and re-handling, so the model interfaces are sharper than reality, and the displacement uncertainty travels with every provenance fraction for exactly that reason.',
          'El registro guarda una pila discreta por columna. Una pila real tiene mezcla continua en cada interfaz por rodadura, avalancha y remanejo, así que las interfaces del modelo son más nítidas que la realidad, y la incertidumbre de desplazamiento viaja con cada fracción de procedencia precisamente por eso.',
        )}
      </Callout>
      <Refs ids={['zhao2021', 'young2021']} label="Refs" />
    </>
  );

  const s5 = (
    <>
      <p className="measure">
        {t(
          'The export stage decides what a reader can actually inspect. The pile ships as a VOLUME, not a surface: one deposition event per voxel on a half-metre vertical grid, with the multi-element assay joined per event rather than per voxel, so adding a variable costs nothing in the artifact and cannot desynchronise from the geometry. Shipping only the surface answers the wrong half of the question about a stockpile.',
          'La etapa de exportación decide qué puede inspeccionar realmente un lector. La pila se publica como VOLUMEN, no como superficie: un evento de deposición por vóxel en una grilla vertical de medio metro, con el ensayo multielemento unido por evento y no por vóxel, así que agregar una variable no cuesta nada en el artefacto y no puede desincronizarse de la geometría. Publicar solo la superficie responde la mitad equivocada de la pregunta sobre un acopio.',
        )}
      </p>
      <p className="measure">
        {t(
          'Playback frames are delta encoded, and that is what makes watching the build affordable. A load touches a couple of dozen cells and leaves the rest alone, so a full surface per frame writes the same numbers hundreds of times. The first frame is complete and every later one carries only the cells that moved by more than the rounding the frames are already stored at, so the encoding cannot introduce drift a reader would see.',
          'Los cuadros de reproducción se codifican por diferencias, y eso es lo que hace asequible ver la construcción. Una carga toca un par de docenas de celdas y deja el resto igual, así que una superficie completa por cuadro escribe los mismos números cientos de veces. El primer cuadro es completo y cada uno posterior lleva solo las celdas que se movieron más que el redondeo con que ya se guardan los cuadros, así que la codificación no puede introducir una deriva que el lector vea.',
        )}
      </p>
      <Equation
        tex="\lvert \text{site} \rvert : 117\ \text{MB} \longrightarrow 36\ \text{MB}"
        caption={t(
          'Measured, over the whole twenty-two-scenario matrix, from delta-encoding the playback frames and voxelising the volume rather than storing a surface per frame. The reduction is a property of what a load actually changes, not a compression trick.',
          'Medido, sobre toda la matriz de veintidós escenarios, al codificar por diferencias los cuadros de reproducción y voxelizar el volumen en vez de guardar una superficie por cuadro. La reducción es una propiedad de lo que una carga realmente cambia, no un truco de compresión.',
        )}
      />
      <Refs ids={['santibanez2026']} label="Refs" />
    </>
  );

  /* -------------------------------------------------------------------- the gate ------------- */

  const s6 = (
    <>
      <p className="measure">
        {t(
          'The invariants are checked on the ACTUAL artifact, not on a synthetic fixture, because a unit test passing on a fixture does not prove the shipped trace is sound. The gate opens the files the release will publish, reads the numbers out of them, and refuses the build if any invariant fails.',
          'Los invariantes se comprueban sobre el ARTEFACTO REAL, no sobre un caso sintético, porque una prueba unitaria que pasa sobre un fixture no demuestra que la traza despachada sea correcta. La compuerta abre los archivos que publicará la versión, lee los números de ellos, y rechaza la compilación si algún invariante falla.',
        )}
      </p>
      <ul className="measure">
        <li>
          {t(
            'Zero cell pairs over the angle of repose. The predecessor finished with 446, the worst at 55.9 degrees against an imposed 37, and that is what rendered as spikes.',
            'Cero pares de celdas sobre el ángulo de reposo. El predecesor terminaba con 446, el peor a 55,9 grados contra 37 impuestos, y eso es lo que se veía como picos.',
          )}
        </li>
        <li>
          {t(
            'The block ledger agrees with the terrain, column by column. A disagreement means material was placed without being recorded or recorded without being placed, and every grade downstream is then wrong.',
            'El libro de bloques concuerda con el terreno, columna por columna. Una discrepancia significa que se colocó material sin registrarlo o se registró sin colocarlo, y entonces toda ley aguas abajo está mal.',
          )}
        </li>
        <li>{t('Mass conserved to one part in a million.', 'Masa conservada a una parte en un millón.')}</li>
        <li>
          {t(
            'No cell below its original ground, which would be excavation nobody performed.',
            'Ninguna celda por debajo de su terreno original, lo que sería una excavación que nadie hizo.',
          )}
        </li>
        <li>
          {t(
            'Every scenario kill criterion, evaluated against the artifact. Two cases failed theirs and were withdrawn rather than have the tolerance widened.',
            'Cada criterio de descarte de escenario, evaluado contra el artefacto. Dos casos fallaron el suyo y fueron retirados en vez de ensanchar la tolerancia.',
          )}
        </li>
      </ul>
      <Equation
        tex="\dfrac{\lvert V_{\text{ledger}} - V_{\text{placed}} \rvert}{V_{\text{placed}}} \le 10^{-6}, \qquad n_{\text{pairs}}\!\left(\theta > \theta_r\right) = 0"
        caption={t(
          'The two numeric gates, as they are actually evaluated. Both are read from the artifact on disk after the bake, never from the objects the bake had in memory, because a run that clobbered its own output would otherwise pass.',
          'Las dos compuertas numéricas, tal como se evalúan realmente. Ambas se leen del artefacto en disco después del horneado, nunca de los objetos que el horneado tenía en memoria, porque de otro modo una corrida que sobrescribiera su propia salida pasaría igual.',
        )}
      />
      {syms([
        ['V_{\\text{ledger}}', 'volume the per-cell lot ledger accounts for, m3', 'volumen del que responde el registro de lotes por celda, m3'],
        ['V_{\\text{placed}}', 'volume offered less the volume refused, m3', 'volumen ofrecido menos el volumen rechazado, m3'],
        ['n_{\\text{pairs}}', 'adjacent cell pairs standing over the angle of repose; must be zero', 'pares de celdas adyacentes sobre el ángulo de reposo; debe ser cero'],
      ])}
      {index && (
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>{t('scenario', 'escenario')}</th>
                <th>{t('placed', 'colocadas')}</th>
                <th>{t('refused', 'rechazadas')}</th>
                <th>{t('pairs over repose', 'pares sobre reposo')}</th>
                <th>{t('mass residual', 'residuo de masa')}</th>
              </tr>
            </thead>
            <tbody>
              {index.scenarios.map((s) => (
                <tr key={s.id}>
                  <td>{s.title[es ? 'es' : 'en']}</td>
                  <td>{s.gate.loads_placed}</td>
                  <td>{(s.gate.refusal_rate * 100).toFixed(1)} %</td>
                  <td className={s.gate.pairs_over_repose === 0 ? 'st-ok' : 'st-bad'}>
                    {s.gate.pairs_over_repose}
                  </td>
                  <td>{s.gate.mass_residual_rel.toExponential(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Refs ids={['young2021']} label="Refs" />
    </>
  );

  const s7 = (
    <>
      <p className="measure">
        {t(
          'Everything stochastic comes from one seeded generator, so a bake is reproducible bit for bit. The manifest is a PURE function of the scenario and its seed: no clock, no host name, no absolute paths. A manifest changing on every re-bake would make the history of the evidence useless, because a real change would stop being distinguishable from a re-run.',
          'Todo lo estocástico proviene de un único generador con semilla, así que un horneado es reproducible bit a bit. El manifiesto es una función PURA del escenario y su semilla: sin reloj, sin nombre de host, sin rutas absolutas. Un manifiesto que cambiara en cada re-horneado volvería inútil el historial de la evidencia, porque un cambio real dejaría de distinguirse de una re-ejecución.',
        )}
      </p>
      <p className="measure">
        {t(
          'Tests ALWAYS bake into a sandbox. A test run writing the canonical tree is how a release once shipped a clobbered artifact, and the fix is not discipline, it is that tests cannot reach it. The gate then re-reads the artifact from disk after the build rather than trusting what the run had in memory, which is the second half of the same lesson.',
          'Las pruebas SIEMPRE hornean en un sandbox. Una corrida de pruebas que escribiera el árbol canónico es como una versión despachó un artefacto pisado, y la corrección no es disciplina, es que las pruebas no puedan alcanzarlo. La compuerta luego relee el artefacto desde disco después de compilar en vez de confiar en lo que la corrida tenía en memoria, que es la segunda mitad de la misma lección.',
        )}
      </p>
      <FigDeploy t={t} />
      <Equation
        tex="\text{bake}(\text{scenario}, \text{seed}) \equiv \text{artifact}, \qquad \text{sha256 stable across runs}"
        caption={t(
          'Determinism stated as the property the release process depends on. It is what lets a diff of the artifact mean something: a changed byte is a changed model, never a changed machine or a changed day.',
          'El determinismo enunciado como la propiedad de la que depende el proceso de publicación. Es lo que hace que un diff del artefacto signifique algo: un byte cambiado es un modelo cambiado, nunca una máquina distinta ni un día distinto.',
        )}
      />
      <Callout variant="honest" title={t('Where the deployment is thin', 'Dónde el despliegue es delgado')}>
        {t(
          'This is a static site: one bundle, hashed assets, a deep-link fallback so a shared focus URL resolves, and no server of its own. That is right for a product whose simulation is baked, and it is a real limit: there is no way for a reader to upload their own dig sequence or their own terrain and get a bake back. Doing that would need a queue and a worker, and it is recorded as future work rather than implied by the page.',
          'Este es un sitio estático: un bundle, activos con hash, un respaldo de enlace profundo para que una URL de foco compartida resuelva, y ningún servidor propio. Eso es correcto para un producto cuya simulación está horneada, y es un límite real: no hay forma de que un lector suba su propia secuencia de extracción o su propio terreno y reciba un horneado de vuelta. Hacerlo necesitaría una cola y un trabajador, y queda registrado como trabajo futuro en vez de insinuarse en la página.',
        )}
      </Callout>
      <Refs ids={['young2021', 'moraga2017']} label="Refs" />
    </>
  );

  const sub = (a: [string, string, React.ReactNode], b: [string, string, React.ReactNode]) => (
    <SubTabs
      tabs={[
        { id: a[0], label: a[1], content: a[2] },
        { id: b[0], label: b[1], content: b[2] },
      ]}
      ariaLabel={t('Subsections', 'Subsecciones')}
    />
  );

  const tabs = [
    {
      id: 'lanes',
      label: t('The lanes', 'Las capas'),
      content: sub(
        ['s0', t('Engine and product', 'Motor y producto'), s0],
        ['s1', t('Why it is baked', 'Por qué se hornea'), s1],
      ),
    },
    {
      id: 'stages',
      label: t('Engine stages', 'Etapas del motor'),
      content: (
        <SubTabs
          tabs={[
            { id: 's2', label: t('Terrain', 'Terreno'), content: s2 },
            { id: 's3', label: t('Placement', 'Colocación'), content: s3 },
            { id: 's4', label: t('The ledger', 'El registro'), content: s4 },
            { id: 's5', label: t('The export', 'La exportación'), content: s5 },
          ]}
          ariaLabel={t('Stages', 'Etapas')}
        />
      ),
    },
    { id: 'gate', label: t('The gate', 'La compuerta'), content: s6 },
    { id: 'deploy', label: t('Deployment', 'Despliegue'), content: s7 },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{t('Implementation', 'Implementación')}</h1>
        <p className="lede">
          {t(
            'The engine is a separately published package; this repository is the product that consumes it. The simulation runs offline and ships an event log; the browser replays it and RECOMPUTES every verdict, so nothing shown as a result comes baked into the file. What follows is each stage of that pipeline with the relation that governs it, the gate that has to pass before a bake is shipped, and how a seed becomes a URL.',
            'El motor es un paquete publicado aparte; este repositorio es el producto que lo consume. La simulación corre fuera de línea y despacha una bitácora de eventos; el navegador la reproduce y RECALCULA cada veredicto, así que nada de lo que se muestra como resultado viene horneado en el archivo. Lo que sigue es cada etapa de esa tubería con la relación que la gobierna, la compuerta que debe pasar antes de publicar un horneado, y cómo una semilla se convierte en una URL.',
          )}
        </p>
      </div>

      <Tabs tabs={tabs} ariaLabel={t('Sections', 'Secciones')} />
    </div>
  );
}
