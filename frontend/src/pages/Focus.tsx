/**
 * The focus route: the pile owns the screen.
 *
 * BUILT AGAINST ADR-0070, clause by clause, and re-built after an audit found six of them still
 * unmet. What each clause costs, and where it is paid:
 *
 *   1. THE STAGE OWNS 80 PERCENT OF THE VIEWPORT. A docked 300-340px rail, which is the band the same
 *      ADR fixes, only leaves 80 percent from about 1500px up. Below that the rail becomes an overlay
 *      drawer over a full-bleed stage, so both numbers hold at every viewport instead of one being
 *      bought by breaking the other (the previous version under-sized the rail to 288px and still
 *      measured 77.5 percent at 1280x800).
 *   2. ONE PARAMETER COLUMN, and EVERY control that changes the simulation is in it. The transport is
 *      the control that changes what the simulation shows most, and it used to float on the stage.
 *      The HUD and the in-stage label are the only chrome the ADR puts on the stage.
 *   3. KPIs OVERLAID as a HUD, monospace values with small uppercase labels, value first.
 *   4. THE STAGE IS LABELLED IN PLACE, top-left, on a translucent surface, so the view teaches alone.
 *   5. PROGRESSIVE DISCLOSURE INSIDE THE VIEW: a basic/advanced toggle governs parameter density.
 *   6. REAL-TIME RESPONSE. Three continuous knobs recompute the verdict from the cut ledger in the
 *      browser. What cannot respond live is a READOUT, labelled as fixed by the bake, never a slider
 *      that lies.
 *   7/8. A ROUTE, DEEP-LINKABLE, AND THE ROUND TRIP PRESERVES THE WORK. Not just the scenario: the
 *      colour field, the overlays, the knobs and the playback position all travel in the query string
 *      in both directions, because a round trip that resets the reader is a broken flow.
 *   9. Theme-aware and bilingual, like every other surface.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minimize2, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShellLang } from '@fasl-work/caos-app-shell';

import {
  type AssayVar,
  type Index,
  type Scenario,
  cutGradeRange,
  gradeTonnage,
  isConcurrent,
  playState,
  timelineLength,
  loadIndex,
  loadScenario,
  segregationSummary,
  surfaceValues,
  verdictAt,
} from '../lib/scenario';
import { axisLabel, byAxis } from '../lib/axes';
import { appHref, focusHref, readView, type ViewState } from '../lib/viewstate';
import SiteView3D, { type ColourBy } from '../viz/SiteView3D';
import PlayBar from '../viz/PlayBar';
import '../styles/focus.css';

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

/** True when the rail is a docked grid track rather than an overlay drawer. Matches focus.css. */
function useDocked(): boolean {
  const q = '(min-width: 1500px)';
  const [docked, setDocked] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setDocked(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return docked;
}

export default function Focus() {
  const { caseId } = useParams<{ caseId: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const dark = useDark();
  const docked = useDocked();
  const lang = useShellLang() === 'es' ? 'es' : 'en';
  const t = (en: string, es: string) => (lang === 'es' ? es : en);

  // Reached either as /focus/<id> or as the nav item, which has no id and opens the case the App
  // last had selected.
  const remembered = (() => {
    try {
      return window.localStorage.getItem('stocktwin.case') || 'single';
    } catch {
      return 'single';
    }
  })();
  const sid = caseId ?? remembered;

  // THE URL CARRIES THE WHOLE VIEW, not only the case. Clause 8 makes parameter state binding in
  // both directions, and it is read once per navigation rather than held as the source of truth,
  // because the reader's edits have to feel immediate.
  const [view, setView] = useState<ViewState>(() => readView(params));
  const set = useCallback(
    <K extends keyof ViewState>(k: K, v: ViewState[K]) => setView((s) => ({ ...s, [k]: v })),
    [],
  );

  // The addressable form. A bare /focus is a link that means something different to whoever opens it
  // next, so the nav entry resolves itself into /focus/<id> carrying the same view.
  useEffect(() => {
    if (!caseId) nav(focusHref(remembered, view), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, remembered, nav]);

  const [index, setIndex] = useState<Index | null>(null);
  const [sc, setSc] = useState<Scenario | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    setSc(null);
    loadScenario(sid).then(setSc).catch((e) => setErr(String(e)));
  }, [sid]);

  // Clause 8: leaving lands back on the App WITH THIS SCENARIO AND THIS WORK.
  const back = useCallback(() => {
    try {
      window.localStorage.setItem('stocktwin.case', sid);
    } catch {
      /* private mode */
    }
    nav(appHref(sid, view));
  }, [nav, sid, view]);

  // Clause 1: the stage is the viewport minus nothing.
  const [stageH, setStageH] = useState(() => Math.max(420, window.innerHeight - 8));
  useEffect(() => {
    const on = () => setStageH(Math.max(420, window.innerHeight - 8));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const steps = useMemo(() => timelineLength(sc), [sc]);
  const play = useMemo(() => (sc && view.pos >= 0 ? playState(sc, view.pos) : null), [sc, view.pos]);
  const surface = play?.z ?? null;

  // Clause 6: the verdict is recomputed at the knob setting, in the browser, on every move.
  const v = useMemo(() => (sc ? verdictAt(sc, view) : null), [sc, view]);
  const gt = useMemo(() => (sc ? gradeTonnage(sc, view.cutoff) : null), [sc, view.cutoff]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);
  const gRange = useMemo(() => (sc ? cutGradeRange(sc) : ([0, 1] as [number, number])), [sc]);

  const assayVars = useMemo<AssayVar[]>(
    () => (sc?.manifest.assay_variables as AssayVar[] | undefined) ?? [],
    [sc],
  );
  const surfaceVals = useMemo(
    () => (sc && assayVars.some((a) => a.key === view.colour) ? surfaceValues(sc, view.colour) : null),
    [sc, view.colour, assayVars],
  );

  if (err) {
    return (
      <div className="fx-root">
        <p className="fx-err">
          {t('Could not load the scenario.', 'No se pudo cargar el escenario.')} <code>{err}</code>
        </p>
        <Link to="/">{t('Back to the App', 'Volver a la App')}</Link>
      </div>
    );
  }

  const m = sc?.manifest;
  const nf = (x: number, d = 3) => x.toFixed(d);

  return (
    <div className="fx-root">
      <section className="fx-stage">
        {sc ? (
          <SiteView3D
            field={sc.field}
            surface={surface}
            play={view.history ? null : play}
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
            dark={dark}
            height={stageH}
            lang={lang}
          />
        ) : (
          <p className="fx-loading">{t('Loading the scenario ...', 'Cargando el escenario ...')}</p>
        )}

        {/* Clause 4: the stage is NAMED, top-left, with one plain sentence of what is being seen. */}
        {m && (
          <p className="fx-label">
            <b>
              {play
                ? play.job === 'reclaim'
                  ? t('Reclaiming a cut', 'Recuperando un corte')
                  : t(
                      `Load ${play.seq} of ${sc?.frames?.frames.length ?? 0}`,
                      `Carga ${play.seq} de ${sc?.frames?.frames.length ?? 0}`,
                    )
                : t('The finished pile', 'La pila terminada')}
            </b>
            <span>{m.summary[lang]}</span>
          </p>
        )}

        {/* Clause 3: the readouts live ON the stage. */}
        {m && v && (
          <div className="fx-hud">
            <div>
              <b>{nf(v.vrr)}</b>
              <span>{t('variance reduction', 'reducción de varianza')}</span>
            </div>
            <div className={v.boundReliable ? '' : 'muted'}>
              <b>{v.boundReliable ? nf(v.ideal) : 'n/a'}</b>
              <span>
                {v.boundReliable
                  ? t('ideal 1/N bound', 'cota ideal 1/N')
                  : t('bound withheld', 'cota omitida')}
              </span>
            </div>
            {gt && view.cutoff > 0 && (
              <div>
                <b>{(gt.recovery * 100).toFixed(1)}%</b>
                <span>{t('metal above cutoff', 'metal sobre la ley de corte')}</span>
              </div>
            )}
            <div>
              <b>{m.build.loads_placed}</b>
              <span>{t('loads placed', 'cargas colocadas')}</span>
            </div>
            <div>
              <b>{(m.build.refusal_rate * 100).toFixed(1)}%</b>
              <span>{t('tips refused', 'puntos rechazados')}</span>
            </div>
            <div>
              <b>{m.build.peak_m.toFixed(1)} m</b>
              <span>{t('peak height', 'altura máxima')}</span>
            </div>
            <div className={m.gate.pairs_over_repose === 0 ? 'ok' : 'bad'}>
              <b>{m.gate.pairs_over_repose}</b>
              <span>{t('pairs over repose', 'pares sobre reposo')}</span>
            </div>
          </div>
        )}

        {/* Clause 4 of the flow rule: a visible return control at the top right of the stage. */}
        <button
          type="button"
          className="fx-return"
          onClick={back}
          aria-label={t('Return to the App', 'Volver a la App')}
        >
          <Minimize2 size={15} aria-hidden />
          <span>{t('Return', 'Volver')}</span>
        </button>

        {!docked && (
          <button
            type="button"
            className="fx-railtoggle"
            onClick={() => setRailOpen((x) => !x)}
            aria-expanded={railOpen}
            aria-controls="fx-rail"
          >
            <SlidersHorizontal size={15} aria-hidden />
            <span>{t('Controls', 'Controles')}</span>
          </button>
        )}
      </section>

      {/* Clause 2: ONE parameter column, on the right, scrolling independently, holding EVERY
          control that changes what the simulation shows. In the ADR's own order: scenario title and
          id, the mode toggle, the primary controls, the secondary readouts, the provenance note,
          then the scenario switcher. */}
      <aside id="fx-rail" className={`fx-rail${railOpen ? ' open' : ''}`}>
        {m && (
          <>
            <h2 className="fx-title">{m.title[lang]}</h2>
            <code className="fx-id">{m.id}</code>
          </>
        )}

        <div className="fx-mode" role="group" aria-label={t('Detail', 'Detalle')}>
          <button type="button" aria-pressed={!advanced} onClick={() => setAdvanced(false)}>
            {t('Basic', 'Básico')}
          </button>
          <button type="button" aria-pressed={advanced} onClick={() => setAdvanced(true)}>
            {t('Advanced', 'Avanzado')}
          </button>
        </div>

        {/* PRIMARY CONTROL 1: the transport. It moves the whole view through time. */}
        {sc && (
          <>
            <p className="fx-group">{t('Playback', 'Reproducción')}</p>
            <div className="fx-transport">
              <PlayBar
                frames={sc.frames}
                total={steps}
            concurrentCuts={isConcurrent(sc) ? sc.cuts.length : 0}
                pos={view.pos < 0 ? Math.max(steps - 1, 0) : view.pos}
                onPos={(p) => set('pos', p)}
                lang={lang}
              />
            </div>
          </>
        )}

        <p className="fx-group">{t('What is drawn', 'Qué se dibuja')}</p>
        <label className="fx-field">
          <span>{t('Colour the material by', 'Colorear el material por')}</span>
          <select value={view.colour} onChange={(e) => set('colour', e.target.value)}>
            <optgroup label={t('geometry', 'geometría')}>
              <option value="coarse">{t('coarse fraction', 'fracción gruesa')}</option>
              <option value="thickness">{t('thickness above ground', 'espesor sobre el suelo')}</option>
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

        <fieldset className="fx-toggles">
          <legend>{t('Overlays', 'Superposiciones')}</legend>
          <label>
            <input type="checkbox" checked={view.paths} onChange={(e) => set('paths', e.target.checked)} />
            {t('truck approach and departure', 'entrada y salida del camión')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={view.history}
              onChange={(e) => set('history', e.target.checked)}
            />
            {t('path history, not just the active truck', 'historial de rutas, no solo el camión activo')}
          </label>
          {advanced && (
            <>
              <label>
                <input type="checkbox" checked={view.crest} onChange={(e) => set('crest', e.target.checked)} />
                {t('crest, which every edge dump was aimed at', 'cresta, hacia la que apuntó cada descarga de borde')}
              </label>
              <label>
                <input type="checkbox" checked={view.plan} onChange={(e) => set('plan', e.target.checked)} />
                {t('planned area boundaries', 'límites de las áreas planificadas')}
              </label>
            </>
          )}
        </fieldset>

        {/* PRIMARY CONTROLS 2-4: the live knobs. Clause 6. Each shows its value inline in its own
            label, because a slider whose number is somewhere else is a number the reader has to
            hunt for. */}
        {sc && v && (
          <>
            <p className="fx-group">{t('Downstream of the pile', 'Aguas abajo de la pila')}</p>
            <label className="fx-field">
              <span>
                {t('Surge averaging', 'Promedio de tolva')}
                <b>{Math.round(view.batch)} {t('cuts', 'cortes')}</b>
              </span>
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={view.batch}
                onChange={(e) => set('batch', Number(e.target.value))}
                title={t(
                  'How many consecutive reclaim cuts the downstream surge capacity averages before the mill sees them.',
                  'Cuántos cortes consecutivos promedia la capacidad de tolva aguas abajo antes de que la planta los reciba.',
                )}
              />
            </label>

            <label className="fx-field">
              <span>
                {t('Cutoff grade', 'Ley de corte')}
                <b>{view.cutoff > 0 ? view.cutoff.toFixed(3) : t('off', 'sin')}</b>
              </span>
              <input
                type="range"
                min={0}
                max={gRange[1]}
                step={(gRange[1] - gRange[0]) / 100 || 0.001}
                value={view.cutoff}
                onChange={(e) => set('cutoff', Number(e.target.value))}
                title={t(
                  'Grade below which a reclaimed cut goes to waste rather than to the mill.',
                  'Ley bajo la cual un corte recuperado va a lastre en vez de a la planta.',
                )}
              />
            </label>

            {advanced && (
              <label className="fx-field">
                <span>
                  {t('Source threshold', 'Umbral de fuente')}
                  <b>{(view.threshold * 100).toFixed(1)}%</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.005}
                  value={view.threshold}
                  onChange={(e) => set('threshold', Number(e.target.value))}
                  title={t(
                    'Minimum tonnage share a dig block must contribute to a cut before it counts as an independent source in the 1/N bound.',
                    'Participación mínima de tonelaje que un bloque de extracción debe aportar a un corte para contar como fuente independiente en la cota 1/N.',
                  )}
                />
              </label>
            )}

            {/* SECONDARY: what the knobs just did. */}
            {gt && (
              <div className="fx-readouts">
                <dl>
                  <div>
                    <dt>{t('effective sources per batch', 'fuentes efectivas por lote')}</dt>
                    <dd>{v.nLayers.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>{t('reduction against the bound', 'reducción contra la cota')}</dt>
                    <dd>{v.boundReliable ? `${(v.efficiency * 100).toFixed(0)}%` : 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>{t('ore tonnes', 'toneladas de mineral')}</dt>
                    <dd>{Math.round(gt.ore).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US')}</dd>
                  </div>
                  <div>
                    <dt>{t('ore grade', 'ley del mineral')}</dt>
                    <dd>{gt.oreGrade.toFixed(4)}</dd>
                  </div>
                  <div>
                    <dt>{t('grade sent to waste', 'ley enviada a lastre')}</dt>
                    <dd>{gt.waste > 0 ? gt.wasteGrade.toFixed(4) : '-'}</dd>
                  </div>
                </dl>
              </div>
            )}
          </>
        )}

        {/* READOUTS, not controls. Each of these would need a re-bake, and ADR-0070 clause 6 forbids
            presenting a parameter that cannot respond live as though it could. */}
        {m && advanced && (
          <div className="fx-readouts">
            <h3>{t('Fixed by the bake', 'Fijado por el horneado')}</h3>
            <p className="fx-hint">
              {t(
                'Changing one of these re-runs the simulation, which routes every load over the trafficable surface and relaxes after every operation. That is an offline operation, so it is shown as a reading rather than as a slider that could not respond.',
                'Cambiar uno de estos vuelve a correr la simulación, que rutea cada carga sobre la superficie transitable y relaja el campo tras cada operación. Eso es una operación fuera de línea, así que se muestra como lectura y no como un control que no podría responder.',
              )}
            </p>
            <dl>
              <div>
                <dt>{t('ground', 'terreno')}</dt>
                <dd>
                  {m.pad.nx} x {m.pad.ny} {t('cells at', 'celdas de')} {m.pad.cell_m} m
                </dd>
              </div>
              <div>
                <dt>{t('angle of repose', 'ángulo de reposo')}</dt>
                <dd>{m.material.repose_deg} {t('deg dry', 'grados en seco')}</dd>
              </div>
              <div>
                <dt>{t('loose density', 'densidad suelta')}</dt>
                <dd>{m.material.loose_density_t_m3} t/m3</dd>
              </div>
              <div>
                <dt>{t('loads offered', 'cargas ofrecidas')}</dt>
                <dd>{m.stream.n_loads}</dd>
              </div>
              <div>
                <dt>{t('shovel dwell', 'permanencia de la pala')}</dt>
                <dd>{m.stream.loads_per_block} {t('loads per dig block', 'cargas por bloque')}</dd>
              </div>
              <div>
                <dt>{t('stream range, measured', 'rango del flujo, medido')}</dt>
                <dd>{m.stream.measured_range_t.toFixed(0)} t</dd>
              </div>
              <div>
                <dt>{t('dozer passes', 'pasadas de bulldozer')}</dt>
                <dd>{m.build.dozer_passes}</dd>
              </div>
              <div>
                <dt>{t('mean dozer displacement', 'arrastre medio')}</dt>
                <dd>{m.build.mean_displacement_m.toFixed(1)} m</dd>
              </div>
            </dl>

            <h3>{t('Dump profiles produced', 'Perfiles de descarga producidos')}</h3>
            <dl>
              {Object.entries(m.build.profiles).map(([k, n]) => (
                <div key={k}>
                  <dt>{k.replace('_', ' ')}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>

            {seg && (
              <>
                <h3>{t('Size segregation', 'Segregación granulométrica')}</h3>
                <dl>
                  <div>
                    <dt>{t('loads sorted on a face', 'cargas clasificadas en una cara')}</dt>
                    <dd>{seg.nSorted}</dd>
                  </div>
                  <div>
                    <dt>{t('coarse fraction, range', 'fracción gruesa, rango')}</dt>
                    <dd>
                      {seg.coarseMin.toFixed(3)} {t('to', 'a')} {seg.coarseMax.toFixed(3)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        )}

        {/* The provenance note the ADR's rail order puts before the scenario switcher. */}
        <p className="fx-prov">
          {t(
            `Engine: bedblend ${__ENGINE_VERSION__}, MIT. Dump geometry calibrated to 28 UAV-surveyed dumps (Young and Rogers, Mining 2022, 10.3390/mining2010006). Segregation: Gray and Thornton kinetic sieving. The multi-element assay is synthetic, sourced to published porphyry ranges, and calibrated to no deposit.`,
            `Motor: bedblend ${__ENGINE_VERSION__}, MIT. Geometría de descarga calibrada contra 28 descargas levantadas con UAV (Young y Rogers, Mining 2022, 10.3390/mining2010006). Segregación: tamizado cinético de Gray y Thornton. El ensayo multielemento es sintético, con rangos tomados de literatura de pórfidos, y no está calibrado a ningún yacimiento.`,
          )}
        </p>

        {/* The scenario switcher, last, and grouped by the axis it varies exactly as the App is. */}
        <label className="fx-field">
          <span>{t('Scenario', 'Escenario')}</span>
          <select value={sid} onChange={(e) => nav(focusHref(e.target.value, view))}>
            {byAxis(index?.scenarios ?? []).map((g) => (
              <optgroup key={g.key} label={axisLabel(g.key, lang)}>
                {g.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title[lang]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </aside>
    </div>
  );
}
