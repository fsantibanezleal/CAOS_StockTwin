import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import { RECLAIM_GEOMETRY, STACKING_LABELS } from '../engine';

/**
 * ADR-0017 section 2: at least six method-family tabs, each with at least four dense paragraphs, at
 * least two captioned equations, a theme-aware figure, exactly one honest callout, and per-section
 * references with real DOIs. The content is TRANSCRIBED from wip/stocktwin/method-survey-2026-08-01.md
 * rather than recalled, which is why the equation numbers are the source's own.
 */
export default function Methodology() {
  const es = useShellLang() === 'es';

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Metodologia' : 'Methodology'}</h1>
        <p className="lede">
          {es
            ? <>Quince metodos en cuatro familias: la geometria de la pila, la fisica de segregacion, la teoria de
              mezcla y la trazabilidad. Para cada uno, que calcula, la ecuacion, la fuente con su DOI, en que carril
              corre y donde falla. La razon de reduccion es{' '}
              <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />, menor es mejor.</>
            : <>Fifteen methods in four families: pile geometry, segregation physics, blending theory and
              traceability. For each, what it computes, its equation, its source with a DOI, which lane it runs in,
              and where it fails. The reduction ratio
              is <InlineMath tex="\mathrm{VRR}=\sigma^2_{\text{out}}/\sigma^2_{\text{in}}" />, lower is better.</>}
        </p>
      </div>

      <SubTabs orientation="vertical" ariaLabel={es ? 'Familias de metodos' : 'Method families'} tabs={[
        {
          id: 'relaxation',
          label: es ? 'Relajacion de la pila' : 'Pile relaxation',
          content: <Relaxation es={es} />,
        },
        {
          id: 'stacking',
          label: es ? 'Geometrias de apilado' : 'Stacking geometries',
          content: <Stacking es={es} />,
        },
        {
          id: 'reclaim',
          label: es ? 'Geometrias de recuperacion' : 'Reclaim geometries',
          content: <Reclaim es={es} />,
        },
        {
          id: 'segregation',
          label: es ? 'Segregacion cinetica' : 'Kinetic segregation',
          content: <Segregation es={es} />,
        },
        {
          id: 'stratification',
          label: es ? 'Estratificacion' : 'Stratification',
          content: <Stratification es={es} />,
        },
        {
          id: 'blending',
          label: es ? 'Teoria de mezcla' : 'Blending theory',
          content: <Blending es={es} />,
        },
        {
          id: 'traceability',
          label: es ? 'Trazabilidad y residencia' : 'Traceability and residence',
          content: <Traceability es={es} />,
        },
        {
          id: 'learned',
          label: es ? 'Tier aprendido' : 'The learned tier',
          content: <Learned es={es} />,
        },
      ]} />
    </div>
  );
}

function Relaxation({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodo 1: relajacion conservativa con angulo de reposo impuesto' : 'Method 1: mass-conserving relaxation with an imposed angle of repose'}</h2>
      <p>
        {es
          ? 'Un campo de alturas recibe material en un punto y se relaja hasta que ninguna pendiente local supera un valor critico. La regla de vuelco es la que Bak, Tang y Wiesenfeld introdujeron para el automata de la pila de arena: una celda cuyo desnivel con un vecino supera el maximo admisible cede material a ese vecino, y la cascada continua hasta que todas las pendientes son subcriticas.'
          : 'A height field receives material at a point and relaxes until no local slope exceeds a critical value. The toppling rule is the one Bak, Tang and Wiesenfeld introduced for the sandpile automaton: a cell whose drop to a neighbour exceeds the admissible maximum gives material to that neighbour, and the cascade continues until every slope is subcritical.'}
        {' '}<Cite id="bak1987" paren />
      </p>
      <p>
        {es
          ? 'Lo que este producto NO afirma importa tanto como lo que si. El modelo de Bak, Tang y Wiesenfeld describe la ESTADISTICA de tamanos de avalancha bajo criticidad autoorganizada, donde la pendiente critica es un parametro libre del automata y el resultado interesante es una ley de potencias. Nada de eso se afirma aqui. Aqui la pendiente critica esta IMPUESTA como el angulo de reposo del material, tomado de rangos publicados de manual, y la regla de vuelco se usa unicamente como un solucionador de relajacion que conserva masa. La estadistica de avalanchas queda fuera de alcance.'
          : 'What this product does NOT claim matters as much as what it does. Bak, Tang and Wiesenfeld’s model describes the STATISTICS of avalanche sizes under self-organized criticality, in which the critical slope is a free parameter of the automaton and the interesting result is a power law. None of that is claimed here. Here the critical slope is IMPOSED as the material’s angle of repose, taken from published handbook ranges, and the toppling rule is used only as a mass-conserving relaxation solver. Avalanche statistics are out of scope.'}
      </p>
      <p>
        {es
          ? 'La regla de vuelco exacta importa para el rendimiento tanto como para la fisica. Una celda cede un total T repartido como t_k = max(0, d_k - T) entre sus vecinos demasiado empinados; asi todas las restricciones se satisfacen simultaneamente y ninguna se sobrepasa, y T resuelve una ecuacion de llenado por niveles que para las k mayores diferencias vale T = (suma de esas k) / (k + 1). La celda inestable MAS ALTA cae primero, de modo que la relajacion desciende monotonamente y las transferencias quedan en orden ladera abajo.'
          : 'The exact toppling rule matters as much for performance as for the physics. A cell gives away a total T split as t_k = max(0, d_k - T) over its over-steep neighbours, so every constraint is satisfied simultaneously and none is overshot, and T solves a water-filling equation which for the k largest excesses is T = (sum of those k) / (k + 1). The HIGHEST unstable cell topples first, so the relaxation marches monotonically downhill and the transfers come out in downslope order.'}
      </p>
      <Equation
        tex="T = \sum_k \max(0,\ d_k - T), \qquad t_k = \max(0,\ d_k - T), \qquad d_k = h_c - h_k - D_k"
        caption={es
          ? 'La regla de vuelco por llenado de niveles. d_k es el exceso al vecino k sobre el desnivel admisible D_k, que vale cell x tan(reposo) en ortogonal y raiz de dos veces eso en diagonal.'
          : 'The water-filling toppling rule. d_k is the excess to neighbour k over the admissible drop D_k, which is cell x tan(repose) orthogonally and the square root of two times that diagonally.'} />
      <Equation
        tex="D_{\text{orth}} = \Delta x \tan\theta_r, \qquad D_{\text{diag}} = \sqrt{2}\,\Delta x \tan\theta_r"
        caption={es
          ? 'El desnivel admisible escala con la distancia horizontal entre centros de celda, porque el reposo es una PENDIENTE. Usar un solo desnivel para ambos es lo que hace que un cono relajado salga cuadrado.'
          : 'The admissible drop scales with the horizontal distance between cell centres, because repose is a SLOPE. Using one drop for both is what makes a relaxed cone come out square.'} />
      <p>
        {es
          ? 'Simbolos: h_c altura de la celda que cae y h_k la del vecino, en metros; D_k desnivel admisible al vecino k, en metros; theta_r angulo de reposo impuesto; delta x el tamano de celda. La cascada devuelve la lista ordenada de transferencias, y ese orden es la coordenada ladera abajo que recorre el solucionador de segregacion: los metodos 1, 4 y 8 estan acoplados a traves de ese valor de retorno.'
          : 'Symbols: h_c the toppling cell’s height and h_k the neighbour’s, in metres; D_k the admissible drop to neighbour k, in metres; theta_r the imposed angle of repose; delta x the cell size. The cascade returns the ordered list of transfers, and that order is the downslope coordinate the segregation solver marches along: methods 1, 4 and 8 are coupled through that return value.'}
      </p>
      <Callout variant="honest" title={es ? 'Donde funciona y donde no' : 'Where it works and where it fails'}>
        {es
          ? 'Funciona como descripcion de la FORMA de una pila seca de material no cohesivo, y sus dos invariantes se verifican numericamente: la masa se conserva a precision de maquina y ninguna pendiente queda por encima del reposo impuesto. Falla si el material es cohesivo o esta humedo, porque entonces puede sostener pendientes locales por encima del reposo seco, y el contrato de ingesta marca las filas con humedad sobre 20 por ciento por esa razon. Tampoco describe la compactacion por peso propio ni la degradacion de particulas por remanejo.'
          : 'It works as a description of the SHAPE of a dry, cohesionless pile, and its two invariants are checked numerically: mass is conserved to machine precision and no slope stands above the imposed repose angle. It fails when the material is cohesive or wet, because it can then hold local slopes above the dry repose angle, which is why the ingestion contract flags rows above 20 percent moisture. It also does not describe self-weight compaction or particle degradation from re-handling.'}
      </Callout>
      <Refs ids={['bak1987', 'samadani2001', 'wartsila']} label="Refs" />
    </>
  );
}

function Stacking({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodo 2: las cinco geometrias de apilado' : 'Method 2: the five stacking geometries'}</h2>
      <p>
        {es
          ? 'Cada geometria responde una sola pregunta: dado el numero de pasadas que hara el apilador y de que descarga se trate, DONDE aterriza el material. Todo lo demas sobre como mezcla una pila se sigue de esa respuesta, y por eso son cinco funciones con nombre y no una funcion con un parametro de dispersion.'
          : 'Each geometry answers a single question: given the number of passes the stacker will make and which dump this is, WHERE does the material land. Everything else about how a pile blends follows from that answer, which is why these are five named functions and not one function with a spread parameter.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'metodo' : 'method'}</th>
            <th>{es ? 'geometria' : 'geometry'}</th>
            <th>{es ? 'capas efectivas' : 'effective layers'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{STACKING_LABELS.chevron.en}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'El apilador recorre toda la losa por la linea central, ida y vuelta, dejando capas de seccion a dos aguas una sobre otra.' : 'The stacker travels the full length along the centre line, back and forth, laying gable-section layers on top of one another.'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'muchas capas delgadas; sesgo fuerte hacia el pie, porque cada capa avalancha por los mismos dos flancos' : 'many thin layers; a strong toe bias, because every layer avalanches down the same two flanks'}
            </td>
          </tr>
          <tr>
            <td>{STACKING_LABELS.windrow.en}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'El mismo recorrido longitudinal, pero el eje de deposicion se desplaza lateralmente entre pasadas, formando cordones paralelos apilados piramidalmente.' : 'The same longitudinal travel, with the deposition axis slewing laterally between passes, building parallel cords stacked pyramidally.'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'similares a chevron, pero el sesgo del pie se reparte entre varias crestas' : 'similar to chevron, but the toe bias is spread over several crests'}
            </td>
          </tr>
          <tr>
            <td>{STACKING_LABELS.coneshell.en}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'Conos sucesivos en posiciones que avanzan a saltos, cada uno cubriendo al anterior.' : 'Successive cones at a stepping position, each shelling over the last.'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'pocas capas efectivas por corte; la literatura lo reporta como inadecuado cuando importa la homogeneizacion' : 'few effective layers per cut; the literature reports it as unsuitable when homogenization matters'}
            </td>
          </tr>
          <tr>
            <td>{STACKING_LABELS.strata.en}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'Capas inclinadas construidas contra un flanco, con el apilador desplazandose lateralmente a medida que la pila crece.' : 'Inclined layers built against one flank, the stacker stepping laterally as the pile grows.'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'intermedio; sensible a la inclinacion de la capa' : 'intermediate; sensitive to the layer inclination'}
            </td>
          </tr>
          <tr>
            <td>{STACKING_LABELS.chevcon.en}</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'Recorrido chevron combinado con el avance por saltos de los conos, produciendo capas inclinadas a lo largo de la pila.' : 'Chevron travel combined with the stepping of cone shell, producing inclined layers along the pile.'}
            </td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'el mejor metodo industrial en un patio CIRCULAR, donde chevron no es una opcion' : 'the best industrial method on a CIRCULAR yard, where chevron is not an option'}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {es
          ? 'La definicion de chevron se contrasto con Schramm, que lo describe exactamente como capas de seccion a dos aguas apiladas una sobre otra, y anota que el espesor de capa es la razon entre la tasa volumetrica de apilado y la velocidad de traslacion. Las definiciones de conos y chevcon vienen del estudio de simulacion de Loubser y de Korte, que es tambien la fuente de las anclas numericas del producto.'
          : 'The chevron definition was cross-checked against Schramm, who describes it exactly as gable-section layers stacked on one another and notes that the layer thickness is the volumetric stacking rate divided by the travel speed. The cone shell and chevcon definitions come from Loubser and de Korte’s simulation study, which is also the source of the product’s numerical anchors.'}
        {' '}<Cite id="schramm2021" paren /> <Cite id="loubser2015" paren />
      </p>
      <Equation
        tex="x(k) = x_0 + \Lambda\!\left(\frac{k}{n-1}\,P\right)\,(x_1 - x_0), \qquad \Lambda(s) = \begin{cases} s \bmod 2, & (s \bmod 2) \le 1 \\ 2 - (s \bmod 2), & \text{otherwise} \end{cases}"
        caption={es
          ? 'La trayectoria chevron: una onda triangular en el indice de descarga normalizado, con P pasadas sobre el tramo util de la losa. Windrow anade un desplazamiento lateral por cordon y chevcon desplaza el origen de la ventana con el avance de la construccion.'
          : 'The chevron path: a triangular wave in the normalised dump index, with P passes over the usable span of the pad. Windrow adds a lateral offset per cord, and chevcon advances the origin of the travel window as the build progresses.'} />
      <Equation
        tex="t_{\text{layer}} = \frac{T_{\text{total}}}{P}"
        caption={es
          ? 'Toneladas por capa. Comparada con el alcance del variograma de entrada, esta es la cantidad que decide si las capas son independientes: si el alcance supera una capa, no lo son.'
          : 'Tonnes per layer. Compared against the input variogram range, this is the quantity that decides whether the layers are independent: once the range exceeds one layer, they are not.'} />
      <Callout variant="honest" title={es ? 'Chevron gana en una pila lineal' : 'Chevron wins on a linear pile'}>
        {es
          ? 'Medido en este motor, el orden es chevron por debajo de estratos, luego chevcon, luego windrow, luego conos. El orden que la literatura acuerda, chevcon mejor que conos, se reproduce; pero chevron sale MEJOR que chevcon, lo que a primera vista contradice a Loubser y de Korte. No lo hace: su comparacion es sobre un patio CIRCULAR, donde la operacion continua obliga al apilador a recorrer el anillo y chevron no es una opcion disponible. En una cama lineal cada capa de chevron abarca toda la longitud, asi que un corte en cualquier estacion muestrea capas de toda la construccion; las capas de chevcon se depositan dentro de una ventana viajera y estan correlacionadas entre si. Chevcon cruza MAS capas por corte y aun asi mezcla peor, que es la demostracion mas clara del producto de que el conteo de capas por si solo no es la respuesta.'
          : 'Measured on this engine the order is chevron below strata, then chevcon, then windrow, then cone shell. The ordering the literature agrees on, chevcon better than cone shell, is reproduced; but chevron comes out BETTER than chevcon, which at first reading contradicts Loubser and de Korte. It does not: their comparison is on a CIRCULAR yard, where continuous operation forces the stacker around the ring and chevron is not an available method. On a linear bed every chevron layer spans the whole length, so a cut at any station samples layers from across the entire build; chevcon’s layers are laid inside a travelling window and are correlated with one another. Chevcon crosses MORE layers per cut and still blends worse, which is the product’s clearest demonstration that layer count alone is not the answer.'}
      </Callout>
      <Refs ids={['loubser2015', 'schramm2021', 'pavloudakis2003', 'petersen2004']} label="Refs" />
    </>
  );
}

function Reclaim({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodo 3: las cuatro geometrias de recuperacion' : 'Method 3: the four reclaim geometries'}</h2>
      <p>
        {es
          ? 'Una geometria de recuperacion queda fijada por dos numeros: que fraccion del ANCHO de la cara engancha la maquina, y cuanto ALCANZA hacia abajo en la columna en un corte. Juntos deciden cuantas capas apiladas terminan en el corte, y el conteo de capas es el termino dominante de la reduccion de varianza. Nada mas de las maquinas importa para la ley de lo que sacan.'
          : 'A reclaim geometry is fixed by two numbers: what fraction of the face WIDTH the machine engages, and how far down the column it REACHES in one cut. Together they decide how many stacked layers end up in the cut, and the layer count is the dominant term in the variance reduction. Nothing else about the machines matters to the grade of what they take.'}
      </p>
      <table className="cmp-table st-table">
        <thead>
          <tr>
            <th>{es ? 'maquina' : 'machine'}</th>
            <th>{es ? 'ancho' : 'width'}</th>
            <th>{es ? 'alcance' : 'reach'}</th>
            <th>{es ? 'efecto' : 'effect'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? RECLAIM_GEOMETRY.fullface.machineEs : RECLAIM_GEOMETRY.fullface.machine}</td>
            <td className="st-mono">100 %</td>
            <td className="st-mono">100 %</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'rastrilla toda la seccion triangular, asi que cruza TODAS las capas de la estacion; es la razon entera por la que la mezcla en cama funciona' : 'rakes the whole triangular section, so it crosses EVERY layer at the station; it is the entire reason bed blending works'}
            </td>
          </tr>
          <tr>
            <td>{es ? RECLAIM_GEOMETRY.bucketwheel.machineEs : RECLAIM_GEOMETRY.bucketwheel.machine}</td>
            <td className="st-mono">33 %</td>
            <td className="st-mono">55 %</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'corta un banco: cruza las capas expuestas y se pierde el resto' : 'cuts a bench: it crosses the exposed layers and misses the rest'}
            </td>
          </tr>
          <tr>
            <td>{es ? RECLAIM_GEOMETRY.end.machineEs : RECLAIM_GEOMETRY.end.machine}</td>
            <td className="st-mono">100 %</td>
            <td className="st-mono">30 %</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'toma la cara expuesta del extremo, que solo alcanza la coraza exterior y sobre-representa lo ultimo apilado' : 'takes the exposed end face, which reaches only the outer shell and over-represents the most recently stacked material'}
            </td>
          </tr>
          <tr>
            <td>{es ? RECLAIM_GEOMETRY.loader.machineEs : RECLAIM_GEOMETRY.loader.machine}</td>
            <td className="st-mono">3 {es ? 'celdas' : 'cells'}</td>
            <td className="st-mono">12 %</td>
            <td style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              {es ? 'mordidas dispersas y someras; el caso real de una losa ROM, no el ideal de la cama de mezcla' : 'shallow scattered bites; the real run-of-mine pad case, not the blending-bed ideal'}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {es
          ? 'La distincion mas importante no es la maquina sino la REGLA DE PROFUNDIDAD. Un rastrillo engancha toda la cara a la vez, asi que se lleva una fraccion proporcional de CADA lote de la columna; el resto de las maquinas trabaja de arriba hacia abajo, y eso es exactamente lo que hace que se pierdan las capas enterradas. En el codigo esa diferencia es un solo booleano, y es responsable de la mayor parte de la separacion entre los cuatro metodos.'
          : 'The most important distinction is not the machine but the DEPTH RULE. A rake engages the whole face at once, so it takes a proportional share of EVERY lot in the column; every other machine works from the top down, and that is exactly what makes it miss the buried layers. In the code that difference is a single boolean, and it accounts for most of the separation between the four methods.'}
      </p>
      <p>
        {es
          ? 'Una maquina de alcance somero no puede completar un corte desde una sola estacion, asi que avanza a lo largo de la pila hasta completarlo, igual que en una losa real. Devolver un corte pequeno por estacion en su lugar habria producido miles de cortes diminutos, que no es lo que recibe la planta, y habria hecho que el flujo recuperado pareciera mucho mas variable de lo que es, puramente como artefacto del paso del modelo.'
          : 'A shallow-reaching machine cannot complete a cut from one station, so it advances along the pile until the cut is full, exactly as it would on a real pad. Returning one small cut per station instead would have produced thousands of tiny cuts, which is not what the plant receives, and would have made the reclaimed stream look far more variable than it is, purely as an artefact of the model’s step size.'}
      </p>
      <Equation
        tex="\bar{g}_{\text{cut}} = \frac{\sum_i m_i\,g_i}{\sum_i m_i}, \qquad f_e = \frac{\sum_{i:\,e_i = e} m_i}{\sum_i m_i}, \qquad \sum_e f_e = 1"
        caption={es
          ? 'La ley del corte es la media ponderada por tonelaje de los lotes consumidos, y f_e es la fraccion aportada por el evento de deposicion e. La identidad de suma a uno es una prueba del motor, verificada en cada corte de cada caso.'
          : 'The cut grade is the tonnage-weighted mean of the lots consumed, and f_e is the fraction contributed by deposition event e. The sum-to-one identity is an engine test, checked on every cut of every case.'} />
      <Equation
        tex="N_{\text{layers}} = \big|\{\,e : f_e > 0\,\}\big|"
        caption={es
          ? 'El conteo de capas de un corte es simplemente cuantos eventos de deposicion distintos aporto. Es el N de la cota 1/N, y se MIDE del libro mayor en vez de predecirse de la geometria.'
          : 'A cut’s layer count is simply how many distinct deposition events contributed to it. That is the N of the 1/N bound, and it is MEASURED from the ledger rather than predicted from the geometry.'} />
      <Callout variant="honest" title={es ? 'El cargador salio mejor que la recuperacion por el extremo' : 'The loader came out better than end reclaim'}>
        {es
          ? 'La expectativa ingenua era cara completa, luego rueda de cangilones, luego extremo, luego cargador. El resultado medido pone al cargador POR DELANTE del extremo. La razon es geometrica y defendible: un cargador que toma mordidas someras dispersas debe recorrer muchas estaciones para completar un corte, y ese recorrido promedia a lo largo de la pila; el recuperador de extremo llena el corte en una o dos estaciones y no promedia nada longitudinalmente. Se reporta como salio, con la explicacion, en vez de ajustar la parametrizacion hasta que el orden coincidiera con la intuicion.'
          : 'The naive expectation was full-face, then bucket wheel, then end, then loader. The measured result puts the loader AHEAD of end reclaim. The reason is geometric and defensible: a loader taking shallow scattered bites must walk many stations to fill a cut, and that walk averages along the pile; the end reclaimer fills its cut in one or two stations and averages nothing longitudinally. It is reported as it came out, with the explanation, rather than by tuning the parameterisation until the order matched intuition.'}
      </Callout>
      <Refs ids={['zhao2015', 'zhao2015b', 'loubser2015']} label="Refs" />
    </>
  );
}

function Segregation({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodo 4: segregacion cinetica por tamano, resuelta como ley de conservacion' : 'Method 4: kinetic size segregation, solved as a conservation law'}</h2>
      <p>
        {es
          ? 'El mecanismo se llama cribado cinetico y lo identificaron Savage y Lun: mientras un material granular cizalla, las particulas pequenas caen preferentemente en el hueco que se abre bajo ellas y hacen palanca sobre las grandes, que suben. Gray y Thornton lo formularon como una teoria de mezcla binaria, y esa formulacion es la que corre en vivo aqui.'
          : 'The mechanism is called kinetic sieving and Savage and Lun identified it: as granular material shears, small particles preferentially fall into the void space opening beneath them and lever the large ones upward. Gray and Thornton formulated it as a binary mixture theory, and that formulation is what runs live here.'}
        {' '}<Cite id="savage1988" paren /> <Cite id="gray2005" paren />
      </p>
      <p>
        {es
          ? 'En un flanco de pila la avalancha es una capa somera de espesor aproximadamente uniforme que fluye sobre un lecho estatico. Tomando flujo tapon y marchando en la coordenada ladera abajo, la ecuacion (3.18) se reduce a una ley de conservacion escalar unidimensional en profundidad, con flujo nulo en la superficie libre y en la base.'
          : 'On a pile flank the avalanche is a shallow layer of roughly uniform thickness flowing over a static bed. Taking plug flow and marching in the downslope coordinate, equation (3.18) reduces to a one-dimensional scalar conservation law in depth, with zero flux at the free surface and at the base.'}
      </p>
      <Equation
        tex="\frac{\partial \phi}{\partial x} + \frac{\partial F}{\partial z} = 0, \qquad F(\phi) = -S_r\,\phi\,(1-\phi)"
        caption={es
          ? 'La forma que se resuelve numericamente. F es convexa, de modo que un flujo de Godunov es exacto para el problema de Riemann en cada interfaz y los CHOQUES de concentracion que Gray y Thornton identifican como la caracteristica observada sobreviven, en vez de ser difuminados por un promedio de Lax-Friedrichs.'
          : 'The form that is solved numerically. F is convex, so a Godunov flux is exact for the Riemann problem at every interface and the concentration SHOCKS that Gray and Thornton identify as the observed feature survive, rather than being smeared by a Lax-Friedrichs average.'} />
      <Equation
        tex="\Delta x \le \mathrm{CFL}\,\frac{\Delta z}{S_r}, \qquad |F'(\phi)| = S_r\,|1 - 2\phi| \le S_r"
        caption={es
          ? 'La condicion CFL. La velocidad caracteristica esta acotada por Sr, asi que la marcha se subdivide para respetarla; con 32 celdas de profundidad son unas pocas centenas de operaciones por generacion de avalancha.'
          : 'The CFL condition. The characteristic speed is bounded by Sr, so the march is sub-stepped to respect it; with 32 depth cells that is a few hundred operations per avalanche generation.'} />
      <p>
        {es
          ? 'El acoplamiento con la pila es donde el modelo gana su lugar. Los finos drenan a la BASE de la capa fluyente. El material que se detiene en el flanco se toma de esa base y el que sigue viajando se toma de arriba, asi que el pie, alimentado por lo que viajo mas lejos, termina grueso. El grueso al pie es una SALIDA del modelo, no una regla escrita en el codigo, y esa distincion es la diferencia entre una simulacion y una animacion.'
          : 'The coupling to the pile is where the model earns its place. Fines drain to the BASE of the flowing layer. Material that stops on the flank is drawn from that base and material that keeps travelling is drawn from the top, so the toe, fed by what travelled furthest, ends up coarse. Coarse-at-the-toe is an OUTPUT of the model, not a rule written into the code, and that distinction is the difference between a simulation and an animation.'}
      </p>
      <p>
        {es
          ? 'Un detalle de implementacion resulto ser una correccion fisica. La primera version escribia la composicion que devolvia el solucionador directamente sobre los lotes que se movian, lo que estampaba el reparto de tamanos del camion actual sobre material mas viejo que la avalancha habia arrastrado. Lo que el solucionador produce es una REDISTRIBUCION, asi que lo que se aplica al libro mayor es el DESPLAZAMIENTO respecto de la media de la propia capa, no una composicion absoluta; los dos desplazamientos se cancelan por construccion, la masa de cada especie se conserva y con Sr en cero ningun lote se toca. El control negativo lo detecto por un cuarto del rango completo.'
          : 'One implementation detail turned out to be a physical correction. The first version wrote the composition the solver returned straight onto the lots being moved, which stamped the current truck’s size split onto older material the avalanche had dislodged. What the solver produces is a REDISTRIBUTION, so what is applied to the ledger is the SHIFT away from the layer’s own mean, not an absolute composition; the two shifts cancel by construction, species mass is conserved, and at Sr of zero no lot is touched at all. The negative control caught it by a quarter of the full range.'}
      </p>
      <Callout variant="honest" title={es ? 'Que no es este modelo' : 'What this model is not'}>
        {es
          ? 'Es un modelo CONTINUO publicado, no verdad a escala de particula. No resuelve elementos discretos, no conoce formas de particula ni contactos, y su unico parametro libre es el numero de segregacion Sr. La magnitud del indice de segregacion resultante es modesta, del orden de 0,07 en fraccion gruesa, y eso es correcto en vez de decepcionante: la mayor parte de una carga se queda donde cae, y solo la parte que sobresale de la superficie de reposo avalancha, de modo que la segregacion en una pila es un efecto de flanco y no de volumen. El indice se satura pasado Sr de aproximadamente uno, que es precisamente lo que la teoria predice: una capa se segrega COMPLETAMENTE en una distancia del orden de 1/Sr.'
          : 'It is a published CONTINUUM model, not particle-scale truth. It solves no discrete elements, knows nothing of particle shape or contacts, and has exactly one free parameter, the segregation number Sr. The resulting segregation index is modest in magnitude, of order 0.07 in coarse fraction, and that is correct rather than disappointing: most of a load stays where it lands, and only the part standing above the repose surface avalanches, so segregation on a pile is a flank effect and not a bulk one. The index saturates past Sr of about one, which is precisely what the theory predicts: a layer segregates COMPLETELY within a distance of order 1/Sr.'}
      </Callout>
      <Refs ids={['gray2005', 'savage1988', 'gray2018', 'jop2006']} label="Refs" />
    </>
  );
}

function Stratification({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodo 5: el regimen de estratificacion de Makse' : 'Method 5: the Makse stratification regime'}</h2>
      <p>
        {es
          ? 'Makse, Havlin, King y Stanley mostraron que una mezcla granular vertida entre dos placas verticales se estratifica espontaneamente en capas alternadas de granos pequenos y grandes, y que el requisito es una diferencia en los angulos de reposo de las dos especies puras: la estratificacion aparece cuando los granos GRANDES tienen el angulo de reposo mayor. Con angulos iguales o invertidos, la mezcla solo segrega.'
          : 'Makse, Havlin, King and Stanley showed that a granular mixture poured between two vertical plates spontaneously stratifies into alternating layers of small and large grains, and that the requirement is a difference in the repose angles of the two pure species: stratification appears when the LARGE grains have the larger angle of repose. With equal or reversed angles the mixture merely segregates.'}
        {' '}<Cite id="makse1997" paren />
      </p>
      <p>
        {es
          ? 'El mecanismo descansa sobre la descripcion de dos capas de una superficie granular que introdujeron Bouchaud, Cates, Ravi Prakash y Edwards: una capa rodante delgada sobre un lecho estatico, con intercambio entre ambas gobernado por la diferencia entre la pendiente local y el angulo de reposo. Cuando las dos especies tienen angulos distintos, el intercambio se vuelve dependiente de la composicion y aparece una inestabilidad que produce el bandeado.'
          : 'The mechanism rests on the two-layer description of a granular surface introduced by Bouchaud, Cates, Ravi Prakash and Edwards: a thin rolling layer over a static bed, with exchange between them governed by the difference between the local slope and the repose angle. When the two species have different angles the exchange becomes composition-dependent, and an instability appears that produces the banding.'}
        {' '}<Cite id="bouchaud1994" paren />
      </p>
      <Equation
        tex="\Delta\theta_r = \theta_{r,\text{coarse}} - \theta_{r,\text{fine}} > 0 \ \Longrightarrow\ \text{estratificacion}"
        caption={es
          ? 'La condicion de Makse, expuesta en la aplicacion como dos controles independientes de angulo de reposo. Barrer la diferencia a traves de cero hace aparecer y desaparecer el bandeado, que es un experimento real y no una animacion.'
          : 'The Makse condition, exposed in the app as two independent repose-angle controls. Sweeping the difference through zero makes the banding appear and disappear, which is a real experiment rather than an animation.'} />
      <Equation
        tex="\theta_r \in [34^\circ,\ 60^\circ] \ \text{(minerales, valores de manual)}"
        caption={es
          ? 'El rango publicado para minerales, de cobre de Noruega a cobre de Peru. Se usa como RANGO, nunca como un valor medido para un material especifico.'
          : 'The published range for ores, from Norwegian copper to Peruvian copper. It is used as a RANGE, never as a measured value for a specific material.'} />
      <p>
        {es
          ? 'Por que esto merece un metodo propio y no una nota al pie: es un resultado nitido, visualmente inconfundible y falsable, y es la mejor oportunidad didactica que ofrece un corte interno. Un lector que arrastra un control y ve aparecer capas alternadas ha aprendido algo que ninguna cantidad de prosa transmite igual de rapido.'
          : 'Why this deserves a method of its own rather than a footnote: it is a crisp, visually unmistakable, falsifiable result, and it is the best teaching opportunity an internal cutaway offers. A reader who drags a control and watches alternating layers appear has learned something no amount of prose conveys as quickly.'}
      </p>
      <Callout variant="honest" title={es ? 'Lo que el modelo reproduce y lo que no' : 'What the model reproduces and what it does not'}>
        {es
          ? 'El producto expone la CONDICION de Makse y su consecuencia sobre la composicion depositada a lo largo del flanco. No resuelve el modelo de dos capas de tipo BCRE ni reproduce el espaciamiento de las bandas medido en experimentos de celda de Hele-Shaw; para eso haria falta un solucionador de superficie que no es parte de este producto. Lo que se afirma es el regimen, no la longitud de onda.'
          : 'The product exposes Makse’s CONDITION and its consequence for the composition deposited along the flank. It does not solve the BCRE-type two-layer model and does not reproduce the band spacing measured in Hele-Shaw cell experiments; that would need a surface-flow solver which is not part of this product. What is claimed is the regime, not the wavelength.'}
      </Callout>
      <Refs ids={['makse1997', 'bouchaud1994', 'samadani2001']} label="Refs" />
    </>
  );
}

function Blending({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodos 9, 10 y 11: la razon de reduccion, el variograma y la cota ideal' : 'Methods 9, 10 and 11: the reduction ratio, the variogram and the ideal bound'}</h2>
      <p>
        {es
          ? 'La metrica y la direccion de la desigualdad. La razon de reduccion de varianza es la varianza de salida dividida por la de entrada, y MENOR ES MEJOR. Esa es la definicion de Loubser y de Korte, siguiendo a Kumral, y sus propios resultados la confirman: conos 0,232 contra chevcon 0,121, con el texto concluyendo que chevcon entrega mucha mejor consistencia. La convencion reciproca tambien circula en fuentes secundarias, y construir contra ella invertiria cada numero del producto y haria que la capa de recomendacion aconsejara el peor metodo. Por eso la formula se muestra junto al numero en cada superficie.'
          : 'The metric and the direction of the inequality. The variance reduction ratio is the output variance divided by the input variance, and LOWER IS BETTER. That is Loubser and de Korte’s definition, following Kumral, and their own results confirm it: cone shell 0.232 against chevcon 0.121, with the text concluding that chevcon delivers much better consistency. The reciprocal convention also circulates in secondary sources, and building against it would invert every number in the product and make the recommendation layer advise the worse method. That is why the formula is rendered next to the number on every surface.'}
        {' '}<Cite id="loubser2015" paren /> <Cite id="kumral2006" paren />
      </p>
      <Equation
        tex="\mathrm{VRR} = \frac{\sigma^2_{\text{out}}}{\sigma^2_{\text{in}}}, \qquad E = \frac{\sigma_{\text{in}}}{\sigma_{\text{out}}} = \frac{1}{\sqrt{\mathrm{VRR}}}"
        caption={es
          ? 'La razon y el efecto de mezcla, que es la forma en que la literatura de manejo de solidos publica sus valores de diseno. Convertir el resultado propio a las unidades del ancla es lo que hace la comparacion honesta en vez de aproximada.'
          : 'The ratio and the mixing effect, which is the form the bulk-handling literature publishes its design values in. Converting the product’s own result into the anchor’s units is what makes the comparison honest rather than approximate.'} />
      <p>
        {es
          ? 'Ambas varianzas se calculan sobre BASE DE TONELAJE, que es el requisito explicito de Kumral: las entradas y las salidas deben compararse sobre pesos o volumenes identicos. Es facil violarlo por accidente, porque los cortes suelen ser un orden de magnitud mayores que las descargas que los alimentaron, y una varianza ponderada por conteo estaria equivocada aproximadamente por ese factor.'
          : 'Both variances are computed on a TONNAGE BASE, which is Kumral’s explicit requirement: input and output must be compared over identical weights or volumes. It is easy to violate by accident, because cuts are typically an order of magnitude larger than the dumps that fed them, and a count-weighted variance would be wrong by roughly that factor.'}
      </p>
      <Equation
        tex="\sigma^2 = \frac{\sum_i m_i\,(g_i - \bar g)^2}{\sum_i m_i}, \qquad \bar g = \frac{\sum_i m_i\,g_i}{\sum_i m_i}"
        caption={es
          ? 'La varianza poblacional sobre base de tonelaje. m_i es la masa del volteo o del corte i y g_i su ley.'
          : 'The population variance on a tonnage base. m_i is the mass of dump or cut i and g_i its grade.'} />
      <p>
        {es
          ? 'El variograma experimental describe la estructura de la entrada, y su separacion se mide en TONELAJE ACUMULADO, no en tiempo de reloj. La entrada de una pila es un lote unidimensional en el sentido de Gy y su heterogeneidad es funcion de la masa a lo largo del flujo; usar el reloj haria que el variograma dependiera de lo ocupado que estuvo el turno.'
          : 'The experimental variogram describes the structure of the input, and its lag is measured in CUMULATIVE TONNAGE, not clock time. A stockpile’s input is a one-dimensional lot in Gy’s sense and its heterogeneity is a function of mass along the stream; using the clock would make the variogram depend on how busy the shift was.'}
      </p>
      <Equation
        tex="\gamma(h) = \frac{1}{2\,N(h)} \sum_{|t_i - t_j| \approx h} \big(g_i - g_j\big)^2"
        caption={es
          ? 'El semivariograma experimental de Matheron sobre el flujo, con h en toneladas. Se ajusta un modelo de pepita mas esferico por busqueda en grilla, deterministica, para que los carriles Python y TypeScript den resultados identicos.'
          : 'Matheron’s experimental semivariogram over the stream, with h in tonnes. A nugget-plus-spherical model is fitted by a deterministic grid search, so the Python and TypeScript lanes give identical results.'} />
      <p>
        {es
          ? 'La cota ideal es la pieza que mantiene honesto al producto. Si las N capas que un corte atraviesa fueran extracciones independientes, la media del corte tendria varianza sigma^2_in / N, asi que lo ideal es 1/N y el efecto de mezcla ideal es la raiz de N. Las camas reales no lo alcanzan: Schramm reporta un efecto de 5 a 7,5 para camas de 200 a 600 capas, donde la raiz de N daria entre 14,1 y 24,5. Es decir, la mezcla real recupera aproximadamente entre un cuarto y un tercio del beneficio ideal.'
          : 'The ideal bound is the piece that keeps the product honest. If the N layers a cut crosses were independent draws, the cut mean would have variance sigma^2_in / N, so the ideal is 1/N and the ideal mixing effect is the square root of N. Real beds do not reach it: Schramm reports an effect of 5 to 7.5 for beds of 200 to 600 layers, where the square root of N would be 14.1 to 24.5. Real blending therefore recovers roughly a quarter to a third of the ideal benefit.'}
        {' '}<Cite id="schramm2021" paren />
      </p>
      <Callout variant="honest" title={es ? 'La ecuacion de De Wet no se reproduce' : 'The De Wet equation is not reproduced'}>
        {es
          ? 'La literatura cita una ecuacion de diseno de De Wet (1994) para la relacion entre capas y homogeneizacion. No se pudo verificar: Bulk Solids Handling 14(1) p. 93 no esta disponible en linea y en el unico articulo que la cita la ecuacion es una imagen rasterizada que no sobrevivio a la extraccion de texto. Por eso NO se reproduce ni se atribuye aqui. Lo que se implementa es la cota 1/N, derivada de primeros principios y etiquetada como derivada. De Wet se cita unicamente por la afirmacion cualitativa de que mas capas mezclan mejor, que tres fuentes independientes confirman.'
          : 'The literature cites a De Wet (1994) design equation for the relationship between layers and homogenization. It could not be verified: Bulk Solids Handling 14(1) p. 93 is not available online, and in the one paper that quotes it the equation is a rasterised image that did not survive text extraction. It is therefore NOT reproduced or attributed here. What is implemented is the 1/N bound, derived from first principles and labelled as derived. De Wet is cited only for the qualitative claim that more layers blend better, which three independent sources confirm.'}
      </Callout>
      <Refs ids={['loubser2015', 'kumral2006', 'robinson2004', 'petersen2004', 'schramm2021', 'marques2013']} label="Refs" />
    </>
  );
}

function Traceability({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodos 8 y 12: el libro mayor de lotes y el tiempo de residencia' : 'Methods 8 and 12: the lot ledger and the residence time'}</h2>
      <p>
        {es
          ? 'Cada celda de la losa posee una pila ordenada de lotes, de abajo hacia arriba. Un lote registra de que evento de deposicion proviene, cuantas toneladas es, sus leyes y su fraccion gruesa. Depositar empuja; la cascada de relajacion mueve material desde la CIMA de la pila origen a la cima de la destino, porque eso es lo que hace una avalancha; recuperar extrae segun la geometria del metodo. La procedencia de un corte es entonces el histograma ponderado por tonelaje de los identificadores de evento que consumio.'
          : 'Every pad cell owns an ordered stack of lots, bottom to top. A lot records which deposition event it came from, how many tonnes it is, its grades and its coarse fraction. Depositing pushes; the relaxation cascade moves material from the TOP of a source stack to the top of a destination stack, because that is what an avalanche does; reclaiming pops according to the geometry of the method. A cut’s provenance is then the tonnage-weighted histogram of the event ids it consumed.'}
      </p>
      <p>
        {es
          ? 'El analogo publicado, citado para que el producto no de a entender que invento esto: Zhao, Lu, Koch y Hurdsman modelan una pila como una grilla de voxeles, cada uno con su composicion de calidad, y calculan por adelantado la calidad de un corte de rueda de cangilones a partir de ella. La version en tiempo casi real, alimentada por posiciones GPS de descarga y carga, es de Zhao, Lu, Statsenko y Koch, y esta siendo trasladada a las operaciones de OZ Minerals.'
          : 'The published analogue, cited so the product does not imply it invented this: Zhao, Lu, Koch and Hurdsman model a stockpile as a grid of voxels, each with a quality composition, and compute a bucket-wheel cut’s quality in advance from it. The near-real-time version, driven by GPS dump and load positions, is Zhao, Lu, Statsenko and Koch, and it is being translated into operations at OZ Minerals.'}
        {' '}<Cite id="zhao2015" paren /> <Cite id="zhao2021" paren />
      </p>
      <p>
        {es
          ? 'El tiempo de residencia es la otra mitad de la pregunta. Una pila no es solo una mezcladora: es un amortiguador entre el rajo y la planta, y su distribucion de tiempos de residencia la deciden por completo su geometria y su regla de recuperacion. Un cono recien construido y recuperado por la cara se comporta cerca de ultimo en entrar, primero en salir; una cama chevron bien construida y recuperada con cara completa se comporta cerca de primero en entrar, primero en salir. Ninguna de las dos es exacta, y la respuesta honesta es la FORMA de la distribucion, no una etiqueta.'
          : 'Residence time is the other half of the question. A pile is not only a blender: it is a buffer between the pit and the plant, and its residence-time distribution is decided entirely by its geometry and its reclaim rule. A freshly built cone reclaimed from its face behaves close to last-in-first-out; a properly bedded chevron reclaimed full-face behaves close to first-in-first-out. Neither is exact, and the honest answer is the SHAPE of the distribution, not a label.'}
        {' '}<Cite id="moraga2022" paren />
      </p>
      <Equation
        tex="\bar\tau = \frac{\sum_i m_i\,(t^{\text{out}}_i - t^{\text{in}}_i)}{\sum_i m_i}, \qquad \frac{\sigma^2_\tau}{\bar\tau^{\,2}}"
        caption={es
          ? 'El tiempo medio de residencia ponderado por tonelaje y la varianza adimensional, que vale cero para flujo tapon ideal y uno para un tanque perfectamente mezclado. Situa la pila en la escala que la gente de procesos ya usa.'
          : 'The tonnage-weighted mean residence time and the dimensionless variance, which is zero for ideal plug flow and one for a perfectly mixed tank. It places the pile on the scale process people already think in.'} />
      <Equation
        tex="p = \frac{\bar\tau_{\text{medido}} - \bar\tau_{\text{LIFO}}}{\bar\tau_{\text{FIFO}} - \bar\tau_{\text{LIFO}}} \in [0, 1]"
        caption={es
          ? 'La posicion de la pila entre las dos referencias, ambas calculadas para LA MISMA secuencia de eventos recorriendo una cola de inventario explicita. La etiqueta que se muestra es una banda descriptiva sobre p, y la interfaz lo dice: no hay un umbral publicado que haga que 0,6 sea "mayoritariamente FIFO".'
          : 'The pile’s position between the two references, both computed for the SAME event sequence by walking an explicit inventory queue. The label shown is a descriptive band over p, and the interface says so: there is no published threshold that makes 0.6 "mostly first-in-first-out".'} />
      <Callout variant="honest" title={es ? 'Las interfaces son mas nitidas que en una pila real' : 'The interfaces are sharper than a real pile’s'}>
        {es
          ? 'El libro mayor guarda una pila discreta de lotes por columna. Una pila real tiene mezcla continua en cada interfaz por rodadura, avalancha y remanejo. Dibujar bandas nitidas invita al lector a creer que las interfaces son nitidas. Por eso el corte estratigrafico dibuja una banda de mezcla en cada limite, la procedencia se reporta como FRACCIONES y nunca como "este corte vino del volteo 47", y esta advertencia aparece bajo la vista en vez de solo en la documentacion.'
          : 'The ledger stores a discrete stack of lots per column. A real pile has continuous mixing at every interface from rolling, avalanching and re-handling. Drawing crisp bands invites the reader to believe the interfaces are crisp. That is why the stratigraphic view draws a mixing band at every boundary, why provenance is reported as FRACTIONS and never as "this cut came from dump 47", and why this caveat sits under the view rather than only in the documentation.'}
      </Callout>
      <Refs ids={['zhao2015', 'zhao2015b', 'zhao2021', 'moraga2022', 'li2019']} label="Refs" />
    </>
  );
}

function Learned({ es }: { es: boolean }) {
  return (
    <>
      <h2>{es ? 'Metodos 14 y 15: el tier aprendido, y la refutacion que debe superar' : 'Methods 14 and 15: the learned tier, and the refutation it has to survive'}</h2>
      <p>
        {es
          ? 'La pregunta que un planificador realmente tiene es: dada la variabilidad de mi alimentacion y como pienso construir y recuperar esta pila, que reduccion de varianza voy a obtener. Un sustituto entrenado sobre un corpus barrido responde eso al instante, sin correr la simulacion. Las entradas son lo que el planificador SABE antes de construir: el variograma del flujo, el metodo de apilado, el conteo de pasadas, el metodo de recuperacion, el numero de segregacion y la forma de la losa.'
          : 'The question a planner actually has is: given how variable my feed is, and how I intend to build and reclaim this pile, what variance reduction will I get. A surrogate trained over a swept corpus answers that instantly, without running the simulation. The inputs are what the planner KNOWS before building: the stream’s variogram, the stacking method, the pass count, the reclaim method, the segregation number and the pad shape.'}
      </p>
      <Equation
        tex="\hat y = \log_{10}\mathrm{VRR} = f_\theta\!\left(\log_{10} a,\ \frac{\sigma^2_{\text{in}}}{\bar g^2},\ \log_{10} P,\ S_r,\ \log_{10} t_{\text{layer}},\ \frac{n_x}{n_y},\ \mathbf{1}_{\text{stack}},\ \mathbf{1}_{\text{reclaim}}\right)"
        caption={es
          ? 'El sustituto aprende log10 de la razon, no la razon. Esta acotada por abajo en cero y abarca dos ordenes de magnitud; regresarla directamente hace que la perdida quede dominada por las peores configuraciones y permite predecir una varianza negativa, que no es un numero.'
          : 'The surrogate learns log10 of the ratio, not the ratio. It is bounded below by zero and spans two orders of magnitude; regressing it directly makes the loss dominated by the worst-blending configurations and lets the model predict a negative variance ratio, which is not a number.'} />
      <p>
        {es
          ? 'Las variables categoricas van en codificacion uno-en-N y no ordinal. Codificar cinco metodos de apilado como 0 a 4 le diria al modelo que chevcon es "mas" que chevron, lo que no significa nada y que una linea base lineal ajustaria con gusto.'
          : 'The categorical variables are one-hot rather than ordinal. Encoding five stacking methods as 0 to 4 would tell the model that chevcon is "more" than chevron, which is meaningless and which a linear baseline would happily fit.'}
      </p>
      <p>
        {es
          ? 'La refutacion es la razon de ser de esta seccion. Kumral (2006) ya ajusta una REGRESION MULTIPLE sobre parametros de pila y optimiza la razon de reduccion con ella. Ese es el arte previo mas cercano, y un modelo aprendido que no lo supere no aporta nada. Por eso ambos se entrenan sobre el corpus identico y se evaluan sobre el conjunto retenido identico, con una banda por remuestreo sobre el error del retenido, y se aplica un criterio de descarte explicito.'
          : 'The refutation is the reason this section exists. Kumral (2006) already fits a MULTIPLE REGRESSION over stockpile parameters and optimises the reduction ratio with it. That is the nearest prior art, and a learned model that does not beat it adds nothing. So both are trained on the identical corpus and scored on the identical held-out set, with a bootstrap band on the held-out error, and an explicit kill criterion is applied.'}
        {' '}<Cite id="kumral2006" paren />
      </p>
      <Equation
        tex="\text{ship} \iff \mathrm{RMSE}_{\text{MLP}} < \mathrm{RMSE}_{\text{OLS}}^{(5\%)}"
        caption={es
          ? 'El criterio de descarte: la red se envia solo si su error en el retenido queda por debajo del percentil 5 de la banda por remuestreo de la regresion. Si no, el resultado negativo se reporta en Benchmark y la red queda solo como demostracion del carril aprendido en el navegador, etiquetada como tal.'
          : 'The kill criterion: the network ships only if its held-out error falls below the 5th percentile of the regression’s bootstrap band. If it does not, the negative result is reported on Benchmark and the network stays only as a demonstration of the in-browser learned lane, labelled as such.'} />
      <Callout variant="honest" title={es ? 'Estado: condicional y aun no enviado' : 'Status: conditional and not yet shipped'}>
        {es
          ? 'El corpus barrido, la linea base de regresion y el sustituto estan implementados en el carril fuera de linea, pero el tier aprendido NO esta activo en esta version y la pagina Benchmark lo declara asi. Un metodo sin veredicto de refutacion publicado no aparece como pestana: un modelo sin medir mostrado junto a otros medidos es un defecto, no una caracteristica. Cuando el veredicto exista, aparecera aqui con su numero, en cualquiera de las dos direcciones.'
          : 'The swept corpus, the regression baseline and the surrogate are implemented in the offline lane, but the learned tier is NOT active in this release and the Benchmark page says so. A method with no published refutation verdict does not appear as a tab: an unmeasured model displayed beside measured ones is a defect, not a feature. When the verdict exists it will appear here with its number, in whichever direction it falls.'}
      </Callout>
      <Refs ids={['kumral2006', 'marques2013', 'li2019', 'muller2022']} label="Refs" />
    </>
  );
}
