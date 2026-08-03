import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';

import { type Index, loadIndex } from '../lib/scenario';

/**
 * How the thing is actually built, and where the seams are.
 *
 * The topography table is READ FROM THE ARTIFACT rather than typed in, so a page claiming a number
 * cannot drift away from the bake that produced it. That is the same rule the docs generator follows.
 */
export default function Implementation() {
  const es = useShellLang() === 'es';
  const [index, setIndex] = useState<Index | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex(null));
  }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Implementación' : 'Implementation'}</h1>
        <p className="lede">
          {es
            ? 'El motor es un paquete publicado aparte; este repositorio es el producto que lo consume. La simulacion corre fuera de linea y despacha una bitacora de eventos; el navegador la reproduce y RECALCULA cada veredicto. Nada de lo que se muestra como resultado viene horneado en el archivo.'
            : 'The engine is a separately published package; this repository is the product that consumes it. The simulation runs offline and ships an event log; the browser replays it and RECOMPUTES every verdict. Nothing shown as a result comes baked into the file.'}
        </p>
      </div>

      <section>
        <h2>{es ? '1. El motor vive en su propio repositorio' : '1. The engine lives in its own repository'}</h2>
        <p>
          {es
            ? 'Un producto no declara paquete propio. Un paquete interno anuncia una biblioteca que nadie puede instalar, asi que la fisica del acopio vive en bedblend, publicado en PyPI y consumido con version fija. Este repositorio invoca su tuberia POR RUTA, y una comprobacion de integridad rechaza cualquier tabla de proyecto, instalacion editable o invocacion como modulo, de modo que el paquete interno no puede volver.'
            : 'A product declares no package of its own. An internal package advertises a library nobody can install, so the stockpile physics lives in bedblend, published on PyPI and consumed pinned. This repository invokes its pipeline BY PATH, and an integrity guard rejects any project table, editable install or module invocation, so the internal package cannot come back.'}
        </p>
        <ul>
          <li>
            <code>bedblend</code>{' '}
            {es
              ? 'terreno y transitabilidad, plan de descarga, relajacion, la geometria de descarga medida, el bulldozer, el libro de bloques, sectores, recuperacion y las metricas de mezcla. Sin dependencias en tiempo de ejecucion.'
              : 'terrain and trafficability, dump plan, relaxation, the measured dump geometry, the dozer, the block ledger, sectors, reclaim and the blending metrics. No runtime dependencies.'}
          </li>
          <li>
            <code>data-pipeline/</code>{' '}
            {es
              ? 'lo especifico del producto: los escenarios, el contrato de ingesta y el escritor de artefactos.'
              : 'the product-specific part: the scenarios, the ingestion contract and the artifact writer.'}
          </li>
          <li>
            <code>frontend/</code>{' '}
            {es
              ? 'React con el shell compartido, three.js para la vista de faena y canvas para los campos y las series.'
              : 'React on the shared shell, three.js for the site view and canvas for the fields and the series.'}
          </li>
        </ul>
      </section>

      <section>
        <h2>{es ? '2. Por qué la simulación se hornea' : '2. Why the simulation is baked'}</h2>
        <p>
          {es
            ? 'El motor rutea cada carga sobre la superficie transitable, inunda la plataforma para calcular alcance, relaja despues de cada operacion y clasifica por tamano cada carga en cascada. Eso son decenas de segundos por unos cientos de cargas: correcto fuera de linea e inutilizable en una pagina. Correrlo en el navegador significaria una pestana congelada o un modelo lo bastante simple como para estar equivocado, y la version anterior de este producto eligio lo segundo.'
            : 'The engine routes every load over the trafficable surface, floods the pad for reachability, relaxes after every operation and sorts each cascading load by size. That is tens of seconds per few hundred loads: fine offline and unusable in a page. Running it in the browser would mean either a frozen tab or a model simple enough to be wrong, and the previous version of this product chose the second.'}
        </p>
        <Callout variant="note" title={es ? 'Lo que el artefacto NO lleva' : 'What the artifact does NOT carry'}>
          {es
            ? 'La traza lleva EVENTOS y GEOMETRIA: el plan, cada carga con su ruta de aproximacion y de salida, la superficie, el campo de bloques y los cortes. No lleva los VEREDICTOS. La reduccion de varianza, los variogramas, la eficiencia contra la cota ideal y los intervalos por sector se recalculan en el navegador desde esos eventos. Una traza que despachara una razon horneada seria una lamina, y su numero seria infalsable: un lector no podria distinguir un resultado real de un error de tipeo.'
            : 'The trace carries EVENTS and GEOMETRY: the plan, every load with its approach and departure path, the surface, the block field and the cuts. It does NOT carry the VERDICTS. Variance reduction, the variograms, the efficiency against the ideal bound and the per-sector intervals are all recomputed in the browser from those events. A trace shipping a baked ratio would be a slide, and its number would be unfalsifiable: a reader could not tell a real result from a typo.'}
        </Callout>
      </section>

      <section>
        <h2>{es ? '3. Cada horneada pasa por una compuerta' : '3. Every bake passes a gate'}</h2>
        <p>
          {es
            ? 'Los invariantes se comprueban sobre el ARTEFACTO REAL, no sobre un caso sintetico, porque una prueba unitaria que pasa sobre un fixture no demuestra que la traza despachada sea correcta.'
            : 'The invariants are checked on the ACTUAL artifact, not on a synthetic fixture, because a unit test passing on a fixture does not prove the shipped trace is sound.'}
        </p>
        <ul>
          <li>
            {es
              ? 'Cero pares de celdas sobre el angulo de reposo. El predecesor terminaba con 446, el peor a 55,9 grados contra 37 impuestos, y eso es lo que se veia como picos.'
              : 'Zero cell pairs over the angle of repose. The predecessor finished with 446, the worst at 55.9 degrees against an imposed 37, and that is what rendered as spikes.'}
          </li>
          <li>
            {es
              ? 'El libro de bloques concuerda con el terreno, columna por columna. Una discrepancia significa que se coloco material sin registrarlo o se registro sin colocarlo, y entonces toda ley aguas abajo esta mal.'
              : 'The block ledger agrees with the terrain, column by column. A disagreement means material was placed without being recorded or recorded without being placed, and every grade downstream is then wrong.'}
          </li>
          <li>{es ? 'Masa conservada a una parte en un millon.' : 'Mass conserved to one part in a million.'}</li>
          <li>
            {es
              ? 'Ninguna celda por debajo de su terreno original, lo que seria una excavacion que nadie hizo.'
              : 'No cell below its original ground, which would be excavation nobody performed.'}
          </li>
        </ul>
        {index && (
          <div className="st-tablewrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>{es ? 'escenario' : 'scenario'}</th>
                  <th>{es ? 'colocadas' : 'placed'}</th>
                  <th>{es ? 'rechazadas' : 'refused'}</th>
                  <th>{es ? 'pares sobre reposo' : 'pairs over repose'}</th>
                  <th>{es ? 'residuo de masa' : 'mass residual'}</th>
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
      </section>

      <section>
        <h2>{es ? '4. El terreno, cuantificado' : '4. The ground, quantified'}</h2>
        <p>
          {es
            ? 'Solo uno de los cinco tipos publicados de relleno es una plataforma plana. La diferencia entre ellos es un numero, no una ilustracion: la fraccion de terreno que un camion ya podria recorrer antes de colocar nada.'
            : 'Only one of the five published fill types is a flat pad. The difference between them is a number rather than a picture: the fraction of ground a truck could already drive on before anything is placed.'}
          {' '}<Cite id="young2021" paren />
        </p>
        {index && (
          <div className="st-tablewrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>{es ? 'tipo de relleno' : 'fill type'}</th>
                  <th>{es ? 'relieve m' : 'relief m'}</th>
                  <th>{es ? 'pendiente máx' : 'max slope'}</th>
                  <th>{es ? 'terreno construible' : 'buildable ground'}</th>
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
      </section>

      <section>
        <h2>{es ? '5. Determinismo y reproducibilidad' : '5. Determinism and reproducibility'}</h2>
        <p>
          {es
            ? 'Todo lo estocastico proviene de un unico generador con semilla, asi que una horneada es reproducible bit a bit. El manifiesto es una funcion PURA del escenario y su semilla: sin reloj, sin nombre de host, sin rutas absolutas. Un manifiesto que cambiara en cada re-horneada volveria inutil el historial de la evidencia, porque un cambio real dejaria de distinguirse de una re-ejecucion.'
            : 'Everything stochastic comes from one seeded generator, so a bake is reproducible bit for bit. The manifest is a PURE function of the scenario and its seed: no clock, no host name, no absolute paths. A manifest changing on every re-bake would make the history of the evidence useless, because a real change would stop being distinguishable from a re-run.'}
        </p>
        <p>
          {es
            ? 'Las pruebas hornean SIEMPRE a un directorio temporal. Una corrida de pruebas que escribiera el arbol canonico es como una version despacho un artefacto pisado, y la correccion es que las pruebas no puedan alcanzarlo.'
            : 'Tests ALWAYS bake into a sandbox. A test run writing the canonical tree is how a release once shipped a clobbered artifact, and the fix is that tests cannot reach it.'}
        </p>
        <Refs ids={['young2021', 'young2022', 'moraga2017']} label="Refs" />
      </section>
    </div>
  );
}
