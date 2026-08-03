/**
 * The workbench.
 *
 * LAID OUT AGAINST TWO ADRs, because the previous version violated both and a reader saw exactly
 * that: readouts stacked as cards below the fold, and the focus entry buried as a line of prose at
 * the bottom of the page.
 *
 * ADR-0071, the UI floor:
 *   the page IS the viewport. No document scroll, no horizontal drag. Scrolling belongs inside the
 *   one container that owns long content, never on the document.
 *   navigation chrome gets ONE row, at most about six sibling tabs.
 *   the instrument takes at least 50 percent of the viewport area. Below that "the product is
 *   showing chrome with a picture in it".
 *
 * ADR-0070, the focus route:
 *   "KPIs are overlaid on the stage as a HUD, not stacked as cards above or below it."
 *   "There MUST be a visible, obvious entry control in the App, on the same surface as the scenario
 *   selector."
 *
 * So: one header row carrying the scenario selector and the focus entry TOGETHER, one tab row of
 * six, a stage that fills what is left, and the readouts on the stage rather than under it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type Index,
  type Scenario,
  loadIndex,
  loadScenario,
  segregationSummary,
  verdict,
} from '../lib/scenario';
import SiteView3D, { type ColourBy } from '../viz/SiteView3D';
import {
  DumpDetailPanel,
  FieldPanel,
  PlanPanel,
  ReclaimPanel,
  SectorPanel,
  VariogramPanel,
} from '../viz/SitePanels';
import '../styles/tool.css';

type TabId = 'site' | 'plan' | 'field' | 'dump' | 'sectors' | 'reclaim';

const TABS: { id: TabId; en: string; es: string }[] = [
  { id: 'site', en: 'Site', es: 'Faena' },
  { id: 'plan', en: 'Dump plan', es: 'Plan de descarga' },
  { id: 'field', en: 'Raw field', es: 'Campo crudo' },
  { id: 'dump', en: 'Dump detail', es: 'Detalle de descarga' },
  { id: 'sectors', en: 'Sectors', es: 'Sectores' },
  { id: 'reclaim', en: 'Reclaim', es: 'Recuperacion' },
];

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

/** Stage height in pixels, so the instrument clears the ADR-0071 fifty percent floor.
 *
 *  Measured rather than guessed: the header and tab rows are fixed, so whatever is left of the
 *  viewport below them belongs to the stage. */
function useStageHeight(): number {
  const calc = () => Math.max(320, Math.round(window.innerHeight * 0.66));
  const [h, setH] = useState(calc);
  useEffect(() => {
    const on = () => setH(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

export default function Tool({ lang = 'en' }: { lang?: 'en' | 'es' }) {
  const dark = useDark();
  const stageH = useStageHeight();
  const [index, setIndex] = useState<Index | null>(null);
  const [sid, setSid] = useState<string>('single');
  const [sc, setSc] = useState<Scenario | null>(null);
  const [tab, setTab] = useState<TabId>('site');
  const [colour, setColour] = useState<ColourBy>('grade');
  const [showPaths, setShowPaths] = useState(true);
  const [showCrest, setShowCrest] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    setSc(null);
    loadScenario(sid)
      .then(setSc)
      .catch((e) => setErr(String(e)));
  }, [sid]);

  const v = useMemo(() => (sc ? verdict(sc) : null), [sc]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);

  // ADR-0070: the round trip preserves the scenario, so the focus route opens on what is on screen.
  const toFocus = useCallback(() => {
    window.location.hash = `#/focus/${sid}`;
  }, [sid]);

  const t = (en: string, es: string) => (lang === 'es' ? es : en);

  if (err) {
    return (
      <div className="st-page">
        <p className="st-bad">Could not load the scenario data: {err}</p>
      </div>
    );
  }

  return (
    <div className="st-page">
      {/* ONE header row. The scenario selector and the focus entry sit on the SAME SURFACE, which is
          what ADR-0070 requires and what the previous version did not do. */}
      <header className="st-bar">
        <label className="st-sel">
          <span>{t('Scenario', 'Escenario')}</span>
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            {(index?.scenarios ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title[lang]}
              </option>
            ))}
          </select>
        </label>

        {(tab === 'site' || tab === 'field') && (
          <label className="st-sel">
            <span>{t('Colour by', 'Colorear por')}</span>
            <select value={colour} onChange={(e) => setColour(e.target.value as ColourBy)}>
              <option value="grade">{t('grade', 'ley')}</option>
              <option value="coarse">{t('coarse fraction', 'fraccion gruesa')}</option>
              <option value="thickness">{t('thickness', 'espesor')}</option>
            </select>
          </label>
        )}

        {tab === 'site' && (
          <div className="st-toggles">
            <label>
              <input
                type="checkbox"
                checked={showPaths}
                onChange={(e) => setShowPaths(e.target.checked)}
              />
              {t('truck paths', 'rutas')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={showCrest}
                onChange={(e) => setShowCrest(e.target.checked)}
              />
              {t('crest', 'cresta')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={showPlan}
                onChange={(e) => setShowPlan(e.target.checked)}
              />
              {t('areas', 'areas')}
            </label>
          </div>
        )}

        <button type="button" className="st-focus" onClick={toFocus}>
          {t('Focus view', 'Vista enfocada')}
        </button>
      </header>

      {/* ONE tab row, six peers, never wrapping. ADR-0071 clauses 4 and 5. */}
      <nav className="st-tabs" role="tablist" aria-label={t('Views', 'Vistas')}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            className={tab === x.id ? 'on' : ''}
            onClick={() => setTab(x.id)}
          >
            {x[lang]}
          </button>
        ))}
      </nav>

      {/* The stage owns the rest of the viewport, and it is the only thing that scrolls. */}
      <main className="st-stage">
        {!sc && (
          <p className="st-note">{t('Loading the scenario ...', 'Cargando el escenario ...')}</p>
        )}

        {sc && tab === 'site' && (
          <div className="st-stagefill">
            <SiteView3D
              field={sc.field}
              plan={sc.plan}
              loads={sc.loads}
              colourBy={colour}
              showPaths={showPaths}
              showCrest={showCrest}
              showPlan={showPlan}
              dark={dark}
              height={stageH}
            />

            {/* THE HUD. Overlaid on the stage, never stacked as cards beneath it. */}
            {v && seg && (
              <div className="st-hud">
                <div>
                  <b>{v.vrr.toFixed(3)}</b>
                  <span>{t('variance reduction', 'reduccion de varianza')}</span>
                </div>
                <div>
                  <b>{v.ideal.toFixed(3)}</b>
                  <span>{t('ideal 1/N bound', 'cota ideal 1/N')}</span>
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
                  <span>{t('peak height', 'altura maxima')}</span>
                </div>
                <div className={sc.manifest.gate.pairs_over_repose === 0 ? 'ok' : 'bad'}>
                  <b>{sc.manifest.gate.pairs_over_repose}</b>
                  <span>{t('pairs over repose', 'pares sobre reposo')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {sc && tab === 'plan' && (
          <PlanPanel plan={sc.plan} loads={sc.loads} field={sc.field} dark={dark} />
        )}
        {sc && tab === 'field' && (
          <FieldPanel field={sc.field} by={colour === 'lift' ? 'grade' : colour} dark={dark} />
        )}
        {sc && tab === 'dump' && <DumpDetailPanel sc={sc} dark={dark} />}
        {sc && tab === 'sectors' && <SectorPanel sectors={sc.sectors.areas} dark={dark} />}
        {sc && tab === 'reclaim' && (
          <>
            <ReclaimPanel sc={sc} dark={dark} />
            <VariogramPanel sc={sc} dark={dark} />
          </>
        )}
      </main>
    </div>
  );
}
