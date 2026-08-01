import { Callout, Cite, Equation, InlineMath, Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Introducción' : 'Introduction'}</h1>
        <p className="lede">
          {es
            ? <>Entre el rajo y la planta el mineral se acopia. La pila no es un balde: como se CONSTRUYE y como se
              RECUPERA deciden cuanta de la variabilidad de entrada llega a la planta, y esa reduccion se mide con
              la razon <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />, donde menor es
              mejor. StockTwin simula esa mecanica, mide el resultado y muestra el trabajo. No es contabilidad
              metalurgica de planta, no resuelve el programa lineal de mezcla y no emite consignas.</>
            : <>Between the pit and the plant, ore is buffered in stockpiles. A pile is not a bucket: how it is
              BUILT and how it is RECLAIMED decide how much of the input variability reaches the plant, and that
              reduction is measured by <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />,
              where lower is better. StockTwin simulates that mechanics, measures the result, and shows the working.
              It is not in-plant metal accounting, it does not solve the blending linear program, and it emits no
              setpoint.</>}
        </p>
      </div>

      <section>
        <h2>{es ? '1. El problema industrial' : '1. The industrial problem'}</h2>
        <p>
          {es
            ? 'Una losa de mineral de mina (ROM), una pila de mineral grueso después del chancado primario, o una cama de mezcla longitudinal en un patio de carbon o de cemento: los tres son el mismo objeto físico visto con distintos nombres. Un apilador deposita material a lo largo de una trayectoria; la pila se derrumba hasta su ángulo de reposo cada vez que recibe una carga; un recuperador toma cortes de la cara expuesta y alimenta la planta. Todo lo interesante ocurre en esos dos verbos.'
            : 'A run-of-mine pad, a coarse-ore stockpile after primary crushing, or a longitudinal blending bed in a coal or cement yard: all three are the same physical object under different names. A stacker deposits material along a path; the pile avalanches to its angle of repose every time it receives a load; a reclaimer takes cuts from the exposed face and feeds the plant. Everything interesting happens inside those two verbs.'}
        </p>
        <p>
          {es
            ? 'El equipamiento es concreto. Apiladores de brazo que recorren la losa a decenas de metros por minuto. Recuperadores de puente o de rastrillo que rastrillan la sección triangular completa de una estación longitudinal. Ruedas de cangilones que giran y cortan un banco de un tercio del ancho. Cargadores frontales que muerden la cara accesible en una losa ROM. Camiones de 220 toneladas que vacian en unos nueve metros de diámetro, no en un punto.'
            : 'The equipment is concrete. Boom stackers travelling the pad at tens of metres per minute. Bridge or harrow reclaimers that rake the entire triangular cross-section at one longitudinal station. Bucket wheels that slew and cut a bench across a third of the width. Front-end loaders biting the accessible face on a run-of-mine pad. Two-hundred-and-twenty-tonne haul trucks tipping over roughly nine metres, not over a point.'}
        </p>
        <p>
          {es
            ? 'Dos hechos duros y poco ensenados gobiernan el resultado. Primero, la geometría de apilado y la segregación de particulas deciden la calidad de la mezcla: la cantidad de capas que un corte atraviesa fija el techo de lo que la cama puede promediar. Segundo, la trazabilidad del material recuperado es un problema real de contabilidad, y sigue sin resolverse en operación: el articulo más reciente sobre modelado de pilas ROM en tiempo casi real afirma explicitamente que rastrear la ley en una pila ROM con los sistemas de despacho actuales es difícil porque la información no está disponible en tiempo real.'
            : 'Two hard and under-taught facts govern the result. First, stacking geometry and particle segregation decide blend quality: the number of layers a cut crosses sets the ceiling on what the bed can average. Second, reclaim traceability is a real bookkeeping problem and remains unsolved in operation: the most recent paper on near-real-time run-of-mine stockpile modelling states plainly that tracing ore grade at a run-of-mine stockpile with current fleet-management systems is hard because the information is not available in real time.'}
          {' '}<Cite id="zhao2021" paren />
        </p>
        <Refs ids={['zhao2021', 'zhao2015', 'li2019']} label="Refs" />
      </section>

      <section>
        <h2>{es ? '2. La física, en tres capas' : '2. The physics, in three layers'}</h2>
        <p>
          {es
            ? 'La geometria es la capa más simple y la más consecuente. Un material granular seco no puede sostener una pendiente por encima de su ángulo de reposo, así que cada carga que llega desencadena una avalancha que reparte el exceso ladera abajo. El ángulo de reposo es una propiedad del material: los valores publicados para minerales van de unos 34 grados (cobre, Noruega) a unos 60 (cobre, Peru), y se mueve con el tamaño, la humedad y el tiempo desde la descarga.'
            : 'Geometry is the simplest layer and the most consequential. Dry granular material cannot hold a slope above its angle of repose, so every arriving load triggers an avalanche that spreads the excess down the flank. The angle of repose is a material property: published values for ores run from about 34 degrees (copper, Norway) to about 60 (copper, Peru), and it moves with size, moisture and time since dumping.'}
          {' '}<Cite id="wartsila" paren /> <Cite id="samadani2001" paren />
        </p>
        <p>
          {es
            ? 'La segregacion es la capa qué hace que mezclar no sea promediar. Mientras el material avalancha, las particulas finas percolan hacia el fondo de la capa fluyente y elevan a las gruesas: el cribado cinético. El material que se detiene primero es rico en finos y el que viaja más lejos es grueso, de modo que el pie de la pila queda más grueso que la cresta. Esto no es un detalle estetico: sesga lo que contiene cada corte de recuperación según donde y a que profundidad se tome.'
            : 'Segregation is the layer that makes blending different from averaging. As material avalanches, fine particles percolate into the void space opening beneath them and lever the large ones upward: kinetic sieving. What stops first is fine-rich and what travels furthest is coarse, so the toe of the pile ends up coarser than the crest. This is not cosmetic: it biases what each reclaim cut contains, according to where and how deep it is taken.'}
          {' '}<Cite id="savage1988" paren /> <Cite id="gray2005" paren />
        </p>
        <p>
          {es
            ? 'Cuando las dos especies tienen angulos de reposo distintos aparece una tercera capa. Makse y colaboradores mostraron que una mezcla bidispersa vertida entre dos placas se estratifica espontaneamente en capas alternadas de gruesos y finos, siempre que los granos grandes tengan el ángulo de reposo mayor; si los angulos son iguales o están invertidos, la mezcla solo segrega. Es un resultado nitido y falsable, y es la mejor oportunidad didactica que ofrece un corte interno.'
            : 'A third layer appears when the two species have different repose angles. Makse and co-workers showed that a bidisperse mixture poured between two plates spontaneously stratifies into alternating coarse and fine layers, provided the large grains have the larger angle of repose; when the angles are equal or reversed the mixture merely segregates. It is a crisp, falsifiable result and it is the best teaching moment an internal cutaway can offer.'}
          {' '}<Cite id="makse1997" paren />
        </p>
        <Refs ids={['savage1988', 'gray2005', 'makse1997', 'samadani2001', 'wartsila', 'bouchaud1994']} label="Refs" />
      </section>

      <section>
        <h2>{es ? '3. La matemática que gobierna' : '3. The governing mathematics'}</h2>
        <p>
          {es
            ? 'El modelo de segregación que corre en vivo en esta aplicación es el de Gray y Thornton. Sus velocidades de percolación relativas al flujo global son'
            : 'The segregation model running live in this app is Gray and Thornton’s. Their percolation velocities relative to the bulk flow are'}
        </p>
        <Equation
          tex="w_l - w = +q\,\phi_s, \qquad w_s - w = -q\,\phi_l, \qquad q = \frac{B}{c}\,g\cos\zeta"
          caption={es
            ? 'Ecuaciones (3.10) y (3.11): las particulas grandes suben a velocidad proporcional a la fracción de finos, y las pequenas drenan a velocidad proporcional a la de gruesos. La segregación se detiene al alcanzar una fase pura.'
            : 'Equations (3.10) and (3.11): large particles rise at a velocity proportional to the small-particle fraction, and small ones drain at a velocity proportional to the large-particle fraction. Segregation stops when a pure phase is reached.'} />
        <p>
          {es
            ? 'Sustituyendo en el balance de masa de la especie fina y adimensionalizando con las escalas estandar de avalancha se obtiene la ecuación de gobierno,'
            : 'Substituting into the small-particle mass balance and non-dimensionalising with the standard avalanche scalings gives the governing equation,'}
        </p>
        <Equation
          tex="\frac{\partial \phi}{\partial t} + \frac{\partial (\phi u)}{\partial x} + \frac{\partial (\phi v)}{\partial y} + \frac{\partial (\phi w)}{\partial z} - S_r\,\frac{\partial}{\partial z}\big[\phi(1-\phi)\big] = 0"
          caption={es
            ? 'Ecuación (3.18). El flujo phi(1-phi) es todo el contenido físico: la segregación se apaga cuando cualquiera de las especies alcanza el 100 por ciento.'
            : 'Equation (3.18). The phi(1-phi) flux is the entire physical content: segregation shuts off when either species reaches 100 percent.'} />
        <Equation
          tex="S_r = \frac{q\,L}{H\,U}"
          caption={es
            ? 'Ecuación (3.19), el número de segregación: la razón entre la velocidad media de segregación y la magnitud típica de la velocidad normal del flujo. En cero la ecuación degenera a un trazador pasivo, y ese límite es el control negativo del producto.'
            : 'Equation (3.19), the segregation number: the ratio of the mean segregation velocity to the typical magnitude of the normal bulk velocity. At zero the equation degenerates to a passive tracer, and that limit is the product’s negative control.'} />
        <p>{es ? 'Simbolos:' : 'Symbols:'}</p>
        <ul>
          <li><InlineMath tex="\phi" /> {es ? 'fracción volumetrica de la especie pequena, adimensional, entre 0 y 1' : 'volume fraction of the small species, dimensionless, 0 to 1'}</li>
          <li><InlineMath tex="\phi_s,\ \phi_l" /> {es ? 'fracciones de la especie pequeña y grande; suman uno' : 'small- and large-species fractions; they sum to one'}</li>
          <li><InlineMath tex="w_s,\ w_l,\ w" /> {es ? 'velocidades normales de cada especie y del flujo global, m/s' : 'normal velocities of each species and of the bulk, m/s'}</li>
          <li><InlineMath tex="q" /> {es ? 'velocidad media de segregación, m/s' : 'mean segregation velocity, m/s'}</li>
          <li><InlineMath tex="B" /> {es ? 'magnitud adimensional de la perturbación de reparto de presión entre especies' : 'dimensionless magnitude of the pressure-partition perturbation between species'}</li>
          <li><InlineMath tex="c" /> {es ? 'coeficiente de arrastre entre particulas' : 'inter-particle drag coefficient'}</li>
          <li><InlineMath tex="\zeta" /> {es ? 'inclinación del flanco' : 'slope inclination of the flank'}</li>
          <li><InlineMath tex="L,\ H,\ U" /> {es ? 'longitud típica del camino, espesor de la capa fluyente y velocidad típica' : 'typical path length, flowing-layer thickness and typical velocity'}</li>
          <li><InlineMath tex="S_r" /> {es ? 'número de segregación, adimensional' : 'segregation number, dimensionless'}</li>
          <li><InlineMath tex="x,\ y,\ z,\ t" /> {es ? 'coordenadas ladera abajo, transversal, en profundidad, y tiempo' : 'downslope, cross-slope, depth and time coordinates'}</li>
          <li><InlineMath tex="u,\ v" /> {es ? 'componentes de la velocidad del flujo global en x e y' : 'bulk velocity components along x and y'}</li>
        </ul>
        <p>
          {es
            ? 'La segunda ecuación que gobierna el producto no viene de la literatura granular sino de la estadística. Si las N capas que un corte atraviesa fueran extracciones independientes de la distribución de entrada, la media del corte tendría varianza sigma^2_in / N, de donde'
            : 'The second governing equation comes not from granular physics but from statistics. If the N layers a cut crosses were independent draws from the input distribution, the cut mean would have variance sigma^2_in / N, so'}
        </p>
        <Equation
          tex="\mathrm{VRR}_{\text{ideal}} = \frac{1}{N}, \qquad E_{\text{ideal}} = \frac{\sigma_{\text{in}}}{\sigma_{\text{out}}} = \sqrt{N}"
          caption={es
            ? 'La cota de capas independientes, derivada aquí de primeros principios y etiquetada como derivada. Una cama real recupera solo una fracción de esta cota.'
            : 'The independent-layer bound, derived here from first principles and labelled as derived. A real bed recovers only a fraction of it.'} />
        <Refs ids={['gray2005', 'gray2018', 'robinson2004', 'petersen2004']} label="Refs" />
      </section>

      <section>
        <h2>{es ? '4. El proceso, de extremo a extremo' : '4. The end-to-end pipeline'}</h2>
        <ol>
          <li>{es ? 'Un cuerpo mineralizado, sintético y sembrado o un modelo de bloques publicado con leyes reales de cobre, da el campo de leyes.' : 'An ore body, either seeded and synthetic or a published block model with real copper grades, supplies the grade field.'}</li>
          <li>{es ? 'Una secuencia de extracción recorre ese campo y produce un flujo de camiones: una fila por descarga, con tonelaje, leyes, fracción gruesa, humedad y posición.' : 'A dig sequence walks that field and produces a truck stream: one row per dump, with tonnage, grades, coarse fraction, moisture and position.'}</li>
          <li>{es ? 'El contrato de ingesta valida cada fila: rechaza lo que está fuera de rango con una razón declarada, marca lo sospechoso y no corrige nada en silencio.' : 'The ingestion contract validates every row: it rejects what is out of range with a stated reason, flags what is suspicious, and silently coerces nothing.'}</li>
          <li>{es ? 'El método de apilado convierte el índice del camion en una posición sobre la losa.' : 'The stacking method turns the truck index into a position on the pad.'}</li>
          <li>{es ? 'La carga aterriza sobre un disco de unos nueve metros y el campo de alturas se relaja; la cascada ordenada de transferencias ES el camino de la avalancha.' : 'The load lands over a nine-metre disc and the height field relaxes; the ordered cascade of transfers IS the avalanche path.'}</li>
          <li>{es ? 'La capa fluyente avanza un paso por banda del camino, y decide como se reparten finos y gruesos entre lo que se detiene y lo que sigue.' : 'The flowing layer advances one step per band of that path, deciding how fines and coarse split between what stops and what travels on.'}</li>
          <li>{es ? 'El libro mayor sigue la geometría: los lotes se mueven desde la cima de la columna origen a la cima de la destino, conservando su orden.' : 'The ledger follows the geometry: lots move from the top of the source column to the top of the destination, preserving their order.'}</li>
          <li>{es ? 'El recuperador toma cortes según su geometría, y cada corte reporta la fracción de su tonelaje proveniente de cada evento de deposición.' : 'The reclaimer takes cuts according to its geometry, and every cut reports the fraction of its tonnage from each deposition event.'}</li>
          <li>{es ? 'Las métricas se calculan sobre base de tonelaje y se muestran contra la cota ideal y contra las anclas publicadas.' : 'The metrics are computed on a tonnage base and shown against the ideal bound and against the published anchors.'}</li>
        </ol>
      </section>

      <section>
        <h2>{es ? '5. Exacto contra ilustrativo' : '5. Exact versus illustrative'}</h2>
        <Callout variant="honest" title={es ? 'Que es exacto y que no' : 'What is exact and what is not'}>
          {es
            ? 'Exacto: la conservación de masa (residual del orden de 1e-11 toneladas sobre un caso completo), la suma a uno de las fracciones de procedencia (1e-12), el determinismo del replay dada una semilla, la degeneración del solucionador de segregación a un trazador pasivo cuando Sr es cero, y la cota 1/N derivada. Ilustrativo: el ángulo de reposo es un valor de manual impuesto, no emergente; las interfaces entre lotes son más nitidas que en una pila real porque el remanejo y la mezcla por avalancha no están modelados; la segregación es un modelo continuo publicado y no verdad a escala de particula; y los datos son sinteticos salvo cuando se selecciona el carril real. Los valores publicados de VRR contra los que se compara el producto provienen de una pila circular de otras dimensiones, así que la prueba es ordinal y de orden de magnitud, nunca de reproducción digito a digito.'
            : 'Exact: mass conservation (residual of order 1e-11 tonnes over a full case), the provenance fractions summing to one (1e-12), replay determinism given a seed, the segregation solver degenerating to a passive tracer at Sr of zero, and the derived 1/N bound. Illustrative: the angle of repose is an imposed handbook value, not an emergent one; lot interfaces are sharper than a real pile’s because re-handling and avalanche mixing are not modelled; the segregation is a published continuum model rather than particle-scale truth; and the data is synthetic except when the real lane is selected. The published variance-reduction values the product is scored against come from a circular pile of different dimensions, so the test is ordinal and magnitude-level, never a digit-for-digit reproduction.'}
        </Callout>
        <Refs ids={['loubser2015', 'kumral2006', 'schramm2021', 'marques2013']} label="Refs" />
      </section>
    </div>
  );
}
