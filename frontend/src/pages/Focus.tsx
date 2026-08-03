/**
 * The focus route: the pile owns the screen.
 *
 * BUILT AGAINST ADR-0070, clause by clause, because the previous version satisfied almost none of it:
 *
 *   1. the stage owns at least 80 percent of the viewport, edge to edge, no card and no border
 *   2. ONE parameter column, on the right, scrollable independently of the stage
 *   3. KPIs are OVERLAID on the stage as a HUD, never stacked as cards above or below it
 *   4. a visible return control at the top right of the stage, landing back on the App
 *   5. the round trip preserves the scenario, so leaving and returning does not reset the reader
 *
 * WHY IT EXISTS at all, rather than for symmetry: this product passes the applicability test. A reader
 * comparing how three sites build the same tonnage needs the instrument large, the controls to hand,
 * and the readouts where their eyes already are.
 *
 * WHAT THE CONTROLS DO AND DO NOT DO. Every control here re-renders the view over the baked trace: it
 * changes what is drawn and what is measured, immediately. None of them re-runs the simulation,
 * because the simulation routes every load over the trafficable surface and relaxes after every
 * operation, which is tens of seconds. ADR-0070 is explicit that a parameter which cannot respond
 * live must not be presented as a live control, so the ones that would need a re-bake are shown as
 * READOUTS of the scenario rather than as sliders that lie.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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

export default function Focus() {
  const { caseId } = useParams<{ caseId: string }>();
  const nav = useNavigate();
  const dark = useDark();
  const sid = caseId ?? 'single';

  const [index, setIndex] = useState<Index | null>(null);
  const [sc, setSc] = useState<Scenario | null>(null);
  const [colour, setColour] = useState<ColourBy>('grade');
  const [showPaths, setShowPaths] = useState(true);
  const [showCrest, setShowCrest] = useState(true);
  const [showPlan, setShowPlan] = useState(false);
  const [through, setThrough] = useState(1);
  const [frame, setFrame] = useState(-1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    setSc(null);
    setFrame(-1);
    loadScenario(sid).then(setSc).catch((e) => setErr(String(e)));
  }, [sid]);

  // Clause 5: leaving lands back on the App WITH THIS SCENARIO, not on a default.
  const back = useCallback(() => nav(`/?scenario=${sid}`), [nav, sid]);

  // Clause 1: the stage is the viewport minus nothing. Measured, not assumed: the gate asserts the
  // instrument clears 80 percent here rather than the App route's 50.
  const [stageH, setStageH] = useState(() => Math.max(420, window.innerHeight - 8));
  useEffect(() => {
    const on = () => setStageH(Math.max(420, window.innerHeight - 8));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The surface being drawn: a build frame while playing, the finished pile otherwise.
  const surface = useMemo(() => {
    if (!sc?.frames || frame < 0) return null;
    return sc.frames.frames[Math.min(frame, sc.frames.frames.length - 1)]?.z ?? null;
  }, [sc, frame]);

  const v = useMemo(() => (sc ? verdict(sc) : null), [sc]);
  const seg = useMemo(() => (sc ? segregationSummary(sc) : null), [sc]);

  if (err) {
    return (
      <div className="fx-root">
        <p className="fx-err">Could not load the scenario: {err}</p>
        <Link to="/">Back to the App</Link>
      </div>
    );
  }

  const m = sc?.manifest;

  return (
    <div className="fx-root">
      <section className="fx-stage">
        {sc ? (
          <SiteView3D
            field={sc.field}
            surface={surface}
            plan={sc.plan}
            loads={sc.loads}
            colourBy={colour}
            through={through}
            showPaths={showPaths}
            showCrest={showCrest}
            showPlan={showPlan}
            dark={dark}
            height={stageH}
          />
        ) : (
          <p className="fx-loading">Loading the scenario ...</p>
        )}

        {/* Clause 3: the readouts live ON the stage. */}
        {m && v && seg && (
          <div className="fx-hud">
            <div>
              <b>{v.vrr.toFixed(3)}</b>
              <span>variance reduction</span>
            </div>
            <div className={v.boundReliable ? '' : 'muted'}>
              <b>{v.boundReliable ? v.ideal.toFixed(3) : 'n/a'}</b>
              <span>{v.boundReliable ? 'ideal 1/N bound' : 'bound not reliable here'}</span>
            </div>
            {v.boundReliable && (
              <div>
                <b>{(v.efficiency * 100).toFixed(0)}%</b>
                <span>of the ideal</span>
              </div>
            )}
            <div>
              <b>{m.build.loads_placed}</b>
              <span>loads placed</span>
            </div>
            <div>
              <b>{(m.build.refusal_rate * 100).toFixed(1)}%</b>
              <span>tips refused</span>
            </div>
            <div>
              <b>{m.build.peak_m.toFixed(1)} m</b>
              <span>peak height</span>
            </div>
            <div className={m.gate.pairs_over_repose === 0 ? 'ok' : 'bad'}>
              <b>{m.gate.pairs_over_repose}</b>
              <span>pairs over repose</span>
            </div>
          </div>
        )}

        {/* Clause 4: a visible return control at the top right of the stage. */}
        <button type="button" className="fx-return" onClick={back} aria-label="Return to the App">
          <Minimize2 size={15} aria-hidden />
          <span>Return</span>
        </button>

        {sc && (
          <div className="fx-play">
            <PlayBar
              frames={sc.frames}
              index={frame < 0 ? (sc.frames?.frames.length ?? 1) - 1 : frame}
              onIndex={setFrame}
            />
          </div>
        )}

        {m && (
          <p className="fx-caption">
            <strong>{m.title.en}.</strong> {m.summary.en}
          </p>
        )}
      </section>

      {/* Clause 2: ONE parameter column, on the right, scrolling independently. */}
      <aside className="fx-rail">
        <label className="fx-field">
          <span>Scenario</span>
          <select value={sid} onChange={(e) => nav(`/focus/${e.target.value}`)}>
            {(index?.scenarios ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title.en}
              </option>
            ))}
          </select>
        </label>

        <label className="fx-field">
          <span>Colour the material by</span>
          <select value={colour} onChange={(e) => setColour(e.target.value as ColourBy)}>
            <option value="grade">grade</option>
            <option value="coarse">coarse fraction</option>
            <option value="thickness">thickness above ground</option>
          </select>
        </label>

        <label className="fx-field">
          <span>
            Truck paths shown, through load{' '}
            <b>{sc ? Math.round(sc.loads.length * through) : 0}</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={through}
            onChange={(e) => setThrough(Number(e.target.value))}
          />
        </label>

        <fieldset className="fx-toggles">
          <legend>Overlays</legend>
          <label>
            <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} />
            truck approach and departure
          </label>
          <label>
            <input type="checkbox" checked={showCrest} onChange={(e) => setShowCrest(e.target.checked)} />
            crest, which every edge dump was aimed at
          </label>
          <label>
            <input type="checkbox" checked={showPlan} onChange={(e) => setShowPlan(e.target.checked)} />
            planned area boundaries
          </label>
        </fieldset>

        {/* READOUTS, not controls. Each of these would need a re-bake, and ADR-0070 forbids
            presenting a parameter that cannot respond live as though it could. */}
        {m && (
          <div className="fx-readouts">
            <h3>This scenario</h3>
            <p className="fx-hint">
              These are fixed by the bake. Changing one re-runs the simulation, which routes every
              load over the trafficable surface and relaxes after every operation, so it is an offline
              operation rather than a slider.
            </p>
            <dl>
              <div>
                <dt>ground</dt>
                <dd>{m.pad.nx} x {m.pad.ny} cells at {m.pad.cell_m} m</dd>
              </div>
              <div>
                <dt>angle of repose</dt>
                <dd>{m.material.repose_deg} deg dry</dd>
              </div>
              <div>
                <dt>loose density</dt>
                <dd>{m.material.loose_density_t_m3} t/m3</dd>
              </div>
              <div>
                <dt>loads offered</dt>
                <dd>{m.stream.n_loads}</dd>
              </div>
              <div>
                <dt>shovel dwell</dt>
                <dd>{m.stream.loads_per_block} loads per dig block</dd>
              </div>
              <div>
                <dt>stream range, measured</dt>
                <dd>{m.stream.measured_range_t.toFixed(0)} t</dd>
              </div>
              <div>
                <dt>dozer passes</dt>
                <dd>{m.build.dozer_passes}</dd>
              </div>
              <div>
                <dt>mean dozer displacement</dt>
                <dd>{m.build.mean_displacement_m.toFixed(1)} m</dd>
              </div>
            </dl>

            <h3>Dump profiles produced</h3>
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
                <h3>Size segregation</h3>
                <dl>
                  <div>
                    <dt>loads sorted on a face</dt>
                    <dd>{seg.nSorted}</dd>
                  </div>
                  <div>
                    <dt>coarse fraction, range</dt>
                    <dd>
                      {seg.coarseMin.toFixed(3)} to {seg.coarseMax.toFixed(3)}
                    </dd>
                  </div>
                </dl>
              </>
            )}

            <p className="fx-hint">
              The stream range is REPORTED, not set: it is a consequence of how long the shovel dwells
              in one dig block, because consecutive trucks load from the same block.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
