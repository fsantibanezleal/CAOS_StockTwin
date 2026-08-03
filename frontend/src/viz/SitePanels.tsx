/**
 * The two-dimensional panels: the plan, the raw field, one dump in detail, sectors, and the feed.
 *
 * Canvas rather than SVG for the two field views, because they are one quad per cell over a pad of
 * several thousand cells and SVG at that count is visibly slow to pan. Everything else is real DOM,
 * so it is selectable, searchable and readable by a screen reader.
 *
 * EVERY NUMBER ON SCREEN IS COMPUTED FROM THE EVENT LOG, never read from a baked field. That is what
 * makes them falsifiable: a reader can see the events and the answer in the same view.
 */
import { useEffect, useMemo, useRef } from 'react';

import {
  type Cut,
  type Field,
  type Load,
  MEASURED,
  type Plan,
  type Scenario,
  type Sector,
  profileStats,
  segregationSummary,
  variogram,
  verdict,
} from '../lib/scenario';

const EMPTY = 1e-4;

/** Chart height that fills the stage.
 *
 *  ADR-0071 clause 8: the primary visualization takes at least 50 percent of the viewport. Measured
 *  before this existed, the table-led views ran at 14 to 26 percent, which is the ADR's own
 *  description of "showing chrome with a picture in it". A table is a readout, not an instrument, so
 *  each of these views now LEADS with a chart and keeps its table underneath. */
function stageChartHeight(el?: HTMLElement | null): number {
  // MEASURE THE BOX. A fraction of the window ignores the header, the scenario deck, the tab strip
  // and the footer, which together are most of a laptop screen; the charts came out taller than the
  // space they had and the panel scrolled when it should have fitted.
  const box = el?.parentElement?.clientHeight ?? 0;
  return Math.max(320, Math.round(box > 120 ? box - 96 : window.innerHeight * 0.52));
}

function ramp(t: number): string {
  const u = Math.min(Math.max(t, 0), 1);
  const stops: [number, [number, number, number]][] = [
    [0.0, [38, 70, 120]],
    [0.25, [58, 140, 150]],
    [0.5, [120, 175, 110]],
    [0.75, [220, 180, 80]],
    [1.0, [200, 90, 60]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (u <= b) {
      const f = (u - a) / (b - a || 1);
      return `rgb(${Math.round(ca[0] + f * (cb[0] - ca[0]))},${Math.round(
        ca[1] + f * (cb[1] - ca[1]),
      )},${Math.round(ca[2] + f * (cb[2] - ca[2]))})`;
    }
  }
  return 'rgb(200,90,60)';
}

/* ------------------------------------------------------------------ the plan --------------- */

export function PlanPanel({
  plan,
  loads,
  field,
  dark,
}: {
  plan: Plan;
  loads: Load[];
  field: Field;
  dark: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const W = field.nx * field.cell_m;
    const H = field.ny * field.cell_m;
    const draw = () => {
      // Fit the WHOLE pad into the box: sized by width alone a square site is taller than the
      // screen, which is what ran the plan and field views past the footer.
      const availW = cv.parentElement?.clientWidth ?? 600;
      const box = cv.parentElement?.clientHeight ?? 0;
      const availH = box > 200 ? box - 90 : Math.round(window.innerHeight * 0.58);
      const s = Math.min(availW / W, availH / H);
      const cssW = W * s;
      const cssH = H * s;
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
      g.fillStyle = dark ? '#11161d' : '#f3f5f8';
      g.fillRect(0, 0, W, H);

      for (const a of plan.areas) {
        g.fillStyle = dark ? 'rgba(90,150,200,0.10)' : 'rgba(20,90,150,0.07)';
        g.fillRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
        g.strokeStyle = dark ? '#7fd7ff' : '#0a6ea8';
        g.lineWidth = 1.2 / 1;
        g.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);

        // The reserved access corridor. Nothing is tipped on it, which is why the pile does not
        // grow over its own way in.
        const [ax, ay] = a.access;
        const cx = (a.x0 + a.x1) / 2;
        const cy = (a.y0 + a.y1) / 2;
        g.save();
        g.strokeStyle = dark ? 'rgba(255,199,90,0.55)' : 'rgba(179,92,0,0.5)';
        g.lineWidth = a.ramp_width_m;
        g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(cx, cy);
        g.stroke();
        g.restore();

        g.fillStyle = dark ? '#cfe6f5' : '#123';
        g.font = '9px system-ui, sans-serif';
        g.fillText(`${a.name} (${a.benches.length} benches)`, a.x0 + 3, a.y0 + 11);
      }

      // Planned tip positions against where the truck actually stood.
      for (const l of loads) {
        if (!l.placed || l.px === undefined) continue;
        g.fillStyle = dark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.22)';
        g.fillRect(l.px - 0.7, (l.py ?? 0) - 0.7, 1.4, 1.4);
        if ((l.offset ?? 0) > 0.5 && l.x !== undefined) {
          g.strokeStyle = dark ? 'rgba(255,143,107,0.6)' : 'rgba(178,64,27,0.5)';
          g.lineWidth = 0.5;
          g.beginPath();
          g.moveTo(l.px, l.py ?? 0);
          g.lineTo(l.x, l.y ?? 0);
          g.stroke();
        }
      }
      for (const l of loads) {
        if (!l.placed || l.x === undefined) continue;
        g.fillStyle = l.phase === 'edge' ? (dark ? '#ffc75a' : '#b35c00') : dark ? '#62e08a' : '#0f7a3d';
        g.beginPath();
        g.arc(l.x, l.y ?? 0, 1.1, 0, Math.PI * 2);
        g.fill();
      }

      const [sx, sy] = plan.shovel;
      g.fillStyle = dark ? '#d8dee9' : '#33475b';
      g.beginPath();
      g.arc(sx, sy, 4, 0, Math.PI * 2);
      g.fill();
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [plan, loads, field, dark]);

  return (
    <div>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} />
      <p className="st-legend">
        <span className="st-key" style={{ background: '#0f7a3d' }} /> paddock tip
        <span className="st-key" style={{ background: '#b35c00' }} /> edge tip
        <span className="st-key" style={{ background: 'rgba(179,92,0,0.5)' }} /> reserved access ramp
        <span className="st-key" style={{ background: 'rgba(0,0,0,0.22)' }} /> planned position
      </p>
      <p className="st-note">
        Grey marks are where the plan asked for the load; a line to a coloured mark is where the truck
        could actually stand. Fresh material stands at the angle of repose and a haul truck works to
        roughly two thirds of that, so a truck never stands on what was just tipped.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- the raw field ------------- */

/** THREE LINKED MAPS, not one.
 *
 *  A single square plan map is height-limited in a wide viewport: fitted to the space available it
 *  can never fill half the screen, and the rest of the width sits empty. Three of them side by side
 *  fill it AND say more, because the question a reader has is not "what is the grade" but "does the
 *  grade pattern follow the thickness, and does the coarse fraction follow either" — which is a
 *  comparison, and a comparison needs the panels together. */
export function FieldPanel({ field, dark }: { field: Field; by?: string; dark: boolean }) {
  const views: { key: 'grade' | 'coarse' | 'thickness'; en: string }[] = [
    { key: 'grade', en: 'grade' },
    { key: 'coarse', en: 'coarse fraction' },
    { key: 'thickness', en: 'thickness above ground' },
  ];
  // A WIDE pad stacks; a squarish one goes side by side. Three columns of a 136-by-80 field are
  // three slivers, which is worse than one map, and the layout should follow the shape of the site
  // rather than a fixed column count.
  const wide = field.nx / field.ny > 1.35;
  return (
    <div>
      <div className={wide ? 'st-multiples st-multiples-wide' : 'st-multiples'}>
        {views.map((v) => (
          <figure key={v.key}>
            <FieldMap field={field} by={v.key} dark={dark} />
            <figcaption>{v.en}</figcaption>
          </figure>
        ))}
      </div>
      <p className="st-note">
        The same pile, coloured three ways. Grade is what the plant receives; coarse fraction is what
        size segregation did on the way down each face; thickness is how much material is actually
        there, measured against the ORIGINAL ground rather than against zero, which are different
        questions on any sloping site. A cell with no material is drawn as pad, never as material at
        grade zero: that confusion once made an empty pad read as a full pile.
      </p>
    </div>
  );
}

function FieldMap({
  field,
  by,
  dark,
}: {
  field: Field;
  by: 'grade' | 'coarse' | 'thickness';
  dark: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  const { vals, lo, hi, unit } = useMemo(() => {
    const thick = field.z.map((v, i) => v - field.z0[i]);
    const v =
      by === 'grade'
        ? field.grade
        : by === 'coarse'
          ? field.coarse
          : thick.map((t) => (t > EMPTY ? t : null));
    const present = v.filter((x): x is number => x !== null && Number.isFinite(x));
    return {
      vals: v,
      lo: present.length ? Math.min(...present) : 0,
      hi: present.length ? Math.max(...present) : 1,
      unit: by === 'grade' ? 'g/t' : by === 'coarse' ? 'coarse fraction' : 'm',
    };
  }, [field, by]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const availW = cv.parentElement?.clientWidth ?? 600;
      const availH = Math.max(220, Math.round(window.innerHeight * 0.55));
      const s = Math.min(availW / field.nx, availH / field.ny);
      const cssW = field.nx * s;
      const cssH = field.ny * s;
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
      for (let j = 0; j < field.ny; j++) {
        for (let i = 0; i < field.nx; i++) {
          const k = j * field.nx + i;
          const v = vals[k];
          // No material means pad, not "material at zero". That confusion shipped once.
          g.fillStyle =
            v === null || !Number.isFinite(v)
              ? dark
                ? '#232a33'
                : '#d9dee5'
              : ramp((v - lo) / (hi - lo || 1));
          g.fillRect(i, j, 1.02, 1.02);
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [field, vals, lo, hi, dark]);

  return (
    <div>
      <canvas ref={ref} style={{ display: 'block', width: '100%', imageRendering: 'pixelated' }} />
      <p className="st-legend">
        <span className="st-scale" />
        <span>
          {lo.toFixed(3)} to {hi.toFixed(3)} {unit}
        </span>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- one dump in detail ---------- */

function EnvelopeChart({
  stats,
  dark,
}: {
  stats: { profile: string; n: number; len: number; wid: number; thick: number }[];
  dark: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const cssW = cv.parentElement?.clientWidth ?? 600;
      const cssH = stageChartHeight(cv);
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = cssW + 'px';
      cv.style.height = cssH + 'px';
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);

      // What this build produced, plotted INSIDE the envelope measured across 28 real dumps. A point
      // outside the shaded band is the operator drifting from the measurements it was fitted to,
      // which is the kill criterion the plan states.
      const padL = 62;
      const padB = 46;
      const padT = 28;
      const X = (v: number) => padL + (v / 52) * (cssW - padL - 26);
      const Y = (v: number) => cssH - padB - (v / 26) * (cssH - padB - padT);

      g.fillStyle = dark ? 'rgba(98,224,138,0.10)' : 'rgba(15,122,61,0.09)';
      const bx = X(MEASURED.length[0]);
      const by = Y(MEASURED.width[1]);
      const bw = X(MEASURED.length[1]) - bx;
      const bh = Y(MEASURED.width[0]) - by;
      g.fillRect(bx, by, bw, bh);
      g.strokeStyle = dark ? 'rgba(98,224,138,0.55)' : 'rgba(15,122,61,0.5)';
      g.setLineDash([4, 4]);
      g.strokeRect(bx, by, bw, bh);
      g.setLineDash([]);

      g.strokeStyle = dark ? '#39424e' : '#c8cfd8';
      g.beginPath();
      g.moveTo(padL, padT);
      g.lineTo(padL, cssH - padB);
      g.lineTo(cssW - 24, cssH - padB);
      g.stroke();

      const colours: Record<string, string> = {
        oval: dark ? '#7fd7ff' : '#0a6ea8',
        comet: dark ? '#ffc75a' : '#b35c00',
        rectangular: dark ? '#62e08a' : '#0f7a3d',
        sloughed_heap: dark ? '#ff8f6b' : '#b2401b',
        paddock: dark ? '#9fb0c3' : '#6a7788',
      };
      for (const r of stats) {
        if (!r.len) continue;
        g.fillStyle = colours[r.profile] ?? '#888888';
        g.beginPath();
        g.arc(X(r.len), Y(r.wid), 4 + Math.min(Math.sqrt(r.n), 9), 0, Math.PI * 2);
        g.fill();
        g.fillStyle = dark ? '#dbe4ee' : '#22303d';
        g.font = '11px system-ui, sans-serif';
        g.fillText(r.profile.replace('_', ' ') + ' (' + r.n + ')', X(r.len) + 15, Y(r.wid) + 4);
      }

      g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
      g.font = '11px system-ui, sans-serif';
      g.fillText('length, m', cssW / 2 - 24, cssH - 14);
      g.save();
      g.translate(16, cssH / 2);
      g.rotate(-Math.PI / 2);
      g.fillText('width, m', -22, 0);
      g.restore();
      g.fillText('shaded: the envelope measured across 28 UAV-surveyed dumps', padL + 8, padT - 10);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [stats, dark]);
  return <canvas ref={ref} style={{ display: 'block', width: '100%' }} />;
}


export function DumpDetailPanel({ sc, dark = false }: { sc: Scenario; dark?: boolean }) {
  const stats = useMemo(() => profileStats(sc), [sc]);
  const seg = useMemo(() => segregationSummary(sc), [sc]);
  const inBand = (v: number, [a, b]: readonly [number, number]) => v >= a && v <= b;

  return (
    <div className="st-detail">
      <EnvelopeChart stats={stats} dark={dark} />
      <p className="st-note">
        A truck dump is not a disc. Twenty-eight real dumps surveyed by drone photogrammetry fall into
        four shapes, and which one forms is decided by how far the truck stood from the crest: far
        away gives a sloughed heap, against the crest gives a comet, an oval or a rectangle. The table
        compares what this build produced against those measurements.
      </p>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>profile</th>
              <th>loads</th>
              <th>length m</th>
              <th>width m</th>
              <th>thickness m</th>
              <th>in the measured envelope</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((r) => {
              const ok =
                r.profile === 'paddock' ||
                (inBand(r.len, MEASURED.length) &&
                  inBand(r.wid, MEASURED.width) &&
                  inBand(r.thick, MEASURED.thickness));
              return (
                <tr key={r.profile}>
                  <td>{r.profile.replace('_', ' ')}</td>
                  <td>{r.n}</td>
                  <td>{r.len.toFixed(1)}</td>
                  <td>{r.wid.toFixed(1)}</td>
                  <td>{r.thick.toFixed(2)}</td>
                  <td>
                    {r.profile === 'paddock' ? (
                      <span className="st-muted">heap, not a cascade</span>
                    ) : ok ? (
                      <span className="st-ok">yes</span>
                    ) : (
                      <span className="st-bad">NO</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="st-ref">
              <td>measured</td>
              <td>28</td>
              <td>
                {MEASURED.length[0]} to {MEASURED.length[1]}
              </td>
              <td>
                {MEASURED.width[0]} to {MEASURED.width[1]}
              </td>
              <td>
                {MEASURED.thickness[0]} to {MEASURED.thickness[1]}
              </td>
              <td className="st-muted">{MEASURED.source}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4>Size segregation down the face</h4>
      <p className="st-note">
        A cascading load sorts itself: coarse runs to the toe, fines stay near the crest, and part of
        the coarse rolls beyond the toe entirely. It gets stronger with drop height and face angle. A
        load tipped on flat ground does not sort at all, which is why the paddock heaps report zero.
      </p>
      <dl className="st-stats">
        <div>
          <dt>loads that sorted on a face</dt>
          <dd>{seg.nSorted}</dd>
        </div>
        <div>
          <dt>mean intensity</dt>
          <dd>{seg.meanIntensity.toFixed(3)}</dd>
        </div>
        <div>
          <dt>mean drop</dt>
          <dd>{seg.meanDrop.toFixed(1)} m</dd>
        </div>
        <div>
          <dt>coarse past the toe</dt>
          <dd>{(seg.meanOverrun * 100).toFixed(1)} %</dd>
        </div>
        <div>
          <dt>coarse fraction across the pile</dt>
          <dd>
            {seg.coarseMin.toFixed(3)} to {seg.coarseMax.toFixed(3)}
          </dd>
        </div>
      </dl>
      <p className="st-note">
        Published guidance limits conical stockpiles to 10 to 12 m because each additional metre
        increases percolation segregation. This pile is shorter than that, so a low intensity here is
        the correct answer rather than a weak model.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- sectors ----------------- */

export function SectorPanel({ sectors, dark = false }: { sectors: Sector[]; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !sectors.length) return;
    const draw = () => {
      const cssW = cv.parentElement?.clientWidth ?? 600;
      const cssH = stageChartHeight(cv);
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = cssW + 'px';
      cv.style.height = cssH + 'px';
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);

      // Every quadrant of every area, so a reader SEES the spread that one sector grade hides.
      const rows: { label: string; grade: number; ci: number; whole: boolean }[] = [];
      for (const s of sectors) {
        rows.push({ label: s.name, grade: s.grade, ci: s.ci['0.95'] ?? 0, whole: true });
        for (const q of s.quadrants) {
          rows.push({
            label: q.name.replace(s.name + ' ', ''),
            grade: q.grade,
            ci: q.ci['0.95'] ?? 0,
            whole: false,
          });
        }
      }
      const lo = Math.min(...rows.map((r) => r.grade - r.ci));
      const hi = Math.max(...rows.map((r) => r.grade + r.ci));
      const padL = 130;
      const padB = 34;
      const X = (v: number) => padL + ((v - lo) / (hi - lo || 1)) * (cssW - padL - 30);
      const band = (cssH - padB - 20) / rows.length;

      g.strokeStyle = dark ? '#39424e' : '#c8cfd8';
      g.beginPath();
      g.moveTo(padL, 12);
      g.lineTo(padL, cssH - padB);
      g.lineTo(cssW - 24, cssH - padB);
      g.stroke();

      rows.forEach((r, i) => {
        const y = 20 + band * (i + 0.5);
        g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
        g.font = (r.whole ? '600 ' : '') + '11px system-ui, sans-serif';
        g.textAlign = 'right';
        g.fillText(r.label.slice(0, 20), padL - 8, y + 4);
        g.textAlign = 'left';

        const col = r.whole
          ? (dark ? '#ffc75a' : '#b35c00')
          : (dark ? '#7fd7ff' : '#0a6ea8');
        // The interval on the mean as a bar, so overlap between two areas is visible rather than
        // something a reader has to work out from two columns of digits.
        g.strokeStyle = col;
        g.lineWidth = r.whole ? 2.5 : 1.5;
        g.beginPath();
        g.moveTo(X(r.grade - r.ci), y);
        g.lineTo(X(r.grade + r.ci), y);
        g.stroke();
        g.fillStyle = col;
        g.beginPath();
        g.arc(X(r.grade), y, r.whole ? 4 : 2.6, 0, Math.PI * 2);
        g.fill();
      });

      g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
      g.font = '10px system-ui, sans-serif';
      g.fillText(lo.toFixed(3), padL, cssH - 14);
      g.fillText('grade, with the 95 percent interval on the mean', padL + 80, cssH - 14);
      g.fillText(hi.toFixed(3), cssW - 66, cssH - 14);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [sectors, dark]);

  return (
    <div>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} />
      <p className="st-legend">
        <span className="st-key" style={{ background: '#b35c00' }} /> whole area
        <span className="st-key" style={{ background: '#0a6ea8' }} /> its quadrants
      </p>
      <p className="st-note">
        A sector reports one grade. The raw field underneath is stratified, and the reclaim sequence
        decides which of the two the plant actually experiences. The interval is on the mean, and the
        quadrant rows are the published comparison: an interpolated model is smoother than the
        observations it was built from, so its interval is narrower in every region.
      </p>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>area</th>
              <th>class</th>
              <th>tonnes</th>
              <th>grade</th>
              <th>sd</th>
              <th>n</th>
              <th>95 % half-width</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.class}</td>
                <td>{Math.round(s.tonnes).toLocaleString()}</td>
                <td>{s.grade.toFixed(4)}</td>
                <td>{s.stdev.toFixed(4)}</td>
                <td>{s.n}</td>
                <td>{(s.ci['0.95'] ?? 0).toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sectors.map((s) => (
        <div key={s.name}>
          <h4>{s.name}, by quadrant</h4>
          <div className="st-tablewrap">
            <table className="st-table st-compact">
              <thead>
                <tr>
                  <th>region</th>
                  <th>grade</th>
                  <th>n</th>
                  <th>90 %</th>
                  <th>95 %</th>
                  <th>99 %</th>
                </tr>
              </thead>
              <tbody>
                {s.quadrants.map((q) => (
                  <tr key={q.name}>
                    <td>{q.name.replace(`${s.name} `, '')}</td>
                    <td>{q.grade.toFixed(4)}</td>
                    <td>{q.n}</td>
                    <td>{(q.ci['0.9'] ?? 0).toFixed(5)}</td>
                    <td>{(q.ci['0.95'] ?? 0).toFixed(5)}</td>
                    <td>{(q.ci['0.99'] ?? 0).toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- reclaim ---------------- */

export function ReclaimPanel({ sc, dark }: { sc: Scenario; dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const v = useMemo(() => verdict(sc), [sc]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const cssW = cv.parentElement?.clientWidth ?? 600;
      const cssH = stageChartHeight(cv);
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);

      const inG = sc.loads.filter((l) => l.placed).map((l) => l.grade);
      const outG = sc.cuts.map((c) => c.grade);
      const all = [...inG, ...outG];
      if (!all.length) return;
      const lo = Math.min(...all);
      const hi = Math.max(...all);
      const pad = 34;
      const X = (i: number, n: number) => pad + (i / Math.max(n - 1, 1)) * (cssW - pad - 12);
      const Y = (val: number) => cssH - 26 - ((val - lo) / (hi - lo || 1)) * (cssH - 50);

      g.strokeStyle = dark ? '#39424e' : '#c8cfd8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(pad, 12);
      g.lineTo(pad, cssH - 26);
      g.lineTo(cssW - 12, cssH - 26);
      g.stroke();

      g.strokeStyle = dark ? 'rgba(120,170,220,0.55)' : 'rgba(30,90,150,0.45)';
      g.beginPath();
      inG.forEach((val, i) => (i ? g.lineTo(X(i, inG.length), Y(val)) : g.moveTo(X(i, inG.length), Y(val))));
      g.stroke();

      g.strokeStyle = dark ? '#ffc75a' : '#b35c00';
      g.lineWidth = 2;
      g.beginPath();
      outG.forEach((val, i) =>
        i ? g.lineTo(X(i, outG.length), Y(val)) : g.moveTo(X(i, outG.length), Y(val)),
      );
      g.stroke();

      g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
      g.font = '10px system-ui, sans-serif';
      g.fillText(hi.toFixed(3), 4, 16);
      g.fillText(lo.toFixed(3), 4, cssH - 30);
      g.fillText('sequence', cssW / 2 - 20, cssH - 8);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [sc, dark]);

  return (
    <div>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} />
      <p className="st-legend">
        <span className="st-key" style={{ background: 'rgba(30,90,150,0.6)' }} /> grade in, per load
        <span className="st-key" style={{ background: '#b35c00' }} /> grade out, per cut
      </p>
      <dl className="st-stats">
        <div>
          <dt>variance in</dt>
          <dd>{v.varIn.toExponential(3)}</dd>
        </div>
        <div>
          <dt>variance out</dt>
          <dd>{v.varOut.toExponential(3)}</dd>
        </div>
        <div>
          <dt>variance reduction</dt>
          <dd>{v.vrr.toFixed(3)}</dd>
        </div>
        <div>
          <dt>independent-layer bound</dt>
          <dd>{v.ideal.toFixed(3)}</dd>
        </div>
        <div>
          <dt>efficiency against the bound</dt>
          <dd>{v.boundReliable ? `${(v.efficiency * 100).toFixed(0)} %` : 'not reliable'}</dd>
        </div>
        <div>
          <dt>mean sources per cut</dt>
          <dd>{v.nLayers.toFixed(1)}</dd>
        </div>
      </dl>
      <p className="st-note">
        Variance reduction is var out over var in, so lower is better and one means the pile did
        nothing. It is shown against the ideal bound for the number of independent sources each cut
        actually drew from, because the ideal is typically three to four times better than any real
        bed achieves and a ratio quoted alone reads far more flattering than it is. Both numbers are
        computed in this page from the load log and the cut log, not read from the file.
      </p>
      {!v.boundReliable && (
        <p className="st-note">
          <strong>The bound is withheld for this case, and that is a known gap rather than a
          result.</strong> The achieved reduction comes out better than one over the number of
          independent sources counted from cut provenance, which is arithmetically impossible: it
          says the source count is being underestimated, not that the pile beat the theoretical
          limit. Until that is root-caused the efficiency is not shown, because a headline claiming
          several thousand percent of the ideal would be worse than no headline at all.
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- the variogram -------------- */

export function VariogramPanel({ sc, dark }: { sc: Scenario; dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const vg = useMemo(() => {
    const placed = sc.loads.filter((l) => l.placed);
    let run = 0;
    const coord = placed.map(() => (run += 231));
    return variogram(
      placed.map((l) => l.grade),
      coord,
      20,
    );
  }, [sc]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !vg.centres.length) return;
    const draw = () => {
      const cssW = cv.parentElement?.clientWidth ?? 600;
      const cssH = Math.round(stageChartHeight(cv) * 0.62);
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);
      const hi = Math.max(...vg.gamma) || 1;
      const maxH = Math.max(...vg.centres) || 1;
      const pad = 40;
      const X = (h: number) => pad + (h / maxH) * (cssW - pad - 12);
      const Y = (v: number) => cssH - 26 - (v / hi) * (cssH - 46);

      g.strokeStyle = dark ? '#39424e' : '#c8cfd8';
      g.beginPath();
      g.moveTo(pad, 10);
      g.lineTo(pad, cssH - 26);
      g.lineTo(cssW - 12, cssH - 26);
      g.stroke();

      g.strokeStyle = dark ? '#62e08a' : '#0f7a3d';
      g.lineWidth = 2;
      g.beginPath();
      vg.centres.forEach((h, i) => (i ? g.lineTo(X(h), Y(vg.gamma[i])) : g.moveTo(X(h), Y(vg.gamma[i]))));
      g.stroke();
      g.fillStyle = dark ? '#62e08a' : '#0f7a3d';
      vg.centres.forEach((h, i) => {
        g.beginPath();
        g.arc(X(h), Y(vg.gamma[i]), 2.5, 0, Math.PI * 2);
        g.fill();
      });

      g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
      g.font = '10px system-ui, sans-serif';
      g.fillText(hi.toExponential(1), 2, 14);
      g.fillText('lag, tonnes', cssW / 2 - 26, cssH - 8);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [vg, dark]);

  return (
    <div>
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} />
      <p className="st-note">
        The semivariogram of the incoming stream, computed here from the load log. Its range is a
        CONSEQUENCE of how long the shovel dwells in one dig block, not a setting: consecutive trucks
        load from the same block, so consecutive grades are similar. The predecessor took this range
        as an input, which had the causality backwards.
      </p>
    </div>
  );
}

export type { Cut, Load, Sector };
