import { useEffect, useState } from 'react';
import { Callout, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

import { type Index, loadIndex } from '../lib/scenario';

/**
 * The scenarios, read from the artifact index.
 *
 * Nothing on this page is typed in. If a scenario changes its kill criterion or its measured result,
 * this page changes with it, because a page that restates the code by hand goes quietly wrong on the
 * first edit and a reader trusts it anyway.
 */
const AXES = [
  { key: 'reference', en: 'Reference', es: 'Referencia',
    blurbEn: 'The case every other one is a variation on: one area, one material class, a prepared pad.',
    blurbEs: 'El caso del que todos los demas son una variacion: un area, una clase de material, una plataforma preparada.' },
  { key: 'feed', en: 'Feed structure', es: 'Alimentacion',
    blurbEn: 'What arrives, and in what order. A stockpile can only help to the extent that consecutive trucks differ, and how much they differ is set by how long the shovel stays in one dig block.',
    blurbEs: 'Que llega, y en que orden. Un acopio solo puede ayudar en la medida en que camiones consecutivos difieran, y cuanto difieren lo fija cuanto permanece la pala en un bloque.' },
  { key: 'yard', en: 'Yard and routing', es: 'Patio y ruteo',
    blurbEn: 'How many piles to run, and what happens when the ore-control estimate that routes a load is wrong.',
    blurbEs: 'Cuantas pilas operar, y que pasa cuando la estimacion de control de leyes que enruta una carga es incorrecta.' },
  { key: 'landform', en: 'Landform', es: 'Relieve',
    blurbEn: 'The ground underneath. Only one of the five published fill types is a flat pad, and relief and difficulty are not the same thing.',
    blurbEs: 'El terreno debajo. Solo uno de los cinco tipos publicados de relleno es una plataforma plana, y relieve y dificultad no son lo mismo.' },
  { key: 'campaign', en: 'Campaign', es: 'Campana',
    blurbEn: 'How hard the pile is fed and how hard it is taken back down, and what happens when two areas are worked one after the other instead of together.',
    blurbEs: 'Con cuanta intensidad se alimenta la pila y con cuanta se desarma, y que pasa cuando dos areas se trabajan una tras otra en vez de a la vez.' },
  { key: 'operations', en: 'Operating choices', es: 'Decisiones operativas',
    blurbEn: 'The levers a planner actually has: bench height, ramp width, dozer cadence, and the material arriving wet.',
    blurbEs: 'Las palancas que un planificador realmente tiene: altura de banco, ancho de rampa, cadencia del bulldozer, y material que llega humedo.' },
];

export default function Experiments() {
  const es = useShellLang() === 'es';
  const [index, setIndex] = useState<Index | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">
          {es
            ? 'El registro de escenarios ES el diseño de validacion, no un conjunto de ejemplos. Cada escenario lleva una razon de inclusion, una semilla fija y un criterio de descarte que la compuerta de horneado hace cumplir. Un escenario sin criterio de descarte es una demostracion, no una prueba.'
            : 'The scenario registry IS the validation design, not a set of examples. Every scenario carries a reason for inclusion, a fixed seed and a kill criterion the bake gate enforces. A scenario without a kill criterion is a demonstration, not a test.'}
        </p>
      </div>

      <p className="measure">
        {es
          ? 'Una tasa de rechazo distinta de cero no es un defecto: es el modelo informando que el plan pidio algo que la pila ya no permite. El material recien colocado se para en su angulo de reposo y un camion trabaja hasta unos dos tercios de eso, de modo que la pila crece sobre su propio acceso a menos que el plan reserve un corredor y ordene el trabajo desde lo mas lejano hacia la salida. La tasa es una medida real de que tan bueno es el plan de descarga, y por eso se muestra en vez de suprimirse.'
          : 'A non-zero refusal rate is not a defect: it is the model reporting that the plan asked for something the pile no longer allows. Freshly placed material stands at its angle of repose and a truck works to roughly two thirds of that, so the pile grows over its own access unless the plan reserves a corridor and orders the work from furthest-away back toward the exit. The rate is a real measure of how good the dump plan is, which is why it is shown rather than suppressed.'}
      </p>

      {err && <p className="st-bad">Could not load the scenario index: {err}</p>}

      {/* GROUPED BY AXIS, ONE TAB EACH. Twenty scenarios stacked is a page a reader scrolls past
          rather than reads, and it hides the thing the registry exists to show: that the cases are
          organised as an experiment, one axis varied at a time. ADR-0016 section 6 puts major
          sections of a page behind the shell's Tabs. */}
      <Tabs
        tabs={AXES.filter((a) => (index?.scenarios ?? []).some((s) => (s.category ?? '') === a.key)).map(
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
        )}
        ariaLabel={es ? 'Ejes' : 'Axes'}
      />

    </div>
  );
}


/** One scenario: what it measured, and what would have killed it. */
function scenarioSection(s: Index['scenarios'][number], es: boolean) {
  return (
        <section key={s.id}>
          <h2>{s.title[es ? 'es' : 'en']}</h2>
          <p>{s.summary[es ? 'es' : 'en']}</p>
  
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
                  <td>{Math.round(s.build.volume_m3).toLocaleString()} m3</td>
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
                  <td>
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
            {s.gate.kill_criterion}
          </Callout>
        </section>
  );
}
