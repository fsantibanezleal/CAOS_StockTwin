/**
 * INSIDE THE PILE. A section cut through the stockpile, coloured by any assay variable.
 *
 * WHY THIS IS THE PRODUCT AND NOT A FEATURE. Everything else in this app shows the pile from
 * outside: the surface, the crest, where the trucks drove. A stockpile is characterised by what is
 * INSIDE it, because that is what the plant receives and because the internal arrangement is the
 * entire consequence of how it was built. A product that ships only the surface has answered the
 * wrong half of the question.
 *
 * The section is the honest way to show it. A stockpile's internal structure is layered, the layers
 * are what a reclaim cut crosses, and a vertical slice is the view that makes both legible. Cut it
 * anywhere along either axis and drag through the pile.
 *
 * THE VOLUME IS A BLOCK MODEL, not a rendering trick. Each voxel carries the deposition event it
 * came from; the assay is joined from the load log. What is drawn is the material's real composition
 * at that point, at the resolution the bake recorded it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { assayIndex, voxelZ } from '../lib/scenario';
import type { AssayVar, Load, Scenario } from '../lib/scenario';

/** Fallback for a scenario baked before the generator declared its own variable table. */
const FALLBACK_VARS: AssayVar[] = [
  { key: 'cu', label: 'Cu', unit: '%', lo: 0.3, hi: 1.1, decimals: 3 },
  { key: 'recovery', label: 'estimated recovery', unit: '%', lo: 58, hi: 94, decimals: 1 },
];

/** Variables that are properties of the VOXEL rather than of the material in it. */
const GEOMETRIC: AssayVar[] = [
  { key: '_elev', label: 'elevation', unit: 'm', lo: 0, hi: 1, decimals: 1 },
  { key: '_age', label: 'placement order', unit: 'load', lo: 0, hi: 1, decimals: 0 },
];

function ramp(t: number): [number, number, number] {
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
      return [
        ca[0] + f * (cb[0] - ca[0]),
        ca[1] + f * (cb[1] - ca[1]),
        ca[2] + f * (cb[2] - ca[2]),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export default function InsidePanel({
  sc,
  dark,
  lang = 'en',
}: {
  sc: Scenario;
  dark: boolean;
  lang?: 'en' | 'es';
}) {
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const vol = sc.volume;
  const ref = useRef<HTMLCanvasElement>(null);

  const vars = useMemo<AssayVar[]>(
    () => [...GEOMETRIC, ...((sc.manifest.assay_variables as AssayVar[] | undefined) ?? FALLBACK_VARS)],
    [sc],
  );
  const [key, setKey] = useState('cu');
  const [axis, setAxis] = useState<'x' | 'y'>('y');
  const [at, setAt] = useState(0.5);
  const [levels, setLevels] = useState(true);

  const byEvent = useMemo(() => assayIndex(sc.loads), [sc]);

  // The slice, and the value at every voxel in it. Computed once per change rather than per pixel.
  const slice = useMemo(() => {
    if (!vol) return null;
    const { nx, ny, nz } = vol;
    const across = axis === 'y' ? nx : ny;
    const fixed = Math.min(
      Math.max(Math.round(at * ((axis === 'y' ? ny : nx) - 1)), 0),
      (axis === 'y' ? ny : nx) - 1,
    );
    const vals: (number | null)[] = new Array(across * nz).fill(null);
    const ground: number[] = new Array(across).fill(0);
    let lo = Infinity;
    let hi = -Infinity;

    for (let a = 0; a < across; a++) {
      const i = axis === 'y' ? a : fixed;
      const j = axis === 'y' ? fixed : a;
      const c = j * nx + i;
      ground[a] = vol.z0[c] ?? 0;
      const col = vol.columns[c];
      if (!col) continue;
      const [k0, events] = col;
      for (let n = 0; n < events.length; n++) {
        const k = k0 + n;
        if (k < 0 || k >= nz) continue;
        const ev = events[n];
        let v: number | null;
        if (key === '_elev') {
          v = voxelZ(vol, k);
        } else if (key === '_age') {
          v = ev;
        } else {
          const l = byEvent.get(ev) as (Load & Record<string, number | undefined>) | undefined;
          v = l && typeof l[key] === 'number' ? (l[key] as number) : null;
        }
        if (v === null || !Number.isFinite(v)) continue;
        vals[k * across + a] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (lo === Infinity) return null;
    return { across, nz, vals, ground, lo, hi, fixed };
  }, [vol, axis, at, key, byEvent]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const host = cv.parentElement;
      const cssW = host?.clientWidth ?? 600;
      const cssH = host?.clientHeight ?? 400;
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = cssW * dpr;
      cv.height = cssH * dpr;
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);
      if (!vol || !slice) {
        g.fillStyle = dark ? '#8b949e' : '#6b7683';
        g.font = '13px system-ui, sans-serif';
        g.fillText(
          t('This scenario was baked without a volume.', 'Este escenario se horneo sin volumen.'),
          16,
          28,
        );
        return;
      }

      const padL = 44;
      const padB = 26;
      const padT = 10;
      const W = cssW - padL - 10;
      const H = cssH - padB - padT;
      const { across, nz, vals, ground, lo, hi } = slice;

      // TRUE PROPORTIONS. A section is a measurement, and stretching the vertical to make the pile
      // look impressive would misstate every slope in the picture. The pile is wide and low, and
      // that is what a stockpile is.
      const mPerCellX = vol.cell_m;
      const spanX = across * mPerCellX;
      const spanZ = nz * vol.dz_m;
      const scale = Math.min(W / spanX, H / Math.max(spanZ, 1e-6));
      const ox = padL + (W - spanX * scale) / 2;
      const oy = padT + H;

      const zPix = (zm: number) => oy - (zm - vol.base_m) * scale;

      // The ground, drawn first so the material reads as sitting ON something.
      g.fillStyle = dark ? '#232a33' : '#d6dbe2';
      g.beginPath();
      g.moveTo(ox, oy);
      for (let a = 0; a < across; a++) g.lineTo(ox + a * mPerCellX * scale, zPix(ground[a]));
      g.lineTo(ox + spanX * scale, oy);
      g.closePath();
      g.fill();

      // The material, voxel by voxel.
      const w = Math.max(mPerCellX * scale, 1);
      const h = Math.max(vol.dz_m * scale, 1);
      for (let k = 0; k < nz; k++) {
        const y = zPix(vol.base_m + (k + 1) * vol.dz_m);
        for (let a = 0; a < across; a++) {
          const v = vals[k * across + a];
          if (v === null) continue;
          const c = ramp((v - lo) / (hi - lo || 1));
          g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          g.fillRect(ox + a * w, y, w + 0.6, h + 0.6);
        }
      }

      // LEVEL SETS. Horizontal lines at round elevations, because a section without a datum is a
      // picture rather than a measurement, and because the lifts are what they mark.
      if (levels) {
        const step = spanZ > 24 ? 5 : spanZ > 10 ? 2 : 1;
        g.strokeStyle = dark ? 'rgba(220,228,238,0.28)' : 'rgba(30,45,60,0.24)';
        g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
        g.font = '10px system-ui, sans-serif';
        g.lineWidth = 1;
        for (let z = 0; z <= vol.base_m + spanZ; z += step) {
          const y = Math.round(zPix(z)) + 0.5;
          if (y < padT || y > oy) continue;
          g.beginPath();
          g.moveTo(ox, y);
          g.lineTo(ox + spanX * scale, y);
          g.stroke();
          g.fillText(`${z} m`, 6, y + 3);
        }
      }

      g.fillStyle = dark ? '#9fb0c3' : '#4a5866';
      g.font = '10px system-ui, sans-serif';
      g.fillText(
        axis === 'y'
          ? `${t('section along x, at y =', 'seccion en x, en y =')} ${(slice.fixed * vol.cell_m).toFixed(0)} m`
          : `${t('section along y, at x =', 'seccion en y, en x =')} ${(slice.fixed * vol.cell_m).toFixed(0)} m`,
        ox,
        cssH - 8,
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => ro.disconnect();
  }, [vol, slice, dark, levels, axis, lang]);

  const active = vars.find((v) => v.key === key);

  return (
    <div className="st-inside">
      <div className="st-controls">
        <label className="st-sel">
          <span>{t('Colour by', 'Colorear por')}</span>
          <select value={key} onChange={(e) => setKey(e.target.value)}>
            {vars.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
                {v.unit ? ` (${v.unit})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="st-sel">
          <span>{t('Cut', 'Corte')}</span>
          <select value={axis} onChange={(e) => setAxis(e.target.value as 'x' | 'y')}>
            <option value="y">{t('along x', 'a lo largo de x')}</option>
            <option value="x">{t('along y', 'a lo largo de y')}</option>
          </select>
        </label>
        <input
          className="st-play-scrub"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          aria-label={t('Move the section through the pile', 'Mover la seccion por la pila')}
        />
        <label className="st-toggles">
          <input type="checkbox" checked={levels} onChange={(e) => setLevels(e.target.checked)} />
          {t('level sets', 'curvas de nivel')}
        </label>
        {slice && (
          <span className="st-scalebar">
            <b>{slice.lo.toFixed(active?.decimals ?? 2)}</b>
            <i className="st-scale" />
            <b>{slice.hi.toFixed(active?.decimals ?? 2)}</b>
            <em>{active?.unit}</em>
          </span>
        )}
      </div>

      <div className="st-chartbox st-sectionbox">
        <canvas ref={ref} className="st-chartcanvas" />
      </div>

      <p className="st-note">
        {t(
          'A vertical slice through the pile, at true proportions. Every voxel carries the load it came from, so what is drawn is the material actually there rather than an interpolation of the surface. Drag the section through the pile, and change what it is coloured by: the metals travel together because they came from the same hydrothermal system, iron and pH move against each other because oxidising sulphide is what makes the ground acid, and moisture follows clay because clay is what holds water.',
          'Un corte vertical de la pila, en proporciones reales. Cada voxel lleva la carga de la que proviene, asi que lo dibujado es el material que realmente esta ahi y no una interpolacion de la superficie. Mueve la seccion por la pila y cambia la variable: los metales viajan juntos porque vienen del mismo sistema hidrotermal, el hierro y el pH se mueven en sentidos opuestos porque el sulfuro oxidandose es lo que acidifica, y la humedad sigue a la arcilla porque la arcilla es la que retiene el agua.',
        )}
      </p>
    </div>
  );
}
