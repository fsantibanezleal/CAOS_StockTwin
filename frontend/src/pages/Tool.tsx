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
  loadIndex,
  loadScenario,
  segregationSummary,
  verdict,
} from '../lib/scenario';
import SiteView3D, { type ColourBy } from '../viz/SiteView3D';
import PlayBar from '../viz/PlayBar';
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
  const [frame, setFrame] = useState(-1); // -1 means the finished pile
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    setSc(null);
    setFrame(-1);
    loadScenario(sid).then(setSc).catch((e) => setErr(String(e)));
  }, [sid]);

  const v = useMemo(() => (sc ? verdict(sc) : null), [sc]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);

  const cases: CaseDef[] = useMemo(
    () =>
      (index?.scenarios ?? []).map((s) => ({
        id: s.id,
        name: s.title[lang],
        // NO CATEGORY. The shell groups cases under labelled headings, which is right for a deck of
        // eleven across four categories and wrong for three: it stacked them into a 182px block and
        // took that height straight off the instrument. One group is one row.
        kind: 'synthetic' as const,
        anchor: `${s.build.loads_placed} loads placed, peak ${s.build.peak_m.toFixed(1)} m`,
      })),
    [index, lang],
  );

  const toFocus = useCallback(() => nav(`/focus/${sid}`), [nav, sid]);

  // The surface being drawn: a build frame while scrubbing, the finished pile otherwise.
  const surface = useMemo(() => {
    if (!sc?.frames || frame < 0) return null;
    return sc.frames.frames[Math.min(frame, sc.frames.frames.length - 1)]?.z ?? null;
  }, [sc, frame]);

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
          dark={dark}
          height={stageH}
        />
      )}

      {/* ADR-0070: the readouts are overlaid on the stage, never stacked as cards beneath it. */}
      {sc && v && seg && (
        <div className="st-hud">
          <div>
            <b>{v.vrr.toFixed(3)}</b>
            <span>{t('variance reduction', 'reducción de varianza')}</span>
          </div>
          <div className={v.boundReliable ? '' : 'muted'}>
            <b>{v.boundReliable ? v.ideal.toFixed(3) : 'n/a'}</b>
            <span>
              {v.boundReliable
                ? t('ideal 1/N bound', 'cota ideal 1/N')
                : t('bound not reliable here', 'cota no confiable aquí')}
            </span>
          </div>
          <div>
            <b>{sc.manifest.build.loads_placed}</b>
            <span>{t('loads placed', 'cargas colocadas')}</span>
          </div>
          <div>
            <b>{(sc.manifest.build.refusal_rate * 100).toFixed(1)}%</b>
            <span>{t('tips refused', 'puntos rechazados')}</span>
          </div>
          <div>
            <b>{sc.manifest.build.peak_m.toFixed(1)} m</b>
            <span>{t('peak height', 'altura máxima')}</span>
          </div>
          <div className={sc.manifest.gate.pairs_over_repose === 0 ? 'ok' : 'bad'}>
            <b>{sc.manifest.gate.pairs_over_repose}</b>
            <span>{t('pairs over repose', 'pares sobre reposo')}</span>
          </div>
        </div>
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
            index={frame < 0 ? (sc.frames?.frames.length ?? 1) - 1 : frame}
            onIndex={setFrame}
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
      {/* The scenario deck and the focus entry on ONE surface, per ADR-0070. */}
      <div className="st-deck">
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
      </div>

      {!sc && <p className="st-note">{t('Loading the scenario ...', 'Cargando el escenario ...')}</p>}

      <Tabs tabs={tabs} initial="site" ariaLabel={t('Views', 'Vistas')} />
    </div>
  );
}
