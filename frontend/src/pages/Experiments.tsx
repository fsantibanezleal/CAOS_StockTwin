import { Callout, Cite, Equation, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, casesByCategory } from '../engine';

/** ADR-0017 section 2: at least six tabs, prose and tabs and never info-box cards, exact metric
 *  equations with their real constants, a leakage-safe protocol, and a real coverage matrix. */
export default function Experiments() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">
          {es
            ? 'El diseno de validacion: diecisiete casos en cinco categorias, tres de ellos controles con criterios numericos de descarte, las metricas con sus ecuaciones exactas, el protocolo de particion que impide la fuga, y las cuatro afirmaciones ordinales que el producto se compromete a publicar pasen o fallen.'
            : 'The validation design: seventeen cases in five categories, three of them controls with numerical kill criteria, the metrics with their exact equations, the split protocol that prevents leakage, and the four ordinal assertions the product commits to publishing whether they pass or fail.'}
        </p>
      </div>

      <SubTabs orientation="vertical" ariaLabel={es ? 'Experimentos' : 'Experiments'} tabs={[
        { id: 'design', label: es ? 'Diseno' : 'Design', content: <Design es={es} /> },
        { id: 'matrix', label: es ? 'Matriz de cobertura' : 'Coverage matrix', content: <Matrix es={es} /> },
        { id: 'metrics', label: es ? 'Metricas' : 'Metrics', content: <Metrics es={es} /> },
        { id: 'controls', label: es ? 'Los tres controles' : 'The three controls', content: <Controls es={es} /> },
        { id: 'protocol', label: es ? 'Protocolo y fuga' : 'Protocol and leakage', content: <Protocol es={es} /> },
        { id: 'assertions', label: es ? 'Afirmaciones' : 'Assertions', content: <Assertions es={es} /> },
        { id: 'data', label: es ? 'Datos y procedencia' : 'Data and provenance', content: <Data es={es} /> },
      ]} />
    </div>
  );
}

function Design({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Que pregunta responde cada eje' : 'What question each axis answers'}</h2>
      <p>
        {es
          ? 'Los casos no son ejemplos: son el diseno de validacion. Cada uno declara su razon cientifica de inclusion, su comportamiento esperado y el criterio de descarte que dice que resultado significaria que el codigo esta mal. Sin esa ultima parte un caso es una demostracion, no una prueba.'
          : 'The cases are not examples: they are the validation design. Each declares its scientific reason for inclusion, its expected behaviour, and the kill criterion that says what result would mean the code is wrong. Without that last part a case is a demonstration, not a test.'}
      </p>
      <ul>
        <li>
          <strong>{es ? 'Geometria de apilado' : 'Stacking geometry'}</strong>{' '}
          {es
            ? 'es el eje primario. El metodo de construccion decide cuantas capas cruza un corte, y ese es el termino dominante de todo lo que sigue.'
            : 'is the primary axis. The build method decides how many layers a cut crosses, and that is the dominant term in everything downstream.'}
        </li>
        <li>
          <strong>{es ? 'Metodo de recuperacion' : 'Reclaim method'}</strong>{' '}
          {es
            ? 'es independiente de la construccion: la misma pila recuperada de dos maneras da dos respuestas. Se mantiene chevron para que la comparacion sea limpia, y el caso chevron con cara completa hace de referencia de este eje en vez de duplicarse como una fila propia. Una fila duplicada es relleno, no cobertura.'
            : 'is independent of the build: the same pile reclaimed two ways gives two answers. The build is held at chevron so the comparison is clean, and the chevron-with-full-face case serves as this axis’s reference rather than being duplicated as a row of its own. A duplicated row is padding, not coverage.'}
        </li>
        <li>
          <strong>{es ? 'Variabilidad de entrada' : 'Input variability'}</strong>{' '}
          {es
            ? 'es la autocorrelacion del flujo entrante, que decide si las capas que cruza un corte son lo bastante independientes para que la cama sirva de algo. Los casos de alcance largo y con deriva son los que un producto que quisiera lucirse omitiria en silencio, asi que se envian como casos destacados.'
            : 'is the autocorrelation of the incoming stream, which decides whether the layers a cut crosses are independent enough for the bed to help at all. The long-range and trending cases are the ones a product wanting to look good would quietly omit, so they ship as headline cases.'}
        </li>
        <li>
          <strong>{es ? 'Regimen de segregacion' : 'Segregation regime'}</strong>{' '}
          {es
            ? 'cubre si el cribado cinetico es lo bastante fuerte para sesgar lo que contiene cada corte, y si las dos especies tienen angulos de reposo lo bastante distintos para estratificar.'
            : 'covers whether kinetic sieving is strong enough to bias what each cut contains, and whether the two species have different enough repose angles to stratify.'}
        </li>
        <li>
          <strong>{es ? 'Controles' : 'Controls'}</strong>{' '}
          {es
            ? 'son tres, cada uno con un criterio numerico. Sin ellos una respuesta plausible pero equivocada es indistinguible de una correcta.'
            : 'are three, each with a numerical criterion. Without them a plausible wrong answer is indistinguishable from a right one.'}
        </li>
      </ul>
    </>
  );
}

function Matrix({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'La matriz completa' : 'The complete matrix'}</h2>
      {casesByCategory().map((g) => (
        <div key={g.category} style={{ marginBottom: '1.4rem' }}>
          <h3>{g.label}</h3>
          <div className="st-tablewrap" style={{ maxHeight: 'none' }}>
            <table className="cmp-table st-table">
              <thead>
                <tr>
                  <th>{es ? 'caso' : 'case'}</th>
                  <th>{es ? 'configuracion' : 'configuration'}</th>
                  <th>{es ? 'se espera' : 'expected'}</th>
                  <th>{es ? 'criterio de descarte' : 'kill criterion'}</th>
                </tr>
              </thead>
              <tbody>
                {g.cases.map((c) => (
                  <tr key={c.id}>
                    <td className="st-mono" style={{ textAlign: 'left', verticalAlign: 'top' }}>{c.id}</td>
                    <td className="st-mono" style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: '0.7rem', verticalAlign: 'top' }}>
                      {c.stacking} / {c.reclaim} / {c.structure}<br />
                      P={c.nPasses} Sr={c.sr} {c.reposeDeg}
                      {c.reposeCoarseDeg !== c.reposeDeg ? `/${c.reposeCoarseDeg}` : ''} deg
                    </td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', verticalAlign: 'top' }}>{c.expectedBand}</td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', verticalAlign: 'top', fontSize: '0.72rem' }}>
                      {c.killCriterion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="st-note">
        {es
          ? `Diecisiete casos, todos etiquetados sinteticos salvo cuando se selecciona el carril real, y todos retenidos del entrenamiento de los sustitutos.`
          : `Seventeen cases, all labelled synthetic except when the real lane is selected, and all held out of surrogate training.`}
        {' '}({CASES.length} {es ? 'en total' : 'total'})
      </p>
    </>
  );
}

function Metrics({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Las metricas, con sus ecuaciones exactas' : 'The metrics, with their exact equations'}</h2>
      <Equation
        tex="\mathrm{VRR} = \frac{\sigma^2_{\text{out}}}{\sigma^2_{\text{in}}}, \qquad \sigma^2 = \frac{\sum_i m_i (g_i - \bar g)^2}{\sum_i m_i}"
        caption={es
          ? 'La razon de reduccion sobre base de tonelaje, menor es mejor. m_i en toneladas, g_i en por ciento de cobre. Las dos varianzas deben calcularse sobre la misma base, que es el requisito explicito de Kumral.'
          : 'The reduction ratio on a tonnage base, lower is better. m_i in tonnes, g_i in percent copper. Both variances must be on the same base, which is Kumral’s explicit requirement.'} />
      <Equation
        tex="\eta = \frac{\mathrm{VRR}_{\text{ideal}}}{\mathrm{VRR}} = \frac{1}{N \cdot \mathrm{VRR}} \in (0, 1]"
        caption={es
          ? 'La eficiencia contra la cota de capas independientes. Es la metrica que impide inflar el beneficio: una cama en 0,05 con 100 capas solo esta recuperando un quinto de lo alcanzable.'
          : 'The efficiency against the independent-layer bound. It is the metric that prevents inflating the benefit: a bed at 0.05 with 100 layers is recovering only a fifth of what was attainable.'} />
      <Equation
        tex="I_{\text{seg}} = \overline{\phi_{c}}\big|_{\text{toe}} - \overline{\phi_{c}}\big|_{\text{apex}}"
        caption={es
          ? 'El indice de segregacion: la diferencia de fraccion gruesa entre el tercio mas bajo y el mas alto de la losa ocupada, por altura. Definirlo por altura y no por distancia a un centro nominal lo mantiene valido para geometrias que construyen varias crestas.'
          : 'The segregation index: the coarse-fraction difference between the lowest and highest thirds of the occupied pad, by height. Defining it by height rather than by distance from a nominal centre keeps it valid for geometries that build several crests.'} />
      <Equation
        tex="R = T_{\text{dep}} - \big(T_{\text{pile}} + T_{\text{rec}}\big)"
        caption={es
          ? 'El residual de conservacion de masa, en toneladas. Se muestra en pantalla en la App en vez de afirmarse en prosa, porque un solucionador que perdiera una fraccion de un por ciento por descarga seguiria dibujando un cono convincente.'
          : 'The mass conservation residual, in tonnes. It is shown on screen in the App rather than asserted in prose, because a solver losing a fraction of a percent per dump would still draw a convincing cone.'} />
      <p>
        {es
          ? 'Toda metrica de una corrida se reporta con una banda de credibilidad multi-semilla sobre 31 semillas, percentiles 5 y 95. Un numero puntual sin intervalo es un defecto en esta linea de productos, y aqui ademas seria una inflacion: la razon de reduccion de una sola realizacion es a su vez una variable aleatoria, y citar la extraccion que mejor se ve es la forma mas facil de exagerar lo que una cama logra.'
          : 'Every metric of a run is reported with a multi-seed credible band over 31 seeds, 5th and 95th percentiles. A point number with no interval is a defect on this product line, and here it would also be an inflation: the reduction ratio of a single realisation is itself a random variable, and quoting whichever draw looks best is the easiest way to overstate what a bed achieves.'}
      </p>
      <Refs ids={['kumral2006', 'loubser2015', 'robinson2004']} label="Refs" />
    </>
  );
}

function Controls({ es }: { es: boolean }) {
  const ctl = CASES.filter((c) => c.category === 'control');
  return (
    <>
      <h2>{es ? 'Los tres controles' : 'The three controls'}</h2>
      <p>
        {es
          ? 'Un control con un criterio numerico es lo que separa una prueba de una demostracion. Cada uno de estos dice, por adelantado, que resultado significaria que el codigo esta mal, y el reporte de release falla si alguno no se cumple.'
          : 'A control with a numerical criterion is what separates a test from a demonstration. Each of these states, in advance, what result would mean the code is wrong, and the release report fails if any of them does not hold.'}
      </p>
      {ctl.map((c) => (
        <div key={c.id} style={{ marginBottom: '1.2rem' }}>
          <h3 className="st-mono">{c.id}</h3>
          <p>{c.reason}</p>
          <p><strong>{es ? 'Se espera' : 'Expected'}:</strong> {c.expectedBand}</p>
          <Callout variant="honest" title={es ? 'Criterio de descarte' : 'Kill criterion'}>{c.killCriterion}</Callout>
        </div>
      ))}
      <Equation
        tex="\text{C01:}\quad \mathrm{VRR}_{\text{ideal}} \in \big[\mathrm{VRR}^{(5\%)},\ \mathrm{VRR}^{(95\%)}\big]"
        caption={es
          ? 'Con una losa de una sola celda no hay geometria, asi que un corte es la media ponderada de toda la pila y la razon lograda debe contener la cota 1/N dentro de su banda. Si no la contiene, la implementacion de la razon esta mal y todo numero del producto queda en duda.'
          : 'With a single-cell pad there is no geometry, so a cut is the tonnage-weighted mean of the whole pile and the achieved ratio must contain the 1/N bound inside its band. If it does not, the ratio implementation is wrong and every number in the product is in doubt.'} />
      <Equation
        tex="\text{C02:}\quad \max_{\text{cortes}} \left| \phi_c^{\text{cut}} - \sum_e f_e\,\phi_c^{(e)} \right| \le 10^{-9}"
        caption={es
          ? 'Con Sr en cero el solucionador no debe cambiar el reparto de tamanos de ningun lote, asi que la fraccion gruesa de cada corte debe igualar la mezcla ponderada por procedencia de sus descargas fuente. Este criterio, aplicado a nivel de lote donde es exacto, detecto un error real de modelado por un cuarto del rango completo.'
          : 'At Sr of zero the solver must not change any lot’s size split, so each cut’s coarse fraction must equal the provenance-weighted mix of its source dumps. This criterion, applied at lot level where it is exact, caught a real modelling error by a quarter of the full range.'} />
      <Refs ids={['gray2005']} label="Refs" />
    </>
  );
}

function Protocol({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'El protocolo de particion y la fuga que impide' : 'The split protocol and the leakage it prevents'}</h2>
      <p>
        {es
          ? 'Los sustitutos predicen un resultado de mezcla a partir de los parametros de la corrida. Si una fila de entrenamiento y una de prueba compartieran semilla, compartirian la secuencia exacta de leyes y el modelo se evaluaria sobre datos que memorizo. Particionar solo por semilla tampoco basta: la ESTRUCTURA DE ENTRADA determina la forma de todo el flujo, asi que un modelo entrenado sobre todas las estructuras y evaluado sobre las mismas aprende las cuatro formas en lugar de la fisica. La particion es por semilla Y estructura.'
          : 'The surrogates predict a blending outcome from the run’s parameters. If a training row and a test row shared a seed they would share the exact grade sequence, and the model would be scored on data it had memorised. Splitting by seed alone is not enough either: the INPUT STRUCTURE determines the shape of the whole stream, so a model trained on every structure and tested on the same structures learns the four shapes rather than the physics. The split is by seed AND structure.'}
      </p>
      <Equation
        tex={'\\text{bucket}(s, \\sigma) = \\mathrm{fnv}\\big(\\text{seed}_{\\text{split}},\\ s \\Vert \\sigma\\big) \\bmod 10, \\qquad \\text{test} \\iff \\text{bucket} < 2'}
        caption={es
          ? 'La asignacion de grupo es un hash de la clave del grupo y no una permutacion, de modo que el mismo corpus se particiona igual sin importar en que orden lleguen las filas. Una prueba verifica que ningun grupo (semilla, estructura) queda a ambos lados.'
          : 'The group assignment is a hash of the group key rather than a shuffle, so the same corpus splits the same way whatever order the rows arrive in. A test asserts that no (seed, structure) group straddles the split.'} />
      <p>
        {es
          ? 'Los diecisiete casos de exhibicion quedan retenidos por completo y ninguno aporta una fila de entrenamiento. Eso es lo que permite que la pagina Benchmark los reporte como evidencia en vez de como un ajuste.'
          : 'The seventeen showcase cases are held out entirely and none contributes a training row. That is what lets the Benchmark page report them as evidence rather than as a fit.'}
      </p>
    </>
  );
}

function Assertions({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Las cuatro afirmaciones, escritas antes de correr' : 'The four assertions, written before the run'}</h2>
      <p>
        {es
          ? 'El producto se compromete con estas cuatro afirmaciones ordinales. Se escriben aqui antes de la corrida, se evaluan en la etapa de evaluacion y se publican en Benchmark pasen o fallen. Un resultado negativo es un resultado: si una falla, se reporta con los numeros que la hicieron fallar, no se ajusta hasta que pase.'
          : 'The product commits to these four ordinal assertions. They are written here before the run, evaluated in the evaluate stage, and published on Benchmark whether they pass or fail. A negative result is a result: if one fails it is reported with the numbers that failed it, not tuned until it passes.'}
      </p>
      <ol>
        <li>
          <strong>A1.</strong>{' '}
          {es ? 'Chevcon mezcla mejor que los conos concentricos, el orden en que toda la literatura coincide.' : 'Chevcon blends better than cone shell, the ordering every source agrees on.'}
        </li>
        <li>
          <strong>A2.</strong>{' '}
          {es ? 'Los conos caen en la misma banda de magnitud que el 0,232 publicado. La banda es amplia a proposito, porque el valor publicado es de una pila circular.' : 'Cone shell lands in the same magnitude band as the published 0.232. The band is deliberately wide because the published value is for a circular pile.'}
        </li>
        <li>
          <strong>A3.</strong>{' '}
          {es ? 'Chevcon recuperado con cara completa alcanza la magnitud de la regla practica de Bond, aproximadamente diez a uno en varianza.' : 'Chevcon reclaimed full-face reaches the magnitude of the Bond rule of thumb, about ten to one in variance.'}
        </li>
        <li>
          <strong>A4.</strong>{' '}
          {es ? 'Un rastrillo de cara completa mezcla mejor que un corte por banco, que a su vez mezcla mejor que las maquinas de alcance somero.' : 'A full-face rake blends better than a bench cut, which blends better than the shallow-reaching machines.'}
        </li>
      </ol>
      <Callout variant="honest" title={es ? 'Por que la prueba es ordinal y no digito a digito' : 'Why the test is ordinal and not digit-for-digit'}>
        {es
          ? 'Las anclas publicadas vienen de una pila CIRCULAR de otras dimensiones, y su fuente es internamente inconsistente sobre ellas: la Tabla IV de Loubser y de Korte, resuelta hacia atras, da dos varianzas de entrada distintas para una comparacion descrita como sobre la misma entrada (0,871 contra 0,620), y las conclusiones citan una razon chevcon menor a 0,1 donde la tabla dice 0,121. La conclusion ordinal esta bien respaldada; los digitos no son verdad de terreno. Reproducirlos exactamente seria una coincidencia, y afirmar que se reprodujeron seria deshonesto.'
          : 'The published anchors come from a CIRCULAR pile of different dimensions, and their source is internally inconsistent about them: Loubser and de Korte’s Table IV, back-solved, gives two different input variances for a comparison described as being on the same input (0.871 against 0.620), and the conclusions quote a chevcon ratio below 0.1 where the table says 0.121. The ordinal conclusion is well supported; the digits are not ground truth. Reproducing them exactly would be a coincidence, and claiming to have reproduced them would be dishonest.'}
      </Callout>
      <Refs ids={['loubser2015', 'kumral2006', 'schramm2021']} label="Refs" />
    </>
  );
}

function Data({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Datos y procedencia' : 'Data and provenance'}</h2>
      <p>
        {es
          ? 'El veredicto de disponibilidad se registro para que no se repita la busqueda: NO existe un registro abierto y licenciado de descargas camion por camion con leyes a la granularidad que necesita un simulador de acopio. Se buscaron Zenodo, Kaggle, el indice awesome-open-data y la literatura. El articulo mas reciente sobre el tema lo dice desde dentro: rastrear la ley en una pila ROM con los sistemas de despacho actuales es dificil porque la informacion no esta disponible en tiempo real.'
          : 'The availability verdict is recorded so the search is not repeated: there is NO open, licensed record of truck-by-truck dumps with grades at the granularity a stockpile simulator needs. Zenodo, Kaggle, the awesome-open-data index and the literature were searched. The most recent paper on the subject says so from the inside: tracing ore grade at a run-of-mine stockpile with current fleet-management systems is hard because the information is not available in real time.'}
        {' '}<Cite id="zhao2021" paren />
      </p>
      <p>
        {es
          ? 'El replanteamiento que lo resuelve: un registro de descargas es un artefacto DERIVADO de un modelo de bloques mas una secuencia de extraccion, y ambos estan disponibles. El producto genera uno en vez de fingir que existe uno publico.'
          : 'The reframe that fixes it: a dump log is a DERIVED artefact of a block model plus a dig sequence, and both are available. The product generates one rather than pretending a public one exists.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'carril' : 'lane'}</th>
            <th>{es ? 'fuente' : 'source'}</th>
            <th>{es ? 'manejo' : 'handling'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'Sintetico' : 'Synthetic'}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'cuerpos mineralizados de oreblocks (Apache-2.0) mas un flujo de leyes con covarianza exponencial, ambos sembrados y reproducibles bit a bit' : 'ore bodies from oreblocks (Apache-2.0) plus an exponential-covariance grade stream, both seeded and byte-reproducible'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'comprometible por completo, etiquetado sintetico en todas partes' : 'fully committable, labelled synthetic everywhere'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'Controlado' : 'Controlled'}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'simulacion gaussiana secuencial con GSTools, para barrer explicitamente el alcance y la meseta del variograma' : 'sequential Gaussian simulation with GSTools, to sweep the variogram range and sill explicitly'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'carril fuera de linea; es lo que hace significativa la comparacion contra la cota' : 'offline lane; it is what makes the comparison against the bound meaningful'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'Real' : 'Real'}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'modelos de bloques publicados de MineLib; la instancia KD lleva una columna explicita de ley de cobre sobre 14.153 bloques' : 'published MineLib block models; the KD instance carries an explicit copper grade column over 14,153 blocks'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'descargados en tiempo de ejecucion a la memoria del navegador; NUNCA comprometidos, NUNCA empaquetados, y la integracion continua nunca los descarga' : 'fetched at runtime into browser memory; NEVER committed, NEVER bundled, and continuous integration never fetches them'}
            </td>
          </tr>
        </tbody>
      </table>
      <Callout variant="honest" title={es ? 'La postura de licencia de MineLib' : 'The MineLib licence posture'}>
        {es
          ? 'La unica concesion de MineLib es que los archivos pueden descargarse con fines academicos. No hay permiso de redistribucion, las instancias provienen de donantes industriales anonimos y una de ellas se distribuye con software comercial. Por eso los archivos no aparecen en este repositorio ni en el sitio construido: el navegador los obtiene de los espejos publicos cuando el lector selecciona un caso real, los mantiene en memoria durante la sesion y los descarta.'
          : 'MineLib’s only grant is that the files may be downloaded for academic purposes. There is no redistribution permission, the instances come from anonymous industrial donors, and one of them ships with commercial software. That is why the files appear nowhere in this repository or in the built site: the browser fetches them from the public mirrors when a reader selects a real case, holds them in memory for the session, and discards them.'}
      </Callout>
      <Refs ids={['espinoza2013', 'oreblocks', 'muller2022', 'marques2013', 'zhao2021']} label="Refs" />
    </>
  );
}
