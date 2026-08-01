import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { Callout, useShellLang } from '@fasl-work/caos-app-shell';
import {
  CASES, CASES_BY_ID, RECLAIM_GEOMETRY, RECLAIM_METHODS, STACKING_LABELS, STACKING_METHODS,
  STRUCTURE_LABELS, blendingRegime, casesByCategory, configFor, dumpsFor,
  inputVariogram, layersPerCut, outputVariogram, residenceTime, simulate,
} from '../engine';
import type { ReclaimMethod, StackingMethod, StreamStructure } from '../engine';
import { PanelBoundary } from '../viz/PanelBoundary';
import { PileView3D, ScalarLegend, type Scalar } from '../viz/PileView3D';
import { UPlotChart } from '../viz/UPlotChart';
import {
  Ctl, Kpis, ProvenanceLedger, ProvenanceSankey, RailSections, StratColumn, TabRow, VrrGauge,
} from '../viz/Panels';

/**
 * The App: the workbench for ONE selected case, fully interactive.
 *
 * Every control below is in the recompute dependency. ADR-0017 clause 3.1 makes a control that does
 * not change the output a defect rather than a cosmetic issue, so the control set here is exactly the
 * field set of RunConfig plus the stream parameters, and nothing else is offered.
 *
 * Cross-case summaries are NOT here. They belong on Experiments and Benchmark; a panel answering
 * "across all scenarios" on the App route is misplaced by the product-quality bar.
 */

const GROUPS = [
  { id: 'pile', en: 'Pile', es: 'Pila', views: [
    { id: 'pile3d', en: 'The pile', es: 'La pila' },
    { id: 'cutaway', en: 'Cutaway', es: 'Corte interno' },
    { id: 'column', en: 'Stratigraphic column', es: 'Columna estratigráfica' },
  ] },
  { id: 'build', en: 'Build', es: 'Construcción', views: [
    { id: 'compare', en: 'Stacking comparison', es: 'Comparación de apilado' },
    { id: 'segprofile', en: 'Segregation profile', es: 'Perfil de segregación' },
    { id: 'regime', en: 'Stratification regime', es: 'Régimen de estratificación' },
  ] },
  { id: 'blend', en: 'Blend', es: 'Mezcla', views: [
    { id: 'streams', en: 'Input vs reclaimed', es: 'Entrada vs recuperado' },
    { id: 'vrr', en: 'Variance reduction', es: 'Reducción de varianza' },
    { id: 'variogram', en: 'Variograms', es: 'Variogramas' },
    { id: 'ideal', en: 'Achieved vs 1/N', es: 'Logrado vs 1/N' },
  ] },
  { id: 'trace', en: 'Trace', es: 'Trazabilidad', views: [
    { id: 'sankey', en: 'Provenance flow', es: 'Flujo de procedencia' },
    { id: 'ledger', en: 'Provenance ledger', es: 'Libro de procedencia' },
    { id: 'rtd', en: 'Residence time', es: 'Tiempo de residencia' },
  ] },
  { id: 'balance', en: 'Balance', es: 'Balance', views: [
    { id: 'mass', en: 'Mass balance', es: 'Balance de masa' },
    { id: 'honesty', en: 'Model honesty', es: 'Honestidad del modelo' },
    { id: 'decision', en: 'Decision', es: 'Decisión' },
  ] },
] as const;

export default function Tool() {
  const es = useShellLang() === 'es';
  const [caseId, setCaseId] = useState<string>(CASES[0].id);
  const base = CASES_BY_ID[caseId];

  const [stacking, setStacking] = useState<StackingMethod>(base.stacking);
  const [reclaim, setReclaim] = useState<ReclaimMethod>(base.reclaim);
  const [nPasses, setNPasses] = useState(base.nPasses);
  const [sr, setSr] = useState(base.sr);
  const [repose, setRepose] = useState(base.reposeDeg);
  const [reposeCoarse, setReposeCoarse] = useState(base.reposeCoarseDeg);
  const [structure, setStructure] = useState<StreamStructure>(base.structure as StreamStructure);
  const [rangeT, setRangeT] = useState(base.rangeT);
  const [reclaimRate, setReclaimRate] = useState(base.reclaimRate);
  const [cutTonnes, setCutTonnes] = useState(base.cutTonnes);
  const [seed, setSeed] = useState(42);
  const [target, setTarget] = useState(0.15);

  const [section, setSection] = useState('case');
  const [view, setView] = useState<string>('pile3d');
  const [scalar, setScalar] = useState<Scalar>('height');
  const [cutAt, setCutAt] = useState(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const [pickedCell, setPickedCell] = useState<number | null>(null);
  const [pickedCut, setPickedCut] = useState<number | null>(null);

  // selecting a different case must actually change the case: the knobs re-seed from it, or the
  // selector would move the title while the experiment stayed exactly as it was
  const [seenCase, setSeenCase] = useState(caseId);
  if (seenCase !== caseId) {
    setSeenCase(caseId);
    setStacking(base.stacking);
    setReclaim(base.reclaim);
    setNPasses(base.nPasses);
    setSr(base.sr);
    setRepose(base.reposeDeg);
    setReposeCoarse(base.reposeCoarseDeg);
    setStructure(base.structure as StreamStructure);
    setRangeT(base.rangeT);
    setReclaimRate(base.reclaimRate);
    setCutTonnes(base.cutTonnes);
    setPickedCell(null);
    setPickedCut(null);
    setScrub(null);
  }

  const run = useMemo(() => {
    const cfg = configFor(base, seed, {
      stacking, reclaim, nPasses, sr, reclaimRate, cutTonnes,
      pad: { nx: base.nx, ny: base.ny, cellM: base.cellM, reposeDeg: repose,
        reposeCoarseDeg: reposeCoarse, bulkDensityTpm3: 1.9 },
    });
    return simulate(cfg, dumpsFor(base, seed, { structure, rangeT }));
  }, [base, seed, stacking, reclaim, nPasses, sr, reclaimRate, cutTonnes, repose, reposeCoarse,
    structure, rangeT]);

  const m = run.metrics;
  const regime = blendingRegime(m, es);
  const vin = useMemo(() => inputVariogram(run.dumps), [run]);
  const vout = useMemo(() => outputVariogram(run.cuts), [run]);
  const rt = useMemo(() => residenceTime(run.dumps, run.cuts), [run]);

  // The snapshot holding the most material. Defaulting the timeline to the END shows the pad AFTER
  // the drain, which is nearly empty: a true picture of the wrong moment. The default is the peak,
  // and the transport still scrubs the whole build.
  const peakFrame = useMemo(() => {
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
  const scrubPos = scrub ?? peakFrame / Math.max(1, nSnap - 1);
  const frame = Math.min(nSnap - 1, Math.max(0, Math.round(scrubPos * (nSnap - 1))));
  const shownHeight = run.snapshots[frame].h;
  const [vex, setVex] = useState(1);
  const dumpIdx = Math.min(run.dumps.length - 1, Math.round(scrubPos * (run.dumps.length - 1)));
  const stackerXY: [number, number] = [run.dumps[dumpIdx].xM, run.dumps[dumpIdx].yM];

  const modified = stacking !== base.stacking || reclaim !== base.reclaim || nPasses !== base.nPasses
    || sr !== base.sr || repose !== base.reposeDeg || structure !== base.structure;

  const cut = pickedCut != null ? run.cuts.find((c) => c.cutId === pickedCut) ?? null : run.cuts[0] ?? null;

  // The two views whose instrument IS the stage get the readouts overlaid on it, so the pile keeps
  // the height a card row would otherwise take on every render.
  const stageView = view === 'pile3d' || view === 'cutaway';
  const kpis = [
    { v: Number.isFinite(m.vrr) ? m.vrr.toFixed(3) : '--', l: 'VRR' },
    { v: Number.isFinite(m.vrrIdeal) ? m.vrrIdeal.toFixed(3) : '--', l: es ? 'ideal 1/N' : '1/N ideal' },
    { v: `${(m.efficiency * 100).toFixed(0)} %`, l: es ? 'de lo ideal' : 'of the ideal' },
    { v: m.nLayersMean.toFixed(1), l: es ? 'capas/corte' : 'layers/cut' },
    { v: Number.isFinite(m.mixingEffect) ? m.mixingEffect.toFixed(1) : '--', l: es ? 'efecto E' : 'mixing effect E' },
    { v: m.segregationIndex.toFixed(3), l: es ? 'segregación' : 'segregation' },
    { v: `${run.cuts.length}`, l: es ? 'cortes' : 'cuts' },
    { v: `${run.runMs.toFixed(0)} ms`, l: es ? 'cálculo en vivo' : 'live compute' },
  ];

  const groups = GROUPS.map((g) => ({
    id: g.id, label: es ? g.es : g.en,
    views: g.views.map((v) => ({ id: v.id, label: es ? v.es : v.en })),
  }));

  return (
    <div className="page-body st-layout">
      <aside className="st-side">
        <div className="st-diag" aria-live="polite">
          <div className="st-diag-l">{es ? 'Reducción de varianza' : 'Variance reduction'}</div>
          <div className="st-diag-v">{Number.isFinite(m.vrr) ? m.vrr.toFixed(3) : '--'}</div>
          <div className="st-diag-s"><strong>{regime.label}.</strong> {regime.text}</div>
          <div className="st-formula">VRR = var_out / var_in</div>
        </div>

        {/* ADR-0070 clause 8: the entry control lives HERE, on the same surface as the case selector,
            and carries the selected case. A focus route reachable only by typing its address does not
            exist for any real user. */}
        <Link className="st-focus-enter" to={`/focus/${caseId}`}>
          <span className="st-focus-enter-t">
            <Maximize2 size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {es ? 'Abrir esta pila a pantalla completa' : 'Open this pile full screen'}
          </span>
          <span className="st-focus-enter-d">
            {es
              ? 'El mismo caso y los mismos parámetros, sin cromo compitiendo: la pila ocupa la pantalla y los indicadores van sobre ella.'
              : 'The same case and the same parameters with no competing chrome: the pile owns the screen and the readouts sit on it.'}
          </span>
        </Link>

        <RailSections
          active={section}
          onPick={setSection}
          sections={[
            { id: 'case', label: es ? 'Caso' : 'Case' },
            { id: 'build', label: es ? 'Apilado' : 'Stack' },
            { id: 'stream', label: es ? 'Flujo' : 'Stream' },
            { id: 'reclaim', label: es ? 'Recuperar' : 'Reclaim' },
            { id: 'material', label: es ? 'Material' : 'Material' },
          ]}
        />

        {section === 'case' && (
          <div className="st-card">
            <div className="st-card-t">{es ? 'Caso seleccionado' : 'Selected case'}</div>
            {/* ADR-0071 rule 7: a categorised one-of-N is a select with optgroup, not 17 chips */}
            <select className="st-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}
              aria-label={es ? 'Caso' : 'Case'}>
              {casesByCategory().map((g) => (
                <optgroup key={g.category} label={g.label}>
                  {g.cases.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                </optgroup>
              ))}
            </select>
            <details>
              <summary className="st-ctl-d" style={{ cursor: 'pointer', margin: '0.35rem 0' }}>
                {es ? 'Por qué este caso está en la matriz' : 'Why this case is in the matrix'}
              </summary>
              <p className="st-note" style={{ marginTop: '0.3rem' }}>{base.reason}</p>
              <p className="st-note st-muted">
                <strong>{es ? 'Se espera' : 'Expected'}:</strong> {base.expectedBand}
              </p>
            </details>
            {modified && (
              <p className="st-note st-muted">
                {es ? 'Modificado respecto de ' : 'Modified from '}<code>{base.id}</code>.{' '}
                <button type="button" className="st-btn" onClick={() => setSeenCase('')}>
                  {es ? 'Restaurar' : 'Reset'}
                </button>
              </p>
            )}
            <Ctl label={es ? 'Semilla' : 'Seed'} value={seed} min={1} max={200} step={1}
              onChange={setSeed}
              hint={es
                ? 'Cada corrida es función pura de (parámetros, semilla). Cambia la semilla para ver cuánto se mueve el resultado.'
                : 'Every run is a pure function of (parameters, seed). Change it to see how much the result moves.'} />
          </div>
        )}

        {section === 'build' && (
          <div className="st-card">
            <div className="st-card-t">{es ? 'Método de apilado' : 'Stacking method'}</div>
            <select className="st-select" value={stacking}
              onChange={(e) => setStacking(e.target.value as StackingMethod)}
              aria-label={es ? 'Método de apilado' : 'Stacking method'}>
              {STACKING_METHODS.map((s) => (
                <option key={s} value={s}>{es ? STACKING_LABELS[s].es : STACKING_LABELS[s].en}</option>
              ))}
            </select>
            <Ctl label={es ? 'Pasadas del apilador (capas)' : 'Stacker passes (layers)'}
              value={nPasses} min={4} max={80} step={1} onChange={setNPasses}
              hint={es
                ? `N de la cota 1/N. La geometria predice ${layersPerCut(stacking, nPasses)} capas por corte; el libro mayor mide ${m.nLayersMean.toFixed(1)}.`
                : `The N of the 1/N bound. The geometry predicts ${layersPerCut(stacking, nPasses)} layers per cut; the ledger measures ${m.nLayersMean.toFixed(1)}.`} />
          </div>
        )}

        {section === 'stream' && (
          <div className="st-card">
            <div className="st-card-t">{es ? 'Flujo de entrada' : 'Incoming stream'}</div>
            <select className="st-select" value={structure}
              onChange={(e) => setStructure(e.target.value as StreamStructure)}
              aria-label={es ? 'Estructura del flujo' : 'Stream structure'}>
              {(Object.keys(STRUCTURE_LABELS) as StreamStructure[]).map((s) => (
                <option key={s} value={s}>{es ? STRUCTURE_LABELS[s].es : STRUCTURE_LABELS[s].en}</option>
              ))}
            </select>
            <p className="st-ctl-d" style={{ marginTop: '0.3rem' }}>
              {es ? STRUCTURE_LABELS[structure].note_es : STRUCTURE_LABELS[structure].note_en}
            </p>
            <Ctl label={es ? 'Alcance del variograma, t' : 'Variogram range, t'}
              value={rangeT} min={200} max={30000} step={200} onChange={setRangeT}
              fmt={(v) => `${(v / 1000).toFixed(1)} kt`}
              hint={es
                ? 'Comparalo con las toneladas por capa: si el alcance supera una capa, las capas no son independientes y la cama ayuda poco.'
                : 'Compare it against the tonnes per layer: once the range exceeds one layer the layers are not independent and the bed helps little.'} />
          </div>
        )}

        {section === 'reclaim' && (
          <div className="st-card">
            <div className="st-card-t">{es ? 'Método de recuperación' : 'Reclaim method'}</div>
            <select className="st-select" value={reclaim}
              onChange={(e) => setReclaim(e.target.value as ReclaimMethod)}
              aria-label={es ? 'Método de recuperación' : 'Reclaim method'}>
              {RECLAIM_METHODS.map((r) => (
                <option key={r} value={r}>
                  {es ? RECLAIM_GEOMETRY[r].machineEs : RECLAIM_GEOMETRY[r].machine}
                </option>
              ))}
            </select>
            <p className="st-ctl-d" style={{ marginTop: '0.3rem' }}>
              {es
                ? `Alcanza el ${(RECLAIM_GEOMETRY[reclaim].depth * 100).toFixed(0)} % de la columna en un corte. Eso decide cuantas capas cruza.`
                : `Reaches ${(RECLAIM_GEOMETRY[reclaim].depth * 100).toFixed(0)} % of the column in one cut. That is what decides how many layers it crosses.`}
            </p>
            <Ctl label={es ? 'Tasa de recuperación' : 'Reclaim rate'} value={reclaimRate}
              min={0.2} max={3} step={0.1} onChange={setReclaimRate} fmt={(v) => `${v.toFixed(1)} x`}
              hint={es
                ? 'Toneladas recuperadas por tonelada apilada. Por encima de 1 la pila se vacia y el recuperador se queda sin material.'
                : 'Tonnes reclaimed per tonne stacked. Above 1 the pile empties and the reclaimer starves.'} />
            <Ctl label={es ? 'Toneladas por corte' : 'Tonnes per cut'} value={cutTonnes}
              min={200} max={3000} step={50} onChange={setCutTonnes} fmt={(v) => `${v.toFixed(0)} t`}
              hint={es ? 'El tamaño del parcel que recibe la planta.' : 'The size of the parcel the plant receives.'} />
            <Ctl label={es ? 'Ventana objetivo, VRR' : 'Target window, VRR'} value={target}
              min={0.02} max={1} step={0.01} onChange={setTarget} fmt={(v) => v.toFixed(2)}
              hint={es ? 'El umbral que usa la tarjeta de decisión.' : 'The threshold the decision card is judged against.'} />
          </div>
        )}

        {section === 'material' && (
          <div className="st-card">
            <div className="st-card-t">{es ? 'Material' : 'Material'}</div>
            <Ctl label={es ? 'Ángulo de reposo, finos' : 'Angle of repose, fines'} value={repose}
              min={28} max={50} step={0.5} onChange={setRepose} fmt={(v) => `${v.toFixed(1)} deg`}
              hint={es
                ? 'Impuesto, no emergente. Los valores publicados para minerales van de unos 34 a 60 grados.'
                : 'Imposed, not emergent. Published values for ores run from about 34 to 60 degrees.'} />
            <Ctl label={es ? 'Ángulo de reposo, gruesos' : 'Angle of repose, coarse'} value={reposeCoarse}
              min={28} max={50} step={0.5} onChange={setReposeCoarse} fmt={(v) => `${v.toFixed(1)} deg`}
              hint={es
                ? 'Si el grueso es más empinado que el fino, la mezcla se estratifica en capas alternadas en vez de solo segregarse (Makse et al. 1997).'
                : 'When the coarse species is steeper than the fine one, the mixture stratifies into alternating layers rather than merely segregating (Makse et al. 1997).'} />
            <Ctl label={es ? 'Número de segregación Sr' : 'Segregation number Sr'} value={sr}
              min={0} max={8} step={0.1} onChange={setSr} fmt={(v) => v.toFixed(1)}
              hint={es
                ? 'Ecuación (3.19) de Gray y Thornton. En 0 la ecuación degenera a un trazador pasivo: es el control negativo.'
                : 'Gray and Thornton equation (3.19). At 0 the equation degenerates to a passive tracer: that is the negative control.'} />
            <p className="st-ctl-d">
              {es
                ? `Pendiente maxima en pie: ${run.steepestSlopeDeg.toFixed(1)} deg contra ${repose.toFixed(1)} impuestos. Apice ${run.apexHeightM.toFixed(1)} m.`
                : `Steepest slope standing: ${run.steepestSlopeDeg.toFixed(1)} deg against ${repose.toFixed(1)} imposed. Apex ${run.apexHeightM.toFixed(1)} m.`}
            </p>
          </div>
        )}
      </aside>

      <main className="st-main">
        <TabRow groups={groups} active={view} onPick={setView} es={es} />

        <div className="st-tabpanel">
          {!stageView && <Kpis items={kpis} />}

          {view === 'pile3d' && (
            <PanelBoundary name="pile3d" es={es}>
              <div className="st-stage st-stage-full">
                <PileView3D pad={run.pad} height={shownHeight} grade={run.gradeFinal}
                  coarse={run.coarseFinal} columnLots={run.columnLots} scalar={scalar}
                  stackerXY={stackerXY} onPick={setPickedCell} onExaggeration={setVex} es={es} />
                <div className="st-hud">
                  {kpis.slice(0, 6).map((k) => (
                    <div className="st-hud-i" key={k.l}>
                      <div className="st-hud-v">{k.v}</div>
                      <div className="st-hud-l">{k.l}</div>
                    </div>
                  ))}
                </div>
                <div className="st-overbar">
                  <select className="st-select" style={{ width: 'auto' }} value={scalar}
                    onChange={(e) => setScalar(e.target.value as Scalar)}
                    aria-label={es ? 'Escalar mostrado' : 'Scalar overlay'}>
                    <option value="height">{es ? 'Altura' : 'Height'}</option>
                    <option value="grade">{es ? 'Ley de columna' : 'Column grade'}</option>
                    <option value="coarse">{es ? 'Fracción gruesa' : 'Coarse fraction'}</option>
                    <option value="origin">{es ? 'Evento de origen' : 'Source event'}</option>
                  </select>
                  <input type="range" min={0} max={1} step={0.01} value={scrubPos}
                    onChange={(e) => setScrub(Number(e.target.value))}
                    aria-label={es ? 'Línea de tiempo' : 'Timeline'} />
                  <span className="st-mono" style={{ fontSize: '0.72rem' }}>
                    {(run.dumps[dumpIdx].tS / 3600).toFixed(1)} h
                  </span>
                </div>
                <div className="st-stage-legend">
                  <ScalarLegend scalar={scalar} max={
                    scalar === 'grade' ? Math.max(...run.gradeFinal)
                      : scalar === 'coarse' ? Math.max(...run.coarseFinal)
                        : Math.max(...shownHeight)} es={es} />
                  <span className="st-muted" style={{ fontSize: '0.62rem' }}>
                    {es
                      ? `Escala vertical exagerada ${vex.toFixed(1)}x sobre una losa de ${(run.pad.nx * run.pad.cellM).toFixed(0)} x ${(run.pad.ny * run.pad.cellM).toFixed(0)} m. Las lecturas al pasar el cursor son alturas REALES.`
                      : `Vertical scale exaggerated ${vex.toFixed(1)}x on a ${(run.pad.nx * run.pad.cellM).toFixed(0)} by ${(run.pad.ny * run.pad.cellM).toFixed(0)} m pad. Hover readouts are TRUE heights.`}
                  </span>
                </div>
              </div>

            </PanelBoundary>
          )}

          {view === 'cutaway' && (
            <PanelBoundary name="cutaway" es={es}>
              <div className="st-stage st-stage-full">
                <PileView3D pad={run.pad} height={run.heightFinal} grade={run.gradeFinal}
                  coarse={run.coarseFinal} columnLots={run.columnLots} scalar="origin"
                  cutAt={cutAt} onPick={setPickedCell} onExaggeration={setVex} es={es} />
                <div className="st-hud">
                  {kpis.slice(0, 6).map((k) => (
                    <div className="st-hud-i" key={k.l}>
                      <div className="st-hud-v">{k.v}</div>
                      <div className="st-hud-l">{k.l}</div>
                    </div>
                  ))}
                </div>
                <div className="st-overbar">
                  <span className="st-muted" style={{ fontSize: '0.72rem' }}>
                    {es ? 'Plano de corte' : 'Cutaway plane'}
                  </span>
                  <input type="range" min={0.05} max={1} step={0.01} value={cutAt}
                    onChange={(e) => setCutAt(Number(e.target.value))}
                    aria-label={es ? 'Plano de corte' : 'Cutaway plane'} />
                  <span className="st-mono" style={{ fontSize: '0.72rem' }}>
                    {(cutAt * run.pad.nx * run.pad.cellM).toFixed(0)} m
                  </span>
                </div>
                <div className="st-stage-legend">
                  <span className="st-muted" style={{ fontSize: '0.66rem' }}>
                    {es
                      ? `Color por evento de deposicion. La profundidad lleva el ORDEN de deposicion, el tercer eje que justifica esta vista en 3D. Escala vertical exagerada ${vex.toFixed(1)}x.`
                      : `Coloured by deposition event. Depth carries the deposition ORDER, the third axis that justifies this view being 3-D. Vertical scale exaggerated ${vex.toFixed(1)}x.`}
                  </span>
                </div>
              </div>

            </PanelBoundary>
          )}

          {view === 'column' && (
            <PanelBoundary name="column" es={es}>
              <StratColumn lots={pickedCell != null ? run.columnLots[pickedCell] : null}
                cell={pickedCell} pad={run.pad} es={es} />
            </PanelBoundary>
          )}

          {view === 'compare' && (
            <PanelBoundary name="compare" es={es}>
              <StackingCompare base={base} seed={seed} nPasses={nPasses} sr={sr} reclaim={reclaim}
                structure={structure} rangeT={rangeT} current={stacking} es={es} />
            </PanelBoundary>
          )}

          {view === 'segprofile' && (
            <PanelBoundary name="segprofile" es={es}>
              <SegregationProfile run={run} es={es} />
            </PanelBoundary>
          )}

          {view === 'regime' && (
            <PanelBoundary name="regime" es={es}>
              <div className="st-plot">
                <div className="st-plot-t">{es ? 'Régimen de estratificación' : 'Stratification regime'}</div>
                <p className="st-note">
                  {reposeCoarse > repose + 0.4
                    ? (es
                      ? `El grueso reposa ${(reposeCoarse - repose).toFixed(1)} grados mas empinado que el fino. Esa es exactamente la condicion de Makse et al. (1997) bajo la cual una mezcla bidispersa vertida se ESTRATIFICA en capas alternadas en vez de solo segregarse.`
                      : `The coarse species stands ${(reposeCoarse - repose).toFixed(1)} degrees steeper than the fine one. That is exactly the Makse et al. (1997) condition under which a poured bidisperse mixture STRATIFIES into alternating layers rather than merely segregating.`)
                    : (es
                      ? 'Los angulos de reposo son iguales o el fino es el más empinado. Fuera de la condición de Makse: la mezcla segrega (grueso al pie) pero no forma capas alternadas.'
                      : 'The repose angles are equal, or the fine species is the steeper one. Outside the Makse condition: the mixture segregates (coarse to the toe) but does not form alternating layers.')}
                </p>
                <Kpis items={[
                  { v: `${(reposeCoarse - repose).toFixed(1)} deg`, l: es ? 'diferencia de reposo' : 'repose difference' },
                  { v: m.segregationIndex.toFixed(4), l: es ? 'índice de segregación' : 'segregation index' },
                  { v: sr.toFixed(1), l: 'Sr' },
                ]} />
                <p className="st-note st-muted">
                  {es
                    ? 'Abre el corte interno con el escalar de origen para ver la alternancia. El índice de segregación se satura pasado Sr de aproximadamente uno: la capa fluyente ya está completamente separada y subir Sr no deja nada más por separar.'
                    : 'Open the cutaway with the source-event scalar to see the alternation. The segregation index saturates past Sr of about one: the flowing layer is already fully separated and raising Sr leaves nothing more to separate.'}
                </p>
              </div>
            </PanelBoundary>
          )}

          {view === 'streams' && (
            <PanelBoundary name="streams" es={es}>
              <StreamsView run={run} es={es} />
            </PanelBoundary>
          )}

          {view === 'vrr' && (
            <PanelBoundary name="vrr" es={es}>
              <div className="st-plot">
                <div className="st-plot-h">
                  <span className="st-plot-t">
                    {es ? 'Razón de reducción de varianza' : 'Variance reduction ratio'}
                  </span>
                  <span className="st-plot-n">
                    {es ? 'una semilla, contra las anclas publicadas' : 'single seed, against the published anchors'}
                  </span>
                </div>
                <VrrGauge m={m} es={es} />
                <p className="st-note">
                  {es
                    ? `Varianza de entrada ${m.varIn.toExponential(3)}, de salida ${m.varOut.toExponential(3)}. Media de entrada ${m.meanIn.toFixed(4)} %Cu, de salida ${m.meanOut.toFixed(4)} %Cu.`
                    : `Input variance ${m.varIn.toExponential(3)}, output ${m.varOut.toExponential(3)}. Input mean ${m.meanIn.toFixed(4)} %Cu, output ${m.meanOut.toFixed(4)} %Cu.`}
                </p>
                <Callout variant="honest" title={es ? 'Lo que este número no dice' : 'What this number does not say'}>
                  {es
                    ? 'Una sola semilla. La banda de credibilidad multi-semilla se calcula fuera de línea (31 semillas) y se muestra en Benchmark: producirla en vivo en cada movimiento del control sería una bomba de computo.'
                    : 'One seed. The multi-seed credible band is computed offline over 31 seeds and shown on Benchmark: producing it live on every slider move would be a compute bomb.'}
                </Callout>
              </div>
            </PanelBoundary>
          )}

          {view === 'variogram' && (
            <PanelBoundary name="variogram" es={es}>
              <div className="st-grid2">
                <div className="st-plot">
                  <div className="st-plot-h">
                    <span className="st-plot-t">{es ? 'Variograma de entrada' : 'Input variogram'}</span>
                    <span className="st-plot-n">
                      {es ? 'alcance' : 'range'} {(vin.model.range / 1000).toFixed(1)} kt
                    </span>
                  </div>
                  <UPlotChart x={vin.lagT} height={190}
                    series={[{ label: es ? 'gamma medido' : 'measured gamma', values: vin.gamma }]}
                    markers={[{ x: vin.model.range, label: es ? 'alcance' : 'range' },
                      { y: vin.model.sill, label: 'sill' }]}
                    xLabel={es ? 'Separación' : 'Lag'} xUnit="t"
                    yLabel="gamma" unit="(%Cu)^2"
                    ariaSummary={es ? 'Tabla del variograma de entrada' : 'Input variogram data table'} />
                </div>
                <div className="st-plot">
                  <div className="st-plot-h">
                    <span className="st-plot-t">{es ? 'Variograma recuperado' : 'Reclaimed variogram'}</span>
                    <span className="st-plot-n">
                      {es ? 'alcance' : 'range'} {(vout.model.range / 1000).toFixed(1)} kt
                    </span>
                  </div>
                  <UPlotChart x={vout.lagT} height={190}
                    series={[{ label: es ? 'gamma medido' : 'measured gamma', values: vout.gamma }]}
                    markers={[{ y: vout.model.sill, label: 'sill' }]}
                    xLabel={es ? 'Separación' : 'Lag'} xUnit="t"
                    yLabel="gamma" unit="(%Cu)^2"
                    ariaSummary={es ? 'Tabla del variograma recuperado' : 'Reclaimed variogram data table'} />
                </div>
              </div>
              <p className="st-note">
                {es
                  ? 'La separación esta en toneladas acumuladas, no en tiempo: la heterogeneidad de un lote unidimensional es función de la masa a lo largo del flujo, y usar el reloj haría que el variograma dependiera de lo ocupado que estuvo el turno.'
                  : 'The lag is in cumulative tonnes, not clock time: the heterogeneity of a one-dimensional lot is a function of mass along the stream, and using the clock would make the variogram depend on how busy the shift was.'}
              </p>
            </PanelBoundary>
          )}

          {view === 'ideal' && (
            <PanelBoundary name="ideal" es={es}>
              <IdealCurve run={run} nPasses={nPasses} es={es} />
            </PanelBoundary>
          )}

          {view === 'sankey' && (
            <PanelBoundary name="sankey" es={es}>
              <div className="st-plot">
                <div className="st-plot-h">
                  <span className="st-plot-t">
                    {es ? 'De los volteos a los cortes' : 'From dumps to reclaim cuts'}
                  </span>
                  <span className="st-plot-n">
                    {pickedCut != null
                      ? (es ? `corte #${pickedCut}` : `cut #${pickedCut}`)
                      : (es ? 'primeros 8 cortes' : 'first 8 cuts')}
                  </span>
                </div>
                <ProvenanceSankey cuts={run.cuts} selected={pickedCut} onSelect={setPickedCut} es={es} />
                {pickedCut != null && (
                  <button type="button" className="st-btn" onClick={() => setPickedCut(null)}>
                    {es ? 'Ver todos' : 'Show all'}
                  </button>
                )}
              </div>
            </PanelBoundary>
          )}

          {view === 'ledger' && (
            <PanelBoundary name="ledger" es={es}>
              <div className="st-grid2">
                <div className="st-plot">
                  <div className="st-plot-t">{es ? 'Cortes' : 'Cuts'}</div>
                  <div className="st-tablewrap">
                    <table className="st-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>t</th>
                          <th>%Cu</th>
                          <th>{es ? 'capas' : 'layers'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.cuts.map((c) => (
                          <tr key={c.cutId} className={pickedCut === c.cutId ? 'on' : ''}
                            onClick={() => setPickedCut(c.cutId)}>
                            <td>#{c.cutId}</td>
                            <td className="st-mono">{c.tonnes.toFixed(0)}</td>
                            <td className="st-mono">{c.gradeCuPct.toFixed(3)}</td>
                            <td className="st-mono">{c.nLayers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="st-plot">
                  <div className="st-plot-t">
                    {es ? 'Procedencia del corte' : 'Provenance of the cut'}
                  </div>
                  <ProvenanceLedger cut={cut} es={es} />
                </div>
              </div>
            </PanelBoundary>
          )}

          {view === 'rtd' && (
            <PanelBoundary name="rtd" es={es}>
              <div className="st-plot">
                <div className="st-plot-h">
                  <span className="st-plot-t">
                    {es ? 'Distribución de tiempo de residencia' : 'Residence-time distribution'}
                  </span>
                  <span className="st-plot-n">{rt.character}</span>
                </div>
                <UPlotChart x={rt.edges.map((e) => e / 3600)} height={200}
                  series={[
                    { label: es ? 'masa por bin' : 'mass per bin', values: rt.mass, fill: true },
                    { label: es ? 'acumulada' : 'cumulative', values: rt.cumulative, dash: true },
                  ]}
                  markers={[
                    { x: rt.fifoMeanS / 3600, label: 'FIFO' },
                    { x: rt.lifoMeanS / 3600, label: 'LIFO' },
                    { x: rt.meanS / 3600, label: es ? 'medido' : 'measured', colour: 'var(--color-accent)' },
                  ]}
                  xLabel={es ? 'Residencia' : 'Residence'} xUnit="h"
                  yLabel={es ? 'Fracción de masa' : 'Mass fraction'}
                  ariaSummary={es ? 'Tabla de la distribución de residencia' : 'Residence-time data table'} />
                <Kpis items={[
                  { v: `${(rt.meanS / 3600).toFixed(2)} h`, l: es ? 'residencia media' : 'mean residence' },
                  { v: `${(rt.fifoMeanS / 3600).toFixed(2)} h`, l: 'FIFO' },
                  { v: `${(rt.lifoMeanS / 3600).toFixed(2)} h`, l: 'LIFO' },
                  { v: rt.dimensionlessVariance.toFixed(3), l: es ? 'varianza adimensional' : 'dimensionless variance' },
                ]} />
                <p className="st-note st-muted">
                  {es
                    ? 'Las referencias FIFO y LIFO se calculan para LA misma secuencia de eventos, de modo que el caracter real de la pila queda ubicado entre dos curvas que pudo haber tenido, en vez de afirmarse que es una de ellas. La etiqueta es una banda descriptiva: no hay un umbral publicado que haga que 0,6 sea "mayoritariamente FIFO".'
                    : 'The FIFO and LIFO references are computed for the same event sequence, so the pile’s actual character is placed between two curves it could have had rather than asserted to be one of them. The label is a descriptive band: there is no published threshold that makes 0.6 "mostly first-in-first-out".'}
                </p>
              </div>
            </PanelBoundary>
          )}

          {view === 'mass' && (
            <PanelBoundary name="mass" es={es}>
              <MassBalance run={run} es={es} />
            </PanelBoundary>
          )}

          {view === 'honesty' && (
            <PanelBoundary name="honesty" es={es}>
              <Honesty run={run} es={es} />
            </PanelBoundary>
          )}

          {view === 'decision' && (
            <PanelBoundary name="decision" es={es}>
              <Decision run={run} target={target} stacking={stacking} reclaim={reclaim}
                nPasses={nPasses} es={es} />
            </PanelBoundary>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── the composite views that need their own computation ──────────────────────────────────────── */

function StackingCompare({ base, seed, nPasses, sr, reclaim, structure, rangeT, current, es }: {
  base: typeof CASES[number]; seed: number; nPasses: number; sr: number;
  reclaim: ReclaimMethod; structure: StreamStructure; rangeT: number;
  current: StackingMethod; es?: boolean;
}) {
  const rows = useMemo(() => STACKING_METHODS.map((s) => {
    const r = simulate(
      configFor(base, seed, { stacking: s, reclaim, nPasses, sr }),
      dumpsFor(base, seed, { structure, rangeT }),
    );
    return { s, vrr: r.metrics.vrr, n: r.metrics.nLayersMean, eff: r.metrics.efficiency,
      seg: r.metrics.segregationIndex };
  }).sort((a, b) => a.vrr - b.vrr), [base, seed, nPasses, sr, reclaim, structure, rangeT]);

  return (
    <div className="st-plot">
      <div className="st-plot-h">
        <span className="st-plot-t">
          {es ? 'Los cinco metodos sobre el mismo flujo' : 'All five methods on the same stream'}
        </span>
        <span className="st-plot-n">
          {es ? 'ordenados por VRR, menor es mejor' : 'sorted by VRR, lower is better'}
        </span>
      </div>
      <table className="st-table">
        <thead>
          <tr>
            <th>{es ? 'método' : 'method'}</th>
            <th>VRR</th>
            <th>{es ? 'capas/corte' : 'layers/cut'}</th>
            <th>{es ? 'de lo ideal' : 'of ideal'}</th>
            <th>{es ? 'segregación' : 'segregation'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s} className={r.s === current ? 'on' : ''}>
              <td>{es ? STACKING_LABELS[r.s].es : STACKING_LABELS[r.s].en}</td>
              <td className="st-mono">{r.vrr.toFixed(4)}</td>
              <td className="st-mono">{r.n.toFixed(1)}</td>
              <td className="st-mono">{(r.eff * 100).toFixed(0)} %</td>
              <td className="st-mono">{r.seg.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Callout variant="honest" title={es ? 'Chevron gana en una pila lineal' : 'Chevron wins on a linear pile'}>
        {es
          ? 'La literatura compara chevcon contra conos concéntricos en un patio circular, donde chevron no es una opción: el apilador tiene que recorrer el anillo. En una cama lineal cada capa de chevron abarca toda la longitud, así que un corte en cualquier estación muestrea capas de toda la construcción. Chevcon cruza mas capas por corte y aun así mezcla peor, porque sus capas vienen de una ventana temporal y están correlacionadas entre si. El conteo de capas por si solo no es la respuesta.'
          : 'The literature compares chevcon against cone shell on a circular yard, where chevron is not an option: the stacker has to travel the ring. On a linear bed every chevron layer spans the whole length, so a cut at any station samples layers from across the entire build. Chevcon crosses more layers per cut and still blends worse, because its layers come from a travelling window and are correlated with one another. Layer count alone is not the answer.'}
      </Callout>
    </div>
  );
}

function SegregationProfile({ run, es }: { run: ReturnType<typeof simulate>; es?: boolean }) {
  const { pad } = run;
  const prof = useMemo(() => {
    // bin the occupied pad by height, apex to toe, and average the coarse fraction and grade in each
    const occ: Array<[number, number]> = [];
    for (let c = 0; c < pad.nx * pad.ny; c++) if (run.heightFinal[c] > 1e-6) occ.push([run.heightFinal[c], c]);
    occ.sort((a, b) => b[0] - a[0]);
    const nb = 16;
    const per = Math.max(1, Math.floor(occ.length / nb));
    const h: number[] = []; const cf: number[] = []; const cu: number[] = [];
    for (let b = 0; b < nb; b++) {
      const slice = occ.slice(b * per, (b + 1) * per);
      if (slice.length === 0) break;
      h.push(slice.reduce((s, [v]) => s + v, 0) / slice.length);
      cf.push(slice.reduce((s, [, c]) => s + run.coarseFinal[c], 0) / slice.length);
      cu.push(slice.reduce((s, [, c]) => s + run.gradeFinal[c], 0) / slice.length);
    }
    return { h, cf, cu };
  }, [run, pad]);

  return (
    <div className="st-plot">
      <div className="st-plot-h">
        <span className="st-plot-t">{es ? 'Perfil apice a pie' : 'Apex-to-toe profile'}</span>
        <span className="st-plot-n">
          {es ? 'índice de segregación' : 'segregation index'} {run.metrics.segregationIndex.toFixed(4)}
        </span>
      </div>
      <UPlotChart x={prof.h} height={210}
        series={[
          { label: es ? 'fracción gruesa' : 'coarse fraction', values: prof.cf },
          { label: es ? 'ley de columna, %Cu' : 'column grade, %Cu', values: prof.cu },
        ]}
        markers={[{ y: prof.cf.length ? prof.cf.reduce((a, b) => a + b, 0) / prof.cf.length : 0,
          label: es ? 'media' : 'mean' }]}
        xLabel={es ? 'Altura de columna' : 'Column height'} xUnit="m"
        yLabel={es ? 'Valor' : 'Value'}
        ariaSummary={es ? 'Tabla del perfil de segregación' : 'Segregation profile data table'} />
      <p className="st-note">
        {es
          ? 'El grueso al pie es una salida del solucionador de Gray y Thornton, no una regla escrita en el codigo: los finos drenan a la base de la capa fluyente y se depositan primero, de modo que lo que llega más lejos es grueso.'
          : 'Coarse at the toe is an output of the Gray and Thornton solver, not a rule written into the code: fines drain to the base of the flowing layer and are deposited first, so what travels furthest is coarse.'}
      </p>
    </div>
  );
}

function StreamsView({ run, es }: { run: ReturnType<typeof simulate>; es?: boolean }) {
  const inCum: number[] = [];
  let acc = 0;
  const inVals: number[] = [];
  for (const d of run.dumps) { acc += d.tonnes; inCum.push(acc / 1000); inVals.push(d.gradeCuPct); }
  const outCum: number[] = [];
  let acc2 = 0;
  const outVals: number[] = [];
  for (const c of run.cuts) { acc2 += c.tonnes; outCum.push(acc2 / 1000); outVals.push(c.gradeCuPct); }
  const m = run.metrics;
  const sdIn = Math.sqrt(m.varIn);
  const sdOut = Math.sqrt(m.varOut);

  return (
    <div className="st-stack">
      <div className="st-plot">
        <div className="st-plot-h">
          <span className="st-plot-t">{es ? 'Flujo de entrada' : 'Input stream'}</span>
          <span className="st-plot-n">
            {es ? 'media' : 'mean'} {m.meanIn.toFixed(4)} · sd {sdIn.toFixed(4)}
          </span>
        </div>
        <UPlotChart x={inCum} height={175}
          series={[{ label: es ? 'ley por volteo' : 'grade per dump', values: inVals }]}
          markers={[{ y: m.meanIn, label: es ? 'media' : 'mean' },
            { y: m.meanIn + 2 * sdIn, label: '+2 sd' },
            { y: m.meanIn - 2 * sdIn, label: '-2 sd' }]}
          xLabel={es ? 'Tonelaje acumulado' : 'Cumulative tonnage'} xUnit="kt"
          yLabel={es ? 'Ley' : 'Grade'} unit="%Cu"
          ariaSummary={es ? 'Tabla del flujo de entrada' : 'Input stream data table'} />
      </div>
      <div className="st-plot">
        <div className="st-plot-h">
          <span className="st-plot-t">{es ? 'Flujo recuperado' : 'Reclaimed stream'}</span>
          <span className="st-plot-n">
            {es ? 'media' : 'mean'} {m.meanOut.toFixed(4)} · sd {sdOut.toFixed(4)}
          </span>
        </div>
        <UPlotChart x={outCum} height={175}
          series={[{ label: es ? 'ley por corte' : 'grade per cut', values: outVals, colour: 'var(--color-good, #3fb950)' }]}
          markers={[{ y: m.meanOut, label: es ? 'media' : 'mean' },
            { y: m.meanIn + 2 * sdIn, label: es ? 'banda de entrada' : 'input band' },
            { y: m.meanIn - 2 * sdIn, label: '' }]}
          xLabel={es ? 'Tonelaje acumulado' : 'Cumulative tonnage'} xUnit="kt"
          yLabel={es ? 'Ley' : 'Grade'} unit="%Cu"
          ariaSummary={es ? 'Tabla del flujo recuperado' : 'Reclaimed stream data table'} />
      </div>
      <p className="st-note">
        {es
          ? 'Ambos flujos se grafican sobre tonelaje acumulado, no sobre el reloj. Kumral exige que las dos varianzas se calculen sobre la misma base, y los cortes son un orden de magnitud mayores que los volteos que los alimentaron.'
          : 'Both streams are plotted against cumulative tonnage, not the clock. Kumral requires both variances on the same base, and cuts are an order of magnitude larger than the dumps that fed them.'}
      </p>
    </div>
  );
}

function IdealCurve({ run, nPasses, es }: {
  run: ReturnType<typeof simulate>; nPasses: number; es?: boolean;
}) {
  const m = run.metrics;
  const ns = Array.from({ length: 40 }, (_, i) => 2 + i * 4);
  const ideal = ns.map((n) => 1 / n);
  const real = ns.map((n) => (n >= 200 && n <= 600 ? 1 / (6.2 * 6.2) : NaN));
  return (
    <div className="st-plot">
      <div className="st-plot-h">
        <span className="st-plot-t">{es ? 'Logrado contra la cota ideal' : 'Achieved against the ideal bound'}</span>
        <span className="st-plot-n">
          {es ? 'eficiencia' : 'efficiency'} {(m.efficiency * 100).toFixed(0)} %
        </span>
      </div>
      <UPlotChart x={ns} height={210}
        series={[
          { label: es ? 'cota 1/N (capas independientes)' : '1/N bound (independent layers)', values: ideal, dash: true },
          { label: es ? 'cama real publicada, E 5 a 7,5' : 'a real published bed, E 5 to 7.5', values: real, colour: 'var(--color-warn, #d29922)' },
        ]}
        markers={[
          { x: m.nLayersMean, label: es ? 'N medido' : 'measured N', colour: 'var(--color-accent)' },
          { y: m.vrr, label: es ? 'VRR logrado' : 'achieved VRR', colour: 'var(--color-accent)' },
        ]}
        xLabel={es ? 'Capas cruzadas por corte, N' : 'Layers crossed per cut, N'}
        yLabel="VRR"
        ariaSummary={es ? 'Tabla de la cota ideal' : 'Ideal-bound data table'} />
      <Kpis items={[
        { v: m.vrr.toFixed(4), l: es ? 'VRR logrado' : 'achieved VRR' },
        { v: m.vrrIdeal.toFixed(4), l: es ? 'cota 1/N' : '1/N bound' },
        { v: `${(m.efficiency * 100).toFixed(0)} %`, l: es ? 'de lo alcanzable' : 'of the attainable' },
        { v: `${nPasses}`, l: es ? 'pasadas' : 'passes' },
      ]} />
      <Callout variant="honest" title={es ? 'Por qué la cota nunca se alcanza' : 'Why the bound is never reached'}>
        {es
          ? 'Si las N capas que cruza un corte fueran extracciones independientes, la media del corte tendría varianza var_in/N, así que lo ideal es 1/N y el efecto de mezcla ideal es raiz de N. Una cama real alcanza un efecto de 5 a 7,5 con 200 a 600 capas, donde lo ideal sería 14,1 a 24,5: recupera aproximadamente entre un cuarto y un tercio del beneficio. Las capas sucesivas están autocorrelacionadas, un corte no muestrea todas por igual y la segregación sesga lo que cada corte contiene. Un simulador que reportara la curva 1/N como resultado inflaria el beneficio en un orden de magnitud.'
          : 'If the N layers a cut crosses were independent draws, the cut mean would have variance var_in/N, so the ideal is 1/N and the ideal mixing effect is the square root of N. A real bed reaches an effect of 5 to 7.5 over 200 to 600 layers, where the ideal would be 14.1 to 24.5: it recovers roughly a quarter to a third of the benefit. Successive layers are autocorrelated, a cut does not sample every layer equally, and segregation biases what each cut contains. A simulator reporting the 1/N curve as its result would inflate the benefit by an order of magnitude.'}
      </Callout>
    </div>
  );
}

function MassBalance({ run, es }: { run: ReturnType<typeof simulate>; es?: boolean }) {
  const x: number[] = [];
  const dep: number[] = [];
  const rec: number[] = [];
  const inp: number[] = [];
  const resid: number[] = [];
  let d = 0;
  let ci = 0;
  let r = 0;
  for (const dump of run.dumps) {
    d += dump.tonnes;
    while (ci < run.cuts.length && run.cuts[ci].tS <= dump.tS) { r += run.cuts[ci].tonnes; ci++; }
    x.push(dump.tS / 3600);
    dep.push(d / 1000);
    rec.push(r / 1000);
    inp.push((d - r) / 1000);
    resid.push(0);
  }
  return (
    <div className="st-plot">
      <div className="st-plot-h">
        <span className="st-plot-t">{es ? 'Inventario y balance de masa' : 'Inventory and mass balance'}</span>
        <span className="st-plot-n">
          {es ? 'residual' : 'residual'} {run.metrics.massResidualT.toExponential(2)} t
        </span>
      </div>
      <UPlotChart x={x} height={220}
        series={[
          { label: es ? 'depositado' : 'deposited', values: dep },
          { label: es ? 'en pila' : 'in pile', values: inp, fill: true },
          { label: es ? 'recuperado' : 'reclaimed', values: rec },
          { label: es ? 'residual de conservación' : 'conservation residual', values: resid, dash: true },
        ]}
        xLabel={es ? 'Tiempo' : 'Time'} xUnit="h"
        yLabel={es ? 'Tonelaje' : 'Tonnage'} unit="kt"
        ariaSummary={es ? 'Tabla del balance de masa' : 'Mass balance data table'} />
      <p className="st-note">
        {es
          ? `Depositado menos (en pila mas recuperado) = ${run.metrics.massResidualT.toExponential(3)} t. `
          : `Deposited minus (in pile plus reclaimed) = ${run.metrics.massResidualT.toExponential(3)} t. `}
        <span className={Math.abs(run.metrics.massResidualT) < 1e-6 ? 'st-pass' : 'st-fail'}>
          {Math.abs(run.metrics.massResidualT) < 1e-6
            ? (es ? 'conservado a precisión de máquina' : 'conserved to machine precision')
            : (es ? 'FALLO' : 'FAILED')}
        </span>
        {'. '}
        {es
          ? 'El residual se muestra en pantalla en vez de afirmarse en prosa, porque un solucionador que perdiera una fracción de un por ciento por volteo seguiria dibujando un cono convincente.'
          : 'The residual is shown on screen rather than asserted in prose, because a solver losing a fraction of a percent per dump would still draw a convincing cone.'}
      </p>
    </div>
  );
}

function Honesty({ run, es }: { run: ReturnType<typeof simulate>; es?: boolean }) {
  const m = run.metrics;
  let worstFrac = 0;
  for (const c of run.cuts) {
    let s = 0;
    for (const [, f] of c.sources) s += f;
    worstFrac = Math.max(worstFrac, Math.abs(s - 1));
  }
  const checks = [
    { ok: Math.abs(m.massResidualT) < 1e-6, v: m.massResidualT.toExponential(2),
      en: 'Deposited equals in-pile plus reclaimed', es: 'Depositado igual a en-pila más recuperado' },
    { ok: worstFrac < 1e-9, v: worstFrac.toExponential(2),
      en: 'Provenance fractions sum to one on every cut', es: 'Las fracciones de procedencia suman uno en cada corte' },
    { ok: run.steepestSlopeDeg <= run.pad.reposeDeg + 0.5, v: `${run.steepestSlopeDeg.toFixed(2)} deg`,
      en: 'No slope stands steeper than the imposed angle of repose', es: 'Ninguna pendiente supera el ángulo de reposo impuesto' },
    { ok: run.cuts.every((c) => c.tonnes > 0 && Number.isFinite(c.gradeCuPct)), v: `${run.cuts.length}`,
      en: 'No cut has zero, negative or non-finite tonnage or grade', es: 'Ningun corte tiene tonelaje o ley nula, negativa o no finita' },
  ];
  return (
    <div className="st-plot">
      <div className="st-plot-t">{es ? 'Invariantes, medidos en vivo' : 'Invariants, measured live'}</div>
      <table className="st-table">
        <thead>
          <tr><th>{es ? 'invariante' : 'invariant'}</th><th>{es ? 'medido' : 'measured'}</th><th /></tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.en}>
              <td style={{ whiteSpace: 'normal' }}>{es ? c.es : c.en}</td>
              <td className="st-mono">{c.v}</td>
              <td className={c.ok ? 'st-pass' : 'st-fail'}>{c.ok ? 'PASS' : 'FAIL'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="st-note">
        {es
          ? 'Estas son las identidades que atrapan la clase de error que produce una imagen plausible con numeros equivocados, la única clase que todavia importa cuando el codigo ya corre. Se recalculan en el navegador a partir de los eventos, no se leen de un artefacto.'
          : 'These are the identities that catch the class of bug producing a plausible picture with wrong numbers, the only class that still matters once the code runs. They are recomputed in the browser from the events, not read from an artifact.'}
      </p>
      <Callout variant="honest" title={es ? 'Límites del modelo' : 'What the model does not do'}>
        {es
          ? 'Las interfaces entre lotes son más nitidas que en una pila real: el remanejo y la mezcla por avalancha no están modelados. El ángulo de reposo es impuesto desde rangos de manual, no emergente. La segregación es un modelo continuo publicado, no verdad a escala de particula. Los datos son sinteticos salvo cuando se selecciona el carril real.'
          : 'Lot interfaces are sharper than a real pile’s: re-handling and avalanche mixing are not modelled. The angle of repose is imposed from handbook ranges, not emergent. The segregation is a published continuum model, not particle-scale truth. The data is synthetic except when the real lane is selected.'}
      </Callout>
    </div>
  );
}

function Decision({ run, target, stacking, reclaim, nPasses, es }: {
  run: ReturnType<typeof simulate>; target: number;
  stacking: StackingMethod; reclaim: ReclaimMethod; nPasses: number; es?: boolean;
}) {
  const m = run.metrics;
  const meets = m.vrr <= target;
  const recs: string[] = [];
  if (!meets && stacking === 'coneshell') {
    recs.push(es
      ? 'Cambia de conos concéntricos a chevcon o chevron. Bond, Coursaux y Worthington (2000), confirmados por Loubser y de Korte (2015), reportan los conos como inadecuados cuando la homogeneización importa.'
      : 'Move off cone shell to chevcon or chevron. Bond, Coursaux and Worthington (2000), confirmed by Loubser and de Korte (2015), report cone shell as unsuitable when homogenization matters.');
  }
  if (!meets && reclaim !== 'fullface') {
    recs.push(es
      ? `El recuperador actual alcanza el ${(100 * (reclaim === 'bucketwheel' ? 0.55 : reclaim === 'end' ? 0.3 : 0.12)).toFixed(0)} % de la columna. Un recuperador de cara completa cruza TODAS las capas de la estacion, que es la razon por la que la mezcla en cama funciona.`
      : `The current machine reaches ${(100 * (reclaim === 'bucketwheel' ? 0.55 : reclaim === 'end' ? 0.3 : 0.12)).toFixed(0)} % of the column. A full-face reclaimer crosses EVERY layer at the station, which is the entire reason bed blending works.`);
  }
  if (!meets && m.efficiency > 0.7) {
    recs.push(es
      ? `La eficiencia contra la cota ya es ${(m.efficiency * 100).toFixed(0)} %, asi que el metodo no es el problema: hacen falta mas capas. Con ${nPasses} pasadas la cota es ${m.vrrIdeal.toFixed(3)}; para llegar a ${target.toFixed(2)} se necesitan del orden de ${Math.ceil(1 / (target * Math.max(0.05, m.efficiency)))} capas por corte.`
      : `Efficiency against the bound is already ${(m.efficiency * 100).toFixed(0)} %, so the method is not the problem: more layers are. At ${nPasses} passes the bound is ${m.vrrIdeal.toFixed(3)}; reaching ${target.toFixed(2)} needs of the order of ${Math.ceil(1 / (target * Math.max(0.05, m.efficiency)))} layers per cut.`);
  }
  if (Math.abs(m.segregationIndex) > 0.1) {
    recs.push(es
      ? `El indice de segregacion es ${m.segregationIndex.toFixed(3)}: donde se toma el corte importa. Un corte de cara completa promedia el sesgo pie-apice; uno somero no.`
      : `The segregation index is ${m.segregationIndex.toFixed(3)}: where the cut is taken matters. A full-face cut averages the toe-to-apex bias; a shallow one does not.`);
  }
  if (recs.length === 0) {
    recs.push(es
      ? 'La configuración cumple el objetivo. Verificalo con la banda multi-semilla en Benchmark antes de tratarlo como un resultado.'
      : 'The configuration meets the target. Check it against the multi-seed band on Benchmark before treating it as a result.');
  }

  return (
    <div className="st-plot">
      <div className="st-plot-h">
        <span className="st-plot-t">{es ? 'Diagnóstico y recomendación' : 'Diagnosis and recommendation'}</span>
        <span className={meets ? 'st-pass' : 'st-fail'}>
          {meets ? (es ? 'CUMPLE' : 'MEETS TARGET') : (es ? 'NO CUMPLE' : 'BELOW TARGET')}
        </span>
      </div>
      <Kpis items={[
        { v: m.vrr.toFixed(3), l: 'VRR' },
        { v: target.toFixed(2), l: es ? 'objetivo' : 'target' },
        { v: `${(m.efficiency * 100).toFixed(0)} %`, l: es ? 'de lo ideal' : 'of the ideal' },
        { v: m.nLayersMean.toFixed(1), l: es ? 'capas por corte' : 'layers per cut' },
        { v: m.segregationIndex.toFixed(3), l: es ? 'segregación' : 'segregation' },
      ]} />
      <ul className="st-note">
        {recs.map((r) => <li key={r.slice(0, 40)} style={{ marginBottom: '0.4rem' }}>{r}</li>)}
      </ul>
      <Callout variant="honest" title={es ? 'Alcance' : 'Scope'}>
        {es
          ? 'Cada recomendación esta atada a un umbral cuantitativo y a una regla de diseño citada. Este producto no emite consignas de planta, no resuelve el programa lineal de mezcla (eso es BlendLP) y no hace contabilidad metalurgica.'
          : 'Every recommendation is tied to a quantitative threshold and a cited design rule. This product emits no plant setpoint, does not solve the blending linear program (that is BlendLP), and does no metallurgical accounting.'}
      </Callout>
    </div>
  );
}
