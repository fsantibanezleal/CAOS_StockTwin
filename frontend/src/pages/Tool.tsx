/**
 * The workbench, built from the SHELL'S OWN PRIMITIVES.
 *
 * The previous version of this page hand-rolled every one of them: its own tab strip, its own
 * scenario dropdown, its own full-bleed width hack with negative margins. That is the violation
 * Felipe called out, and it is explicit in the ADRs:
 *
 *   ADR-0016 §5  the page root is the shell's `.page-body`, centred, NEVER full-bleed, and a product
 *                never redefines a shell primitive. The repo already carried `.page-body.st-layout`
 *                for exactly this and it was ignored in favour of `width: 100vw`.
 *   ADR-0016 §6  major sections of a page use the shell's `Tabs`, the accent-soft pills, not a
 *                bespoke row of buttons.
 *   ADR-0071     the page IS the viewport, one tab row, the instrument at or above half the screen.
 *   ADR-0070     the focus entry is a visible control on the SAME SURFACE as the scenario selector.
 *
 * So: `CaseSelector` for the scenario deck, `Tabs` for the views, `.page-body.st-layout` for width,
 * and the readouts overlaid on the stage rather than stacked beneath it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { CaseDef } from '@fasl-work/caos-app-shell';

import {
  type AssayVar,
  type Index,
  type Scenario,
  playState,
  loadIndex,
  loadScenario,
  segregationSummary,
  surfaceValues,
  timelineLength,
  verdict,
} from '../lib/scenario';
import SiteView3D, { type ColourBy } from '../viz/SiteView3D';
import PlayBar from '../viz/PlayBar';
import InsidePanel from '../viz/InsidePanel';
import BlockModel3D from '../viz/BlockModel3D';
import {
  DumpDetailPanel,
  FieldPanel,
  PlanPanel,
  ReclaimPanel,
  SectorPanel,
  VariogramPanel,
} from '../viz/SitePanels';
import '../styles/tool.css';

function useDark(): boolean {
  const read = () =>
    document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Height of an element, observed.
 *
 *  MEASURED, NOT GUESSED. Sizing the canvas as a fraction of the window looks right until the deck,
 *  the tab strip, the panel controls and the playback bar are added up: at 70 percent of the window
 *  the stage and its transport ran straight over the footer. The numeric gate did not catch it,
 *  because the document itself was not scrolling; only looking at the render did. So the canvas takes
 *  the space its own container actually has. */
function useBoxHeight<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [h, setH] = useState(360);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A HIDDEN PANEL MEASURES ZERO, AND ZERO IS NOT A SIZE. The shell keeps a tab panel mounted and
    // hides it, so the observer fires with a client height of zero the moment the reader switches
    // tabs. Taking that reading clamped the stage to the floor, and coming back showed it a third of
    // the height it left with, because nothing re-measures a box that did not change when it became
    // visible again. A zero reading means "not currently laid out", so it is ignored and the last
    // real height stands.
    const read = () => {
      const box = Math.round(el.clientHeight);
      if (box > 0) setH(Math.max(280, box));
    };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}

/** Human labels for the matrix axes, in both languages. */
const CATEGORY_ORDER = ['reference', 'feed', 'yard', 'landform', 'campaign', 'operations', 'physics'];

const CATEGORY: Record<string, { en: string; es: string }> = {
  reference: { en: 'Reference', es: 'Referencia' },
  feed: { en: 'Feed structure', es: 'Estructura de alimentacion' },
  yard: { en: 'Yard and routing', es: 'Patio y ruteo' },
  landform: { en: 'Landform', es: 'Relieve' },
  operations: { en: 'Operating choices', es: 'Decisiones operativas' },
  physics: { en: 'Physics', es: 'Fisica' },
};

/** The case the reader last looked at, so the top-level Focus route can open it. */
function readRememberedCase(): string {
  try {
    return window.localStorage.getItem('stocktwin.case') || 'single';
  } catch {
    return 'single';
  }
}

/** One readout tile. Optional fields are what makes a tile a headline, a caveat or a gate result. */
interface Kpi {
  k: string;
  v: string;
  unit?: string;
  sub?: string;
  muted?: boolean;
  good?: boolean;
  strong?: boolean;
}

interface KpiGroup {
  head: string;
  rows: Kpi[];
}

export default function Tool() {
  const lang = useShellLang() === 'es' ? 'es' : 'en';
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const dark = useDark();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [stageRef, stageH] = useBoxHeight<HTMLDivElement>();

  const [index, setIndex] = useState<Index | null>(null);
  // The round trip from the focus route carries the scenario back, per ADR-0070 clause 5.
  const [sid, setSid] = useState(
    () => params.get('case') ?? params.get('scenario') ?? readRememberedCase(),
  );

  // THE URL IS AUTHORITATIVE WHEN IT CHANGES. Returning from the focus route navigates to
  // `/?case=<id>` without remounting this component, so initialising the state once from the query
  // is not enough: the address bar said one case and the page showed another.
  useEffect(() => {
    const q = params.get('case') ?? params.get('scenario');
    if (q && q !== sid) setSid(q);
  }, [params, sid]);
  const [sc, setSc] = useState<Scenario | null>(null);
  const [colour, setColour] = useState<string>('cu');
  const [showPaths, setShowPaths] = useState(true);
  const [showCrest, setShowCrest] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [range, setRange] = useState<{ lo: number; hi: number } | null>(null);
  // Fractional position through the build, in loads. -1 means the finished pile.
  const [pos, setPos] = useState(-1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    setSc(null);
    setPos(-1);
    loadScenario(sid).then(setSc).catch((e) => setErr(String(e)));
    // Remembered so the top-level Focus route opens the case the reader was looking at. ADR-0070
    // requires the round trip to preserve the scenario, and with the entry in the nav rather than
    // beside the selector, that state has to live somewhere both routes can see.
    try {
      window.localStorage.setItem('stocktwin.case', sid);
    } catch {
      /* private mode; the route falls back to the default case */
    }
  }, [sid]);

  const v = useMemo(() => (sc ? verdict(sc) : null), [sc]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);

  const cases: (CaseDef & { axis: string })[] = useMemo(
    () =>
      (index?.scenarios ?? []).map((s) => ({
        id: s.id,
        name: s.title[lang],
        // GROUPED BY THE AXIS THEY VARY. The matrix is an experiment, not a list: reference, feed
        // structure, yard layout, landform, operations. An earlier version dropped the category to
        // save vertical space when there were only three cases, which was the right call then and
        // is the wrong one for fourteen, where an ungrouped deck says nothing about what is being
        // compared with what.
        axis: s.category ?? 'physics',
        kind: 'synthetic' as const,
        anchor: `${s.build.loads_placed} loads placed, peak ${s.build.peak_m.toFixed(1)} m`,
      })),
    [index, lang],
  );


  // The surface being drawn, and the load being worked: a build frame while scrubbing, the
  // finished pile otherwise.
  const loc = lang === 'es' ? 'es-CL' : 'en-US';

  const toFocus = useCallback(() => nav(`/focus/${sid}`), [nav, sid]);

  const assayVars = useMemo<AssayVar[]>(
    () => (sc?.manifest.assay_variables as AssayVar[] | undefined) ?? [],
    [sc],
  );
  // The colour field for the stage: a joined assay surface, or null to let the view use its own.
  const surfaceVals = useMemo(
    () => (sc && assayVars.some((a) => a.key === colour) ? surfaceValues(sc, colour) : null),
    [sc, colour, assayVars],
  );
  const activeVar = assayVars.find((a) => a.key === colour);

  const steps = useMemo(() => timelineLength(sc), [sc]);
  const play = useMemo(() => (sc && pos >= 0 ? playState(sc, pos) : null), [sc, pos]);
  const surface = play?.z ?? null;

  if (err) {
    return (
      <div className="page-body st-layout">
        <p className="st-bad">Could not load the scenario data: {err}</p>
      </div>
    );
  }

  const site = (
    <div className="st-stagefill">
      <div className="st-canvashost" ref={stageRef}>
        {sc && (
          <SiteView3D
            field={sc.field}
            surface={surface}
            plan={sc.plan}
            loads={sc.loads}
            colourBy={(colour === 'coarse' || colour === 'thickness' ? colour : 'grade') as ColourBy}
            values={surfaceVals}
            showPaths={showPaths}
            showCrest={showCrest}
            showPlan={showPlan}
            play={showHistory ? null : play}
            onRange={setRange}
            dark={dark}
            height={stageH}
          />
        )}
      </div>

      <div className="st-controls">
        <label className="st-sel">
          <span>{t('Colour by', 'Colorear por')}</span>
          {/* THE WHOLE ASSAY, not just copper. The field carries a grade and a coarse fraction per
              column; everything else lives on the load, and the volume says which load is on top of
              each column, so the two join into a surface for any of the nine variables. */}
          <select value={colour} onChange={(e) => setColour(e.target.value)}>
            <optgroup label={t('geometry', 'geometría')}>
              <option value="coarse">{t('coarse fraction', 'fracción gruesa')}</option>
              <option value="thickness">{t('thickness', 'espesor')}</option>
            </optgroup>
            <optgroup label={t('assay at the surface', 'ensayo en la superficie')}>
              {assayVars.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                  {a.unit ? ` (${a.unit})` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {/* THE SCALE, WITH NUMBERS ON IT. A ramp the reader cannot read is decoration, and the
            range moves with the scenario and the variable, so it cannot be written into a caption. */}
        {range && (
          <span className="st-scalebar" aria-label={t('Colour scale', 'Escala de color')}>
            <b>{range.lo.toFixed(activeVar?.decimals ?? (colour === 'thickness' ? 1 : 3))}</b>
            <i className="st-scale" />
            <b>{range.hi.toFixed(activeVar?.decimals ?? (colour === 'thickness' ? 1 : 3))}</b>
            <em>{activeVar?.unit ?? (colour === 'thickness' ? 'm' : '')}</em>
          </span>
        )}
        <div className="st-toggles">
          <label>
            <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} />
            {t('truck paths', 'rutas')}
          </label>
          <label>
            <input type="checkbox" checked={showCrest} onChange={(e) => setShowCrest(e.target.checked)} />
            {t('crest', 'cresta')}
          </label>
          <label>
            <input type="checkbox" checked={showPlan} onChange={(e) => setShowPlan(e.target.checked)} />
            {t('areas', 'áreas')}
          </label>
          <label
            title={t(
              'Off: only the truck working at this frame. On: the recent history, which shows how the campaign reached the whole area.',
              'Apagado: solo el camion que trabaja en este cuadro. Encendido: el historial reciente, que muestra como la campana alcanzo toda el area.',
            )}
          >
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
            />
            {t('path history', 'historial de rutas')}
          </label>
        </div>
        <span
          className="st-hint"
          title={t(
            'Drag to orbit. Shift-drag or right-drag to pan. Wheel to zoom. Double click to recentre.',
            'Arrastra para orbitar. Shift o botón derecho para desplazar. Rueda para acercar. Doble clic para recentrar.',
          )}
        >
          {t('orbit · pan · zoom', 'orbitar · desplazar · zoom')}
        </span>

        {/* The transport shares the control row: every extra row of chrome is height the
            instrument does not get, and ADR-0071 gives the instrument at least half the screen. */}
        {sc && (
          <PlayBar
            frames={sc.frames}
            total={steps}
            pos={pos < 0 ? Math.max(steps - 1, 0) : pos}
            onPos={setPos}
            lang={lang}
          />
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'site', label: t('Site', 'Faena'), content: site },
    {
      id: 'plan',
      label: t('Dump plan', 'Plan de descarga'),
      content: sc ? <PlanPanel plan={sc.plan} loads={sc.loads} field={sc.field} dark={dark} /> : null,
    },
    {
      id: 'field',
      label: t('Raw field', 'Campo crudo'),
      content: sc ? <FieldPanel field={sc.field} dark={dark} /> : null,
    },
    {
      // SECOND, not last. What is inside the pile is the subject of the product, so it sits beside
      // the site view rather than at the end of a row of analyses.
      id: 'inside',
      label: t('Section', 'Sección'),
      content: sc ? <InsidePanel sc={sc} dark={dark} lang={lang} /> : null,
    },
    {
      id: 'blocks',
      label: t('Block model', 'Modelo de bloques'),
      content: sc ? <BlockModel3D sc={sc} dark={dark} lang={lang} /> : null,
    },
    {
      id: 'dump',
      label: t('Dump detail', 'Detalle de descarga'),
      content: sc ? <DumpDetailPanel sc={sc} dark={dark} /> : null,
    },
    {
      id: 'sectors',
      label: t('Sectors', 'Sectores'),
      content: sc ? <SectorPanel sectors={sc.sectors.areas} dark={dark} /> : null,
    },
    {
      id: 'reclaim',
      label: t('Reclaim', 'Recuperación'),
      content: sc ? (
        <>
          <ReclaimPanel sc={sc} dark={dark} />
          <VariogramPanel sc={sc} dark={dark} />
        </>
      ) : null,
    },
  ];

  return (
    <div className="page-body st-layout">
      {/* THE LEFT RAIL: one control to choose the case, then the readings for it.
       *
       * A DROPDOWN, NOT CHIPS, and that is ADR-0071 clause 7 verbatim: "A one-of-N choice from a
       * categorised set is a `select` with `optgroup`, not N buttons under N headings." Twenty cases
       * as chips under six headings is about twenty-six rows of rail for what one row expresses, and
       * clause 6 of the same ADR says a rail that has to scroll before the user can reach a control
       * is a sizing failure. It was doing both.
       *
       * The shell has no dropdown variant of CaseSelector, so this is the native control the ADR
       * names rather than a re-implementation of a shell primitive. */}
      <aside className="st-rail">
        {/* THE FOCUS ENTRY SITS WITH THE SCENARIO CONTROL, which is ADR-0070 clause 8: a visible,
            obvious entry on the same surface as the scenario selector. It spent a version in the
            top nav, which is visible but is not that surface, and the clause is specific for a
            reason: the thing you are about to focus ON is chosen right underneath it. */}
        <button type="button" className="st-focus" onClick={toFocus}>
          <Maximize2 size={14} aria-hidden />
          <span>{t('Focus this scenario', 'Enfocar este escenario')}</span>
        </button>

        <label className="st-case">
          <span>{t('Scenario', 'Escenario')}</span>
          <select
            value={sid}
            onChange={(e) => setSid(e.target.value)}
            aria-label={t('Scenario', 'Escenario')}
          >
            {CATEGORY_ORDER.filter((k) => cases.some((c) => c.axis === k)).map((k) => (
              <optgroup key={k} label={CATEGORY[k]?.[lang] ?? k}>
                {cases
                  .filter((c) => c.axis === k)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        {sc && <p className="st-caseblurb">{sc.manifest.summary[lang]}</p>}

        {sc && v && seg && (
          <div className="st-kpis">
            {([
              {
                head: t('what the pile did', 'lo que hizo la pila'),
                rows: [
                  { k: t('variance reduction', 'reducción de varianza'), v: v.vrr.toFixed(3), sub: t('var out / var in', 'var salida / var entrada'), strong: true },
                  v.boundReliable
                    ? { k: t('ideal 1/N bound', 'cota ideal 1/N'), v: v.ideal.toFixed(3), sub: t('independent layers', 'capas independientes') }
                    : { k: t('ideal 1/N bound', 'cota ideal 1/N'), v: 'n/a', sub: t('withheld, not reliable', 'omitida, no confiable'), muted: true },
                ],
              },
              {
                head: t('what was built', 'lo que se construyó'),
                rows: [
                  { k: t('loads placed', 'cargas colocadas'), v: sc.manifest.build.loads_placed.toLocaleString(loc) },
                  { k: t('tips refused', 'puntos rechazados'), v: `${(sc.manifest.build.refusal_rate * 100).toFixed(1)}%` },
                  { k: t('peak height', 'altura máxima'), v: `${sc.manifest.build.peak_m.toFixed(1)}`, unit: 'm' },
                  { k: t('material', 'material'), v: Math.round(sc.manifest.build.volume_m3).toLocaleString(loc), unit: 'm3' },
                ],
              },
              {
                head: t('how it got there', 'cómo llegó ahí'),
                rows: [
                  { k: t('dozer travel', 'arrastre bulldozer'), v: sc.manifest.build.mean_displacement_m.toFixed(1), unit: 'm' },
                  { k: t('stream range', 'rango del flujo'), v: sc.manifest.stream.measured_range_t.toFixed(0), unit: 't' },
                  { k: t('sorted on a face', 'clasificadas en cara'), v: String(seg.nSorted) },
                  { k: t('over repose', 'sobre reposo'), v: String(sc.manifest.gate.pairs_over_repose), good: sc.manifest.gate.pairs_over_repose === 0 },
                ],
              },
            ] as KpiGroup[]).map((g) => (
              <section key={g.head}>
                <h3>{g.head}</h3>
                <div className="st-tiles">
                  {g.rows.map((r) => (
                    <div
                      key={r.k}
                      className={[r.muted ? 'muted' : '', r.good ? 'ok' : '', r.strong ? 'strong' : '']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <b>
                        {r.v}
                        {r.unit ? <i>{r.unit}</i> : null}
                      </b>
                      <span>{r.k}</span>
                      {r.sub ? <em>{r.sub}</em> : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </aside>

      <div className="st-main">
        {!sc && (
          <p className="st-note">{t('Loading the scenario ...', 'Cargando el escenario ...')}</p>
        )}
        <Tabs tabs={tabs} initial="site" ariaLabel={t('Views', 'Vistas')} />
      </div>
    </div>
  );
}
