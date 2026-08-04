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
import { SubTabs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { CaseDef } from '@fasl-work/caos-app-shell';

import {
  type AssayVar,
  type Index,
  type Scenario,
  cutGradeRange,
  gradeTonnage,
  isConcurrent,
  playState,
  loadIndex,
  loadScenario,
  segregationSummary,
  surfaceValues,
  timelineLength,
  verdictAt,
} from '../lib/scenario';
import { axisLabel, CATEGORY_ORDER } from '../lib/axes';
import { focusHref, readView, type ViewState } from '../lib/viewstate';
import { cssGradient } from '../viz/colormap';
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
  // EVERY VIEW PARAMETER IN ONE OBJECT, because it all has to survive the trip to the focus route
  // and back. ADR-0070 clause 8 makes that binding in both directions, and a dozen separate useState
  // hooks is exactly how the previous version lost all of them but the case id.
  const [view, setView] = useState<ViewState>(() => readView(params));
  const set = useCallback(
    <K extends keyof ViewState>(k: K, v: ViewState[K]) => setView((s) => ({ ...s, [k]: v })),
    [],
  );
  const [range, setRange] = useState<{ lo: number; hi: number } | null>(null);
  const [blurbOpen, setBlurbOpen] = useState(false);
  /** Which rail pane is showing beneath the headline result. */
  const [pane, setPane] = useState<'tune' | 'built' | 'route'>('tune');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    setSc(null);
    setBlurbOpen(false);
    // The playback position is the one view parameter that does not carry across a case change: it
    // counts loads, and two scenarios do not have the same number of them.
    setView((s) => ({ ...s, pos: -1 }));
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

  // THE VERDICT AT THE KNOB SETTING, recomputed in the browser on every move of a slider. The knobs
  // are the operating decisions taken downstream of a pile somebody else built: how much surge
  // averaging sits between the reclaimer and the mill, what cutoff the stream is screened at, and
  // how large a share of a cut a dig block needs before it counts as an independent source.
  const v = useMemo(() => (sc ? verdictAt(sc, view) : null), [sc, view]);
  const gt = useMemo(() => (sc ? gradeTonnage(sc, view.cutoff) : null), [sc, view.cutoff]);
  const gRange = useMemo(() => (sc ? cutGradeRange(sc) : ([0, 1] as [number, number])), [sc]);
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

  // The focus entry carries the WHOLE view, not only the case: the reader keeps their colour field,
  // their overlays, their knobs and their position in the build.
  const toFocus = useCallback(() => nav(focusHref(sid, view)), [nav, sid, view]);

  const assayVars = useMemo<AssayVar[]>(
    () => (sc?.manifest.assay_variables as AssayVar[] | undefined) ?? [],
    [sc],
  );
  // The colour field for the stage: a joined assay surface, or null to let the view use its own.
  const surfaceVals = useMemo(
    () => (sc && assayVars.some((a) => a.key === view.colour) ? surfaceValues(sc, view.colour) : null),
    [sc, view.colour, assayVars],
  );
  const activeVar = assayVars.find((a) => a.key === view.colour);

  const steps = useMemo(() => timelineLength(sc), [sc]);
  const play = useMemo(() => (sc && view.pos >= 0 ? playState(sc, view.pos) : null), [sc, view.pos]);
  const surface = play?.z ?? null;

  if (err) {
    return (
      <div className="page-body st-layout">
        <p className="st-bad">
          {t('Could not load the scenario data.', 'No se pudieron cargar los datos del escenario.')}{' '}
          <code>{err}</code>
        </p>
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
            colourBy={
              (view.colour === 'coarse' || view.colour === 'thickness'
                ? view.colour
                : 'grade') as ColourBy
            }
            values={surfaceVals}
            showPaths={view.paths}
            showCrest={view.crest}
            showPlan={view.plan}
            play={view.history ? null : play}
            onRange={setRange}
            dark={dark}
            height={stageH}
            lang={lang}
            valueLabel={activeVar?.label ?? (view.colour === 'coarse' ? t('coarse fraction', 'fracción gruesa') : t('thickness', 'espesor'))}
            valueUnit={activeVar?.unit ?? (view.colour === 'thickness' ? 'm' : '')}
          />
        )}
      </div>

      <div className="st-controls">
        <label className="st-sel">
          <span>{t('Colour by', 'Colorear por')}</span>
          {/* THE WHOLE ASSAY, not just copper. The field carries a grade and a coarse fraction per
              column; everything else lives on the load, and the volume says which load is on top of
              each column, so the two join into a surface for any of the nine variables. */}
          <select
            value={view.colour}
            onChange={(e) => set('colour', e.target.value)}
            title={t(
              'The quantity the material skin is coloured by. Geometry comes from the height field; every assay variable is joined from the load sitting on top of each column.',
              'La cantidad con que se colorea la piel del material. La geometría viene del campo de alturas; cada variable de ensayo se une desde la carga que está encima de cada columna.',
            )}
          >
            <optgroup label={t('geometry', 'geometría')}>
              <option value="coarse">{t('coarse fraction', 'fracción gruesa')}</option>
              <option value="thickness">{t('thickness (m)', 'espesor (m)')}</option>
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
        {/* THE SCALE, WITH NUMBERS ON IT AND A RAMP IN IT. A ramp the reader cannot read is
            decoration; a ramp element with no background at all, which is what this was, is not even
            that. The gradient comes from the same colormap the stage samples. */}
        {range && (
          <span className="st-scalebar" aria-label={t('Colour scale', 'Escala de color')}>
            <b>{range.lo.toFixed(activeVar?.decimals ?? (view.colour === 'thickness' ? 1 : 3))}</b>
            <i className="st-scale" style={{ background: cssGradient() }} />
            <b>{range.hi.toFixed(activeVar?.decimals ?? (view.colour === 'thickness' ? 1 : 3))}</b>
            <em>{activeVar?.unit ?? (view.colour === 'thickness' ? 'm' : '')}</em>
          </span>
        )}
        <div className="st-toggles">
          <label
            title={t(
              'The approach and departure route the engine solved for the truck working this frame, over ground it could actually climb.',
              'La ruta de entrada y salida que el motor resolvió para el camión que trabaja en este cuadro, sobre terreno que realmente podía subir.',
            )}
          >
            <input type="checkbox" checked={view.paths} onChange={(e) => set('paths', e.target.checked)} />
            {t('truck paths', 'rutas')}
          </label>
          <label
            title={t(
              'The crest line of the working face: the edge every edge dump was aimed at.',
              'La línea de cresta de la cara de trabajo: el borde al que apuntó cada descarga de borde.',
            )}
          >
            <input type="checkbox" checked={view.crest} onChange={(e) => set('crest', e.target.checked)} />
            {t('crest', 'cresta')}
          </label>
          <label
            title={t(
              'The boundaries of the planned dump areas, which the pile grows away from as the campaign proceeds.',
              'Los límites de las áreas de descarga planificadas, de las que la pila se aleja a medida que avanza la campaña.',
            )}
          >
            <input type="checkbox" checked={view.plan} onChange={(e) => set('plan', e.target.checked)} />
            {t('areas', 'áreas')}
          </label>
          <label
            title={t(
              'Off: only the truck working at this frame. On: the recent history, which shows how the campaign reached the whole area.',
              'Apagado: solo el camión que trabaja en este cuadro. Encendido: el historial reciente, que muestra cómo la campaña alcanzó toda el área.',
            )}
          >
            <input
              type="checkbox"
              checked={view.history}
              onChange={(e) => set('history', e.target.checked)}
            />
            {t('path history', 'historial de rutas')}
          </label>
        </div>
        <span
          className="st-hint"
          title={t(
            'Drag to orbit. Shift-drag or right-drag to pan. Wheel to zoom. Double click to recentre. Hover for the value under the cursor. With the stage focused: arrows turn, plus and minus zoom, Home recentres.',
            'Arrastra para orbitar. Shift o botón derecho para desplazar. Rueda para acercar. Doble clic para recentrar. Pasa el cursor para leer el valor. Con el escenario enfocado: flechas giran, más y menos acercan, Inicio recentra.',
          )}
        >
          {t('orbit · pan · zoom · hover to read', 'orbitar · desplazar · zoom · pasar para leer')}
        </span>

        {/* The transport shares the control row: every extra row of chrome is height the
            instrument does not get, and ADR-0071 gives the instrument at least half the screen. */}
        {sc && (
          <PlayBar
            frames={sc.frames}
            total={steps}
            concurrentCuts={isConcurrent(sc) ? sc.cuts.length : 0}
            pos={view.pos < 0 ? Math.max(steps - 1, 0) : view.pos}
            onPos={(p) => set('pos', p)}
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
      content: sc ? (
        <PlanPanel plan={sc.plan} loads={sc.loads} field={sc.field} dark={dark} lang={lang} />
      ) : null,
    },
    {
      id: 'field',
      label: t('Raw field', 'Campo crudo'),
      content: sc ? <FieldPanel field={sc.field} dark={dark} lang={lang} /> : null,
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
      content: sc ? <DumpDetailPanel sc={sc} lang={lang} /> : null,
    },
    {
      id: 'sectors',
      label: t('Sectors', 'Sectores'),
      content: sc ? <SectorPanel sectors={sc.sectors.areas} lang={lang} /> : null,
    },
    {
      id: 'reclaim',
      label: t('Reclaim', 'Recuperación'),
      // TWO METHODS, TWO PANES. The cut sequence and the experimental semivariogram are separate
      // analyses computed by separate functions, and they were stacked in one scrolling pane. ADR-0016
      // section 6 asks for one sub-tab per discrete thing; the flat tab row is already at the
      // ADR-0071 clause 5 limit, so they go under a SubTabs rail rather than becoming a ninth tab.
      content: sc ? (
        <SubTabs
          ariaLabel={t('Reclaim analyses', 'Análisis de recuperación')}
          tabs={[
            {
              id: 'cuts',
              label: t('Cut sequence', 'Secuencia de cortes'),
              content: <ReclaimPanel sc={sc} lang={lang} knobs={view} gt={gt} />,
            },
            {
              id: 'variogram',
              label: t('Semivariogram', 'Semivariograma'),
              content: <VariogramPanel sc={sc} lang={lang} />,
            },
          ]}
        />
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
              <optgroup key={k} label={axisLabel(k, lang)}>
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

        {/* BOUNDED. The blurb is the only variable-height thing in this rail, and its 81-to-179px
            range is exactly the amount by which the rail overflowed a 1280x800 viewport on three of
            the twenty scenarios. Four lines fit every one of them; the rest is one click away. */}
        {sc && (
          <div className={`st-caseblurb${blurbOpen ? ' open' : ''}`}>
            <p>{sc.manifest.summary[lang]}</p>
            <button type="button" onClick={() => setBlurbOpen((x) => !x)}>
              {blurbOpen ? t('less', 'menos') : t('more', 'más')}
            </button>
          </div>
        )}

        {/* THE LIVE KNOBS. ADR-0017 section 3.2: a case selector plus a layer toggle is not an App.
            These three are continuous, they recompute the verdict from the cut ledger in the
            browser on every move, and every one of them is a decision a plant actually makes about
            a pile it did not build. What changes what is BUILT stays a readout, because rebuilding
            routes every load and relaxes the whole field, which is tens of seconds of Python. */}
        {/* THE RAIL SECTIONS, ONE PANE AT A TIME. ADR-0071 clause 6 asks that the rail show its
            controls without scrolling and names sectioning as the fix when the content does not
            fit. Measured by the click-through gate at 1280x800: the whole stack overflowed by
            135px. The headline result, the group the knobs move, is always on screen; the knobs
            and the two fixed-by-the-bake ledgers take turns. */}
        {sc && v && gt && (
          <div className="st-railtabs" role="tablist" aria-label={t('Rail sections', 'Secciones del panel')}>
            {([
              ['tune', t('tune', 'ajustar')],
              ['built', t('built', 'construido')],
              ['route', t('route', 'ruta')],
            ] as const).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={pane === k}
                onClick={() => setPane(k)}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}

        {sc && v && gt && pane === 'tune' && (
          <div className="st-knobs">
            <label
              title={t(
                'How many consecutive reclaim cuts the downstream surge capacity averages before the mill sees them. Averaging k cuts multiplies the effective number of independent sources by k, so the ideal bound moves with it.',
                'Cuántos cortes consecutivos promedia la capacidad de tolva aguas abajo antes de que la planta los reciba. Promediar k cortes multiplica por k el número efectivo de fuentes independientes, así que la cota ideal se mueve con él.',
              )}
            >
              <span>
                {t('surge averaging', 'promedio de tolva')}
                <b>
                  {Math.round(view.batch)} {t('cuts', 'cortes')}
                </b>
              </span>
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={view.batch}
                onChange={(e) => set('batch', Number(e.target.value))}
              />
            </label>
            <label
              title={t(
                'Grade below which a reclaimed cut goes to waste rather than to the mill. The screen sits upstream of the surge bin, so it changes both the tonnage and the variance the mill sees.',
                'Ley bajo la cual un corte recuperado va a lastre en vez de a la planta. El harnero está aguas arriba de la tolva, así que cambia tanto el tonelaje como la varianza que ve la planta.',
              )}
            >
              <span>
                {t('cutoff grade', 'ley de corte')}
                <b>{view.cutoff > 0 ? view.cutoff.toFixed(3) : t('off', 'sin')}</b>
              </span>
              <input
                type="range"
                min={0}
                max={gRange[1]}
                step={(gRange[1] - gRange[0]) / 100 || 0.001}
                value={view.cutoff}
                onChange={(e) => set('cutoff', Number(e.target.value))}
              />
            </label>
            <label
              title={t(
                'Minimum tonnage share a dig block must contribute to a cut before it counts as an independent source in the 1/N bound. A cut that is 95 percent one block and traces of four others is averaging one source, not five.',
                'Participación mínima de tonelaje que un bloque debe aportar a un corte para contar como fuente independiente en la cota 1/N. Un corte que es 95 por ciento un bloque y trazas de otros cuatro promedia una fuente, no cinco.',
              )}
            >
              <span>
                {t('source threshold', 'umbral de fuente')}
                <b>{(view.threshold * 100).toFixed(1)}%</b>
              </span>
              <input
                type="range"
                min={0}
                max={0.2}
                step={0.005}
                value={view.threshold}
                onChange={(e) => set('threshold', Number(e.target.value))}
              />
            </label>
          </div>
        )}

        {sc && v && seg && gt && (
          <div className="st-kpis">
            {([
              {
                // THIS GROUP MOVES WITH THE KNOBS. Everything below it is a property of the built
                // pile and is fixed by the bake.
                head: t('what the pile did', 'lo que hizo la pila'),
                rows: [
                  { k: t('variance reduction', 'reducción de varianza'), v: v.vrr.toFixed(3), sub: t('var out / var in, lower is better', 'var salida / var entrada, menor es mejor'), strong: true },
                  v.boundReliable
                    ? { k: t('ideal 1/N bound', 'cota ideal 1/N'), v: v.ideal.toFixed(3), sub: t('N independent sources', 'N fuentes independientes') }
                    : { k: t('ideal 1/N bound', 'cota ideal 1/N'), v: 'n/a', sub: t('withheld, not reliable', 'omitida, no confiable'), muted: true },
                  { k: t('effective sources', 'fuentes efectivas'), v: v.nLayers.toFixed(2), sub: t('per batch reaching the mill', 'por lote que llega a la planta') },
                  view.cutoff > 0
                    ? { k: t('metal above cutoff', 'metal sobre la ley'), v: `${(gt.recovery * 100).toFixed(1)}%`, sub: `${Math.round(gt.ore).toLocaleString(loc)} t ${t('ore', 'mineral')}` }
                    : { k: t('reclaimed', 'recuperado'), v: Math.round(gt.ore).toLocaleString(loc), unit: 't', sub: t('no cutoff applied', 'sin ley de corte') },
                ],
              },
              {
                head: t('what was built', 'lo que se construyó'),
                rows: [
                  { k: t('loads placed', 'cargas colocadas'), v: sc.manifest.build.loads_placed.toLocaleString(loc), sub: t('of those offered', 'de las ofrecidas') },
                  { k: t('tips refused', 'puntos rechazados'), v: `${(sc.manifest.build.refusal_rate * 100).toFixed(1)}%`, sub: t('no trafficable spot', 'sin punto transitable') },
                  { k: t('peak height', 'altura máxima'), v: `${sc.manifest.build.peak_m.toFixed(1)}`, unit: 'm', sub: t('above original ground', 'sobre el terreno original') },
                  { k: t('material', 'material'), v: Math.round(sc.manifest.build.volume_m3).toLocaleString(loc), unit: 'm3', sub: t('loose volume placed', 'volumen suelto colocado') },
                ],
              },
              {
                head: t('how it got there', 'cómo llegó ahí'),
                rows: [
                  { k: t('dozer travel', 'arrastre bulldozer'), v: sc.manifest.build.mean_displacement_m.toFixed(1), unit: 'm', sub: t('mean, per moved cell', 'medio, por celda movida') },
                  { k: t('stream range', 'rango del flujo'), v: sc.manifest.stream.measured_range_t.toFixed(0), unit: 't', sub: t('shovel dwell, measured', 'permanencia de pala, medida') },
                  { k: t('sorted on a face', 'clasificadas en cara'), v: String(seg.nSorted), sub: t('loads that cascaded', 'cargas que cascadearon') },
                  { k: t('over repose', 'sobre reposo'), v: String(sc.manifest.gate.pairs_over_repose), sub: t('cell pairs, must be zero', 'pares de celdas, debe ser cero'), good: sc.manifest.gate.pairs_over_repose === 0 },
                ],
              },
            ] as KpiGroup[]).map((g, gi) => (
              // ONE SECTION AT A TIME BELOW THE HEADLINE. ADR-0071 clause 6: the rail shows its
              // controls without scrolling, and it cannot hold four sliders, ten tiles and a blurb
              // in 744 usable pixels. The group the knobs move stays on screen always, because it is
              // the answer; the two describing the built pile, which do not change while the reader
              // works, share a switcher. Nothing is deleted and nothing is more than one click away.
              gi === 0 || (gi === 1 && pane === 'built') || (gi === 2 && pane === 'route') ? (
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
              ) : null
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
