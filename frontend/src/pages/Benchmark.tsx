import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang, Tabs } from '@fasl-work/caos-app-shell';

import { MEASURED, type Scenario, loadScenario, profileStats, verdict } from '../lib/scenario';

/**
 * What this product is measured against, and where it falls short.
 *
 * The comparison is computed from the shipped artifact, so the page cannot claim a fit the bake did
 * not produce. Anything not yet done is listed as not yet done rather than being left out.
 */
export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [sc, setSc] = useState<Scenario | null>(null);
  useEffect(() => {
    loadScenario('single').then(setSc).catch(() => setSc(null));
  }, []);

  const stats = sc ? profileStats(sc) : [];
  const v = sc ? verdict(sc) : null;
  const inBand = (x: number, [a, b]: readonly [number, number]) => x >= a && x <= b;

  const tabs = [
    {
      id: 's0',
      label: es ? 'La geometría, contra 28 descargas medidas' : 'The geometry, against 28 measured dumps',
      content: (
        <>

        <p>
          {es
            ? 'El operador de descarga de borde se calibra contra fotogrametria por dron de descargas individuales de un CAT 793F, no contra una suposicion. El predecesor colocaba cada carga como un disco isotropico de 4,5 m de radio, que falla los tres rangos a la vez.'
            : 'The edge dump operator is calibrated against UAV photogrammetry of individual CAT 793F dumps, not against an assumption. The predecessor placed every load as an isotropic 4.5 m radius disc, which fails all three ranges at once.'}
          {' '}<Cite id="young2022" paren /> <Cite id="young2021b" paren />
        </p>
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>{es ? 'perfil' : 'profile'}</th>
                <th>{es ? 'cargas' : 'loads'}</th>
                <th>{es ? 'largo m' : 'length m'}</th>
                <th>{es ? 'ancho m' : 'width m'}</th>
                <th>{es ? 'espesor m' : 'thickness m'}</th>
                <th>{es ? 'dentro del rango' : 'in the envelope'}</th>
              </tr>
            </thead>
            <tbody>
              {stats
                .filter((r) => r.profile !== 'paddock')
                .map((r) => {
                  const ok =
                    inBand(r.len, MEASURED.length) &&
                    inBand(r.wid, MEASURED.width) &&
                    inBand(r.thick, MEASURED.thickness);
                  return (
                    <tr key={r.profile}>
                      <td>{r.profile.replace('_', ' ')}</td>
                      <td>{r.n}</td>
                      <td>{r.len.toFixed(1)}</td>
                      <td>{r.wid.toFixed(1)}</td>
                      <td>{r.thick.toFixed(2)}</td>
                      <td className={ok ? 'st-ok' : 'st-bad'}>{ok ? (es ? 'sí' : 'yes') : 'NO'}</td>
                    </tr>
                  );
                })}
              <tr className="st-ref">
                <td>{es ? 'medido' : 'measured'}</td>
                <td>28</td>
                <td>
                  {MEASURED.length[0]} - {MEASURED.length[1]}
                </td>
                <td>
                  {MEASURED.width[0]} - {MEASURED.width[1]}
                </td>
                <td>
                  {MEASURED.thickness[0]} - {MEASURED.thickness[1]}
                </td>
                <td className="st-muted">{MEASURED.source}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout variant="honest" title={es ? 'Criterio de descarte, declarado por adelantado' : 'Kill criterion, stated in advance'}>
          {es
            ? 'Si un perfil no puede ajustarse dentro del rango medido, el operador esta MAL y se rediseña, no se ajusta hasta que se vea aceptable.'
            : 'If a profile cannot be fitted inside the measured envelope, the operator is WRONG and gets redesigned, not tuned until it looks acceptable.'}
        </Callout>
        </>
      ),
    },
    {
      id: 's1',
      label: es ? 'La línea base de la industria' : 'The industry baseline',
      content: (
        <>

        <p>
          {es
            ? 'Es explicita y humilde: el modelo de bloques hoy en operacion para un acopio grande es UN solo valor homogeneizado que lleva la ley promedio movil. Un numero para toda la pila. Ese es el listón real.'
            : 'It is explicit and humbling: the block model in place today for a large stockpile is ONE large homogenized block value carrying the rolling average grade. One number for the whole pile. That is the actual bar.'}
          {' '}<Cite id="young2021" paren />
        </p>
        {v && (
          <div className="st-tablewrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>{es ? 'lo que reporta' : 'what it reports'}</th>
                  <th>{es ? 'línea base' : 'baseline'}</th>
                  <th>{es ? 'este producto' : 'this product'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{es ? 'valores de ley' : 'grade values'}</td>
                  <td>1</td>
                  <td>{sc ? sc.field.grade.filter((g) => g !== null).length.toLocaleString() : '-'}</td>
                </tr>
                <tr>
                  <td>{es ? 'densidad de muestreo' : 'sampling density'}</td>
                  <td>175,000 t {es ? 'por muestra' : 'per sample'}</td>
                  <td>100-400 t {es ? 'por muestra' : 'per sample'}</td>
                </tr>
                <tr>
                  <td>{es ? 'estructura interna visible' : 'internal structure visible'}</td>
                  <td>{es ? 'ninguna' : 'none'}</td>
                  <td>{es ? 'por banco y por sector' : 'by lift and by sector'}</td>
                </tr>
                <tr>
                  <td>{es ? 'trazabilidad del corte' : 'cut provenance'}</td>
                  <td>{es ? 'ninguna' : 'none'}</td>
                  <td>{es ? 'por bloque de origen, con su desplazamiento' : 'per source block, with its displacement'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        </>
      ),
    },
    {
      id: 's2',
      label: es ? 'La mezcla, contra la cota ideal' : 'Blending, against the ideal bound',
      content: (
        <>

        {v && (
          <p>
            {es ? 'En el escenario base la razon medida es ' : 'On the base scenario the measured ratio is '}
            <strong>{v.vrr.toFixed(3)}</strong>
            {es ? ' contra una cota ideal de ' : ' against an ideal bound of '}
            <strong>{v.ideal.toFixed(3)}</strong>
            {es
              ? `, es decir un ${(v.efficiency * 100).toFixed(0)} por ciento del ideal, con ${v.nLayers.toFixed(1)} fuentes distintas por corte en promedio.`
              : `, that is ${(v.efficiency * 100).toFixed(0)} percent of the ideal, with ${v.nLayers.toFixed(1)} distinct sources per cut on average.`}
          </p>
        )}
        <p>
          {es
            ? 'La razon nunca se cita sola. El ideal es tipicamente tres a cuatro veces mejor que lo que logra cualquier cama real, asi que una razon sin su cota se lee mucho mas favorable de lo que es. Y N se MIDE del propio build, no se configura.'
            : 'The ratio is never quoted alone. The ideal is typically three to four times better than any real bed achieves, so a ratio without its bound reads far more flattering than it is. And N is MEASURED from the build itself rather than configured.'}
          {' '}<Cite id="schramm2021" paren /> <Cite id="kumral2006" paren />
        </p>
        </>
      ),
    },
    {
      id: 's3',
      label: es ? 'Lo que NO está hecho' : 'What is NOT done',
      content: (
        <>

        <p>
          {es
            ? 'Listado con el mismo detalle que lo demas, porque omitirlo seria la sobreafirmacion que este producto existe para evitar.'
            : 'Listed in the same detail as the rest, because leaving it out would be the overclaim this product exists to avoid.'}
        </p>
        <ul>
          <li>
            {es
              ? 'La segregacion se calibra contra la TABLA publicada, no contra las superficies 3-D subyacentes. El conjunto de datos esta abierto bajo CC BY; ajustar contra las superficies es trabajo futuro declarado, no algo supuesto.'
              : 'Segregation is calibrated against the published TABLE, not against the underlying 3-D surfaces. The dataset is open under CC BY; fitting against the surfaces is declared future work, not something assumed done.'}
            {' '}<Cite id="young2021b" paren />
          </li>
          <li>
            {es
              ? 'La segregacion se resuelve con la ley de conservacion de Gray y Thornton mas el remezclado de Gray y Chugunov, no con curvas ajustadas. Lo que no esta validado son sus dos coeficientes anclados, el de percolacion y el de Peclet: ambos vienen de la literatura y ninguno esta medido contra DEM ni contra un ensayo de laboratorio sobre este material.'
              : 'Segregation is solved with the Gray-Thornton conservation law plus Gray-Chugunov remixing, not with fitted curves. What is not validated is its two anchored coefficients, the percolation coefficient and the Peclet number: both come from the literature and neither is measured against DEM or a laboratory test on this material.'}
          </li>
          <li>
            {es
              ? 'No hay modelo sustituto aprendido. No se despacha ninguno hasta que supere a una regresion multiple sobre el mismo corpus por mas que la propia banda de la regresion.'
              : 'There is no learned surrogate model. None ships until it beats a multiple regression on the same corpus by more than the regression own band.'}
            {' '}<Cite id="kumral2006" paren />
          </li>
          <li>
            {es
              ? 'La relacion entre humedad y angulo de reposo tiene la forma correcta y un pico real, pero su valor a cualquier humedad dada no esta validado. Esta marcado como tal en el codigo.'
              : 'The moisture-to-repose relationship has the right shape and a real peak, but its value at any given moisture is not validated. It is marked as such in the code.'}
          </li>
          <li>
            {es
              ? 'Los rechazos de puntos planificados van de 2,9 a 13,8 por ciento segun el escenario. Es comportamiento real y se reporta, pero no es cero: el plan todavia pide en ocasiones puntos que la pila ya cubrio.'
              : 'Refusals of planned tips run from 2.9 to 13.8 percent depending on the scenario. That is real behaviour and it is reported, but it is not zero: the plan still occasionally asks for tips the pile has grown over.'}
          </li>
        </ul>
        <Refs
          ids={['young2021', 'young2022', 'young2021b', 'schramm2021', 'kumral2006', 'moraga2017']}
          label="Refs"
        />
        </>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Contraste' : 'Benchmark'}</h1>
        <p className="lede">
          {es
            ? 'Contra que se mide este producto: la geometria medida en 28 descargas reales, la linea base de la industria para un modelo de acopio, y la cota ideal de mezcla. Y, con el mismo detalle, lo que todavia no esta hecho.'
            : 'What this product is measured against: the geometry measured across 28 real dumps, the industry baseline for a stockpile model, and the ideal blending bound. And, in the same detail, what is not yet done.'}
        </p>
      </div>

      <Tabs tabs={tabs} ariaLabel={es ? 'Secciones' : 'Sections'} />
    </div>
  );
}
