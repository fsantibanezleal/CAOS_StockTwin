/**
 * The two-dimensional panels: the plan, the raw field, one dump in detail, sectors, and the reclaim.
 *
 * WHAT IS DRAWN ON A RAW CANVAS AND WHAT IS NOT. The rubric assigns 2-D line, stem and scatter charts
 * to uPlot and leaves raw Canvas2D for the per-cell cases, and this file used to ignore the first
 * half: the measured-envelope scatter, the sector interval plot, the reclaim series and the
 * semivariogram were all hand-drawn, so none of them had a cursor readout, drag zoom, a reset, a
 * keyboard path or a screen-reader table, and each one re-implemented axes and padding slightly
 * differently. They now go through `UPlotChart`, which ships all of that once. The two field MAPS and
 * the plan stay on canvas, because they are one quad per cell over several thousand cells and that is
 * the case the deviation exists for; they get their interactions written out by hand here.
 *
 * EVERY STRING IS BILINGUAL. The whole module used to be English-only, including the legends, the
 * captions, the table headers and the text drawn INTO the canvases, so a Spanish reader got a
 * Spanish page with English instruments in it.
 *
 * EVERY NUMBER ON SCREEN IS COMPUTED FROM THE EVENT LOG, never read from a baked field. That is what
 * makes them falsifiable: a reader can see the events and the answer in the same view.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  batchCuts,
  type Cut,
  type Field,
  type GradeTonnage,
  type Knobs,
  type Load,
  MEASURED,
  type Plan,
  type Scenario,
  type Sector,
  profileStats,
  segregationSummary,
  variogram,
  verdictAt,
} from '../lib/scenario';
import { cssVar, rgbCss, viridis } from './colormap';
import { UPlotChart } from './UPlotChart';

const EMPTY = 1e-4;

/** Bilingual helper, the same shape every other module in this app uses. */
type Lang = 'en' | 'es';
const T = (lang: Lang) => (en: string, es: string) => (lang === 'es' ? es : en);

/** A chart host whose height comes from the layout and can never come from its own canvas.
 *
 *  THE CANVAS IS ABSOLUTELY POSITIONED INSIDE IT, so it is out of flow and cannot push the host.
 *  Measuring the immediate parent of an in-flow canvas is a feedback loop: a taller canvas makes a
 *  taller parent, the next measurement reads the taller parent and makes the canvas taller again,
 *  and the chart grows without bound. That shipped, and it is what "the graph grows to infinity"
 *  was. The host takes the remaining flex space of the panel, which is definite.
 */
export function ChartBox({
  children,
  grow = 1,
  onRef,
}: {
  children: React.ReactNode;
  grow?: number;
  onRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="st-chartbox" style={{ flexGrow: grow }} ref={onRef}>
      {children}
    </div>
  );
}

/** The shared perceptually-uniform ramp. See the note in colormap.ts: there used to be three copies
 *  of a jet-family ramp in this codebase, and a false gradient changes what a reader reads off a
 *  surface, which the rubric treats as a correctness defect rather than a matter of taste. */
const ramp = (t: number): string => rgbCss(viridis(t));

/** Theme colours for a canvas, read from the tokens rather than switched on a boolean.
 *
 *  Hardcoding a palette per theme means the canvas and the HTML legend beside it are two separate
 *  opinions about what colour "the crest" is, and they drifted. */
function palette() {
  return {
    fg: cssVar('--color-fg', '#e6edf3'),
    faint: cssVar('--color-fg-faint', '#8b949e'),
    border: cssVar('--color-border', '#30363d'),
    surface: cssVar('--color-surface', '#161b22'),
    bg: cssVar('--color-bg', '#0d1117'),
    accent: cssVar('--color-accent', '#58a6ff'),
    good: cssVar('--color-good', '#3fb950'),
    warn: cssVar('--color-warn', '#d29922'),
    bad: cssVar('--color-bad', '#f85149'),
  };
}

/* ---------------------------------------------------- shared map interaction ------------------ */

interface MapView {
  /** Zoom factor, 1 is the whole pad fitted to the box. */
  k: number;
  /** Pan offset in CSS pixels. */
  tx: number;
  ty: number;
}

const HOME: MapView = { k: 1, tx: 0, ty: 0 };

/**
 * Wheel zoom, drag pan, double-click reset and keyboard operation for a canvas map.
 *
 * Written once here rather than three times in the panels below, because the rubric's heatmap
 * requirements are the same for all of them and the previous version met none of them: the only
 * listener on any of these canvases was a ResizeObserver.
 */
function useMapView(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const [view, setView] = useState<MapView>(HOME);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        const k = Math.min(Math.max(v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1), 14);
        // Zoom about the pointer, not about the corner, so the cell under the cursor stays there.
        const box = cv.getBoundingClientRect();
        const px = e.clientX - box.left;
        const py = e.clientY - box.top;
        const f = k / v.k;
        return { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
      });
    };
    const down = (e: PointerEvent) => {
      if (e.shiftKey) return; // shift-drag is the region select, handled by the panel
      drag.current = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      drag.current = { x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
    };
    const up = (e: PointerEvent) => {
      drag.current = null;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be gone */
      }
      cv.style.cursor = 'grab';
    };
    const reset = () => setView(HOME);
    const key = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 48 : 16;
      if (e.key === 'ArrowLeft') setView((v) => ({ ...v, tx: v.tx + step }));
      else if (e.key === 'ArrowRight') setView((v) => ({ ...v, tx: v.tx - step }));
      else if (e.key === 'ArrowUp') setView((v) => ({ ...v, ty: v.ty + step }));
      else if (e.key === 'ArrowDown') setView((v) => ({ ...v, ty: v.ty - step }));
      else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, k: Math.min(v.k * 1.2, 14) }));
      else if (e.key === '-' || e.key === '_') setView((v) => ({ ...v, k: Math.max(v.k / 1.2, 1) }));
      else if (e.key === 'Escape' || e.key === 'Home') reset();
      else return;
      e.preventDefault();
    };
    cv.style.cursor = 'grab';
    cv.tabIndex = 0;
    cv.addEventListener('wheel', wheel, { passive: false });
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('dblclick', reset);
    cv.addEventListener('keydown', key);
    return () => {
      cv.removeEventListener('wheel', wheel);
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('dblclick', reset);
      cv.removeEventListener('keydown', key);
    };
  }, [canvas]);

  return { view, reset: useCallback(() => setView(HOME), []) };
}

/** The positioned value readout every map shares. */
function Probe({ at }: { at: { x: number; y: number; html: string } | null }) {
  if (!at) return null;
  return (
    <div
      className="st-probe"
      style={{ left: at.x, top: at.y }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: at.html }}
    />
  );
}

/* ------------------------------------------------------------------ the plan --------------- */

export function PlanPanel({
  plan,
  loads,
  field,
  dark,
  lang = 'en',
}: {
  plan: Plan;
  loads: Load[];
  field: Field;
  dark: boolean;
  lang?: Lang;
}) {
  const t = T(lang);
  const ref = useRef<HTMLCanvasElement>(null);
  const { view, reset } = useMapView(ref);
  const [at, setAt] = useState<{ x: number; y: number; html: string } | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const W = field.nx * field.cell_m;
    const H = field.ny * field.cell_m;
    const P = palette();
    const draw = () => {
      // Fit the WHOLE pad into the box: sized by width alone a square site is taller than the
      // screen, which is what ran the plan and field views past the footer.
      const availW = cv.parentElement?.clientWidth ?? 600;
      const box = cv.parentElement?.clientHeight ?? 0;
      const availH = box > 200 ? box : Math.round(window.innerHeight * 0.58);
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
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = P.bg;
      g.fillRect(0, 0, cssW, cssH);
      // The reader's zoom and pan, then the metres-to-pixels scale.
      g.translate(view.tx, view.ty);
      g.scale(view.k * s, view.k * s);

      for (const a of plan.areas) {
        g.fillStyle = `color-mix(in srgb, ${P.accent} 12%, transparent)`;
        g.fillRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
        g.strokeStyle = P.accent;
        g.lineWidth = 1.2 / (view.k * s);
        g.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);

        // The reserved access corridor. Nothing is tipped on it, which is why the pile does not
        // grow over its own way in.
        const [ax, ay] = a.access;
        const cx = (a.x0 + a.x1) / 2;
        const cy = (a.y0 + a.y1) / 2;
        g.save();
        g.strokeStyle = `color-mix(in srgb, ${P.warn} 55%, transparent)`;
        g.lineWidth = a.ramp_width_m;
        g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(cx, cy);
        g.stroke();
        g.restore();
      }

      // Planned tip positions against where the truck actually stood.
      for (const l of loads) {
        if (!l.placed || l.px === undefined) continue;
        g.fillStyle = `color-mix(in srgb, ${P.fg} 28%, transparent)`;
        g.fillRect(l.px - 0.7, (l.py ?? 0) - 0.7, 1.4, 1.4);
        if ((l.offset ?? 0) > 0.5 && l.x !== undefined) {
          g.strokeStyle = `color-mix(in srgb, ${P.bad} 55%, transparent)`;
          g.lineWidth = 0.5;
          g.beginPath();
          g.moveTo(l.px, l.py ?? 0);
          g.lineTo(l.x, l.y ?? 0);
          g.stroke();
        }
      }
      for (const l of loads) {
        if (!l.placed || l.x === undefined) continue;
        g.fillStyle = l.phase === 'edge' ? P.warn : P.good;
        g.beginPath();
        g.arc(l.x, l.y ?? 0, 1.1, 0, Math.PI * 2);
        g.fill();
      }

      const [sx, sy] = plan.shovel;
      g.fillStyle = P.fg;
      g.beginPath();
      g.arc(sx, sy, 4, 0, Math.PI * 2);
      g.fill();
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [plan, loads, field, dark, view]);

  // THE NEAREST TIP UNDER THE CURSOR, in metres, with how far it moved from its planned spot.
  const probe = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = ref.current;
    if (!cv) return;
    const box = cv.getBoundingClientRect();
    const W = field.nx * field.cell_m;
    const H = field.ny * field.cell_m;
    const s = Math.min(box.width / W, box.height / H) * view.k;
    const mx = (e.clientX - box.left - view.tx) / s;
    const my = (e.clientY - box.top - view.ty) / s;
    let best: Load | null = null;
    let bd = Infinity;
    for (const l of loads) {
      if (!l.placed || l.x === undefined) continue;
      const d = (l.x - mx) ** 2 + ((l.y ?? 0) - my) ** 2;
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    if (!best || Math.sqrt(bd) > 12) {
      setAt(null);
      return;
    }
    setAt({
      x: Math.min(e.clientX - box.left + 14, box.width - 200),
      y: Math.min(e.clientY - box.top + 14, box.height - 84),
      html:
        `<b>${t('load', 'carga')} ${best.seq}</b>` +
        `<span>${t('grade', 'ley')} ${best.grade.toFixed(4)}</span>` +
        `<span>x ${(best.x ?? 0).toFixed(0)} m &middot; y ${(best.y ?? 0).toFixed(0)} m</span>` +
        `<span>${t('moved from plan', 'movida del plan')} ${(best.offset ?? 0).toFixed(1)} m</span>` +
        `<span>${best.phase === 'edge' ? t('edge tip', 'descarga de borde') : t('paddock tip', 'descarga en playa')}</span>`,
    });
  };

  const nEdge = loads.filter((l) => l.placed && l.phase === 'edge').length;
  const nMoved = loads.filter((l) => l.placed && (l.offset ?? 0) > 0.5).length;

  return (
    <div className={field.nx / field.ny > 1.35 ? 'st-planpanel st-wide-pad' : 'st-planpanel'}>
      <figure className="st-figure">
        <ChartBox>
          <canvas
            ref={ref}
            className="st-chartcanvas"
            aria-hidden="true"
            onPointerMove={probe}
            onPointerLeave={() => setAt(null)}
          />
          <Probe at={at} />
        </ChartBox>
        <figcaption className="st-figcap">
          {t(
            `The dump plan against where the trucks actually stood: ${nEdge} edge tips, and ${nMoved} loads spotted away from the planned position because the plan asked for ground no truck could stand on.`,
            `El plan de descarga contra donde los camiones realmente se pararon: ${nEdge} descargas de borde y ${nMoved} cargas ubicadas fuera de la posición planificada porque el plan pedía terreno donde ningún camión podía pararse.`,
          )}
        </figcaption>
      </figure>
      {/* THE AREA NAMES SIT OUTSIDE THE MAP. Drawing them onto the plan put nine-pixel type on top
          of the thing being measured, at whatever scale the map happened to be, and it obscured the
          tips in the corner it was anchored to. A map is a measurement; labels belong beside it. */}
      <ul className="st-arealist">
        {plan.areas.map((a) => (
          <li key={a.name}>
            <b>{a.name}</b>
            <span>
              {a.benches.length}{' '}
              {a.benches.length === 1 ? t('bench', 'banco') : t('benches', 'bancos')} ·{' '}
              {Math.round(a.x1 - a.x0)} x {Math.round(a.y1 - a.y0)} m
            </span>
          </li>
        ))}
      </ul>
      <p className="st-legend">
        <span className="st-key st-key-good" /> {t('paddock tip', 'descarga en playa')}
        <span className="st-key st-key-warn" /> {t('edge tip', 'descarga de borde')}
        <span className="st-key st-key-ramp" /> {t('reserved access ramp', 'rampa de acceso reservada')}
        <span className="st-key st-key-plan" /> {t('planned position', 'posición planificada')}
      </p>
      <p className="st-note">
        {t(
          'Grey marks are where the plan asked for the load; a line to a coloured mark is where the truck could actually stand. Fresh material stands at the angle of repose and a haul truck works to roughly two thirds of that, so a truck never stands on what was just tipped.',
          'Las marcas grises son donde el plan pidió la carga; una línea a una marca de color es donde el camión realmente pudo pararse. El material fresco se para en el ángulo de reposo y un camión trabaja hasta unos dos tercios de eso, así que nunca se para sobre lo recién descargado.',
        )}
      </p>
      <p className="st-hint">
        {t(
          'Wheel to zoom, drag to pan, double click to reset, hover for the load under the cursor.',
          'Rueda para acercar, arrastra para desplazar, doble clic para reiniciar, pasa el cursor para leer la carga.',
        )}{' '}
        <button type="button" className="st-linkbtn" onClick={reset}>
          {t('reset view', 'reiniciar vista')}
        </button>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- the raw field ------------- */

export type FieldVar = 'grade' | 'coarse' | 'thickness' | 'lift' | 'ground';

const FIELD_VARS: {
  key: FieldVar;
  label: { en: string; es: string };
  caption: { en: string; es: string };
  unit: { en: string; es: string };
}[] = [
  {
    key: 'grade',
    label: { en: 'grade', es: 'ley' },
    caption: { en: 'grade, what the plant receives', es: 'ley, lo que recibe la planta' },
    unit: { en: 'g/t', es: 'g/t' },
  },
  {
    key: 'coarse',
    label: { en: 'coarse fraction', es: 'fracción gruesa' },
    caption: {
      en: 'coarse fraction, what segregation did on each face',
      es: 'fracción gruesa, lo que hizo la segregación en cada cara',
    },
    unit: { en: 'fraction', es: 'fracción' },
  },
  {
    key: 'thickness',
    label: { en: 'thickness', es: 'espesor' },
    caption: {
      en: 'thickness of material above the ORIGINAL ground',
      es: 'espesor de material sobre el terreno ORIGINAL',
    },
    unit: { en: 'm', es: 'm' },
  },
  {
    key: 'lift',
    label: { en: 'surface elevation', es: 'cota de superficie' },
    caption: {
      en: 'surface elevation, ground plus material',
      es: 'cota de superficie, terreno más material',
    },
    unit: { en: 'm', es: 'm' },
  },
  {
    key: 'ground',
    label: { en: 'original ground', es: 'terreno original' },
    caption: {
      en: 'the landform before a single load was placed',
      es: 'el relieve antes de colocar una sola carga',
    },
    unit: { en: 'm', es: 'm' },
  },
];

/** TWO LINKED MAPS, each with its own selector, plus a linked profile of whatever is selected. */
export function FieldPanel({
  field,
  dark,
  lang = 'en',
}: {
  field: Field;
  by?: string;
  dark: boolean;
  lang?: Lang;
}) {
  const t = T(lang);
  // TWO MAPS, SIDE BY SIDE, EACH WITH ITS OWN SELECTOR.
  //
  // Three fixed thumbnails is not a comparison, it is a contact sheet: the reader gets whatever three
  // views someone chose, at a third of the width each, and cannot ask the one question this panel
  // exists for, which is "does THIS vary with THAT". Two maps at half width are legible, and letting
  // each one choose its variable means every pair is available instead of one fixed triple.
  const [left, setLeft] = useState<FieldVar>('grade');
  const [right, setRight] = useState<FieldVar>('coarse');

  return (
    <div className={field.nx / field.ny > 1.35 ? 'st-fieldpanel st-wide-pad' : 'st-fieldpanel'}>
      <div className="st-pair">
        {([[left, setLeft, 'left'], [right, setRight, 'right']] as const).map(([v, set, side]) => (
          <figure key={side} className="st-figure">
            <label className="st-sel">
              <span>{t('show', 'mostrar')}</span>
              <select value={v} onChange={(e) => set(e.target.value as FieldVar)}>
                {FIELD_VARS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label[lang]}
                  </option>
                ))}
              </select>
            </label>
            <FieldMap field={field} by={v} dark={dark} lang={lang} />
            <figcaption className="st-figcap">
              {FIELD_VARS.find((o) => o.key === v)?.caption[lang]}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="st-note">
        {t(
          'The same pile, two variables at a time. A cell with no material is drawn as pad, never as material at grade zero: that confusion once made an empty pad read as a full pile.',
          'La misma pila, dos variables a la vez. Una celda sin material se dibuja como plataforma, nunca como material con ley cero: esa confusión una vez hizo que una plataforma vacía se leyera como una pila llena.',
        )}
      </p>
    </div>
  );
}

function FieldMap({
  field,
  by,
  dark,
  lang,
}: {
  field: Field;
  by: FieldVar;
  dark: boolean;
  lang: Lang;
}) {
  const t = T(lang);
  const ref = useRef<HTMLCanvasElement>(null);
  const { view, reset } = useMapView(ref);
  const [at, setAt] = useState<{ x: number; y: number; html: string } | null>(null);
  // THE COLOUR SCALE IS ADJUSTABLE. A field with one hot cell puts everything else in the bottom
  // eighth of the ramp, and a reader cannot see the structure that is actually there. Clipping at a
  // percentile is the standard answer and the rubric requires it be exposed, not hardcoded.
  const [clip, setClip] = useState<[number, number]>([0, 100]);
  /** A rectangle the reader shift-dragged, driving the linked profile beneath the map. */
  const [sel, setSel] = useState<{ i0: number; j0: number; i1: number; j1: number } | null>(null);
  const selDrag = useRef<{ i: number; j: number } | null>(null);

  const meta = FIELD_VARS.find((o) => o.key === by)!;

  const { vals, lo, hi } = useMemo(() => {
    const thick = field.z.map((v, i) => v - field.z0[i]);
    // `lift` and `ground` are drawn EVERYWHERE, including on bare pad, because a landform is there
    // whether or not anything was tipped on it. The other three are properties OF THE MATERIAL, so
    // they are null where there is none.
    const v: (number | null)[] =
      by === 'grade'
        ? field.grade.map((g, i) => (thick[i] > EMPTY ? g : null))
        : by === 'coarse'
          ? field.coarse.map((c, i) => (thick[i] > EMPTY ? c : null))
          : by === 'thickness'
            ? thick.map((x) => (x > EMPTY ? x : null))
            : by === 'lift'
              ? field.z.slice()
              : field.z0.slice();
    const present = v.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    const q = (p: number) =>
      present.length ? present[Math.min(present.length - 1, Math.floor((p / 100) * (present.length - 1)))] : 0;
    return { vals: v, lo: q(clip[0]), hi: q(clip[1]) };
  }, [field, by, clip]);

  /** Mean of the selected rectangle, column by column: the linked 1-D view. */
  const profile = useMemo(() => {
    if (!sel) return null;
    const i0 = Math.min(sel.i0, sel.i1);
    const i1 = Math.max(sel.i0, sel.i1);
    const j0 = Math.min(sel.j0, sel.j1);
    const j1 = Math.max(sel.j0, sel.j1);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = i0; i <= i1; i += 1) {
      let s = 0;
      let n = 0;
      for (let j = j0; j <= j1; j += 1) {
        const v = vals[j * field.nx + i];
        if (v !== null && Number.isFinite(v)) {
          s += v;
          n += 1;
        }
      }
      xs.push(i * field.cell_m);
      ys.push(n ? s / n : NaN);
    }
    return { xs, ys, cells: (i1 - i0 + 1) * (j1 - j0 + 1) };
  }, [sel, vals, field.nx, field.cell_m]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const P = palette();
    const draw = () => {
      // MEASURE THE HOST, not a fraction of the window. The host is a ChartBox: its height comes
      // from the layout and the canvas inside it is out of flow, so reading it cannot feed back.
      const availW = cv.parentElement?.clientWidth ?? 600;
      const availH = Math.max(220, cv.parentElement?.clientHeight ?? 400);
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
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = P.bg;
      g.fillRect(0, 0, cssW, cssH);
      g.translate(view.tx, view.ty);
      g.scale(view.k * s, view.k * s);
      const bare = `color-mix(in srgb, ${P.fg} 14%, transparent)`;
      for (let j = 0; j < field.ny; j++) {
        for (let i = 0; i < field.nx; i++) {
          const k = j * field.nx + i;
          const v = vals[k];
          // No material means pad, not "material at zero". That confusion shipped once.
          g.fillStyle =
            v === null || !Number.isFinite(v) ? bare : ramp((v - lo) / (hi - lo || 1));
          g.fillRect(i, j, 1.02, 1.02);
        }
      }
      if (sel) {
        g.strokeStyle = P.accent;
        g.lineWidth = 1.6 / (view.k * s);
        g.strokeRect(
          Math.min(sel.i0, sel.i1),
          Math.min(sel.j0, sel.j1),
          Math.abs(sel.i1 - sel.i0) + 1,
          Math.abs(sel.j1 - sel.j0) + 1,
        );
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [field, vals, lo, hi, dark, view, sel]);

  /** Client coordinates to a cell index, through the reader's zoom and pan. */
  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = ref.current;
    if (!cv) return null;
    const box = cv.getBoundingClientRect();
    const s = (Math.min(box.width / field.nx, box.height / field.ny) * view.k) || 1;
    const i = Math.floor((e.clientX - box.left - view.tx) / s);
    const j = Math.floor((e.clientY - box.top - view.ty) / s);
    if (i < 0 || j < 0 || i >= field.nx || j >= field.ny) return null;
    return { i, j, box };
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = cellAt(e);
    if (!c) {
      setAt(null);
      return;
    }
    if (selDrag.current) setSel({ ...selDrag.current, i1: c.i, j1: c.j } as never);
    const v = vals[c.j * field.nx + c.i];
    setAt({
      x: Math.min(e.clientX - c.box.left + 14, c.box.width - 172),
      y: Math.min(e.clientY - c.box.top + 14, c.box.height - 64),
      html:
        `<b>${v === null || !Number.isFinite(v) ? t('bare ground', 'suelo desnudo') : `${v.toFixed(by === 'grade' || by === 'coarse' ? 4 : 2)} ${meta.unit[lang]}`}</b>` +
        `<span>${meta.label[lang]}</span>` +
        `<span>x ${(c.i * field.cell_m).toFixed(0)} m &middot; y ${(c.j * field.cell_m).toFixed(0)} m</span>`,
    });
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) return;
    const c = cellAt(e);
    if (!c) return;
    selDrag.current = { i: c.i, j: c.j };
    setSel({ i0: c.i, j0: c.j, i1: c.i, j1: c.j });
  };

  const onUp = () => {
    selDrag.current = null;
  };

  return (
    <div className="st-map">
      <ChartBox>
        <canvas
          ref={ref}
          className="st-chartcanvas"
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerLeave={() => setAt(null)}
        />
        <Probe at={at} />
      </ChartBox>
      <p className="st-legend">
        <span className="st-scale" style={{ background: `linear-gradient(to right, ${rgbCss(viridis(0))}, ${rgbCss(viridis(0.25))}, ${rgbCss(viridis(0.5))}, ${rgbCss(viridis(0.75))}, ${rgbCss(viridis(1))})` }} />
        <span>
          {lo.toFixed(3)} {t('to', 'a')} {hi.toFixed(3)} {meta.unit[lang]}
        </span>
      </p>
      <div className="st-cuts">
        <label title={t('Clip the colour scale at a low percentile so one cold cell does not compress the ramp.', 'Recorta la escala de color en un percentil bajo para que una celda fría no comprima la rampa.')}>
          <span>{t('clip low', 'recorte bajo')}</span>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={clip[0]}
            onChange={(e) => setClip([Number(e.target.value), clip[1]])}
          />
          <b>{clip[0]}%</b>
        </label>
        <label title={t('Clip the colour scale at a high percentile so one hot cell does not compress the ramp.', 'Recorta la escala de color en un percentil alto para que una celda caliente no comprima la rampa.')}>
          <span>{t('clip high', 'recorte alto')}</span>
          <input
            type="range"
            min={80}
            max={100}
            step={1}
            value={clip[1]}
            onChange={(e) => setClip([clip[0], Number(e.target.value)])}
          />
          <b>{clip[1]}%</b>
        </label>
        <button type="button" className="st-linkbtn" onClick={() => { reset(); setSel(null); setClip([0, 100]); }}>
          {t('reset view', 'reiniciar vista')}
        </button>
      </div>
      <p className="st-hint">
        {t(
          'Wheel to zoom, drag to pan, shift-drag to select a region, double click to reset. Focus the map and use the arrow keys, plus and minus.',
          'Rueda para acercar, arrastra para desplazar, shift y arrastra para seleccionar una región, doble clic para reiniciar. Enfoca el mapa y usa las flechas, más y menos.',
        )}
      </p>
      {profile && profile.xs.length > 1 && (
        <UPlotChart
          x={profile.xs}
          series={[{ label: meta.label[lang], values: profile.ys }]}
          height={150}
          xLabel={t('easting', 'este')}
          xUnit="m"
          yLabel={meta.label[lang]}
          unit={meta.unit[lang]}
          caption={t(
            `Mean ${meta.label.en} across the selected region, ${profile.cells} cells, column by column.`,
            `${meta.label.es} media en la región seleccionada, ${profile.cells} celdas, columna por columna.`,
          )}
          ariaSummary={t('Profile of the selected region, as a table', 'Perfil de la región seleccionada, como tabla')}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- one dump in detail ---------- */

function EnvelopeChart({
  stats,
  lang,
}: {
  stats: { profile: string; n: number; len: number; wid: number; thick: number }[];
  lang: Lang;
}) {
  const t = T(lang);
  // WHAT THIS BUILD PRODUCED, PLOTTED INSIDE THE ENVELOPE MEASURED ACROSS 28 REAL DUMPS. A point
  // outside the shaded band is the operator drifting from the measurements it was fitted to, which
  // is the kill criterion the plan states, so the drift is MARKED rather than left to the eye.
  const rows = stats.filter((r) => r.len > 0);
  const x = rows.map((r) => r.len);
  const order = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
  const xs = order.map((i) => x[i]);
  const series = order.map((oi, k) => ({
    label: `${rows[oi].profile.replace('_', ' ')} (${rows[oi].n})`,
    values: order.map((_, kk) => (kk === k ? rows[oi].wid : NaN)),
  }));
  const outside = rows.filter(
    (r) =>
      r.profile !== 'paddock' &&
      !(
        r.len >= MEASURED.length[0] &&
        r.len <= MEASURED.length[1] &&
        r.wid >= MEASURED.width[0] &&
        r.wid <= MEASURED.width[1]
      ),
  );
  return (
    <UPlotChart
      x={xs}
      series={series}
      alwaysPoints
      decimals={1}
      bands={[
        {
          label: t('measured envelope', 'envolvente medida'),
          lo: xs.map(() => MEASURED.width[0]),
          hi: xs.map(() => MEASURED.width[1]),
        },
      ]}
      markers={[
        { x: MEASURED.length[0], label: `${t('measured min length', 'largo mínimo medido')} ${MEASURED.length[0]} m` },
        { x: MEASURED.length[1], label: `${t('measured max length', 'largo máximo medido')} ${MEASURED.length[1]} m` },
        ...outside.map((r) => ({
          x: r.len,
          label: `${r.profile.replace('_', ' ')}: ${t('outside envelope', 'fuera de la envolvente')}`,
        })),
      ]}
      height={300}
      xLabel={t('length', 'largo')}
      xUnit="m"
      yLabel={t('width', 'ancho')}
      unit="m"
      caption={t(
        `Each profile this build produced, against the width envelope of 28 UAV-surveyed dumps. ${outside.length === 0 ? 'Every cascade profile falls inside it.' : `${outside.length} profile(s) fall outside it and are marked.`}`,
        `Cada perfil que produjo esta construcción, contra la envolvente de ancho de 28 descargas levantadas con UAV. ${outside.length === 0 ? 'Todos los perfiles de cascada caen dentro.' : `${outside.length} perfil(es) caen fuera y están marcados.`}`,
      )}
      ariaSummary={t('Profile dimensions, as a table', 'Dimensiones de los perfiles, como tabla')}
    />
  );
}

  /* NO `dark` PROP. This chart goes through UPlotChart, which subscribes to the shell's theme store
     and re-reads its CSS variables itself; a boolean threaded down from the page would be a second,
     redundant source of truth for the same fact. The two canvas MAPS still take one, because they
     paint their own pixels and need a redraw trigger. */
export function DumpDetailPanel({ sc, lang = 'en' }: { sc: Scenario; lang?: Lang }) {
  const t = T(lang);
  const stats = useMemo(() => profileStats(sc), [sc]);
  const seg = useMemo(() => segregationSummary(sc), [sc]);
  const inBand = (v: number, [a, b]: readonly [number, number]) => v >= a && v <= b;

  return (
    <div className="st-detail">
      <EnvelopeChart stats={stats} lang={lang} />
      <p className="st-note">
        {t(
          'A truck dump is not a disc. Twenty-eight real dumps surveyed by drone photogrammetry fall into four shapes, and which one forms is decided by how far the truck stood from the crest: far away gives a sloughed heap, against the crest gives a comet, an oval or a rectangle. The table compares what this build produced against those measurements.',
          'Una descarga de camión no es un disco. Veintiocho descargas reales levantadas por fotogrametría con dron caen en cuatro formas, y cuál se forma lo decide qué tan lejos de la cresta se paró el camión: lejos da un montón desmoronado, contra la cresta da un cometa, un óvalo o un rectángulo. La tabla compara lo que produjo esta construcción contra esas mediciones.',
        )}
      </p>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>{t('profile', 'perfil')}</th>
              <th>{t('loads', 'cargas')}</th>
              <th>{t('length m', 'largo m')}</th>
              <th>{t('width m', 'ancho m')}</th>
              <th>{t('thickness m', 'espesor m')}</th>
              <th>{t('in the measured envelope', 'en la envolvente medida')}</th>
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
                      <span className="st-muted">{t('heap, not a cascade', 'montón, no cascada')}</span>
                    ) : ok ? (
                      <span className="st-ok">{t('yes', 'sí')}</span>
                    ) : (
                      <span className="st-bad">{t('NO', 'NO')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="st-ref">
              <td>{t('measured', 'medido')}</td>
              <td>28</td>
              <td>
                {MEASURED.length[0]} {t('to', 'a')} {MEASURED.length[1]}
              </td>
              <td>
                {MEASURED.width[0]} {t('to', 'a')} {MEASURED.width[1]}
              </td>
              <td>
                {MEASURED.thickness[0]} {t('to', 'a')} {MEASURED.thickness[1]}
              </td>
              <td className="st-muted">{MEASURED.source}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4>{t('Size segregation down the face', 'Segregación granulométrica cara abajo')}</h4>
      <p className="st-note">
        {t(
          'A cascading load sorts itself: coarse runs to the toe, fines stay near the crest, and part of the coarse rolls beyond the toe entirely. It gets stronger with drop height and face angle. A load tipped on flat ground does not sort at all, which is why the paddock heaps report zero.',
          'Una carga que cascadea se clasifica sola: el grueso corre al pie, el fino queda cerca de la cresta y parte del grueso rueda más allá del pie. Se intensifica con la altura de caída y el ángulo de la cara. Una carga descargada en terreno plano no se clasifica, por eso los montones en playa reportan cero.',
        )}
      </p>
      <dl className="st-stats">
        <div>
          <dt>{t('loads that sorted on a face', 'cargas que se clasificaron en una cara')}</dt>
          <dd>{seg.nSorted}</dd>
        </div>
        <div>
          <dt>{t('mean intensity', 'intensidad media')}</dt>
          <dd>{seg.meanIntensity.toFixed(3)}</dd>
        </div>
        <div>
          <dt>{t('mean drop', 'caída media')}</dt>
          <dd>{seg.meanDrop.toFixed(1)} m</dd>
        </div>
        <div>
          <dt>{t('coarse past the toe', 'grueso más allá del pie')}</dt>
          <dd>{(seg.meanOverrun * 100).toFixed(1)} %</dd>
        </div>
        <div>
          <dt>{t('coarse fraction across the pile', 'fracción gruesa en la pila')}</dt>
          <dd>
            {seg.coarseMin.toFixed(3)} {t('to', 'a')} {seg.coarseMax.toFixed(3)}
          </dd>
        </div>
      </dl>
      <p className="st-note">
        {t(
          'Published guidance limits conical stockpiles to 10 to 12 m because each additional metre increases percolation segregation. This pile is shorter than that, so a low intensity here is the correct answer rather than a weak model.',
          'La guía publicada limita las pilas cónicas a 10 a 12 m porque cada metro adicional aumenta la segregación por percolación. Esta pila es más baja que eso, así que una intensidad baja aquí es la respuesta correcta y no un modelo débil.',
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- sectors ----------------- */

  /* NO `dark` PROP. This chart goes through UPlotChart, which subscribes to the shell's theme store
     and re-reads its CSS variables itself; a boolean threaded down from the page would be a second,
     redundant source of truth for the same fact. The two canvas MAPS still take one, because they
     paint their own pixels and need a redraw trigger. */
export function SectorPanel({ sectors, lang = 'en' }: { sectors: Sector[]; lang?: Lang }) {
  const t = T(lang);
  // Every quadrant of every area, so a reader SEES the spread that one sector grade hides.
  const rows = useMemo(() => {
    const out: { label: string; grade: number; ci: number; whole: boolean }[] = [];
    for (const s of sectors) {
      out.push({ label: s.name, grade: s.grade, ci: s.ci['0.95'] ?? 0, whole: true });
      for (const q of s.quadrants) {
        out.push({
          label: q.name.replace(`${s.name} `, ''),
          grade: q.grade,
          ci: q.ci['0.95'] ?? 0,
          whole: false,
        });
      }
    }
    return out;
  }, [sectors]);

  if (!rows.length) return null;

  const x = rows.map((_, i) => i);
  const gradeAll = rows.map((r) => r.grade);
  const wholeMean =
    sectors.length > 0 ? sectors.reduce((a, s) => a + s.grade, 0) / sectors.length : 0;
  // The overlap the interval plot exists to show, stated rather than left to the eye.
  const spread = Math.max(...gradeAll) - Math.min(...gradeAll);

  return (
    <div>
      <UPlotChart
        x={x}
        xLabels={rows.map((r) => r.label.slice(0, 22))}
        series={[{ label: t('grade', 'ley'), values: gradeAll }]}
        alwaysPoints
        bands={[
          {
            label: t('95 percent interval on the mean', 'intervalo del 95 por ciento sobre la media'),
            lo: rows.map((r) => r.grade - r.ci),
            hi: rows.map((r) => r.grade + r.ci),
          },
        ]}
        markers={[
          { y: wholeMean, label: `${t('mean of the whole areas', 'media de las áreas completas')} ${wholeMean.toFixed(4)}` },
        ]}
        height={320}
        xLabel={t('area and quadrant', 'área y cuadrante')}
        yLabel={t('grade', 'ley')}
        caption={t(
          `Each area and each of its quadrants, with the 95 percent interval on the mean. The quadrants span ${spread.toFixed(4)} of grade, which is the spread one sector number hides.`,
          `Cada área y cada uno de sus cuadrantes, con el intervalo del 95 por ciento sobre la media. Los cuadrantes abarcan ${spread.toFixed(4)} de ley, que es la dispersión que oculta un solo número por sector.`,
        )}
        ariaSummary={t('Sector grades and intervals, as a table', 'Leyes e intervalos por sector, como tabla')}
      />
      <p className="st-note">
        {t(
          'A sector reports one grade. The raw field underneath is stratified, and the reclaim sequence decides which of the two the plant actually experiences. The interval is on the mean, and the quadrant rows are the published comparison: an interpolated model is smoother than the observations it was built from, so its interval is narrower in every region.',
          'Un sector reporta una ley. El campo crudo debajo está estratificado, y la secuencia de recuperación decide cuál de los dos experimenta la planta. El intervalo es sobre la media, y las filas por cuadrante son la comparación publicada: un modelo interpolado es más suave que las observaciones con que se construyó, así que su intervalo es más angosto en cada región.',
        )}
      </p>
      <div className="st-tablewrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>{t('area', 'área')}</th>
              <th>{t('class', 'clase')}</th>
              <th>{t('tonnes', 'toneladas')}</th>
              <th>{t('grade', 'ley')}</th>
              <th>{t('sd', 'de')}</th>
              <th>n</th>
              <th>{t('95 % half-width', 'semiancho 95 %')}</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.class}</td>
                <td>{Math.round(s.tonnes).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US')}</td>
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
          <h4>
            {s.name}, {t('by quadrant', 'por cuadrante')}
          </h4>
          <div className="st-tablewrap">
            <table className="st-table st-compact">
              <thead>
                <tr>
                  <th>{t('region', 'región')}</th>
                  <th>{t('grade', 'ley')}</th>
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

  /* NO `dark` PROP. This chart goes through UPlotChart, which subscribes to the shell's theme store
     and re-reads its CSS variables itself; a boolean threaded down from the page would be a second,
     redundant source of truth for the same fact. The two canvas MAPS still take one, because they
     paint their own pixels and need a redraw trigger. */
export function ReclaimPanel({
  sc,
  lang = 'en',
  knobs,
  gt,
}: {
  sc: Scenario;
  lang?: Lang;
  /** The rail's live knob setting, so this chart shows what the reader is actually asking about. */
  knobs?: Knobs;
  gt?: GradeTonnage | null;
}) {
  const t = T(lang);
  const k = knobs ?? { batch: 1, threshold: 0, cutoff: 0 };
  const v = useMemo(() => verdictAt(sc, k), [sc, k.batch, k.threshold, k.cutoff]);

  // THE TWO STREAMS ON ONE AXIS, resampled onto a common sequence coordinate so a load index and a
  // cut index can share an x. The cut stream is drawn at the knob setting: with surge averaging on,
  // this IS what the mill sees.
  const { x, inS, outS } = useMemo(() => {
    const inG = sc.loads.filter((l) => l.placed).map((l) => l.grade);
    const kept = k.cutoff > 0 ? sc.cuts.filter((c) => c.grade >= k.cutoff) : sc.cuts;
    const outG = batchCuts(kept, k.batch).map((c) => c.grade);
    const n = Math.max(inG.length, outG.length, 2);
    const at = (a: number[], i: number) =>
      a.length ? a[Math.min(a.length - 1, Math.round((i / (n - 1)) * (a.length - 1)))] : NaN;
    const xs: number[] = [];
    const A: number[] = [];
    const B: number[] = [];
    for (let i = 0; i < n; i += 1) {
      xs.push((i / (n - 1)) * 100);
      A.push(at(inG, i));
      B.push(at(outG, i));
    }
    return { x: xs, inS: A, outS: B };
  }, [sc, k.batch, k.cutoff]);

  return (
    <div>
      <UPlotChart
        x={x}
        series={[
          { label: t('grade in, per load', 'ley de entrada, por carga'), values: inS, width: 1 },
          { label: t('grade out, per batch', 'ley de salida, por lote'), values: outS, width: 2.2 },
        ]}
        markers={[
          // THE DETECTIONS DRAWN ON THE CHART, not printed beside it. An undecorated chart makes the
          // analyst do the algorithm's job by eye.
          { y: v.meanGradeIn, label: `${t('mean grade in', 'ley media de entrada')} ${v.meanGradeIn.toFixed(4)}` },
          ...(k.cutoff > 0
            ? [{ y: k.cutoff, label: `${t('cutoff', 'ley de corte')} ${k.cutoff.toFixed(3)}` }]
            : []),
        ]}
        height={300}
        xLabel={t('through the campaign', 'a través de la campaña')}
        xUnit="%"
        yLabel={t('grade', 'ley')}
        caption={t(
          `The feed the pile received against the stream it gave back${k.batch > 1 ? `, averaged ${Math.round(k.batch)} cuts at a time` : ''}. Variance reduction ${v.vrr.toFixed(3)}${v.boundReliable ? `, against an ideal bound of ${v.ideal.toFixed(3)}` : ', with the ideal bound withheld'}.`,
          `La alimentación que recibió la pila contra el flujo que devolvió${k.batch > 1 ? `, promediado de a ${Math.round(k.batch)} cortes` : ''}. Reducción de varianza ${v.vrr.toFixed(3)}${v.boundReliable ? `, contra una cota ideal de ${v.ideal.toFixed(3)}` : ', con la cota ideal omitida'}.`,
        )}
        ariaSummary={t('Feed and reclaim grades, as a table', 'Leyes de alimentación y recuperación, como tabla')}
      />
      <dl className="st-stats">
        <div>
          <dt>{t('variance in', 'varianza de entrada')}</dt>
          <dd>{v.varIn.toExponential(3)}</dd>
        </div>
        <div>
          <dt>{t('variance out', 'varianza de salida')}</dt>
          <dd>{v.varOut.toExponential(3)}</dd>
        </div>
        <div>
          <dt>{t('variance reduction', 'reducción de varianza')}</dt>
          <dd>{v.vrr.toFixed(3)}</dd>
        </div>
        <div>
          <dt>{t('independent-layer bound', 'cota de capas independientes')}</dt>
          <dd>{v.ideal.toFixed(3)}</dd>
        </div>
        <div>
          <dt>{t('efficiency against the bound', 'eficiencia contra la cota')}</dt>
          <dd>
            {v.boundReliable
              ? `${(v.efficiency * 100).toFixed(0)} %`
              : t('not reliable', 'no confiable')}
          </dd>
        </div>
        <div>
          <dt>{t('mean sources per batch', 'fuentes medias por lote')}</dt>
          <dd>{v.nLayers.toFixed(1)}</dd>
        </div>
      </dl>

      {gt && (
        <>
          <h4>{t('The grade-tonnage curve, at this cutoff', 'La curva ley-tonelaje, a esta ley de corte')}</h4>
          <UPlotChart
            x={gt.curve.map((p) => p.cutoff)}
            series={[
              { label: t('ore grade', 'ley del mineral'), values: gt.curve.map((p) => p.grade) },
            ]}
            markers={[
              ...(k.cutoff > 0
                ? [{ x: k.cutoff, label: `${t('cutoff', 'ley de corte')} ${k.cutoff.toFixed(3)}` }]
                : []),
            ]}
            height={220}
            xLabel={t('cutoff grade', 'ley de corte')}
            yLabel={t('ore grade', 'ley del mineral')}
            caption={t(
              `At the current cutoff, ${Math.round(gt.ore).toLocaleString('en-US')} t goes to the mill at ${gt.oreGrade.toFixed(4)} and ${Math.round(gt.waste).toLocaleString('en-US')} t goes to waste at ${gt.waste > 0 ? gt.wasteGrade.toFixed(4) : '0'}, keeping ${(gt.recovery * 100).toFixed(1)} percent of the reclaimed metal.`,
              `A la ley de corte actual, ${Math.round(gt.ore).toLocaleString('es-CL')} t van a la planta con ley ${gt.oreGrade.toFixed(4)} y ${Math.round(gt.waste).toLocaleString('es-CL')} t van a lastre con ley ${gt.waste > 0 ? gt.wasteGrade.toFixed(4) : '0'}, conservando el ${(gt.recovery * 100).toFixed(1)} por ciento del metal recuperado.`,
            )}
            ariaSummary={t('Grade-tonnage curve, as a table', 'Curva ley-tonelaje, como tabla')}
          />
        </>
      )}

      <p className="st-note">
        {t(
          'Variance reduction is var out over var in, so lower is better and one means the pile did nothing. It is shown against the ideal bound for the number of independent sources each cut actually drew from, because the ideal is typically three to four times better than any real bed achieves and a ratio quoted alone reads far more flattering than it is. Both numbers are computed in this page from the load log and the cut log, not read from the file.',
          'La reducción de varianza es varianza de salida sobre varianza de entrada, así que menor es mejor y uno significa que la pila no hizo nada. Se muestra contra la cota ideal para el número de fuentes independientes de las que realmente tomó cada corte, porque el ideal suele ser tres a cuatro veces mejor que cualquier cama real y una razón citada sola se lee mucho más favorable de lo que es. Ambos números se calculan en esta página desde el registro de cargas y el de cortes, no se leen del archivo.',
        )}
      </p>
      {!v.boundReliable && (
        <p className="st-note">
          <strong>
            {t(
              'The bound is withheld for this case, and that is a known gap rather than a result.',
              'La cota se omite para este caso, y eso es una brecha conocida y no un resultado.',
            )}
          </strong>{' '}
          {t(
            'The achieved reduction comes out better than one over the number of independent sources counted from cut provenance, which is arithmetically impossible: it says the source count is being underestimated, not that the pile beat the theoretical limit. Until that is root-caused the efficiency is not shown, because a headline claiming several thousand percent of the ideal would be worse than no headline at all.',
            'La reducción lograda resulta mejor que uno sobre el número de fuentes independientes contadas desde la procedencia de los cortes, lo que es aritméticamente imposible: dice que el conteo de fuentes está subestimado, no que la pila haya superado el límite teórico. Hasta encontrar la causa raíz, la eficiencia no se muestra, porque un titular que reclame varios miles por ciento del ideal sería peor que ningún titular.',
          )}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- the variogram -------------- */

  /* NO `dark` PROP. This chart goes through UPlotChart, which subscribes to the shell's theme store
     and re-reads its CSS variables itself; a boolean threaded down from the page would be a second,
     redundant source of truth for the same fact. The two canvas MAPS still take one, because they
     paint their own pixels and need a redraw trigger. */
export function VariogramPanel({ sc, lang = 'en' }: { sc: Scenario; lang?: Lang }) {
  const t = T(lang);
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

  // THE RANGE, MARKED. The lag at which the semivariogram first reaches 95 percent of its sill is
  // the range, and it is the number this whole panel exists to report; printing it in the prose
  // underneath and leaving the chart undecorated makes the reader find it by eye.
  const sill = vg.gamma.length ? Math.max(...vg.gamma) : 0;
  const rangeIdx = vg.gamma.findIndex((g) => g >= 0.95 * sill);
  const rangeAt = rangeIdx >= 0 ? vg.centres[rangeIdx] : null;
  const measured = sc.manifest.stream.measured_range_t;

  if (!vg.centres.length) return null;

  return (
    <div>
      <UPlotChart
        x={vg.centres}
        series={[{ label: t('semivariance', 'semivarianza'), values: vg.gamma }]}
        markers={[
          { y: sill, label: `${t('sill', 'meseta')} ${sill.toExponential(2)}` },
          ...(rangeAt !== null
            ? [{ x: rangeAt, label: `${t('range', 'alcance')} ${rangeAt.toFixed(0)} t` }]
            : []),
          { x: measured, label: `${t('shovel dwell, measured', 'permanencia de pala, medida')} ${measured.toFixed(0)} t` },
        ]}
        height={300}
        xLabel={t('lag', 'retardo')}
        xUnit="t"
        yLabel={t('semivariance', 'semivarianza')}
        decimals={6}
        caption={t(
          `The experimental semivariogram of the incoming stream. Its range${rangeAt !== null ? ` of about ${rangeAt.toFixed(0)} t` : ''} is a consequence of the shovel dwelling ${measured.toFixed(0)} t in one dig block, not a setting.`,
          `El semivariograma experimental del flujo entrante. Su alcance${rangeAt !== null ? ` de unas ${rangeAt.toFixed(0)} t` : ''} es consecuencia de que la pala permanezca ${measured.toFixed(0)} t en un bloque, no un parámetro.`,
        )}
        ariaSummary={t('Semivariogram lags, as a table', 'Retardos del semivariograma, como tabla')}
      />
      <p className="st-note">
        {t(
          'The semivariogram of the incoming stream, computed here from the load log. Its range is a CONSEQUENCE of how long the shovel dwells in one dig block, not a setting: consecutive trucks load from the same block, so consecutive grades are similar. The predecessor took this range as an input, which had the causality backwards.',
          'El semivariograma del flujo entrante, calculado aquí desde el registro de cargas. Su alcance es CONSECUENCIA de cuánto permanece la pala en un bloque de extracción, no un parámetro: los camiones consecutivos cargan del mismo bloque, así que las leyes consecutivas se parecen. El predecesor tomaba este alcance como entrada, lo que invertía la causalidad.',
        )}
      </p>
    </div>
  );
}

export type { Cut, Load, Sector };
