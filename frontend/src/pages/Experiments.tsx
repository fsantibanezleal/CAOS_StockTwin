import { useEffect, useState } from 'react';
import { Callout, Cite, Equation, InlineMath, Refs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

import { type Index, loadIndex } from '../lib/scenario';

/**
 * The scenarios, read from the artifact index.
 *
 * Nothing on this page is typed in. If a scenario changes its kill criterion or its measured result,
 * this page changes with it, because a page that restates the code by hand goes quietly wrong on the
 * first edit and a reader trusts it anyway.
 *
 * THE PROTOCOL TAB IS PART OF THE EVIDENCE, not decoration. A registry of results with no statement
 * of how the results were obtained is a table of numbers a reader has to take on trust; the tab says
 * what a kill criterion is, what the metrics are as equations with their real constants, what data
 * every case was built from, and, explicitly, the anti-pattern this design exists to avoid.
 */
const AXES = [
  { key: 'reference', en: 'Reference', es: 'Referencia',
    blurbEn: 'The case every other one is a variation on: one area, one material class, a prepared pad.',
    blurbEs: 'El caso del que todos los demás son una variación: un área, una clase de material, una plataforma preparada.' },
  { key: 'feed', en: 'Feed structure', es: 'Alimentación',
    blurbEn: 'What arrives, and in what order. A stockpile can only help to the extent that consecutive trucks differ, and how much they differ is set by how long the shovel stays in one dig block.',
    blurbEs: 'Qué llega, y en qué orden. Un acopio solo puede ayudar en la medida en que camiones consecutivos difieran, y cuánto difieren lo fija cuánto permanece la pala en un bloque.' },
  { key: 'yard', en: 'Yard and routing', es: 'Patio y ruteo',
    blurbEn: 'How many piles to run, and what happens when the ore-control estimate that routes a load is wrong.',
    blurbEs: 'Cuántas pilas operar, y qué pasa cuando la estimación de control de leyes que enruta una carga es incorrecta.' },
  { key: 'landform', en: 'Landform', es: 'Relieve',
    blurbEn: 'The ground underneath. Only one of the five published fill types is a flat pad, and relief and difficulty are not the same thing.',
    blurbEs: 'El terreno debajo. Solo uno de los cinco tipos publicados de relleno es una plataforma plana, y relieve y dificultad no son lo mismo.' },
  { key: 'campaign', en: 'Campaign', es: 'Campaña',
    blurbEn: 'How hard the pile is fed and how hard it is taken back down, and what happens when two areas are worked one after the other instead of together.',
    blurbEs: 'Con cuánta intensidad se alimenta la pila y con cuánta se desarma, y qué pasa cuando dos áreas se trabajan una tras otra en vez de a la vez.' },
  { key: 'operations', en: 'Operating choices', es: 'Decisiones operativas',
    blurbEn: 'The levers a planner actually has: bench height, ramp width, dozer cadence, and the material arriving wet.',
    blurbEs: 'Las palancas que un planificador realmente tiene: altura de banco, ancho de rampa, cadencia del bulldozer, y material que llega húmedo.' },
];

/** The datasets and calibration sources every case was built from. Not a scenario list: the inputs. */
const SOURCES = [
  {
    what: { en: 'Dump geometry envelope', es: 'Envolvente de geometría de descarga' },
    detail: {
      en: '28 truck dumps surveyed by UAV photogrammetry: length 13-46 m, width 11-23 m, thickness 0.368-2.032 m, angle 12-36 deg, volume 94-155 m3',
      es: '28 descargas de camión levantadas por fotogrametría con UAV: largo 13-46 m, ancho 11-23 m, espesor 0,368-2,032 m, ángulo 12-36 grados, volumen 94-155 m3',
    },
    cite: 'young2022',
  },
  {
    what: { en: 'Size segregation', es: 'Segregación granulométrica' },
    detail: {
      en: 'Kinetic sieving in a dense granular flow, solved down a real face taken from the terrain rather than assumed',
      es: 'Tamizado cinético en un flujo granular denso, resuelto por una cara real tomada del terreno en vez de supuesta',
    },
    cite: 'gray2005',
  },
  {
    what: { en: 'Fill-type taxonomy', es: 'Taxonomía de tipos de relleno' },
    detail: {
      en: 'Five published fill types: heaped, sidehill, valley, cross-valley, ridge crest. Four are in the matrix; the ridge crest is withdrawn',
      es: 'Cinco tipos publicados de relleno: montículo, ladera, valle, valle transversal y cresta. Cuatro están en la matriz; la cresta está retirada',
    },
    cite: 'baffinland2017',
  },
  {
    what: { en: 'Multi-element assay', es: 'Ensayo multielemento' },
    detail: {
      en: 'SYNTHETIC. Ranges and correlation structure from published porphyry and flotation literature; calibrated to no deposit and not to be read as an orebody',
      es: 'SINTÉTICO. Rangos y estructura de correlación desde literatura publicada de pórfidos y flotación; no calibrado a ningún yacimiento y no debe leerse como un cuerpo mineralizado',
    },
    cite: 'sillitoe2010',
  },
  {
    what: { en: 'Terrain', es: 'Terreno' },
    detail: {
      en: 'SYNTHETIC. Parameterised landforms with a relief and a roughness, not surveyed ground',
      es: 'SINTÉTICO. Relieves parametrizados con un desnivel y una rugosidad, no terreno levantado',
    },
    cite: null,
  },
];

/** The held-out protocol, and the anti-pattern it exists to rule out. Hand-authored, theme-aware. */
function ProtocolFigure({ es }: { es: boolean }) {
  const t = (en: string, s: string) => (es ? s : en);
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 760 300"
      role="img"
      aria-label={t(
        'The protocol: a kill criterion is written before the bake, the bake runs once, the gate reads the artifact. Below it, struck out, the anti-pattern of tuning against the same bake the result is read from.',
        'El protocolo: el criterio de descarte se escribe antes del horneado, el horneado corre una vez, la compuerta lee el artefacto. Debajo, tachado, el antipatrón de ajustar contra el mismo horneado del que se lee el resultado.',
      )}
    >
      <style>{`
        .px-box { fill: color-mix(in srgb, var(--color-accent) 10%, transparent); stroke: var(--color-accent); stroke-width: 1.2; }
        .px-box-bad { fill: color-mix(in srgb, var(--color-bad) 9%, transparent); stroke: var(--color-bad); stroke-width: 1.2; stroke-dasharray: 5 4; }
        .px-t { fill: var(--color-fg); font: 600 12px system-ui, sans-serif; }
        .px-s { fill: var(--color-fg-faint); font: 11px system-ui, sans-serif; }
        .px-lbl { fill: var(--color-fg-faint); font: 10px system-ui, sans-serif; }
        .px-flow { stroke: var(--color-accent); stroke-width: 1.6; fill: none; marker-end: url(#px-a); }
        .px-flow-bad { stroke: var(--color-bad); stroke-width: 1.6; fill: none; marker-end: url(#px-ab); stroke-dasharray: 5 4; }
        .px-strike { stroke: var(--color-bad); stroke-width: 2.4; }
        .px-head { fill: var(--color-fg-faint); font: 600 10px system-ui, sans-serif; letter-spacing: 0.06em; }
      `}</style>
      <defs>
        <marker id="px-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent)" />
        </marker>
        <marker id="px-ab" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-bad)" />
        </marker>
      </defs>

      <text className="px-head" x="8" y="16">
        {t('THE PROTOCOL', 'EL PROTOCOLO')}
      </text>

      <rect className="px-box" x="8" y="28" width="150" height="62" rx="8" />
      <text className="px-t" x="20" y="50">
        {t('1. Kill criterion', '1. Criterio de descarte')}
      </text>
      <text className="px-s" x="20" y="68">
        {t('written BEFORE', 'escrito ANTES')}
      </text>
      <text className="px-s" x="20" y="82">
        {t('the bake runs', 'de correr el horneado')}
      </text>

      <path className="px-flow" d="M162,59 L212,59" />
      <text className="px-lbl" x="166" y="52">
        {t('committed', 'comprometido')}
      </text>

      <rect className="px-box" x="216" y="28" width="150" height="62" rx="8" />
      <text className="px-t" x="228" y="50">
        {t('2. The bake', '2. El horneado')}
      </text>
      <text className="px-s" x="228" y="68">
        {t('fixed seed, one run,', 'semilla fija, una corrida,')}
      </text>
      <text className="px-s" x="228" y="82">
        {t('no criterion in scope', 'sin ver el criterio')}
      </text>

      <path className="px-flow" d="M370,59 L420,59" />
      <text className="px-lbl" x="372" y="52">
        {t('artifact', 'artefacto')}
      </text>

      <rect className="px-box" x="424" y="28" width="150" height="62" rx="8" />
      <text className="px-t" x="436" y="50">
        {t('3. The gate', '3. La compuerta')}
      </text>
      <text className="px-s" x="436" y="68">
        {t('reads the ARTIFACT,', 'lee el ARTEFACTO,')}
      </text>
      <text className="px-s" x="436" y="82">
        {t('never the code', 'nunca el código')}
      </text>

      <path className="px-flow" d="M578,59 L628,59" />
      <text className="px-lbl" x="580" y="52">
        {t('verdict', 'veredicto')}
      </text>

      <rect className="px-box" x="632" y="28" width="120" height="62" rx="8" />
      <text className="px-t" x="644" y="50">
        {t('4. Ship or', '4. Publicar o')}
      </text>
      <text className="px-t" x="644" y="66">
        {t('WITHDRAW', 'RETIRAR')}
      </text>
      <text className="px-s" x="644" y="82">
        {t('2 cases withdrawn', '2 casos retirados')}
      </text>

      <line x1="8" y1="118" x2="752" y2="118" stroke="var(--color-border)" strokeWidth="1" />

      <text className="px-head" x="8" y="146">
        {t('THE ANTI-PATTERN, WHICH THIS RULES OUT', 'EL ANTIPATRÓN, QUE ESTO DESCARTA')}
      </text>

      <rect className="px-box-bad" x="8" y="158" width="180" height="58" rx="8" />
      <text className="px-t" x="20" y="182">
        {t('Run the bake', 'Correr el horneado')}
      </text>
      <text className="px-s" x="20" y="200">
        {t('look at the numbers', 'mirar los números')}
      </text>

      <path className="px-flow-bad" d="M192,187 L242,187" />

      <rect className="px-box-bad" x="246" y="158" width="200" height="58" rx="8" />
      <text className="px-t" x="258" y="182">
        {t('Write the criterion', 'Escribir el criterio')}
      </text>
      <text className="px-s" x="258" y="200">
        {t('so the numbers pass', 'para que pasen los números')}
      </text>

      <path className="px-flow-bad" d="M450,187 L500,187" />

      <rect className="px-box-bad" x="504" y="158" width="248" height="58" rx="8" />
      <text className="px-t" x="516" y="182">
        {t('Report it as validation', 'Reportarlo como validación')}
      </text>
      <text className="px-s" x="516" y="200">
        {t('every case passes, always', 'todos los casos pasan, siempre')}
      </text>

      <line className="px-strike" x1="14" y1="216" x2="748" y2="160" />

      <text className="px-s" x="8" y="248">
        {t(
          'A criterion written after the result is a description of the result. The evidence that this is not that:',
          'Un criterio escrito después del resultado es una descripción del resultado. La evidencia de que esto no es eso:',
        )}
      </text>
      <text className="px-t" x="8" y="270">
        {t(
          'two scenarios FAILED their criterion and were withdrawn rather than have the tolerance widened.',
          'dos escenarios FALLARON su criterio y fueron retirados en vez de ensanchar la tolerancia.',
        )}
      </text>
      <text className="px-s" x="8" y="290">
        {t(
          'steep sidehill: 22 pairs at 45.9 deg  ·  ridge crest: 1 pair at 41.5 deg  ·  imposed repose 37 deg  ·  finding F-020',
          'ladera empinada: 22 pares a 45,9 grados  ·  cresta: 1 par a 41,5 grados  ·  reposo impuesto 37 grados  ·  hallazgo F-020',
        )}
      </text>
    </svg>
  );
}

export default function Experiments() {
  const es = useShellLang() === 'es';
  const [index, setIndex] = useState<Index | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);

  const n = index?.scenarios.length ?? 0;

  const protocol = (
    <>
      <p className="measure">
        {es
          ? 'Un criterio de descarte es una afirmación escrita antes de que corra el horneado, que dice qué resultado significaría que el código está equivocado. Está comprometido en el repositorio junto con la definición del escenario, la semilla está fija y la compuerta lo evalúa contra el ARTEFACTO en disco, no contra el código que lo escribió. Esa última distinción es la que hace que la compuerta sea capaz de fallar: una compuerta que llama a la misma función que produjo el número solo puede confirmar que la función es determinista.'
          : 'A kill criterion is a statement written before the bake runs that says what result would mean the code is wrong. It is committed to the repository beside the scenario definition, the seed is fixed, and the gate evaluates it against the ARTIFACT on disk rather than against the code that wrote it. That last distinction is what makes the gate capable of failing: a gate that calls the same function that produced the number can only confirm that the function is deterministic.'}
      </p>

      <ProtocolFigure es={es} />

      <h2>{es ? 'Las métricas, como ecuaciones' : 'The metrics, as equations'}</h2>
      <p className="measure">
        {es
          ? 'Cada número que decide si un escenario pasa está definido aquí, con la constante real que usa la compuerta. Una métrica descrita solo en prosa se puede implementar de dos maneras distintas y ambas parecen correctas al leerlas.'
          : 'Every number that decides whether a scenario passes is defined here, with the real constant the gate uses. A metric described only in prose can be implemented two different ways and both read as correct.'}
      </p>

      <Equation
        tex="\mathrm{VRR} = \dfrac{\operatorname{Var}_w(g_{\text{out}})}{\operatorname{Var}(g_{\text{in}})}"
        caption={
          es
            ? 'Reducción de varianza: varianza de las leyes de los cortes ponderada por tonelaje, sobre la varianza de las leyes de las cargas colocadas. Menor es mejor; uno significa que la pila no hizo nada.'
            : 'Variance reduction: the tonnage-weighted variance of the cut grades over the variance of the placed load grades. Lower is better; one means the pile did nothing.'
        }
      />
      <ul className="measure">
        <li>
          <InlineMath tex="g_{\text{in}}" />{' '}
          {es ? 'ley de cada carga colocada, adimensional' : 'grade of each placed load, dimensionless'}
        </li>
        <li>
          <InlineMath tex="g_{\text{out}}" />{' '}
          {es ? 'ley de cada corte recuperado' : 'grade of each reclaimed cut'}
        </li>
        <li>
          <InlineMath tex="\operatorname{Var}_w" />{' '}
          {es ? 'varianza ponderada por el tonelaje del corte, en t' : 'variance weighted by cut tonnage, in t'}
        </li>
      </ul>

      <Equation
        tex="N_{\text{eff}} = \dfrac{1}{\sum_b f_b^{2}}, \qquad \mathrm{VRR}_{\text{ideal}} = \dfrac{1}{N_{\text{eff}}}"
        caption={
          es
            ? 'La cota de fuentes independientes. El número efectivo de fuentes por corte es la razón de participación inversa sobre las fracciones de procedencia, no el conteo de bloques: un corte que es 95 por ciento un bloque y trazas de otros cuatro promedia una fuente, no cinco.'
            : 'The independent-source bound. The effective number of sources per cut is the inverse participation ratio over the provenance fractions, not the count of blocks: a cut that is 95 percent one block and traces of four others is averaging one source, not five.'
        }
      />
      <ul className="measure">
        <li>
          <InlineMath tex="f_b" />{' '}
          {es
            ? 'fracción del tonelaje de un corte que vino del bloque de extracción b, sumando uno'
            : 'fraction of a cut tonnage that came from dig block b, summing to one'}
        </li>
        <li>
          <InlineMath tex="N_{\text{eff}}" />{' '}
          {es
            ? 'fuentes efectivas por corte; uno para un corte puro, n para uno mezclado uniformemente'
            : 'effective sources per cut; one for a pure cut, n for an evenly mixed one'}
        </li>
      </ul>
      <Callout variant="honest" title={es ? 'Cuándo se omite la cota' : 'When the bound is withheld'}>
        {es
          ? 'Una eficiencia sobre 1,05 dice que la reducción lograda superó la cota, lo que es aritméticamente imposible para fuentes genuinamente independientes: significa que el conteo de fuentes está subestimado. En ese caso la cota no se muestra en vez de mostrarse recortada.'
          : 'An efficiency above 1.05 says the achieved reduction beat the bound, which is arithmetically impossible for genuinely independent sources: it means the source count is being underestimated. The bound is withheld in that case rather than shown clamped.'}
      </Callout>

      <Equation
        tex="\max_{(i,j)\,\text{adjacent}} \arctan\!\left(\dfrac{|z_i - z_j|}{\Delta x}\right) \le \phi = 37^{\circ}"
        caption={
          es
            ? 'El invariante de reposo, evaluado sobre el artefacto al final de cada horneado. Cero pares pueden violarlo. Las celdas sin material se saltan, y también los pares cuya pendiente sobreviviría a retirar todo el material, porque una ladera natural puede pararse más empinada que cualquier mineral suelto.'
            : 'The repose invariant, evaluated on the artifact at the end of every bake. Zero pairs may violate it. Cells carrying no material are skipped, and so is any pair whose steepness would survive removing the material entirely, because a natural hillside is entitled to stand steeper than any loose ore.'
        }
      />
      <ul className="measure">
        <li>
          <InlineMath tex="z_i" /> {es ? 'cota de superficie de la celda i, en m' : 'surface elevation of cell i, in m'}
        </li>
        <li>
          <InlineMath tex="\Delta x" /> {es ? 'tamaño de celda, 2,5 m' : 'cell size, 2.5 m'}
        </li>
        <li>
          <InlineMath tex="\phi" />{' '}
          {es ? 'ángulo de reposo impuesto, 37 grados en seco y 43 con material húmedo' : 'imposed angle of repose, 37 degrees dry and 43 for wet material'}
        </li>
      </ul>

      <Equation
        tex="\dfrac{\left|V_{\text{ledger}} - V_{\text{placed}}\right|}{V_{\text{placed}}} \le 10^{-6}"
        caption={
          es
            ? 'Conservación de masa. El volumen que el registro por celda dice que está en el sitio debe coincidir con el volumen ofrecido menos el rechazado, dentro de una parte en un millón. Es la comprobación que atrapa que un relajamiento o una pasada de bulldozer creen o destruyan material.'
            : 'Mass conservation. The volume the per-cell ledger says is on site must match the volume offered less the volume refused, to one part in a million. It is the check that catches a relaxation or a dozer pass creating or destroying material.'
        }
      />

      <Equation
        tex="\eta = 1 - \dfrac{n_{\text{placed}}}{n_{\text{offered}}}"
        caption={
          es
            ? 'Tasa de rechazo: la fracción de puntos planificados que ningún camión pudo ocupar. Se reporta, no se suprime, porque es la medida real de qué tan bueno es el plan de descarga contra una pila que crece alejándose de él.'
            : 'Refusal rate: the fraction of planned tips no truck could occupy. It is reported rather than suppressed, because it is the real measure of how good the dump plan is against a pile that grows away from it.'
        }
      />

      <h2>{es ? 'De qué datos se construyó cada caso' : 'What every case was built from'}</h2>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>{es ? 'entrada' : 'input'}</th>
              <th>{es ? 'qué es' : 'what it is'}</th>
              <th>{es ? 'fuente' : 'source'}</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((r) => (
              <tr key={r.what.en}>
                <td>{r.what[es ? 'es' : 'en']}</td>
                <td style={{ whiteSpace: 'normal' }}>{r.detail[es ? 'es' : 'en']}</td>
                <td>{r.cite ? <Cite id={r.cite} /> : <span className="st-muted">{es ? 'sintético' : 'synthetic'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'Nada de esto está retenido de un yacimiento real' : 'None of this is held out from a real deposit'}>
        {es
          ? 'El terreno y el ensayo son sintéticos. Lo que se retiene es el CRITERIO respecto del resultado, no un conjunto de datos respecto de un modelo: cada escenario declara por adelantado qué resultado lo mataría y el horneado corre sin ver esa declaración. Llamar a esto validación contra la realidad sería una afirmación falsa, y el producto no la hace.'
          : 'The terrain and the assay are synthetic. What is held out is the CRITERION from the result, not a dataset from a model: every scenario declares in advance what result would kill it and the bake runs without sight of that declaration. Calling this validation against reality would be a false claim, and the product does not make it.'}
      </Callout>
      <Refs ids={['young2022', 'gray2005', 'baffinland2017', 'sillitoe2010']} label="Refs" />
    </>
  );

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">
          {es
            ? 'El registro de escenarios ES el diseño de validación, no un conjunto de ejemplos. Cada escenario lleva una razón de inclusión, una semilla fija y un criterio de descarte que la compuerta de horneado hace cumplir contra el artefacto. Un escenario sin criterio de descarte es una demostración, no una prueba.'
            : 'The scenario registry IS the validation design, not a set of examples. Every scenario carries a reason for inclusion, a fixed seed and a kill criterion the bake gate enforces against the artifact. A scenario without a kill criterion is a demonstration, not a test.'}
        </p>
      </div>

      <p className="measure">
        {es
          ? 'Una tasa de rechazo distinta de cero no es un defecto: es el modelo informando que el plan pidió algo que la pila ya no permite. El material recién colocado se para en su ángulo de reposo y un camión trabaja hasta unos dos tercios de eso, de modo que la pila crece sobre su propio acceso a menos que el plan reserve un corredor y ordene el trabajo desde lo más lejano hacia la salida. La tasa es una medida real de qué tan bueno es el plan de descarga, y por eso se muestra en vez de suprimirse.'
          : 'A non-zero refusal rate is not a defect: it is the model reporting that the plan asked for something the pile no longer allows. Freshly placed material stands at its angle of repose and a truck works to roughly two thirds of that, so the pile grows over its own access unless the plan reserves a corridor and orders the work from furthest-away back toward the exit. The rate is a real measure of how good the dump plan is, which is why it is shown rather than suppressed.'}
      </p>

      {err && (
        <p className="st-bad">
          {es ? 'No se pudo cargar el índice de escenarios.' : 'Could not load the scenario index.'}{' '}
          <code>{err}</code>
        </p>
      )}

      {/* GROUPED BY AXIS, ONE TAB EACH, with the protocol first. Twenty scenarios stacked is a page a
          reader scrolls past rather than reads, and it hides the thing the registry exists to show:
          that the cases are organised as an experiment, one axis varied at a time. ADR-0016 section 6
          puts major sections of a page behind the shell's Tabs. */}
      <Tabs
        tabs={[
          { id: 'protocol', label: es ? 'Protocolo' : 'Protocol', content: protocol },
          ...AXES.filter((a) => (index?.scenarios ?? []).some((s) => (s.category ?? '') === a.key)).map(
            (a) => ({
              id: a.key,
              label: es ? a.es : a.en,
              content: (
                <>
                  <p className="measure">{es ? a.blurbEs : a.blurbEn}</p>
                  {(index?.scenarios ?? [])
                    .filter((s) => (s.category ?? '') === a.key)
                    .map((s) => scenarioSection(s, es))}
                </>
              ),
            }),
          ),
        ]}
        ariaLabel={es ? 'Ejes' : 'Axes'}
      />

      <p className="st-note">
        {es
          ? `${n} escenarios en la matriz, más dos retirados por fallar su propio criterio de descarte.`
          : `${n} scenarios in the matrix, plus two withdrawn for failing their own kill criterion.`}
      </p>
    </div>
  );
}

/** One scenario: what it measured, and what would have killed it. */
function scenarioSection(s: Index['scenarios'][number], es: boolean) {
  const kill = s.gate.kill_criterion;
  return (
    <section key={s.id}>
      <h2>{s.title[es ? 'es' : 'en']}</h2>
      <p className="measure">{s.summary[es ? 'es' : 'en']}</p>

      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>{es ? 'resultado medido' : 'measured result'}</th>
              <th>{es ? 'valor' : 'value'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'cargas colocadas' : 'loads placed'}</td>
              <td>{s.build.loads_placed}</td>
            </tr>
            <tr>
              <td>{es ? 'puntos planificados rechazados' : 'planned tips refused'}</td>
              <td>{(s.build.refusal_rate * 100).toFixed(1)} %</td>
            </tr>
            <tr>
              <td>{es ? 'altura máxima' : 'peak height'}</td>
              <td>{s.build.peak_m.toFixed(2)} m</td>
            </tr>
            <tr>
              <td>{es ? 'volumen colocado' : 'volume placed'}</td>
              <td>{Math.round(s.build.volume_m3).toLocaleString(es ? 'es-CL' : 'en-US')} m3</td>
            </tr>
            <tr>
              <td>{es ? 'pasadas de bulldozer' : 'dozer passes'}</td>
              <td>{s.build.dozer_passes}</td>
            </tr>
            <tr>
              <td>{es ? 'desplazamiento medio por bulldozer' : 'mean dozer displacement'}</td>
              <td>{s.build.mean_displacement_m.toFixed(1)} m</td>
            </tr>
            <tr>
              <td>{es ? 'perfiles de descarga producidos' : 'dump profiles produced'}</td>
              <td style={{ whiteSpace: 'normal' }}>
                {Object.entries(s.build.profiles)
                  .map(([k, n]) => `${k.replace('_', ' ')} ${n}`)
                  .join(', ')}
              </td>
            </tr>
            <tr className={s.gate.pairs_over_repose === 0 ? '' : 'st-bad'}>
              <td>{es ? 'pares sobre el ángulo de reposo' : 'pairs over the angle of repose'}</td>
              <td>{s.gate.pairs_over_repose}</td>
            </tr>
            <tr>
              <td>{es ? 'residuo de masa, relativo' : 'mass residual, relative'}</td>
              <td>{s.gate.mass_residual_rel.toExponential(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'Criterio de descarte' : 'Kill criterion'}>
        {typeof kill === 'string' ? kill : kill[es ? 'es' : 'en']}
      </Callout>
    </section>
  );
}
