import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useThemeStore } from '@fasl-work/caos-app-shell';
import { cssVar } from './colormap';

/**
 * The single 2-D charting primitive. uPlot per the visualization rubric: fastest cursor and zoom of
 * any JS chart library, Canvas2D so there is no WebGL context budget to blow, and built-in cursor sync
 * for linked brushing.
 *
 * TIER A IS BUILT IN, not optional per chart: zoom and pan by drag, double-click to reset, a crosshair
 * with a value readout in physical units, and correct rendering in BOTH themes. The theme colours are
 * READ FROM CSS VARIABLES on every theme change, because a canvas cannot resolve `var(--color-fg)` and
 * a chart with a variable name baked into a stroke silently draws nothing.
 *
 * A screen-reader data table accompanies every chart; the canvas itself is aria-hidden. A chart you
 * cannot tab into is unfinished.
 */
export interface Series {
  label: string;
  values: number[];
  colour?: string;
  /** dashed for a reference or a bound, solid for a measurement */
  dash?: boolean;
  fill?: boolean;
  width?: number;
}

export interface Band {
  label: string;
  lo: number[];
  hi: number[];
  colour?: string;
}

export interface Marker {
  /** x value in data units */
  x?: number;
  /** y value in data units */
  y?: number;
  label: string;
  colour?: string;
}

export function UPlotChart({
  x, series, bands = [], markers = [], height = 210, xLabel, yLabel, unit = '', xUnit = '',
  ariaSummary,
}: {
  x: number[];
  series: Series[];
  bands?: Band[];
  markers?: Marker[];
  height?: number;
  xLabel: string;
  yLabel: string;
  unit?: string;
  xUnit?: string;
  ariaSummary: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const plot = useRef<uPlot | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const el = host.current;
    if (!el || x.length === 0) return;

    const faint = cssVar('--color-fg-faint', '#8b949e');
    const border = cssVar('--color-border', '#30363d');
    const accent = cssVar('--color-accent', '#58a6ff');
    const palette = [accent, cssVar('--color-good', '#3fb950'), cssVar('--color-warn', '#d29922'),
      cssVar('--color-bad', '#f85149'), faint];

    const data: uPlot.AlignedData = [
      Float64Array.from(x),
      ...bands.flatMap((b) => [Float64Array.from(b.lo), Float64Array.from(b.hi)]),
      ...series.map((s) => Float64Array.from(s.values)),
    ] as unknown as uPlot.AlignedData;

    const bandSeries: uPlot.Series[] = bands.flatMap((b, i) => ([
      { label: `${b.label} low`, stroke: 'transparent', show: true, scale: 'y',
        points: { show: false } } as uPlot.Series,
      { label: `${b.label} high`, stroke: 'transparent', fill: b.colour ?? `color-mix(in srgb, ${palette[i % palette.length]} 22%, transparent)`,
        scale: 'y', points: { show: false } } as uPlot.Series,
    ]));

    const mainSeries: uPlot.Series[] = series.map((s, i) => ({
      label: s.label,
      stroke: s.colour ?? palette[i % palette.length],
      width: s.width ?? 1.6,
      dash: s.dash ? [5, 4] : undefined,
      fill: s.fill ? `color-mix(in srgb, ${s.colour ?? palette[i % palette.length]} 18%, transparent)` : undefined,
      scale: 'y',
      points: { show: (u, si, idx) => (u.data[si] as number[]).length < 60 && idx !== undefined },
      value: (_u, v) => (v == null ? '--' : `${v.toFixed(4)} ${unit}`),
    }));

    const opts: uPlot.Options = {
      width: el.clientWidth || 480,
      height,
      padding: [10, 12, 0, 0],
      cursor: {
        drag: { x: true, y: false },
        focus: { prox: 24 },
      },
      legend: { live: true },
      scales: { x: { time: false } },
      axes: [
        { label: xUnit ? `${xLabel} (${xUnit})` : xLabel, stroke: faint, grid: { stroke: border, width: 1 },
          ticks: { stroke: border }, labelSize: 30, font: '11px system-ui', labelFont: '11px system-ui' },
        { label: unit ? `${yLabel} (${unit})` : yLabel, stroke: faint, grid: { stroke: border, width: 1 },
          ticks: { stroke: border }, labelSize: 34, font: '11px system-ui', labelFont: '11px system-ui' },
      ],
      series: [
        { label: xLabel, value: (_u, v) => (v == null ? '--' : `${v.toFixed(1)} ${xUnit}`) },
        ...bandSeries,
        ...mainSeries,
      ],
      bands: bands.map((_, i) => ({ series: [2 + i * 2, 1 + i * 2] as [number, number] })),
      hooks: {
        draw: [(u) => {
          // MARK WHAT THE ENGINE DETECTED. An undecorated chart makes the analyst do the algorithm's
          // job by eye, which the rubric treats as a defect rather than a style choice.
          const ctx = u.ctx;
          ctx.save();
          ctx.font = '10px system-ui';
          for (const m of markers) {
            ctx.strokeStyle = m.colour ?? faint;
            ctx.fillStyle = m.colour ?? faint;
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1;
            if (m.y !== undefined) {
              const py = u.valToPos(m.y, 'y', true);
              if (!Number.isFinite(py)) continue;
              ctx.beginPath();
              ctx.moveTo(u.bbox.left, py);
              ctx.lineTo(u.bbox.left + u.bbox.width, py);
              ctx.stroke();
              ctx.fillText(m.label, u.bbox.left + 6, py - 3);
            } else if (m.x !== undefined) {
              const px = u.valToPos(m.x, 'x', true);
              if (!Number.isFinite(px)) continue;
              ctx.beginPath();
              ctx.moveTo(px, u.bbox.top);
              ctx.lineTo(px, u.bbox.top + u.bbox.height);
              ctx.stroke();
              ctx.fillText(m.label, px + 4, u.bbox.top + 12);
            }
          }
          ctx.restore();
        }],
      },
    };

    plot.current?.destroy();
    plot.current = new uPlot(opts, data, el);
    const ro = new ResizeObserver(() => {
      if (plot.current && el.clientWidth > 0) plot.current.setSize({ width: el.clientWidth, height });
    });
    ro.observe(el);
    return () => { ro.disconnect(); plot.current?.destroy(); plot.current = null; };
    // theme is a dependency so the chart re-reads the CSS variables and re-strokes on a toggle
  }, [x, series, bands, markers, height, xLabel, yLabel, unit, xUnit, theme]);

  return (
    <div>
      <div ref={host} aria-hidden="true" />
      <details>
        <summary className="st-muted" style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
          {ariaSummary}
        </summary>
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>{xLabel}</th>
                {series.map((s) => <th key={s.label}>{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {x.map((xv, i) => (
                <tr key={i}>
                  <td className="st-mono">{xv.toFixed(1)}</td>
                  {series.map((s) => (
                    <td key={s.label} className="st-mono">
                      {Number.isFinite(s.values[i]) ? s.values[i].toFixed(4) : '--'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
