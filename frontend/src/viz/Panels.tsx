import { useMemo, useState } from 'react';
import { PUBLISHED_ANCHORS, VRR_FORMULA_LABEL, VRR_FORMULA_LABEL_ES } from '../engine';
import type { BlendMetrics, Lot, PadSpec, ReclaimCut } from '../engine';
import { eventColour, rgbCss } from './colormap';

/**
 * The variance-reduction gauge: the achieved ratio, its multi-seed band, the ideal bound, and the
 * published anchors, all on ONE logarithmic axis.
 *
 * Reporting the achieved ratio alone invites the reader to compare it against zero. Against the
 * `1/N` bound it shows how much of the attainable benefit was actually realised, and against the
 * anchors it shows whether the configuration is in the same league as a real bed. The formula is
 * printed under the number because the VRR convention is reciprocal-ambiguous in the literature.
 */
export function VrrGauge({ m, band, es }: {
  m: BlendMetrics; band?: [number, number]; es?: boolean;
}) {
  // log axis from 0.005 to 1.5: the anchors span two orders of magnitude and a linear axis would put
  // every good result in the first two percent of the track
  const lo = Math.log10(0.005);
  const hi = Math.log10(1.5);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((Math.log10(Math.min(1.5, Math.max(0.005, v))) - lo) / (hi - lo)) * 100))}%`;
  const finite = Number.isFinite(m.vrr);

  return (
    <div>
      <div className="st-gauge" aria-hidden="true">
        <div className="st-gauge-track" />
        {PUBLISHED_ANCHORS.map((a) => (
          <div key={a.src + a.vrr} className="st-gauge-mark" style={{ left: pos(a.vrr) }}>
            <span>{a.vrr.toFixed(2)}</span>
          </div>
        ))}
        {band && Number.isFinite(band[0]) && (
          <div className="st-gauge-band"
            style={{ left: pos(band[0]), width: `calc(${pos(band[1])} - ${pos(band[0])})` }} />
        )}
        {Number.isFinite(m.vrrIdeal) && (
          <div className="st-gauge-ideal" style={{ left: pos(m.vrrIdeal) }}>
            <span>{es ? `ideal 1/N ${m.vrrIdeal.toFixed(3)}` : `1/N ideal ${m.vrrIdeal.toFixed(3)}`}</span>
          </div>
        )}
        {finite && (
          <div className="st-gauge-pin" style={{ left: pos(m.vrr) }}>
            <span>{m.vrr.toFixed(3)}</span>
          </div>
        )}
      </div>
      <div className="st-legend" style={{ marginTop: '1.1rem' }}>
        {PUBLISHED_ANCHORS.map((a) => (
          <span key={a.src + a.vrr} className="st-muted">
            {a.vrr.toFixed(2)} {es ? a.es : a.en}
          </span>
        ))}
      </div>
      <p className="st-formula">{es ? VRR_FORMULA_LABEL_ES : VRR_FORMULA_LABEL}</p>
    </div>
  );
}

/**
 * The provenance Sankey: deposition events on the left, reclaim cuts on the right, ribbon width the
 * tonnage fraction.
 *
 * Hand-authored SVG rather than a layout library: the graph is bipartite with at most a few dozen
 * nodes, so the layout is two columns and a cubic between them, and an SVG gives hover, focus and a
 * screen-reader path for free.
 */
export function ProvenanceSankey({ cuts, selected, onSelect, es }: {
  cuts: ReclaimCut[]; selected: number | null; onSelect: (id: number) => void; es?: boolean;
}) {
  const shown = useMemo(() => {
    if (selected != null) return cuts.filter((c) => c.cutId === selected);
    return cuts.slice(0, 8);
  }, [cuts, selected]);

  const events = useMemo(() => {
    const acc = new Map<number, number>();
    for (const c of shown) {
      for (const [e, f] of c.sources) acc.set(e, (acc.get(e) ?? 0) + f * c.tonnes);
    }
    return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 26).sort((a, b) => a[0] - b[0]);
  }, [shown]);

  if (shown.length === 0 || events.length === 0) {
    return <p className="st-note st-muted">{es ? 'Sin cortes todavia.' : 'No cuts yet.'}</p>;
  }

  const H = Math.max(220, Math.max(events.length, shown.length) * 16);
  const W = 560;
  const evTotal = events.reduce((s, [, t]) => s + t, 0) || 1;
  const cutTotal = shown.reduce((s, c) => s + c.tonnes, 0) || 1;

  let ey = 6;
  const evPos = new Map<number, { y: number; h: number }>();
  for (const [id, t] of events) {
    const h = Math.max(2, ((t / evTotal) * (H - 12)));
    evPos.set(id, { y: ey, h });
    ey += h;
  }
  let cy = 6;
  const cutPos = new Map<number, { y: number; h: number }>();
  for (const c of shown) {
    const h = Math.max(3, (c.tonnes / cutTotal) * (H - 12));
    cutPos.set(c.cutId, { y: cy, h });
    cy += h;
  }

  const ribbons: Array<{ key: string; d: string; w: number; colour: string; title: string }> = [];
  const evUsed = new Map<number, number>();
  for (const c of shown) {
    const cp = cutPos.get(c.cutId)!;
    let off = 0;
    for (const [e, f] of [...c.sources].sort((a, b) => b[1] - a[1])) {
      const ep = evPos.get(e);
      if (!ep) continue;
      const w = Math.max(1, f * cp.h);
      const used = evUsed.get(e) ?? 0;
      const y0 = ep.y + used + Math.min(w, ep.h) / 2;
      evUsed.set(e, used + Math.min(w, ep.h - used));
      const y1 = cp.y + off + w / 2;
      off += w;
      ribbons.push({
        key: `${c.cutId}-${e}`,
        d: `M 96 ${y0} C ${W / 2} ${y0}, ${W / 2} ${y1}, ${W - 96} ${y1}`,
        w,
        colour: rgbCss(eventColour(e)),
        title: es
          ? `dump #${e} aporta ${(f * 100).toFixed(1)} % del corte #${c.cutId} (${(f * c.tonnes).toFixed(0)} t)`
          : `dump #${e} contributes ${(f * 100).toFixed(1)} % of cut #${c.cutId} (${(f * c.tonnes).toFixed(0)} t)`,
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
      aria-label={es ? 'Diagrama de procedencia de los cortes' : 'Provenance flow from deposition events to reclaim cuts'}>
      {ribbons.map((r) => (
        <path key={r.key} d={r.d} stroke={r.colour} strokeWidth={r.w} fill="none" opacity={0.55}>
          <title>{r.title}</title>
        </path>
      ))}
      {events.map(([id]) => {
        const p = evPos.get(id)!;
        return (
          <g key={`e${id}`}>
            <rect x={80} y={p.y} width={14} height={Math.max(2, p.h)} fill={rgbCss(eventColour(id))} rx={2}>
              <title>{es ? `evento de deposicion #${id}` : `deposition event #${id}`}</title>
            </rect>
            {p.h > 9 && (
              <text x={74} y={p.y + p.h / 2 + 3} textAnchor="end" fontSize={9} fill="var(--color-fg-faint)">
                #{id}
              </text>
            )}
          </g>
        );
      })}
      {shown.map((c) => {
        const p = cutPos.get(c.cutId)!;
        return (
          <g key={`c${c.cutId}`} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.cutId)}>
            <rect x={W - 94} y={p.y} width={14} height={Math.max(3, p.h)} rx={2}
              fill={selected === c.cutId ? 'var(--color-accent)' : 'var(--color-fg-faint)'}>
              <title>{es
                ? `corte #${c.cutId}: ${c.tonnes.toFixed(0)} t, ${c.nLayers} capas`
                : `cut #${c.cutId}: ${c.tonnes.toFixed(0)} t across ${c.nLayers} layers`}</title>
            </rect>
            <text x={W - 76} y={p.y + p.h / 2 + 3} fontSize={9} fill="var(--color-fg-subtle)">
              #{c.cutId} · {c.gradeCuPct.toFixed(3)} %Cu
            </text>
          </g>
        );
      })}
      <text x={80} y={H - 1} fontSize={9} fill="var(--color-fg-faint)">
        {es ? 'eventos de deposición' : 'deposition events'}
      </text>
      <text x={W - 94} y={H - 1} fontSize={9} fill="var(--color-fg-faint)" textAnchor="end">
        {es ? 'cortes recuperados' : 'reclaim cuts'}
      </text>
    </svg>
  );
}

/**
 * The provenance ledger: every contributing event of the selected cut, with its fraction and the row
 * sum, which must be one.
 *
 * The sum is DISPLAYED rather than asserted in prose. A ledger that lost material would still draw a
 * convincing Sankey; showing the identity on screen is what makes it checkable by the reader.
 */
export function ProvenanceLedger({ cut, es }: { cut: ReclaimCut | null; es?: boolean }) {
  if (!cut) return <p className="st-note st-muted">{es ? 'Selecciona un corte.' : 'Select a cut.'}</p>;
  const rows = [...cut.sources].sort((a, b) => b[1] - a[1]);
  const sum = rows.reduce((s, [, f]) => s + f, 0);
  return (
    <>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>{es ? 'evento' : 'event'}</th>
              <th>{es ? 'fracción' : 'fraction'}</th>
              <th>{es ? 'toneladas' : 'tonnes'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([e, f]) => (
              <tr key={e}>
                <td>
                  <i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2,
                    marginRight: 6, background: rgbCss(eventColour(e)) }} />
                  #{e}
                </td>
                <td className="st-mono">{(f * 100).toFixed(2)} %</td>
                <td className="st-mono">{(f * cut.tonnes).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="st-note">
        {es ? 'Suma de fracciones' : 'Fractions sum to'}{' '}
        <span className={Math.abs(sum - 1) < 1e-9 ? 'st-pass st-mono' : 'st-fail st-mono'}>
          {sum.toFixed(12)}
        </span>
        {'. '}
        {es
          ? 'Esta identidad es una prueba del motor, no un comentario: un libro mayor que pierda o duplique material la rompe de inmediato.'
          : 'That identity is an engine test, not a comment: a ledger that loses or double-counts material breaks it immediately.'}
      </p>
    </>
  );
}

/**
 * The stratigraphic column at a clicked cell: what is actually inside this spot, bottom to top.
 *
 * The clearest single picture of the lot ledger. Each band is one lot, its height the tonnage and its
 * colour the deposition event, with the interface-mixing band drawn at every boundary so the reader
 * can see that the model's interfaces are sharper than a real pile's rather than being told so.
 */
export function StratColumn({ lots, cell, pad, es }: {
  lots: Lot[] | null; cell: number | null; pad: PadSpec; es?: boolean;
}) {
  if (!lots || lots.length === 0 || cell == null) {
    return (
      <p className="st-note st-muted">
        {es ? 'Haz clic en una columna de la pila para ver su estratigrafía.' : 'Click a column on the pile to see its stratigraphy.'}
      </p>
    );
  }
  const total = lots.reduce((s, l) => s + l.tonnes, 0) || 1;
  const H = 260;
  let y = H;
  const i = cell % pad.nx;
  const j = Math.floor(cell / pad.nx);

  return (
    <div>
      <p className="st-note" style={{ marginTop: 0 }}>
        {es ? 'Columna' : 'Column'} E {(i * pad.cellM).toFixed(0)} m, N {(j * pad.cellM).toFixed(0)} m
        {' · '}{lots.length} {es ? 'lotes' : 'lots'}{' · '}{total.toFixed(0)} t
      </p>
      <svg viewBox={`0 0 240 ${H}`} width="100%" height={H} role="img"
        aria-label={es ? 'Columna estratigráfica del lote seleccionado' : 'Stratigraphic column of the selected cell'}>
        {lots.map((l, k) => {
          const h = Math.max(1.5, (l.tonnes / total) * H);
          y -= h;
          return (
            <g key={k}>
              <rect x={0} y={y} width={120} height={h} fill={rgbCss(eventColour(l.eventId))}>
                <title>
                  {es
                    ? `evento #${l.eventId}: ${l.tonnes.toFixed(1)} t, ${l.gradeCuPct.toFixed(3)} %Cu, grueso ${(l.coarseFrac * 100).toFixed(0)} %`
                    : `event #${l.eventId}: ${l.tonnes.toFixed(1)} t, ${l.gradeCuPct.toFixed(3)} %Cu, coarse ${(l.coarseFrac * 100).toFixed(0)} %`}
                </title>
              </rect>
              {/* the interface-mixing band: the model's boundaries are sharper than a real pile's,
                  and drawing the uncertainty is more honest than describing it in a caption */}
              {k < lots.length - 1 && (
                <rect x={0} y={y - 1.2} width={120} height={2.4} fill="var(--color-bg)" opacity={0.35} />
              )}
              {h > 11 && (
                <text x={126} y={y + h / 2 + 3} fontSize={9} fill="var(--color-fg-subtle)">
                  #{l.eventId} · {l.gradeCuPct.toFixed(3)} %Cu · {(l.coarseFrac * 100).toFixed(0)} % {es ? 'gr' : 'cs'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="st-note st-muted">
        {es
          ? 'Las interfaces entre lotes son más nitidas en el modelo que en una pila real: el remanejo y la mezcla por avalancha no están modelados. Las bandas claras marcan esa incertidumbre.'
          : 'Lot interfaces are sharper in the model than in a real pile: re-handling and avalanche mixing are not modelled. The pale bands mark that uncertainty.'}
      </p>
    </div>
  );
}

/** A compact KPI strip. Value first, label second: the eye reads the number. */
export function Kpis({ items }: { items: Array<{ v: string; l: string; title?: string }> }) {
  return (
    <div className="st-kpis">
      {items.map((k) => (
        <div className="st-kpi" key={k.l} title={k.title}>
          <div className="st-kpi-v">{k.v}</div>
          <div className="st-kpi-l">{k.l}</div>
        </div>
      ))}
    </div>
  );
}

/** A labelled slider that shows its value inline and explains what the knob IS. */
export function Ctl({ label, value, min, max, step, onChange, fmt, hint, disabled }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string; hint?: string; disabled?: boolean;
}) {
  return (
    <label className="st-ctl">
      <span className="st-ctl-h">
        <span>{label}</span>
        <span className="st-ctl-v">{fmt ? fmt(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="st-ctl-d">{hint}</span>}
    </label>
  );
}

/** A rail section switcher: one row of chips, one section visible, so the rail never needs scrolling. */
export function RailSections({ sections, active, onPick }: {
  sections: Array<{ id: string; label: string }>; active: string; onPick: (id: string) => void;
}) {
  return (
    <div className="st-chips" role="tablist">
      {sections.map((s) => (
        <button key={s.id} type="button" role="tab" aria-selected={active === s.id}
          className={`chip${active === s.id ? ' on' : ''}`} onClick={() => onPick(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Grouped single-row tabs with hover sub-menus (ADR-0071 rules 4 and 5). */
export function TabRow({ groups, active, onPick, es }: {
  groups: Array<{ id: string; label: string; views: Array<{ id: string; label: string }> }>;
  active: string;
  onPick: (viewId: string) => void;
  es?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="st-tabrow" role="tablist"
      aria-label={es ? 'Vistas del taller' : 'Workbench views'}>
      {groups.map((g) => {
        const on = g.views.some((v) => v.id === active);
        const multi = g.views.length > 1;
        return (
          <div key={g.id} className="st-tabwrap"
            onMouseEnter={() => setOpen(g.id)} onMouseLeave={() => setOpen(null)}>
            <button type="button" role="tab" aria-selected={on}
              aria-haspopup={multi ? 'true' : undefined}
              aria-expanded={multi ? open === g.id : undefined}
              className={`st-tab${on ? ' on' : ''}`}
              onClick={() => onPick(g.views[0].id)}
              onFocus={() => setOpen(g.id)}>
              {g.label}{multi && <span className="st-caret">&#9660;</span>}
            </button>
            {multi && open === g.id && (
              <div className="st-tabmenu">
                {g.views.map((v) => (
                  <button key={v.id} type="button" className={v.id === active ? 'on' : ''}
                    onClick={() => { onPick(v.id); setOpen(null); }}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The operating-regime control: the case's variants as a select, in the rail beside the case picker.
 *
 * ADR-0016 section 9A requires it, and the reason is that a single point is not an experiment. The
 * case says what is being tested; the variant says where on the deciding knob it is being tested,
 * and moving along that knob is what turns a picture into a result a reader can reason about.
 *
 * A SELECT rather than a row of chips, and rather than a bar above the stage, for two measured
 * reasons. ADR-0071 rule 7: a one-of-N choice from a set is a select, not N buttons. ADR-0071 rule 4
 * and clause 8: chips above the stage cost a permanent row of chrome on every render, and that row
 * took the App instrument from 53% of the viewport to 44.7% at 1280x800, below the floor. The regime
 * is a control, so it lives on the control surface next to the case it belongs to.
 *
 * Selecting a regime re-runs the REAL engine in the browser rather than loading a pre-baked frame, so
 * the sweep is continuous with the rail's own sliders instead of being a separate pre-simulated mode.
 * The note underneath says what that regime is there to show.
 *
 * A case with NO variants renders the honest empty state rather than a padded row of chips. The three
 * controls are single deliberate points carrying numerical kill criteria; sweeping one would destroy
 * the property that makes it a control.
 */
export function VariantBar({ variants, active, onPick, es, familyLabel }: {
  variants: Array<{ id: string; labelEn: string; labelEs: string; noteEn: string; noteEs: string }>;
  active: string | null;
  onPick: (id: string) => void;
  es?: boolean;
  familyLabel?: string;
}) {
  if (variants.length === 0) {
    return (
      <p className="st-note st-muted">
        {es
          ? 'Control: un punto único con criterio de descarte numérico. Barrerlo destruiría lo que lo hace un control, así que no lleva regímenes.'
          : 'A control: one point with a numerical kill criterion. Sweeping it would destroy what makes it a control, so it carries no regimes.'}
      </p>
    );
  }
  const cur = variants.find((v) => v.id === active) ?? variants[0];
  const label = familyLabel ?? (es ? 'Régimen' : 'Regime');
  return (
    <>
      <label className="st-ctl-l" htmlFor="st-variant">{label}</label>
      <select
        id="st-variant"
        className="st-select"
        value={cur.id}
        onChange={(e) => onPick(e.target.value)}
        aria-label={label}
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>{es ? v.labelEs : v.labelEn}</option>
        ))}
      </select>
      <p className="st-ctl-d">{es ? cur.noteEs : cur.noteEn}</p>
    </>
  );
}
