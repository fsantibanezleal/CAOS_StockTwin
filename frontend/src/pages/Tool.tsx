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
import { CaseSelector, Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { CaseDef } from '@fasl-work/caos-app-shell';

import {
  type Index,
  type Scenario,
  playState,
  loadIndex,
  loadScenario,
  segregationSummary,
  verdict,
} from '../lib/scenario';
import SiteView3D, { type ColourBy } from '../viz/SiteView3D';
import PlayBar from '../viz/PlayBar';
import InsidePanel from '../viz/InsidePanel';
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
    const ro = new ResizeObserver(() => setH(Math.max(280, Math.round(el.clientHeight))));
    ro.observe(el);
    setH(Math.max(280, Math.round(el.clientHeight)));
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}

/** Human labels for the matrix axes, in both languages. */
const CATEGORY: Record<string, { en: string; es: string }> = {
  reference: { en: 'Reference', es: 'Referencia' },
  feed: { en: 'Feed structure', es: 'Estructura de alimentacion' },
  yard: { en: 'Yard and routing', es: 'Patio y ruteo' },
  landform: { en: 'Landform', es: 'Relieve' },
  operations: { en: 'Operating choices', es: 'Decisiones operativas' },
  physics: { en: 'Physics', es: 'Fisica' },
};

export default function Tool() {
  const lang = useShellLang() === 'es' ? 'es' : 'en';
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const dark = useDark();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [stageRef, stageH] = useBoxHeight<HTMLDivElement>();

  const [index, setIndex] = useState<Index | null>(null);
  // The round trip from the focus route carries the scenario back, per ADR-0070 clause 5.
  const [sid, setSid] = useState(() => params.get('case') ?? params.get('scenario') ?? 'single');
  const [sc, setSc] = useState<Scenario | null>(null);
  const [colour, setColour] = useState<ColourBy>('grade');
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
  }, [sid]);

  const v = useMemo(() => (sc ? verdict(sc) : null), [sc]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);

  const cases: CaseDef[] = useMemo(
    () =>
      (index?.scenarios ?? []).map((s) => ({
        id: s.id,
        name: s.title[lang],
        // GROUPED BY THE AXIS THEY VARY. The matrix is an experiment, not a list: reference, feed
        // structure, yard layout, landform, operations. An earlier version dropped the category to
        // save vertical space when there were only three cases, which was the right call then and
        // is the wrong one for fourteen, where an ungrouped deck says nothing about what is being
        // compared with what.
        category: CATEGORY[s.category ?? 'physics']?.[lang] ?? s.category,
        kind: 'synthetic' as const,
        anchor: `${s.build.loads_placed} loads placed, peak ${s.build.peak_m.toFixed(1)} m`,
      })),
    [index, lang],
  );

  const toFocus = useCallback(() => nav(`/focus/${sid}`), [nav, sid]);

  // The surface being drawn, and the load being worked: a build frame while scrubbing, the
  // finished pile otherwise.
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
            colourBy={colour}
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
          <select value={colour} onChange={(e) => setColour(e.target.value as ColourBy)}>
            <option value="grade">{t('grade', 'ley')}</option>
            <option value="coarse">{t('coarse fraction', 'fracción gruesa')}</option>
            <option value="thickness">{t('thickness', 'espesor')}</option>
          </select>
        </label>
        {/* THE SCALE, WITH NUMBERS ON IT. A ramp the reader cannot read is decoration, and the
            range moves with the scenario and the variable, so it cannot be written into a caption. */}
        {range && (
          <span className="st-scalebar" aria-label={t('Colour scale', 'Escala de color')}>
            <b>{range.lo.toFixed(colour === 'thickness' ? 1 : 3)}</b>
            <i className="st-scale" />
            <b>{range.hi.toFixed(colour === 'thickness' ? 1 : 3)}</b>
            <em>{colour === 'grade' ? 'g/t' : colour === 'thickness' ? 'm' : ''}</em>
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
            pos={pos < 0 ? (sc.frames?.frames.length ?? 1) - 1 : pos}
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
      label: t('Inside the pile', 'Dentro de la pila'),
      content: sc ? <InsidePanel sc={sc} dark={dark} lang={lang} /> : null,
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
      {/* THE LEFT RAIL: pick the case here, read the answer here. Both belong on one surface,
          because choosing a scenario and seeing what it produced is a single act. The focus entry
          sits with them, per ADR-0070. */}
      <aside className="st-rail">
        <CaseSelector
          cases={cases}
          selectedId={sid}
          onSelect={setSid}
          lang={lang}
          deepLink
          ariaLabel={t('Scenario', 'Escenario')}
        />

        <button type="button" className="st-focus" onClick={toFocus}>
          <Maximize2 size={14} aria-hidden />
          <span>{t('Focus view', 'Vista enfocada')}</span>
        </button>

        {sc && v && seg && (
          <dl className="st-kpis">
            <div>
              <dt>{t('variance reduction', 'reducción de varianza')}</dt>
              <dd>{v.vrr.toFixed(3)}</dd>
            </div>
            <div className={v.boundReliable ? undefined : 'muted'}>
              <dt>{v.boundReliable ? t('ideal 1/N bound', 'cota ideal 1/N') : t('bound not reliable', 'cota no confiable')}</dt>
              <dd>{v.boundReliable ? v.ideal.toFixed(3) : 'n/a'}</dd>
            </div>
            <div>
              <dt>{t('loads placed', 'cargas colocadas')}</dt>
              <dd>{sc.manifest.build.loads_placed}</dd>
            </div>
            <div>
              <dt>{t('tips refused', 'puntos rechazados')}</dt>
              <dd>{(sc.manifest.build.refusal_rate * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>{t('peak height', 'altura máxima')}</dt>
              <dd>{sc.manifest.build.peak_m.toFixed(1)} m</dd>
            </div>
            <div>
              <dt>{t('material placed', 'material colocado')}</dt>
              {/* The locale is pinned to the UI language, not left to the browser. Unpinned,
                  `toLocaleString()` on a Spanish-locale machine rendered 33644 as "33.644" inside an
                  English page, where it reads as thirty-three point six. */}
              <dd>{Math.round(sc.manifest.build.volume_m3).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US')} m3</dd>
            </div>
            <div>
              <dt>{t('dozer displacement', 'desplazamiento del bulldozer')}</dt>
              <dd>{sc.manifest.build.mean_displacement_m.toFixed(1)} m</dd>
            </div>
            <div>
              <dt>{t('stream range, measured', 'rango del flujo, medido')}</dt>
              <dd>{sc.manifest.stream.measured_range_t.toFixed(0)} t</dd>
            </div>
            <div>
              <dt>{t('loads sorted on a face', 'cargas clasificadas en cara')}</dt>
              <dd>{seg.nSorted}</dd>
            </div>
            <div className={sc.manifest.gate.pairs_over_repose === 0 ? 'ok' : 'bad'}>
              <dt>{t('pairs over repose', 'pares sobre reposo')}</dt>
              <dd>{sc.manifest.gate.pairs_over_repose}</dd>
            </div>
          </dl>
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
