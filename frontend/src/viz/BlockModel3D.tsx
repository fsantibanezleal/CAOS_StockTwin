/**
 * THE STOCK AS A BLOCK MODEL, IN THREE DIMENSIONS, CUT OPEN ON ANY AXIS.
 *
 * The section view shows one slice of the pile. This shows the solid: every voxel the bake recorded,
 * as a block, coloured by any assay variable, with a cross-section control on each of the three axes
 * so the reader can carve into it and look at what is inside from any angle. That is the interaction
 * a block model wants, and it is what the mining viewers converge on: cross-sections across X, Y and
 * Z, colour by property, and orbit.
 *
 * THREE THINGS MAKE IT FAST ENOUGH TO BE INTERACTIVE.
 *
 *   INSTANCING. One InstancedMesh for every block, so the whole model is a single draw call instead
 *   of tens of thousands. A mesh per block is what makes these viewers unusable.
 *
 *   INTERIOR CULLING. A voxel with material on all six sides cannot be seen and is not emitted. On a
 *   shipped pile that is most of them: the solid is a skin plus whatever the cuts expose. The culling
 *   is recomputed when the cross-section moves, because moving it is exactly what turns interior
 *   blocks into visible ones.
 *
 *   A BUDGET WITH A STATED CAP. If a scenario ever exceeds it the view says how many blocks it is
 *   showing out of how many, rather than quietly dropping some and looking complete.
 *
 * Sources for the approach: browser block-model viewers built on three.js with instanced rendering
 * and X/Y/Z cross-sections, and the three.js guidance that InstancedMesh is the tool for many objects
 * sharing a geometry.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { assayIndex } from '../lib/scenario';
import type { AssayVar, Load, Scenario, Volume } from '../lib/scenario';

/** Hard cap on emitted blocks. Generous for the shipped scenarios, and reported when it bites. */
const MAX_BLOCKS = 220_000;

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

/** Occupancy and value lookup for the whole volume, built once per scenario and variable. */
function buildGrid(vol: Volume, byEvent: Map<number, Load>, key: string) {
  const { nx, ny, nz } = vol;
  const n = nx * ny * nz;
  const filled = new Uint8Array(n);
  const value = new Float32Array(n);
  let lo = Infinity;
  let hi = -Infinity;

  for (let c = 0; c < nx * ny; c++) {
    const col = vol.columns[c];
    if (!col) continue;
    const [k0, events] = col;
    const i = c % nx;
    const j = (c / nx) | 0;
    for (let m = 0; m < events.length; m++) {
      const k = k0 + m;
      if (k < 0 || k >= nz) continue;
      const ev = events[m];
      let v: number;
      if (key === '_elev') v = vol.base_m + (k + 0.5) * vol.dz_m;
      else if (key === '_age') v = ev;
      else {
        const l = byEvent.get(ev) as (Load & Record<string, number | undefined>) | undefined;
        const raw = l ? l[key] : undefined;
        if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        v = raw;
      }
      const idx = (k * ny + j) * nx + i;
      filled[idx] = 1;
      value[idx] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  return { filled, value, lo: lo === Infinity ? 0 : lo, hi: hi === -Infinity ? 1 : hi };
}

export default function BlockModel3D({
  sc,
  dark,
  lang = 'en',
  height = 520,
}: {
  sc: Scenario;
  dark: boolean;
  lang?: 'en' | 'es';
  height?: number;
}) {
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const vol = sc.volume;
  const host = useRef<HTMLDivElement>(null);

  const vars = useMemo<AssayVar[]>(
    () => [...GEOMETRIC, ...((sc.manifest.assay_variables as AssayVar[] | undefined) ?? [])],
    [sc],
  );
  const [key, setKey] = useState('cu');
  const [area, setArea] = useState('all');
  // Cross-section: a fraction of the extent kept on each axis, from each end.
  const [cutX, setCutX] = useState(1);
  const [cutY, setCutY] = useState(1);
  const [cutZ, setCutZ] = useState(1);
  const [shown, setShown] = useState({ drawn: 0, total: 0 });

  const byEvent = useMemo(() => assayIndex(sc.loads), [sc]);
  const grid = useMemo(() => (vol ? buildGrid(vol, byEvent, key) : null), [vol, byEvent, key]);

  // FRAME THE MATERIAL, NOT THE PAD. The pad is deliberately larger than the stock, so a camera set
  // from its extent puts the solid in the middle distance with a field of grey around it.
  const bbox = useMemo(() => {
    if (!vol) return null;
    let i0 = vol.nx;
    let i1 = 0;
    let j0 = vol.ny;
    let j1 = 0;
    let kTop = 0;
    for (let c = 0; c < vol.nx * vol.ny; c++) {
      const col = vol.columns[c];
      if (!col) continue;
      const i = c % vol.nx;
      const j = (c / vol.nx) | 0;
      if (i < i0) i0 = i;
      if (i > i1) i1 = i;
      if (j < j0) j0 = j;
      if (j > j1) j1 = j;
      const top = col[0] + col[1].length;
      if (top > kTop) kTop = top;
    }
    if (i1 < i0) return null;
    return { i0, i1, j0, j1, kTop };
  }, [vol]);

  // Which columns belong to the selected stock, when the yard holds several.
  const inArea = useMemo(() => {
    if (!vol || area === 'all') return null;
    const a = sc.plan.areas.find((q) => q.name === area);
    if (!a) return null;
    const mask = new Uint8Array(vol.nx * vol.ny);
    for (let c = 0; c < mask.length; c++) {
      const x = ((c % vol.nx) + 0.5) * vol.cell_m;
      const y = (((c / vol.nx) | 0) + 0.5) * vol.cell_m;
      mask[c] = x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 ? 1 : 0;
    }
    return mask;
  }, [vol, area, sc]);

  // -- the stage, built once ---------------------------------------------------------------------
  const live = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    render: () => void;
  } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !vol) return;

    const W = vol.nx * vol.cell_m;
    const H = vol.ny * vol.cell_m;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(dark ? 0x11161d : 0xeef1f5);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.62 : 0.78));
    const sun = new THREE.DirectionalLight(0xffffff, dark ? 0.85 : 0.75);
    sun.position.set(W, 500, H * 0.6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-W, 200, -H);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    // The middle of the material, and a distance set by ITS extent.
    const cx = bbox ? ((bbox.i0 + bbox.i1 + 1) / 2) * vol.cell_m - W / 2 : 0;
    const cz = bbox ? ((bbox.j0 + bbox.j1 + 1) / 2) * vol.cell_m - H / 2 : 0;
    const cy = bbox ? vol.base_m + (bbox.kTop * vol.dz_m) / 2 : 0;
    const R = bbox
      ? Math.max((bbox.i1 - bbox.i0 + 1) * vol.cell_m, (bbox.j1 - bbox.j0 + 1) * vol.cell_m) * 1.25
      : Math.max(W, H);
    const home = { az: -0.75, elv: 0.62, dist: R * 0.95 };
    let az = home.az;
    let elv = home.elv;
    let dist = home.dist;
    const target = new THREE.Vector3(cx, cy, cz);
    const place = () => {
      camera.position.set(
        target.x + dist * Math.cos(elv) * Math.cos(az),
        target.y + dist * Math.sin(elv),
        target.z + dist * Math.cos(elv) * Math.sin(az),
      );
      camera.lookAt(target);
    };
    const render = () => renderer.render(scene, camera);

    let drag = false;
    let panning = false;
    let lx = 0;
    let ly = 0;
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';
    const down = (e: PointerEvent) => {
      drag = true;
      panning = e.button === 1 || e.button === 2 || e.shiftKey;
      lx = e.clientX;
      ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      if (panning) {
        const k = dist * 0.0016;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
        target.addScaledVector(right, -dx * k);
        target.addScaledVector(up, dy * k);
      } else {
        az -= dx * 0.006;
        elv = Math.min(Math.max(elv + dy * 0.005, -0.2), 1.45);
      }
      lx = e.clientX;
      ly = e.clientY;
      place();
      render();
    };
    const up = (e: PointerEvent) => {
      drag = false;
      dom.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.min(Math.max(dist * (1 + Math.sign(e.deltaY) * 0.12), R * 0.12), R * 3);
      place();
      render();
    };
    const noMenu = (e: Event) => e.preventDefault();
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('wheel', wheel, { passive: false });
    dom.addEventListener('contextmenu', noMenu);
    dom.addEventListener('dblclick', () => {
      az = home.az;
      elv = home.elv;
      dist = home.dist;
      target.set(cx, cy, cz);
      place();
      render();
    });

    const resize = () => {
      const w = el.clientWidth || 600;
      const h = el.clientHeight || height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      place();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    live.current = { renderer, scene, camera, group, render };
    return () => {
      live.current = null;
      ro.disconnect();
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('wheel', wheel);
      dom.removeEventListener('contextmenu', noMenu);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      renderer.dispose();
      el.innerHTML = '';
    };
  }, [vol, dark, height, bbox]);

  // -- the blocks, rebuilt when the cut or the variable moves -------------------------------------
  useEffect(() => {
    const L = live.current;
    if (!L || !vol || !grid) return;

    for (const o of L.group.children) {
      const m = o as THREE.InstancedMesh;
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose();
    }
    L.group.clear();

    const { nx, ny, nz, cell_m: cm, dz_m: dz } = vol;
    const { filled, value, lo, hi } = grid;
    const W = nx * cm;
    const H = ny * cm;

    // The kept slab on each axis, measured from the far side so dragging carves INTO the solid.
    const kx = Math.max(1, Math.round(nx * cutX));
    const ky = Math.max(1, Math.round(ny * cutY));
    const kz = Math.max(1, Math.round(nz * cutZ));

    const inCut = (i: number, j: number, k: number) => i < kx && j < ky && k < kz;
    const at = (i: number, j: number, k: number) =>
      i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz
        ? 0
        : filled[(k * ny + j) * nx + i];

    // A block is drawn only if it has a face nobody else covers, counting the cut as open air.
    const xs: number[] = [];
    let total = 0;
    for (let k = 0; k < kz; k++) {
      for (let j = 0; j < ky; j++) {
        for (let i = 0; i < kx; i++) {
          const idx = (k * ny + j) * nx + i;
          if (!filled[idx]) continue;
          if (inArea && !inArea[j * nx + i]) continue;
          total++;
          const hidden =
            at(i - 1, j, k) && inCut(i - 1, j, k) &&
            at(i + 1, j, k) && inCut(i + 1, j, k) &&
            at(i, j - 1, k) && inCut(i, j - 1, k) &&
            at(i, j + 1, k) && inCut(i, j + 1, k) &&
            at(i, j, k - 1) && inCut(i, j, k - 1) &&
            at(i, j, k + 1) && inCut(i, j, k + 1);
          if (hidden) continue;
          xs.push(idx, i, j, k);
        }
      }
    }

    const count = Math.min(xs.length / 4, MAX_BLOCKS);
    setShown({ drawn: count, total });
    if (!count) {
      L.render();
      return;
    }

    const geo = new THREE.BoxGeometry(cm, dz, cm);
    // NO `vertexColors` HERE, and it is not an oversight. That flag makes the shader read a per-vertex
    // colour attribute, which a BoxGeometry does not have, so every block came out black. Per-instance
    // colour is a different path: three defines it automatically once `instanceColor` exists, which
    // `setColorAt` creates.
    const mat = new THREE.MeshLambertMaterial({});
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const idx = xs[n * 4];
      const i = xs[n * 4 + 1];
      const j = xs[n * 4 + 2];
      const k = xs[n * 4 + 3];
      m4.setPosition(
        (i + 0.5) * cm - W / 2,
        vol.base_m + (k + 0.5) * dz,
        (j + 0.5) * cm - H / 2,
      );
      mesh.setMatrixAt(n, m4);
      const c = ramp((value[idx] - lo) / (hi - lo || 1));
      col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255);
      mesh.setColorAt(n, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    L.group.add(mesh);

    // The ground under it, CLIPPED TO THE SITE plus a short apron. The full pad is deliberately
    // larger than the stock, and drawing all of it puts a field of grey around the thing being
    // looked at.
    const M = 4;
    const gi0 = Math.max(0, (bbox?.i0 ?? 0) - M);
    const gi1 = Math.min(nx - 1, (bbox?.i1 ?? nx - 1) + M);
    const gj0 = Math.max(0, (bbox?.j0 ?? 0) - M);
    const gj1 = Math.min(ny - 1, (bbox?.j1 ?? ny - 1) + M);
    const gw = gi1 - gi0;
    const gh = gj1 - gj0;
    const gGeo = new THREE.PlaneGeometry(gw * cm, gh * cm, gw, gh);
    gGeo.rotateX(-Math.PI / 2);
    gGeo.translate(
      ((gi0 + gi1 + 1) / 2) * cm - W / 2,
      0,
      ((gj0 + gj1 + 1) / 2) * cm - H / 2,
    );
    const pos = gGeo.attributes.position as THREE.BufferAttribute;
    for (let jj = 0; jj <= gh; jj++) {
      for (let ii = 0; ii <= gw; ii++) {
        pos.setY(jj * (gw + 1) + ii, vol.z0[(gj0 + jj) * nx + (gi0 + ii)] ?? 0);
      }
    }
    pos.needsUpdate = true;
    gGeo.computeVertexNormals();
    L.group.add(
      new THREE.Mesh(
        gGeo,
        new THREE.MeshLambertMaterial({
          color: dark ? 0x1d232b : 0xdde2e8,
          side: THREE.DoubleSide,
        }),
      ),
    );

    L.render();
  }, [vol, grid, cutX, cutY, cutZ, inArea, dark, bbox]);

  const active = vars.find((v) => v.key === key);

  if (!vol) {
    return (
      <div className="st-note">
        {t('This scenario was baked without a volume.', 'Este escenario se horneo sin volumen.')}
      </div>
    );
  }

  return (
    <div className="st-blocks">
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

        {sc.plan.areas.length > 1 && (
          <label className="st-sel">
            <span>{t('Stock', 'Acopio')}</span>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="all">{t('all stocks', 'todos los acopios')}</option>
              {sc.plan.areas.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {grid && (
          <span className="st-scalebar">
            <b>{grid.lo.toFixed(active?.decimals ?? 2)}</b>
            <i className="st-scale" />
            <b>{grid.hi.toFixed(active?.decimals ?? 2)}</b>
            <em>{active?.unit}</em>
          </span>
        )}

        <span className="st-hint">
          {shown.drawn.toLocaleString()} {t('blocks drawn of', 'bloques dibujados de')}{' '}
          {shown.total.toLocaleString()} {t('in the cut', 'en el corte')}
        </span>
      </div>

      {/* CROSS-SECTIONS ON ALL THREE AXES. Dragging one carves the solid open along it; the blocks
          the cut exposes are emitted as the cut moves, so what you see is always a real face. */}
      <div className="st-cuts">
        {(
          [
            ['x', cutX, setCutX, t('cut along x', 'corte en x')],
            ['y', cutY, setCutY, t('cut along y', 'corte en y')],
            ['z', cutZ, setCutZ, t('cut in height', 'corte en altura')],
          ] as const
        ).map(([id, v, set, label]) => (
          <label key={id}>
            <span>{label}</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={v}
              onChange={(e) => set(Number(e.target.value))}
            />
            <b>{Math.round(v * 100)}%</b>
          </label>
        ))}
      </div>

      <div className="st-chartbox st-blockbox">
        <div ref={host} className="st-blockhost" />
      </div>

      <p className="st-note">
        {t(
          'The stock as a block model. Every block is one voxel of the bake, half a metre tall, carrying the load it came from and coloured by whichever variable you choose. Drag a cross-section to carve into the solid and look at what is inside; drag to orbit, shift-drag to pan, wheel to zoom, double click to recentre. Blocks with material on all six sides are not drawn, because they cannot be seen, and they become visible as soon as a cut exposes them.',
          'El acopio como modelo de bloques. Cada bloque es un voxel del horneado, de medio metro de alto, que lleva la carga de la que proviene y se colorea segun la variable elegida. Arrastra un corte para abrir el solido y ver lo que hay dentro; arrastra para orbitar, shift para desplazar, rueda para acercar, doble clic para recentrar. Los bloques con material en las seis caras no se dibujan porque no se pueden ver, y aparecen en cuanto un corte los expone.',
        )}
      </p>
    </div>
  );
}
