import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import {
  CASES, CASES_BY_ID, RECLAIM_GEOMETRY, RECLAIM_METHODS, STACKING_LABELS, STACKING_METHODS,
  blendingRegime, configFor, dumpsFor, simulate,
} from '../engine';
import type { ReclaimMethod, StackingMethod } from '../engine';
import { PileView3D, type Scalar } from '../viz/PileView3D';
import { Ctl } from '../viz/Panels';

/**
 * ADR-0070 scenario focus view: one selected pile, full page, nothing competing with it.
 *
 * ADDITIVE. The App keeps every tab and all its explanation; this route is a second way to look at the
 * SAME case through the SAME engine, for operating it rather than reading about it. It renders OUTSIDE
 * the AppShell on purpose: the header and footer are exactly the chrome a focus view exists to escape.
 *
 * The clauses this implements, each of which is easy to fake and therefore stated: the stage owns the
 * viewport; one parameter column on the right; the KPIs are a HUD overlaid on the stage rather than
 * cards stacked above it; the blending regime is NAMED on the stage in one plain sentence; a
 * basic/advanced toggle governs parameter density; there is a visible return that lands back on the
 * App with the same case selected; and the route is deep-linkable per case.
 *
 * Motion starts paused. This view recomputes on a control change and draws on demand; nothing here
 * runs a permanent animation loop, because a focus view that autoplays is a compute bomb on a
 * background tab.
 */
export default function Focus() {
  const { caseId } = useParams();
  const es = useShellLang() === 'es';
  const base = useMemo(() => CASES_BY_ID[caseId ?? ''] ?? CASES[0], [caseId]);

  const [advanced, setAdvanced] = useState(false);
  const [stacking, setStacking] = useState<StackingMethod>(base.stacking);
  const [reclaim, setReclaim] = useState<ReclaimMethod>(base.reclaim);
  const [nPasses, setNPasses] = useState(base.nPasses);
  const [sr, setSr] = useState(base.sr);
  const [repose, setRepose] = useState(base.reposeDeg);
  const [reclaimRate, setReclaimRate] = useState(base.reclaimRate);
  const [scalar, setScalar] = useState<Scalar>('height');
  const [cutAt, setCutAt] = useState(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const [vex, setVex] = useState(1);

  // switching case from the rail must actually switch the experiment, not only the title
  const [seen, setSeen] = useState(base.id);
  if (seen !== base.id) {
    setSeen(base.id);
    setStacking(base.stacking);
    setReclaim(base.reclaim);
    setNPasses(base.nPasses);
    setSr(base.sr);
    setRepose(base.reposeDeg);
    setReclaimRate(base.reclaimRate);
    setScrub(null);
  }

  const run = useMemo(() => simulate(
    configFor(base, 42, {
      stacking, reclaim, nPasses, sr, reclaimRate,
      pad: { nx: base.nx, ny: base.ny, cellM: base.cellM, reposeDeg: repose,
        reposeCoarseDeg: base.reposeCoarseDeg, bulkDensityTpm3: 1.9 },
    }),
    dumpsFor(base, 42),
  ), [base, stacking, reclaim, nPasses, sr, reclaimRate, repose]);

  // The focus view opened on the FINAL state, which is the pad AFTER the reclaimer drained it: a true
  // picture of the wrong moment. It opens at the fullest the pile ever was, and the rail scrubs.
  const peak = useMemo(() => {
    let best = 0;
    let bestSum = -1;
    run.snapshots.forEach((s0, i) => {
      let t = 0;
      for (let k = 0; k < s0.h.length; k++) t += s0.h[k];
      if (t > bestSum) { bestSum = t; best = i; }
    });
    return best;
  }, [run]);
  const nSnap = run.snapshots.length;
  const pos = scrub ?? peak / Math.max(1, nSnap - 1);
  const frame = Math.min(nSnap - 1, Math.max(0, Math.round(pos * (nSnap - 1))));
  const shown = run.snapshots[frame].h;
  const apexNow = shown.reduce((a, b) => (b > a ? b : a), 0);

  const m = run.metrics;
  const regime = blendingRegime(m, es);

  const hud = [
    { v: Number.isFinite(m.vrr) ? m.vrr.toFixed(3) : '--', l: 'VRR' },
    { v: Number.isFinite(m.vrrIdeal) ? m.vrrIdeal.toFixed(3) : '--', l: es ? 'ideal 1/N' : '1/N ideal' },
    { v: `${(m.efficiency * 100).toFixed(0)} %`, l: es ? 'de lo ideal' : 'of ideal' },
    { v: m.nLayersMean.toFixed(1), l: es ? 'capas/corte' : 'layers/cut' },
    { v: `${apexNow.toFixed(1)} m`, l: es ? 'apice' : 'apex' },
    { v: m.segregationIndex.toFixed(3), l: es ? 'segregacion' : 'segregation' },
  ];

  return (
    <div className="stf">
      <div className="stf-stage">
        <PileView3D pad={run.pad} height={shown} grade={run.gradeFinal}
          coarse={run.coarseFinal} columnLots={run.columnLots} scalar={scalar}
          cutAt={cutAt < 1 ? cutAt : undefined} onExaggeration={setVex} es={es} />

        {/* the transport sits ON the stage, so the instrument keeps the height a bar would take */}
        <div className="st-overbar" style={{ left: 'auto', right: 14, top: 56, width: '46%' }}>
          <span className="st-muted" style={{ fontSize: '0.68rem' }}>
            {es ? 'Linea de tiempo' : 'Timeline'}
          </span>
          <input type="range" min={0} max={1} step={0.01} value={pos}
            onChange={(e) => setScrub(Number(e.target.value))}
            aria-label={es ? 'Linea de tiempo' : 'Timeline'} />
          <span className="st-mono" style={{ fontSize: '0.68rem' }}>
            {(run.snapshots[frame].tS / 3600).toFixed(1)} h
          </span>
        </div>
        <div className="st-stage-legend" style={{ left: 14, right: 14 }}>
          <span className="st-muted" style={{ fontSize: '0.64rem' }}>
            {es
              ? `Escala vertical exagerada ${vex.toFixed(1)}x sobre una losa de ${(run.pad.nx * run.pad.cellM).toFixed(0)} x ${(run.pad.ny * run.pad.cellM).toFixed(0)} m. Las lecturas al pasar el cursor son alturas REALES. La linea de tiempo abre en el momento de maximo inventario.`
              : `Vertical scale exaggerated ${vex.toFixed(1)}x on a ${(run.pad.nx * run.pad.cellM).toFixed(0)} by ${(run.pad.ny * run.pad.cellM).toFixed(0)} m pad. Hover readouts are TRUE heights. The timeline opens at peak inventory.`}
          </span>
        </div>

        {/* the stage is LABELLED IN PLACE: the regime named, plus one plain sentence, so the view can
            teach on its own without the reader looking anywhere else */}
        <div className="stf-badge">
          <div className="stf-badge-t">{regime.label}</div>
          <div className="stf-badge-d">{regime.text}</div>
        </div>

        <div className="stf-hud">
          {hud.map((k) => (
            <div className="stf-hud-i" key={k.l}>
              <div className="stf-hud-v">{k.v}</div>
              <div className="stf-hud-l">{k.l}</div>
            </div>
          ))}
        </div>

        <Link className="st-btn stf-exit" to="/">
          <Minimize2 size={13} /> {es ? 'Volver al taller' : 'Back to the workbench'}
        </Link>
      </div>

      <aside className="stf-rail">
        <div>
          <h2>{base.id}</h2>
          <p className="st-muted" style={{ margin: '0.2rem 0 0' }}>{base.reason}</p>
        </div>

        <div className="st-chips">
          <button type="button" className={`chip${advanced ? '' : ' on'}`} onClick={() => setAdvanced(false)}>
            {es ? 'Basico' : 'Basic'}
          </button>
          <button type="button" className={`chip${advanced ? ' on' : ''}`} onClick={() => setAdvanced(true)}>
            {es ? 'Avanzado' : 'Advanced'}
          </button>
        </div>

        <label className="st-ctl">
          <span className="st-ctl-h"><span>{es ? 'Metodo de apilado' : 'Stacking method'}</span></span>
          <select className="st-select" value={stacking}
            onChange={(e) => setStacking(e.target.value as StackingMethod)}>
            {STACKING_METHODS.map((s) => (
              <option key={s} value={s}>{es ? STACKING_LABELS[s].es : STACKING_LABELS[s].en}</option>
            ))}
          </select>
        </label>

        <label className="st-ctl">
          <span className="st-ctl-h"><span>{es ? 'Recuperacion' : 'Reclaim'}</span></span>
          <select className="st-select" value={reclaim}
            onChange={(e) => setReclaim(e.target.value as ReclaimMethod)}>
            {RECLAIM_METHODS.map((r) => (
              <option key={r} value={r}>
                {es ? RECLAIM_GEOMETRY[r].machineEs : RECLAIM_GEOMETRY[r].machine}
              </option>
            ))}
          </select>
        </label>

        <Ctl label={es ? 'Pasadas (capas)' : 'Passes (layers)'} value={nPasses}
          min={4} max={80} step={1} onChange={setNPasses} />
        <Ctl label={es ? 'Numero de segregacion Sr' : 'Segregation number Sr'} value={sr}
          min={0} max={8} step={0.1} onChange={setSr} fmt={(v) => v.toFixed(1)} />

        {advanced && (
          <>
            <Ctl label={es ? 'Angulo de reposo' : 'Angle of repose'} value={repose}
              min={28} max={50} step={0.5} onChange={setRepose} fmt={(v) => `${v.toFixed(1)} deg`} />
            <Ctl label={es ? 'Tasa de recuperacion' : 'Reclaim rate'} value={reclaimRate}
              min={0.2} max={3} step={0.1} onChange={setReclaimRate} fmt={(v) => `${v.toFixed(1)} x`} />
            <Ctl label={es ? 'Plano de corte' : 'Cutaway plane'} value={cutAt}
              min={0.15} max={1} step={0.01} onChange={setCutAt} fmt={(v) => `${(v * 100).toFixed(0)} %`} />
            <label className="st-ctl">
              <span className="st-ctl-h"><span>{es ? 'Escalar' : 'Scalar'}</span></span>
              <select className="st-select" value={scalar} onChange={(e) => setScalar(e.target.value as Scalar)}>
                <option value="height">{es ? 'Altura' : 'Height'}</option>
                <option value="grade">{es ? 'Ley de columna' : 'Column grade'}</option>
                <option value="coarse">{es ? 'Fraccion gruesa' : 'Coarse fraction'}</option>
                <option value="origin">{es ? 'Evento de origen' : 'Source event'}</option>
              </select>
            </label>
          </>
        )}

        <p className="st-muted" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
          {es
            ? 'Relajacion con angulo de reposo impuesto (Bak, Tang y Wiesenfeld 1987 como regla de vuelco, no como afirmacion de criticidad); segregacion por cribado cinetico segun Gray y Thornton 2005, ecuacion (3.20); libro mayor de lotes por celda al estilo de Zhao et al. 2015. VRR = var_salida / var_entrada, menor es mejor.'
            : 'Relaxation with an imposed angle of repose (Bak, Tang and Wiesenfeld 1987 as the toppling rule, not as a criticality claim); kinetic-sieving segregation from Gray and Thornton 2005, equation (3.20); a per-cell lot ledger after Zhao et al. 2015. VRR = var_out / var_in, lower is better.'}
        </p>

        <div>
          <div className="st-card-t">{es ? 'Otros casos' : 'Other cases'}</div>
          <div className="st-chips">
            {CASES.map((c) => (
              <Link key={c.id} to={`/focus/${c.id}`}
                className={`chip${c.id === base.id ? ' on' : ''}`} style={{ textDecoration: 'none' }}>
                {c.id.split('_')[0]}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
