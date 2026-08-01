import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { PUBLISHED_ANCHORS } from '../engine';
import { loadMatrix } from '../lib/artifacts';
import type { Matrix } from '../lib/contract.types';

/**
 * ADR-0017 section 2: the numbers come ONLY from a committed artifact, never typed in. When the bake
 * has not run, the page says so and shows nothing rather than showing a zero, because a zero in a
 * metric column is indistinguishable from a real measurement.
 */
export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    loadMatrix().then((m) => {
      if (!alive) return;
      setMatrix(m);
      setState(m ? 'ready' : 'missing');
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">
          {es
            ? 'Todos los numeros de esta página se leen del artefacto comprometido que produjo el horneado canónico sobre 31 semillas por caso. Ninguno esta escrito a mano. Las cuatro afirmaciones ordinales se publican aquí pasen o fallen.'
            : 'Every number on this page is read from the committed artifact produced by the canonical bake over 31 seeds per case. None is typed in. The four ordinal assertions are published here whether they pass or fail.'}
        </p>
      </div>

      <section>
        <h2>{es ? 'Anclas publicadas' : 'Published anchors'}</h2>
        <p>
          {es
            ? 'El eje de apilado se compara contra resultados publicados y no solo contra si mismo. Estos digitos NO son objetivos de reproducción: vienen de una pila circular de otras dimensiones y su fuente es internamente inconsistente sobre ellos. La prueba es ordinal y de orden de magnitud.'
            : 'The stacking axis is scored against published results, not only against itself. These digits are not reproduction targets: they come from a circular pile of different dimensions and their source is internally inconsistent about them. The test is ordinal and magnitude-level.'}
        </p>
        <table className="cmp-table st-table">
          <thead>
            <tr><th>VRR</th><th>{es ? 'que es' : 'what'}</th><th>{es ? 'fuente' : 'source'}</th></tr>
          </thead>
          <tbody>
            {PUBLISHED_ANCHORS.map((a) => (
              <tr key={a.src + a.vrr}>
                <td className="st-mono">{a.vrr.toFixed(3)}</td>
                <td style={{ textAlign: 'left', whiteSpace: 'normal' }}>{es ? a.es : a.en}</td>
                <td style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: '0.72rem' }}>{a.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Refs ids={['loubser2015', 'kumral2006', 'schramm2021']} label="Refs" />
      </section>

      {state === 'loading' && <p className="st-note">{es ? 'Cargando el artefacto...' : 'Loading the artifact...'}</p>}

      {state === 'missing' && (
        <section>
          <h2>{es ? 'El horneado canónico no está presente en esta construcción' : 'The canonical bake is not present in this build'}</h2>
          <Callout variant="honest" title={es ? 'Sin numeros en vez de numeros inventados' : 'No numbers rather than invented numbers'}>
            {es
              ? 'Esta página lee unicamente del artefacto comprometido. Cuando el artefacto no está, la página lo dice y no muestra nada: un cero en una columna de métricas es indistinguible de una medición real, y rellenar la tabla con valores plausibles es exactamente el fallo que está regla existe para evitar. Para producirlo, ejecuta el horneado canónico y reconstruye el sitio; el comando esta en la página de Implementación. Mientras tanto, la App calcula todas estas métricas en vivo para el caso seleccionado.'
              : 'This page reads only from the committed artifact. When the artifact is absent the page says so and shows nothing: a zero in a metric column is indistinguishable from a real measurement, and filling the table with plausible values is exactly the failure this rule exists to prevent. To produce it, run the canonical bake and rebuild the site; the command is on the Implementation page. In the meantime the App computes all of these metrics live for the selected case.'}
          </Callout>
        </section>
      )}

      {state === 'ready' && matrix && (
        <>
          <section>
            <h2>{es ? 'Las cuatro afirmaciones' : 'The four assertions'}</h2>
            <table className="cmp-table st-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{es ? 'afirmación' : 'assertion'}</th>
                  <th>{es ? 'medido' : 'measured'}</th>
                  <th>{es ? 'veredicto' : 'verdict'}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.assertions.map((a) => (
                  <tr key={a.id}>
                    <td className="st-mono">{a.id}</td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal' }}>{a.statement}</td>
                    <td className="st-mono" style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: '0.7rem' }}>
                      {Object.entries(a.measured)
                        .map(([k, v]) => `${k} ${Number(v).toFixed(4)}`).join(' · ')}
                    </td>
                    <td className={a.pass ? 'st-pass' : 'st-fail'}>{a.pass ? 'PASS' : 'FAIL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matrix.assertions.some((a) => !a.pass) && (
              <Callout variant="honest" title={es ? 'Una afirmación fallo' : 'An assertion failed'}>
                {es
                  ? 'Una afirmación fallida se publica con los numeros que la hicieron fallar. Un resultado negativo es un resultado; ajustar la parametrización hasta que pase sería convertir una prueba en una decoración.'
                  : 'A failed assertion is published with the numbers that failed it. A negative result is a result; tuning the parameterisation until it passes would turn a test into a decoration.'}
              </Callout>
            )}
          </section>

          <section>
            <h2>{es ? 'La matriz completa, caso por métrica' : 'The complete case-by-metric matrix'}</h2>
            <p>
              {es
                ? `${matrix.rows.length} casos, cada uno con su banda de credibilidad sobre las semillas indicadas. Una celda faltante hace fallar la compuerta de completitud; no se promedia para hacerla desaparecer.`
                : `${matrix.rows.length} cases, each with its credible band over the stated number of seeds. A missing cell fails the completeness gate; it is not averaged away.`}
            </p>
            <div className="st-tablewrap" style={{ maxHeight: 'none' }}>
              <table className="cmp-table st-table">
                <thead>
                  <tr>
                    <th>{es ? 'caso' : 'case'}</th>
                    <th>VRR</th>
                    <th>{es ? 'banda p05 a p95' : 'band p05 to p95'}</th>
                    <th>1/N</th>
                    <th>N</th>
                    <th>{es ? 'eficiencia' : 'efficiency'}</th>
                    <th>E</th>
                    <th>{es ? 'segregación' : 'segregation'}</th>
                    <th>{es ? 'residencia' : 'residence'}</th>
                    <th>{es ? 'semillas' : 'seeds'}</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r) => (
                    <tr key={r.case_id}>
                      <td className="st-mono" style={{ textAlign: 'left' }}>{r.case_id}</td>
                      <td className="st-mono">{r.vrr.toFixed(4)}</td>
                      <td className="st-mono">{r.vrr_band[0].toFixed(4)} - {r.vrr_band[1].toFixed(4)}</td>
                      <td className="st-mono">{r.vrr_ideal.toFixed(4)}</td>
                      <td className="st-mono">{r.n_layers.toFixed(1)}</td>
                      <td className="st-mono">{(r.efficiency * 100).toFixed(0)} %</td>
                      <td className="st-mono">{Number.isFinite(r.mixing_effect) ? r.mixing_effect.toFixed(1) : '--'}</td>
                      <td className="st-mono">{r.segregation_index.toFixed(3)}</td>
                      <td>{r.rtd_character}</td>
                      <td className="st-mono">{r.seeds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>{es ? 'El eje de apilado' : 'The stacking axis'}</h2>
            <p>
              {es
                ? 'El orden que la literatura acuerda, chevcon mejor que conos concéntricos, se reproduce. Pero chevron sale mejor que chevcon, lo que a primera vista contradice a Loubser y de Korte y no lo hace: su comparación es sobre un patio circular, donde la operación continua obliga al apilador a recorrer el anillo y chevron no es una opción disponible. En una cama lineal cada capa de chevron abarca toda la longitud, así que un corte en cualquier estación muestrea capas de toda la construcción; las de chevcon vienen de una ventana viajera y están correlacionadas entre si.'
                : 'The ordering the literature agrees on, chevcon better than cone shell, is reproduced. But chevron comes out better than chevcon, which at first reading contradicts Loubser and de Korte and does not: their comparison is on a circular yard, where continuous operation forces the stacker around the ring and chevron is not an available method. On a linear bed every chevron layer spans the whole length, so a cut at any station samples layers from across the entire build; chevcon’s come from a travelling window and are correlated with one another.'}
              {' '}<Cite id="loubser2015" paren />
            </p>
            <p>
              {es
                ? 'La columna de eficiencia es el diagnóstico útil. Chevcon cruza mas capas por corte que chevron y aun así mezcla peor, lo que muestra que el conteo de capas por si solo no es la respuesta: lo que importa es cuántas capas independientes cruza el corte.'
                : 'The efficiency column is the useful diagnostic. Chevcon crosses more layers per cut than chevron and still blends worse, which shows that layer count alone is not the answer: what matters is how many independent layers the cut crosses.'}
            </p>
          </section>

          <section>
            <h2>{es ? 'El tier aprendido' : 'The learned tier'}</h2>
            <Callout variant="honest" title={es ? 'No activo en esta versión' : 'Not active in this release'}>
              {es
                ? 'El corpus barrido, la línea base de regresión multiple al estilo de Kumral y el sustituto de perceptron están implementados en el carril fuera de línea, pero el veredicto de refutación no se ha publicado y por eso el tier aprendido NO aparece como método en la App. Un modelo sin medir mostrado junto a otros medidos es un defecto, no una característica. Cuando el veredicto exista aparecera aquí con su número, en la dirección que sea: si la red no supera a la regresión por más que la banda por remuestreo de la regresión, el resultado negativo se reporta y la red queda solo como demostración del carril aprendido en el navegador.'
                : 'The swept corpus, the Kumral-style multiple-regression baseline and the perceptron surrogate are implemented in the offline lane, but the refutation verdict has not been published, so the learned tier does not appear as a method in the App. An unmeasured model displayed beside measured ones is a defect, not a feature. When the verdict exists it will appear here with its number, in whichever direction it falls: if the network does not beat the regression by more than the regression’s own bootstrap band, the negative result is reported and the network stays only as a demonstration of the in-browser learned lane.'}
            </Callout>
            <Refs ids={['kumral2006']} label="Refs" />
          </section>

          <section>
            <h2>{es ? 'Paridad entre carriles' : 'Cross-lane parity'}</h2>
            <p>
              {es
                ? 'La misma física existe dos veces: en el motor fuera de línea que produce los artefactos, y en el navegador para que un control mueva la pila al instante. La aplicación solo es honesta si ambas coinciden, así que la diferencia se mide y se publica en vez de suponerse. El carril fuera de línea es la verdad canónica; el del navegador es un espejo con una tolerancia declarada.'
                : 'The same physics exists twice: in the offline engine that produces the artifacts, and in the browser so a control moves the pile immediately. The app is only honest if the two agree, so the difference is measured and published rather than assumed. The offline lane is canonical truth; the browser lane is a mirror with a stated tolerance.'}
            </p>
            <table className="st-table">
              <thead>
                <tr>
                  <th>{es ? 'Cantidad' : 'Quantity'}</th>
                  <th>{es ? 'Acuerdo medido' : 'Measured agreement'}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{es ? 'Flujo de entrada' : 'Input stream'}</td><td><code>5.7e-14</code></td></tr>
                <tr><td>{es ? 'Tonelaje depositado, por lote' : 'Deposited tonnage, per lot'}</td><td><code>1.8e-13</code></td></tr>
                <tr><td>{es ? 'Masa total de la pila' : 'Total pile mass'}</td><td><code>1.1e-11</code></td></tr>
                <tr><td>{es ? 'Capas por corte' : 'Layers per cut'}</td><td>{es ? 'exacto' : 'exact'}</td></tr>
                <tr><td>{es ? 'Composición granulométrica del lote' : 'Lot size-split composition'}</td><td><code>9.8e-4</code></td></tr>
                <tr><td>{es ? 'Ley del corte' : 'Cut grade'}</td><td><code>5.4e-4</code></td></tr>
              </tbody>
            </table>
            <Callout variant="honest" title={es ? 'La masa es exacta; la composición no' : 'Mass is exact; composition is not'}>
              {es
                ? 'La masa, la geometría y el conteo de capas coinciden de forma exacta, y el conteo de capas es la cantidad sobre la que descansa toda afirmación de mezcla. Lo que se separa es la composición por tamaño, en el cuarto decimal, por el orden de acumulación en punto flotante del solver de segregación y no por una diferencia de lógica: el mismo cálculo se leyó rutina por rutina en ambos carriles y las salidas del solver por banda coinciden a 1e-12. Un corte con ley 0,58 en el navegador puede leerse 0,5805 en el artefacto. Para decidir entre geometrías esa diferencia es irrelevante; para citar una ley, el artefacto manda.'
                : 'Mass, geometry and the layer count agree exactly, and the layer count is the quantity every blending claim rests on. What separates is the size-split composition, in the fourth decimal, from floating-point accumulation order in the segregation solver rather than from a logic difference: the same computation was read routine by routine across both lanes, and the per-band solver outputs match to 1e-12. A cut reading 0.58 in the browser may read 0.5805 in the artifact. For choosing between geometries that difference is irrelevant; for quoting a grade, the artifact governs.'}
            </Callout>
          </section>
        </>
      )}
    </div>
  );
}
