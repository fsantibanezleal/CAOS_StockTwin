/**
 * Hand-authored, theme-aware figures for the Methodology page.
 *
 * WHY THEY LIVE HERE AND NOT IN THE PAGE. Eight sections each need their own figure, and eight
 * inline SVGs of eighty lines apiece inside a page component makes the prose unreadable, which is
 * the thing the page is for. They are still hand-authored source, not generated: there is no emitter,
 * every coordinate is written down, and each one is a diagram of a specific mechanism rather than a
 * decorative shape reused with different labels.
 *
 * EVERY COLOUR IS A TOKEN. `var(--color-...)` throughout, no hex literals, so the figures follow the
 * theme like the rest of the surface. A diagram with a dark-theme literal baked in renders as a dark
 * diagram on a white page, which is how a figure becomes a defect.
 *
 * The numbers on these figures are the MEASURED ones from the engine and from the sources, not
 * illustrative values: 37 degrees of repose, a 0.50 truck gradient, 4.43 m of blade excursion, 19.2
 * percent refusals, 7.34 m of mean displacement, the 13-46 m by 11-23 m survey envelope.
 */

type L = (en: string, es: string) => string;

const STYLE = `
  .mf-box { fill: color-mix(in srgb, var(--color-accent) 10%, transparent); stroke: var(--color-accent); stroke-width: 1.2; }
  .mf-box-warn { fill: color-mix(in srgb, var(--color-warn) 12%, transparent); stroke: var(--color-warn); stroke-width: 1.2; }
  .mf-box-bad { fill: color-mix(in srgb, var(--color-bad) 10%, transparent); stroke: var(--color-bad); stroke-width: 1.2; stroke-dasharray: 5 4; }
  .mf-box-good { fill: color-mix(in srgb, var(--color-good) 12%, transparent); stroke: var(--color-good); stroke-width: 1.2; }
  .mf-ground { fill: color-mix(in srgb, var(--color-fg) 16%, transparent); stroke: var(--color-fg-faint); stroke-width: 1; }
  .mf-mat { fill: color-mix(in srgb, var(--color-warn) 26%, transparent); stroke: var(--color-warn); stroke-width: 1.1; }
  .mf-mat2 { fill: color-mix(in srgb, var(--color-accent) 22%, transparent); stroke: var(--color-accent); stroke-width: 1.1; }
  .mf-t { fill: var(--color-fg); font: 600 12px system-ui, sans-serif; }
  .mf-s { fill: var(--color-fg-faint); font: 11px system-ui, sans-serif; }
  .mf-m { fill: var(--color-fg-faint); font: 11px ui-monospace, monospace; }
  .mf-lbl { fill: var(--color-fg-faint); font: 10px system-ui, sans-serif; }
  .mf-head { fill: var(--color-fg-faint); font: 600 10px system-ui, sans-serif; letter-spacing: 0.06em; }
  .mf-flow { stroke: var(--color-accent); stroke-width: 1.6; fill: none; marker-end: url(#mf-a); }
  .mf-flow-warn { stroke: var(--color-warn); stroke-width: 1.6; fill: none; marker-end: url(#mf-w); }
  .mf-flow-bad { stroke: var(--color-bad); stroke-width: 1.6; fill: none; marker-end: url(#mf-b); stroke-dasharray: 5 4; }
  .mf-dim { stroke: var(--color-fg-faint); stroke-width: 0.9; stroke-dasharray: 3 3; }
  .mf-rule { stroke: var(--color-border); stroke-width: 1; }
`;

function Defs() {
  return (
    <>
      <style>{STYLE}</style>
      <defs>
        <marker id="mf-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent)" />
        </marker>
        <marker id="mf-w" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-warn)" />
        </marker>
        <marker id="mf-b" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-bad)" />
        </marker>
      </defs>
    </>
  );
}

/** s0: why a truck never stands on fresh material, drawn as two angles on one section. */
export function FigTrafficability({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 260"
      role="img"
      aria-label={t(
        'A section through a lift: fresh material stands at 37 degrees, a haul truck climbs 27 degrees, so the face is not drivable and the ramp is.',
        'Una sección por un banco: el material fresco se para a 37 grados, un camión sube 27 grados, así que la cara no es transitable y la rampa sí.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('WHY THERE IS A PLAN, A RAMP AND A DOZER AT ALL', 'POR QUÉ EXISTEN UN PLAN, UNA RAMPA Y UN BULLDOZER')}
      </text>

      <path className="mf-ground" d="M8,214 L692,214 L692,238 L8,238 z" />
      <text className="mf-s" x="14" y="232">
        {t('original ground, a hard floor for every operation', 'terreno original, un piso rígido para toda operación')}
      </text>

      {/* the fresh face at repose */}
      <path className="mf-mat" d="M360,214 L470,214 L560,132 L660,132 L660,214 L692,214 L692,214 z" />
      <path d="M470,214 L560,132" stroke="var(--color-bad)" strokeWidth="2.4" fill="none" />
      <text className="mf-t" x="474" y="176" fill="var(--color-bad)">
        37&#176;
      </text>
      <text className="mf-s" x="474" y="192">
        {t('fresh material', 'material fresco')}
      </text>
      <text className="mf-s" x="566" y="124">
        {t('working level', 'nivel de trabajo')}
      </text>

      {/* the ramp */}
      <path className="mf-mat2" d="M60,214 L360,214 L360,132 L246,132 z" />
      <path d="M60,214 L246,132" stroke="var(--color-good)" strokeWidth="2.4" fill="none" />
      <text className="mf-t" x="96" y="186" fill="var(--color-good)">
        27&#176;
      </text>
      <text className="mf-s" x="96" y="202">
        {t('ramp, cut at 85% of the limit', 'rampa, cortada al 85% del límite')}
      </text>

      <line className="mf-dim" x1="246" y1="132" x2="660" y2="132" />

      <rect className="mf-box-good" x="240" y="36" width="212" height="60" rx="8" />
      <text className="mf-t" x="252" y="58">
        {t('A truck CAN stand here', 'Un camión SÍ puede pararse aquí')}
      </text>
      <text className="mf-m" x="252" y="76">
        g_max = tan(37&#176;) / 1.5 = 0.50
      </text>
      <text className="mf-s" x="252" y="90">
        {t('the local gradient, by central difference', 'el gradiente local, por diferencia central')}
      </text>

      <rect className="mf-box-bad" x="470" y="36" width="222" height="60" rx="8" />
      <text className="mf-t" x="482" y="58">
        {t('and NEVER here', 'y NUNCA aquí')}
      </text>
      <text className="mf-m" x="482" y="76">
        tan(37&#176;) = 0.75 &gt; 0.50
      </text>
      <text className="mf-s" x="482" y="90">
        {t('every fresh face, by construction', 'toda cara fresca, por construcción')}
      </text>

      <path className="mf-flow" d="M346,100 L300,126" />
      <path className="mf-flow-bad" d="M560,100 L522,126" />

      <rect className="mf-box-warn" x="8" y="36" width="216" height="60" rx="8" />
      <text className="mf-t" x="20" y="58">
        {t('The consequence', 'La consecuencia')}
      </text>
      <text className="mf-s" x="20" y="76">
        {t('reachable ground is ground something', 'el terreno alcanzable es el que algo')}
      </text>
      <text className="mf-s" x="20" y="90">
        {t('MADE reachable: ground, floor or ramp', 'HIZO alcanzable: suelo, piso o rampa')}
      </text>
    </svg>
  );
}

/** s1: the plan in plan view, with the reserved corridor and the order of work. */
export function FigPlan({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 250"
      role="img"
      aria-label={t(
        'The dump plan in plan view: rows worked furthest from the access first, in serpentine order, with a reserved corridor and a gapped berm.',
        'El plan de descarga en planta: filas trabajadas desde la más lejana al acceso, en orden serpenteante, con corredor reservado y berma con huecos.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('THE ORDER OF WORK IS THE PLAN', 'EL ORDEN DE TRABAJO ES EL PLAN')}
      </text>

      <rect className="mf-box" x="60" y="30" width="420" height="190" rx="4" />
      <text className="mf-lbl" x="66" y="46">
        {t('dump area, 90 x 90 m', 'área de descarga, 90 x 90 m')}
      </text>

      {/* the reserved corridor */}
      <rect className="mf-box-warn" x="240" y="150" width="60" height="70" rx="2" />
      <text className="mf-s" x="306" y="196">
        {t('access corridor', 'corredor de acceso')}
      </text>
      <text className="mf-s" x="306" y="210">
        {t('filled, then cut back', 'se llena, luego se corta')}
      </text>

      {/* serpentine rows, furthest first */}
      {[0, 1, 2, 3].map((r) => {
        const y = 62 + r * 22;
        return (
          <g key={r}>
            <path
              className="mf-flow"
              d={r % 2 === 0 ? `M78,${y} L446,${y}` : `M446,${y} L78,${y}`}
            />
            <text className="mf-lbl" x={r % 2 === 0 ? 52 : 452} y={y + 4}>
              {r + 1}
            </text>
          </g>
        );
      })}
      <text className="mf-s" x="78" y="42">
        {t('row 1 is the FURTHEST from the way in', 'la fila 1 es la MÁS LEJANA a la entrada')}
      </text>
      <text className="mf-s" x="78" y="168">
        {t('serpentine: the truck starts where it finished', 'serpenteante: el camión parte donde terminó')}
      </text>

      {/* the gapped berm */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} className="mf-box-good" x={64 + i * 70} y="30" width="46" height="7" rx="2" />
      ))}
      <text className="mf-s" x="492" y="40">
        {t('berm WITH GAPS', 'berma CON HUECOS')}
      </text>

      <rect className="mf-box-bad" x="492" y="58" width="200" height="86" rx="8" />
      <text className="mf-t" x="502" y="78">
        {t('A continuous berm is a wall', 'Una berma continua es un muro')}
      </text>
      <text className="mf-s" x="502" y="96">
        {t('refusals went UP with dozer work:', 'los rechazos SUBÍAN con más bulldozer:')}
      </text>
      <text className="mf-m" x="502" y="112">
        62% @ 1/10 &#183; 33% @ 1/40
      </text>
      <text className="mf-s" x="502" y="130">
        {t('with gaps: 19.2%', 'con huecos: 19,2%')}
      </text>

      <text className="mf-s" x="492" y="170">
        {t('the way in', 'la entrada')}
      </text>
      <path className="mf-flow-warn" d="M270,244 L270,222" />
    </svg>
  );
}

/** s2: the three questions routing keeps apart. */
export function FigRouting({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 230"
      role="img"
      aria-label={t(
        'The three separate questions: can a truck stand here, can it get here, and what route did it drive.',
        'Las tres preguntas separadas: si un camión puede pararse aquí, si puede llegar, y qué ruta condujo.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('THREE QUESTIONS, KEPT APART', 'TRES PREGUNTAS, MANTENIDAS APARTE')}
      </text>

      <rect className="mf-box" x="8" y="30" width="212" height="94" rx="8" />
      <text className="mf-t" x="20" y="52">
        {t('1. Can it STAND here?', '1. ¿Puede PARARSE aquí?')}
      </text>
      <text className="mf-m" x="20" y="72">
        |(dz/dx, dz/dy)| &#8804; g_max
      </text>
      <text className="mf-s" x="20" y="90">
        {t('a CENTRAL DIFFERENCE, the tilt under', 'una DIFERENCIA CENTRAL, la inclinación')}
      </text>
      <text className="mf-s" x="20" y="104">
        {t('the machine, not the steepest neighbour', 'bajo la máquina, no el vecino más empinado')}
      </text>

      <path className="mf-flow" d="M224,77 L240,77" />

      <rect className="mf-box" x="244" y="30" width="212" height="94" rx="8" />
      <text className="mf-t" x="256" y="52">
        {t('2. Can it GET here?', '2. ¿Puede LLEGAR aquí?')}
      </text>
      <text className="mf-m" x="256" y="72">
        |z(b) &#8722; z(a)| / run &#8804; g_max
      </text>
      <text className="mf-s" x="256" y="90">
        {t('a flood fill, PER STEP. One fill answers', 'un llenado por inundación, POR PASO. Uno')}
      </text>
      <text className="mf-s" x="256" y="104">
        {t('every candidate at once', 'responde por todos los candidatos')}
      </text>

      <path className="mf-flow" d="M460,77 L476,77" />

      <rect className="mf-box" x="480" y="30" width="212" height="94" rx="8" />
      <text className="mf-t" x="492" y="52">
        {t('3. What route?', '3. ¿Qué ruta?')}
      </text>
      <text className="mf-m" x="492" y="72">
        A* , diagonal = &#8730;2
      </text>
      <text className="mf-s" x="492" y="90">
        {t('the SAME per-step rule, so reachable', 'la MISMA regla por paso, para que alcanzable')}
      </text>
      <text className="mf-s" x="492" y="104">
        {t('and routable cannot disagree', 'y ruteable no puedan discrepar')}
      </text>

      <line className="mf-rule" x1="8" y1="142" x2="692" y2="142" />

      <rect className="mf-box-bad" x="8" y="156" width="336" height="64" rx="8" />
      <text className="mf-t" x="20" y="176">
        {t('Steepest-neighbour, the first version', 'Vecino más empinado, la primera versión')}
      </text>
      <text className="mf-s" x="20" y="194">
        {t('condemns every crest, perimeter and toe cell.', 'condena cresta, perímetro y pie completos.')}
      </text>
      <text className="mf-m" x="20" y="212">
        30 / 1296 {t('cells reachable', 'celdas alcanzables')}
      </text>

      <rect className="mf-box-good" x="356" y="156" width="336" height="64" rx="8" />
      <text className="mf-t" x="368" y="176">
        {t('Central difference, the same platform', 'Diferencia central, la misma plataforma')}
      </text>
      <text className="mf-s" x="368" y="194">
        {t('asks what the machine actually feels.', 'pregunta lo que la máquina realmente siente.')}
      </text>
      <text className="mf-m" x="368" y="212">
        1286 / 1296 {t('cells reachable', 'celdas alcanzables')}
      </text>
    </svg>
  );
}

/** s3: the four measured profiles, chosen by distance to the crest. */
export function FigProfiles({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 250"
      role="img"
      aria-label={t(
        'The four measured dump profiles, selected by distance to the live crest, inside the surveyed envelope.',
        'Los cuatro perfiles de descarga medidos, seleccionados por distancia a la cresta viva, dentro de la envolvente levantada.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('THE PROFILE IS CHOSEN BY DISTANCE TO THE LIVE CREST', 'EL PERFIL SE ELIGE POR LA DISTANCIA A LA CRESTA VIVA')}
      </text>

      <line className="mf-dim" x1="8" y1="150" x2="692" y2="150" />
      <text className="mf-s" x="8" y="168">
        {t('far from the crest', 'lejos de la cresta')}
      </text>
      <text className="mf-s" x="600" y="168">
        {t('over the edge', 'sobre el borde')}
      </text>
      <path className="mf-flow" d="M120,168 L580,168" />

      {/* oval */}
      <ellipse className="mf-mat" cx="80" cy="110" rx="46" ry="24" />
      <text className="mf-t" x="54" y="52">
        {t('oval', 'óvalo')}
      </text>
      <text className="mf-s" x="34" y="68">
        {t('stands where it fell', 'queda donde cayó')}
      </text>

      {/* comet */}
      <path className="mf-mat" d="M200,92 Q244,86 288,104 Q272,124 238,130 Q206,128 200,110 z" />
      <text className="mf-t" x="222" y="52">
        {t('comet', 'cometa')}
      </text>
      <text className="mf-s" x="190" y="68">
        {t('elongates downslope', 'se alarga ladera abajo')}
      </text>

      {/* rectangular */}
      <rect className="mf-mat" x="350" y="90" width="94" height="42" rx="3" />
      <text className="mf-t" x="366" y="52">
        {t('rectangular', 'rectangular')}
      </text>
      <text className="mf-s" x="352" y="68">
        {t('bounded footprint', 'huella acotada')}
      </text>

      {/* sloughed heap */}
      <path className="mf-mat" d="M520,88 L560,88 L620,134 L520,134 z" />
      <text className="mf-t" x="522" y="52">
        {t('sloughed heap', 'montón desmoronado')}
      </text>
      <text className="mf-s" x="512" y="68">
        {t('collapses down the face, slough 0.85', 'colapsa por la cara, arrastre 0,85')}
      </text>

      <line className="mf-rule" x1="8" y1="186" x2="692" y2="186" />

      <text className="mf-t" x="8" y="206">
        {t('The surveyed envelope, 28 UAV-photogrammetry dumps', 'La envolvente levantada, 28 descargas por fotogrametría UAV')}
      </text>
      <text className="mf-m" x="8" y="226">
        {t('length', 'largo')} 13&#8211;46 m &#183; {t('width', 'ancho')} 11&#8211;23 m &#183;{' '}
        {t('thickness', 'espesor')} 0.368&#8211;2.032 m &#183; {t('angle', 'ángulo')} 12&#8211;36&#176; &#183;{' '}
        {t('volume', 'volumen')} 94&#8211;155 m&#179;
      </text>
      <text className="mf-s" x="8" y="244">
        {t(
          'Width is fitted to the SURVEY, not to the 7.3 m tray: a load spreads as it descends.',
          'El ancho se ajusta al LEVANTAMIENTO, no a la tolva de 7,3 m: la carga se expande al descender.',
        )}
      </text>
    </svg>
  );
}

/** s4: the topple, and the re-queue defect that rendered as spikes. */
export function FigRelaxation({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 250"
      role="img"
      aria-label={t(
        'A topple lowers the cell that gave material away, which destabilises the cells above it. Re-queueing only the receivers left 446 pairs over repose.',
        'Un derrumbe baja la celda que entregó material, lo que desestabiliza las celdas de arriba. Reencolar solo a las receptoras dejó 446 pares sobre el reposo.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('A TOPPLE LOWERS THE GIVER, AND THE GIVER HAS NEIGHBOURS ABOVE IT', 'UN DERRUMBE BAJA AL QUE ENTREGA, Y ESE TIENE VECINOS ARRIBA')}
      </text>

      {/* before */}
      <text className="mf-t" x="8" y="46">
        {t('before', 'antes')}
      </text>
      <rect className="mf-mat" x="30" y="60" width="40" height="120" />
      <rect className="mf-mat" x="70" y="96" width="40" height="84" />
      <rect className="mf-mat" x="110" y="150" width="40" height="30" />
      <text className="mf-lbl" x="42" y="196">
        {t('above', 'arriba')}
      </text>
      <text className="mf-lbl" x="80" y="196">
        {t('cell', 'celda')}
      </text>
      <text className="mf-lbl" x="116" y="196">
        {t('below', 'abajo')}
      </text>

      <path className="mf-flow-warn" d="M164,120 L204,120" />
      <text className="mf-lbl" x="164" y="112">
        {t('topple', 'derrumbe')}
      </text>

      {/* after */}
      <text className="mf-t" x="216" y="46">
        {t('after', 'después')}
      </text>
      <rect className="mf-mat" x="230" y="60" width="40" height="120" />
      <rect className="mf-mat" x="270" y="128" width="40" height="52" />
      <rect className="mf-mat" x="310" y="120" width="40" height="60" />
      <path d="M230,60 L270,128" stroke="var(--color-bad)" strokeWidth="2.4" fill="none" />
      <text className="mf-t" x="196" y="76" fill="var(--color-bad)">
        {t('now over repose', 'ahora sobre el reposo')}
      </text>
      <text className="mf-s" x="230" y="212">
        {t('the giver dropped; the cell ABOVE it', 'el que entregó bajó; la celda de ARRIBA')}
      </text>
      <text className="mf-s" x="230" y="226">
        {t('is now the unstable one', 'es ahora la inestable')}
      </text>

      <line className="mf-rule" x1="382" y1="30" x2="382" y2="238" />

      <rect className="mf-box-bad" x="400" y="36" width="292" height="86" rx="8" />
      <text className="mf-t" x="412" y="56">
        {t('Re-queue the RECEIVERS only', 'Reencolar solo a las RECEPTORAS')}
      </text>
      <text className="mf-s" x="412" y="74">
        {t('With a highest-first queue an uphill neighbour', 'Con una cola de mayor-primero, un vecino')}
      </text>
      <text className="mf-s" x="412" y="88">
        {t('is checked once, comes out stable, and is', 'cuesta arriba se revisa una vez, sale estable')}
      </text>
      <text className="mf-s" x="412" y="102">
        {t('never looked at again.', 'y nunca se vuelve a mirar.')}
      </text>
      <text className="mf-m" x="412" y="118">
        446 {t('pairs, worst 55.9', 'pares, peor 55,9')}&#176;
      </text>

      <rect className="mf-box-good" x="400" y="140" width="292" height="86" rx="8" />
      <text className="mf-t" x="412" y="160">
        {t('Re-queue the GIVER and its neighbourhood', 'Reencolar al que ENTREGA y su vecindad')}
      </text>
      <text className="mf-s" x="412" y="178">
        {t('and sweep until no cell moves; then reseed', 'y barrer hasta que nada se mueva; luego')}
      </text>
      <text className="mf-s" x="412" y="192">
        {t('from any cell still over the angle.', 'resembrar desde toda celda aún sobre el ángulo.')}
      </text>
      <text className="mf-m" x="412" y="212">
        0 {t('pairs, on every one of the 22 bakes', 'pares, en cada uno de los 22 horneados')}
      </text>
    </svg>
  );
}

/** s5: kinetic sieving as a conservation law down the flowing layer. */
export function FigSegregation({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 250"
      role="img"
      aria-label={t(
        'Kinetic sieving in the flowing layer: fines percolate to the base, coarse is levered to the top, and what stops early is drawn from the base.',
        'Tamizado cinético en la capa fluyente: los finos percolan a la base, el grueso es empujado arriba, y lo que se detiene antes se toma de la base.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('COARSE AT THE TOE IS AN OUTPUT, NOT A RULE IN THE CODE', 'GRUESO EN EL PIE ES UNA SALIDA, NO UNA REGLA EN EL CÓDIGO')}
      </text>

      {/* the face */}
      <path className="mf-ground" d="M60,60 L420,196 L420,220 L60,220 z" />
      {/* the flowing layer */}
      <path className="mf-mat2" d="M60,40 L420,176 L420,196 L60,60 z" />
      <text className="mf-s" x="86" y="42">
        {t('flowing layer, thickness H', 'capa fluyente, espesor H')}
      </text>

      {/* percolation arrows */}
      {[0, 1, 2, 3].map((i) => {
        const x = 120 + i * 74;
        const y = 60 + (x - 60) * (136 / 360);
        return (
          <g key={i}>
            <path className="mf-flow" d={`M${x},${y - 18} L${x},${y - 2}`} />
            <path className="mf-flow-warn" d={`M${x + 16},${y - 2} L${x + 16},${y - 18}`} />
          </g>
        );
      })}
      <text className="mf-s" x="128" y="120" fill="var(--color-accent)">
        {t('fines percolate DOWN', 'los finos percolan ABAJO')}
      </text>
      <text className="mf-s" x="128" y="134" fill="var(--color-warn)">
        {t('coarse is levered UP', 'el grueso sube por palanca')}
      </text>

      <text className="mf-t" x="424" y="192">
        {t('toe: coarse', 'pie: grueso')}
      </text>
      <text className="mf-t" x="70" y="242">
        {t('crest: fines', 'cresta: finos')}
      </text>

      <rect className="mf-box" x="440" y="34" width="252" height="96" rx="8" />
      <text className="mf-t" x="452" y="54">
        {t('The reduction, in one dimension', 'La reducción, en una dimensión')}
      </text>
      <text className="mf-m" x="452" y="76">
        &#8706;&#966;/&#8706;x + &#8706;F/&#8706;z = 0
      </text>
      <text className="mf-m" x="452" y="94">
        F(&#966;) = &#8722;Sr &#966; (1 &#8722; &#966;)
      </text>
      <text className="mf-s" x="452" y="114">
        {t('F is convex, so a Godunov flux is EXACT', 'F es convexa, así que un flujo de Godunov es EXACTO')}
      </text>
      <text className="mf-s" x="452" y="126">
        {t('and the shocks survive rather than smear', 'y los choques sobreviven en vez de difuminarse')}
      </text>

      <rect className="mf-box-warn" x="440" y="144" width="252" height="94" rx="8" />
      <text className="mf-t" x="452" y="164">
        {t('What is written to the ledger is a SHIFT', 'Lo que se escribe al registro es un DESPLAZAMIENTO')}
      </text>
      <text className="mf-s" x="452" y="182">
        {t('An avalanche also carries what it dislodged,', 'Una avalancha también arrastra lo que soltó,')}
      </text>
      <text className="mf-s" x="452" y="196">
        {t('from earlier dumps with their own splits.', 'de descargas previas con sus propias fracciones.')}
      </text>
      <text className="mf-s" x="452" y="210">
        {t('Writing an absolute composition stamps this', 'Escribir una composición absoluta estampa la')}
      </text>
      <text className="mf-s" x="452" y="224">
        {t("truck's size split onto older material.", 'granulometría de este camión sobre material viejo.')}
      </text>
      <text className="mf-m" x="452" y="236">
        Sr = 0 &#8658; {t('no lot touched', 'ningún lote tocado')}
      </text>
    </svg>
  );
}

/** s6: the dozer, local donors, and the displacement uncertainty. */
export function FigDozer({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 240"
      role="img"
      aria-label={t(
        'The dozer takes donors from the nearest cells above target, not from the crown of the pile, and the ramp is cut back into the fill rather than reserved in it.',
        'El bulldozer toma donantes de las celdas más cercanas sobre el objetivo, no de la corona de la pila, y la rampa se corta en el relleno en vez de reservarse.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('THE RAMP IS A CUT IN THE FILL, NOT A VOID RESERVED IN IT', 'LA RAMPA ES UN CORTE EN EL RELLENO, NO UN VACÍO RESERVADO')}
      </text>

      <rect className="mf-box-bad" x="8" y="32" width="330" height="110" rx="8" />
      <text className="mf-t" x="20" y="52">
        {t('Reserve the corridor in plan', 'Reservar el corredor en planta')}
      </text>
      <path className="mf-ground" d="M28,124 L318,124 L318,132 L28,132 z" />
      <path className="mf-mat" d="M28,84 L128,84 L128,124 L28,124 z" />
      <path className="mf-mat" d="M218,84 L318,84 L318,124 L218,124 z" />
      <text className="mf-s" x="140" y="104">
        {t('a trench', 'una zanja')}
      </text>
      <text className="mf-s" x="140" y="118">
        {t('3 m walls', 'muros de 3 m')}
      </text>
      <text className="mf-m" x="20" y="72">
        1296 / 1296 {t('cells unreachable at 3.2 m', 'celdas inalcanzables a 3,2 m')}
      </text>

      <rect className="mf-box-good" x="354" y="32" width="338" height="110" rx="8" />
      <text className="mf-t" x="366" y="52">
        {t('Fill everything, then cut the road back', 'Llenar todo, luego cortar el camino')}
      </text>
      <path className="mf-ground" d="M374,124 L672,124 L672,132 L374,132 z" />
      <path className="mf-mat" d="M374,84 L672,84 L672,124 L374,124 z" />
      <path d="M400,124 L560,86" stroke="var(--color-good)" strokeWidth="2.4" fill="none" />
      <text className="mf-s" x="410" y="112">
        {t('cut at 85% of the limit', 'cortada al 85% del límite')}
      </text>
      <text className="mf-m" x="366" y="72">
        {t('the material is where the blade needs it', 'el material está donde la hoja lo necesita')}
      </text>

      <line className="mf-rule" x1="8" y1="156" x2="692" y2="156" />

      <text className="mf-t" x="8" y="178">
        {t('Donors are LOCAL, and that is a ledger rule as much as a geometry one', 'Los donantes son LOCALES, y eso es una regla del registro tanto como de la geometría')}
      </text>
      <text className="mf-s" x="8" y="196">
        {t(
          'Sorting the whole area by elevation and taking the highest first builds the ramp out of the crown of the pile: measured, that lowered',
          'Ordenar toda el área por cota y tomar la más alta primero construye la rampa con la corona de la pila: medido, eso bajó',
        )}
      </text>
      <text className="mf-s" x="8" y="210">
        {t(
          'the peak from 9.6 m to 5.2 m while making access no better. A blade shoves material in from the ground beside it.',
          'la altura de 9,6 m a 5,2 m sin mejorar el acceso. Una hoja empuja material desde el suelo de al lado.',
        )}
      </text>
      <text className="mf-m" x="8" y="232">
        {t('mean displacement 7.34 m', 'desplazamiento medio 7,34 m')} &#183;{' '}
        {t('carried on every provenance fraction', 'adjunto a cada fracción de procedencia')}
      </text>
    </svg>
  );
}

/** s7: reclaim orders, and the bound the ratio is quoted against. */
export function FigReclaim({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 700 250"
      role="img"
      aria-label={t(
        'Three reclaim orders over a layered pile: last-in-first-out, first-in-first-out and full height. Only full height crosses the layers.',
        'Tres órdenes de recuperación sobre una pila estratificada: último en entrar primero en salir, primero en entrar primero en salir, y altura completa. Solo la altura completa cruza las capas.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('ONLY A FULL-HEIGHT CUT CROSSES THE LIFTS', 'SOLO UN CORTE DE ALTURA COMPLETA CRUZA LOS BANCOS')}
      </text>

      {[0, 1, 2].map((k) => {
        const x0 = 8 + k * 232;
        const title = [
          t('last in, first out', 'último en entrar, primero en salir'),
          t('first in, first out', 'primero en entrar, primero en salir'),
          t('full height', 'altura completa'),
        ][k];
        return (
          <g key={k}>
            <text className="mf-t" x={x0 + 10} y="42">
              {title}
            </text>
            {[0, 1, 2, 3].map((L2) => (
              <rect
                key={L2}
                className={L2 % 2 === 0 ? 'mf-mat' : 'mf-mat2'}
                x={x0 + 10}
                y={62 + L2 * 26}
                width="200"
                height="26"
              />
            ))}
            {k === 0 && <rect className="mf-box-bad" x={x0 + 10} y="62" width="200" height="26" />}
            {k === 1 && <rect className="mf-box-bad" x={x0 + 10} y="140" width="200" height="26" />}
            {k === 2 && <rect className="mf-box-good" x={x0 + 68} y="62" width="52" height="104" />}
            <text className="mf-s" x={x0 + 10} y="188">
              {k === 2
                ? t('N sources per cut: many', 'N fuentes por corte: muchas')
                : t('N sources per cut: one lift', 'N fuentes por corte: un banco')}
            </text>
          </g>
        );
      })}

      <line className="mf-rule" x1="8" y1="200" x2="692" y2="200" />
      <text className="mf-s" x="8" y="222">
        {t(
          'The ratio is never quoted alone: the ideal is typically three to four times better than any real bed achieves, so a bare ratio reads',
          'La razón nunca se cita sola: el ideal suele ser tres a cuatro veces mejor que cualquier cama real, así que una razón sola se lee',
        )}
      </text>
      <text className="mf-s" x="8" y="238">
        {t(
          'far more flattering than it is. N is MEASURED from cut provenance, never configured.',
          'mucho más favorable de lo que es. N se MIDE desde la procedencia de los cortes, nunca se configura.',
        )}
      </text>
    </svg>
  );
}

/** Implementation: the deployment path, with the determinism banner the ADR requires on it. */
export function FigDeploy({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 720 250"
      role="img"
      aria-label={t(
        'The deployment path: a seeded offline bake writes a committed artifact, CI rebuilds and gates it, the static site is published to a CDN, and the browser recomputes the verdicts.',
        'La ruta de despliegue: un horneado con semilla escribe un artefacto comprometido, la integración continua lo reconstruye y lo controla, el sitio estático se publica a una CDN, y el navegador recalcula los veredictos.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('FROM A SEED TO A URL', 'DE UNA SEMILLA A UNA URL')}
      </text>

      {[
        [t('Seeded bake', 'Horneado con semilla'), t('one generator, no clock,', 'un generador, sin reloj,'), t('no host name, no paths', 'sin host, sin rutas')],
        [t('Committed artifact', 'Artefacto comprometido'), t('manifests, events, volume,', 'manifiestos, eventos, volumen,'), t('delta frames, cuts', 'cuadros delta, cortes')],
        [t('CI gate', 'Compuerta de CI'), t('invariants read from the', 'invariantes leídos del')  , t('ARTIFACT, not the code', 'ARTEFACTO, no del código')],
        [t('Static build', 'Compilación estática'), t('one bundle, hashed assets,', 'un bundle, activos con hash,'), t('a deep-link fallback', 'un respaldo de enlace profundo')],
      ].map((row, i) => (
        <g key={i}>
          <rect className="mf-box" x={8 + i * 176} y="30" width="160" height="76" rx="8" />
          <text className="mf-t" x={20 + i * 176} y="52">
            {row[0]}
          </text>
          <text className="mf-s" x={20 + i * 176} y="72">
            {row[1]}
          </text>
          <text className="mf-s" x={20 + i * 176} y="88">
            {row[2]}
          </text>
          {i < 3 && <path className="mf-flow" d={`M${170 + i * 176},68 L${182 + i * 176},68`} />}
        </g>
      ))}

      <rect className="mf-box-good" x="8" y="122" width="704" height="52" rx="8" />
      <text className="mf-t" x="20" y="144">
        {t('REPRODUCIBILITY: the same seed gives the same artifact, byte for byte', 'REPRODUCIBILIDAD: la misma semilla da el mismo artefacto, byte a byte')}
      </text>
      <text className="mf-s" x="20" y="162">
        {t(
          'The manifest is a pure function of the scenario and its seed. A manifest that changed on every re-bake would make the history of the evidence useless: a real change would stop being distinguishable from a re-run.',
          'El manifiesto es una función pura del escenario y su semilla. Un manifiesto que cambiara en cada re-horneado haría inútil el historial de la evidencia: un cambio real dejaría de distinguirse de una re-ejecución.',
        )}
      </text>

      <rect className="mf-box-warn" x="8" y="186" width="704" height="52" rx="8" />
      <text className="mf-t" x="20" y="208">
        {t('AND TESTS NEVER WRITE THE CANONICAL TREE', 'Y LAS PRUEBAS NUNCA ESCRIBEN EL ÁRBOL CANÓNICO')}
      </text>
      <text className="mf-s" x="20" y="226">
        {t(
          'A test run once wrote over the committed bake and two releases shipped it. Tests bake into a sandbox, and the gate re-reads the artifact from disk after the build rather than trusting what the run had in memory.',
          'Una corrida de pruebas una vez sobrescribió el horneado comprometido y dos versiones lo publicaron. Las pruebas hornean en un sandbox, y la compuerta relee el artefacto desde disco después de compilar en vez de confiar en lo que la corrida tenía en memoria.',
        )}
      </text>
    </svg>
  );
}

/** Introduction: the whole pipeline, offline to browser. */
export function FigPipeline({ t }: { t: L }) {
  return (
    <svg
      className="fig-svg wide"
      viewBox="0 0 720 250"
      role="img"
      aria-label={t(
        'The pipeline: an offline Python bake on the published engine writes a compact artifact, and the browser recomputes the verdicts from its events.',
        'La tubería: un horneado Python fuera de línea sobre el motor publicado escribe un artefacto compacto, y el navegador recalcula los veredictos desde sus eventos.',
      )}
    >
      <Defs />
      <text className="mf-head" x="8" y="16">
        {t('HEAVY OFFLINE, COMPACT ARTIFACT, THIN LIVE', 'PESADO FUERA DE LÍNEA, ARTEFACTO COMPACTO, LIVIANO EN VIVO')}
      </text>

      <rect className="mf-box-warn" x="8" y="30" width="330" height="130" rx="8" />
      <text className="mf-t" x="20" y="50">
        {t('Offline, once per release', 'Fuera de línea, una vez por versión')}
      </text>
      <text className="mf-s" x="20" y="70">
        {t('the published engine, pinned', 'el motor publicado, fijado')}
      </text>
      <text className="mf-m" x="20" y="86">
        bedblend 0.6.0 (MIT)
      </text>
      <text className="mf-s" x="20" y="108">
        {t('routes every load over the trafficable', 'rutea cada carga sobre la superficie')}
      </text>
      <text className="mf-s" x="20" y="122">
        {t('surface, relaxes the WHOLE field after', 'transitable, relaja TODO el campo tras')}
      </text>
      <text className="mf-s" x="20" y="136">
        {t('every operation, sorts each cascade', 'cada operación, clasifica cada cascada')}
      </text>
      <text className="mf-m" x="20" y="154">
        {t('tens of seconds per few hundred loads', 'decenas de segundos por unos cientos de cargas')}
      </text>

      <path className="mf-flow" d="M342,95 L378,95" />
      <text className="mf-lbl" x="342" y="88">
        {t('events', 'eventos')}
      </text>

      <rect className="mf-box" x="382" y="30" width="150" height="130" rx="8" />
      <text className="mf-t" x="394" y="50">
        {t('The artifact', 'El artefacto')}
      </text>
      <text className="mf-s" x="394" y="70">
        {t('the dump plan', 'el plan de descarga')}
      </text>
      <text className="mf-s" x="394" y="86">
        {t('the load log, located', 'el registro de cargas, ubicado')}
      </text>
      <text className="mf-s" x="394" y="102">
        {t('the block volume', 'el volumen de bloques')}
      </text>
      <text className="mf-s" x="394" y="118">
        {t('the reclaim cuts', 'los cortes de recuperación')}
      </text>
      <text className="mf-t" x="394" y="140" fill="var(--color-bad)">
        {t('NOT the answers', 'NO las respuestas')}
      </text>

      <path className="mf-flow" d="M536,95 L572,95" />
      <text className="mf-lbl" x="536" y="88">
        {t('fetch', 'descarga')}
      </text>

      <rect className="mf-box-good" x="576" y="30" width="136" height="130" rx="8" />
      <text className="mf-t" x="588" y="50">
        {t('The browser', 'El navegador')}
      </text>
      <text className="mf-s" x="588" y="70">
        {t('recomputes every', 'recalcula cada')}
      </text>
      <text className="mf-s" x="588" y="84">
        {t('verdict from the', 'veredicto desde los')}
      </text>
      <text className="mf-s" x="588" y="98">
        {t('events, on load and', 'eventos, al cargar y')}
      </text>
      <text className="mf-s" x="588" y="112">
        {t('on every knob move', 'con cada control')}
      </text>
      <text className="mf-m" x="588" y="136">
        {t('VRR, 1/N, sectors', 'VRR, 1/N, sectores')}
      </text>

      <line className="mf-rule" x1="8" y1="180" x2="712" y2="180" />
      <text className="mf-s" x="8" y="202">
        {t(
          'A trace that shipped a baked variance-reduction ratio would be a slide: a reader could not tell a real result from a typo, and nothing',
          'Una traza que enviara una razón de reducción de varianza ya horneada sería una lámina: un lector no podría distinguir un resultado real de un error,',
        )}
      </text>
      <text className="mf-s" x="8" y="218">
        {t(
          'in the page would fail if the number were wrong. Recomputing means the numbers are derived in front of the reader from data they can see.',
          'y nada en la página fallaría si el número estuviera mal. Recalcular significa que los números se derivan ante el lector desde datos que puede ver.',
        )}
      </text>
      <text className="mf-m" x="8" y="240">
        {t('22 scenarios', '22 escenarios')} &#183; 22,656 {t('placed loads', 'cargas colocadas')} &#183; 0{' '}
        {t('cell pairs over repose', 'pares de celdas sobre el reposo')}
      </text>
    </svg>
  );
}
