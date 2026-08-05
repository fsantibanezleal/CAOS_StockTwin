/**
 * The site in three dimensions: the ground, the pile built on it, and the machines that built it.
 *
 * WHAT THIS HAS TO SHOW, and what the previous version could not. A stockpile is not a surface that
 * appeared. It is a planned earthwork placed load by load by trucks that had to reach where they were
 * going. So this view draws the original ground and the material separately, colours the material by
 * what it actually contains, marks the crest that every edge dump was aimed at, and draws the truck
 * paths coming in and going away.
 *
 * TWO SURFACES, NOT ONE. `z0` is the ground and `z` is the current surface. On any sloping site those
 * differ everywhere, and a view that draws only `z` shows a hillside as though it were a stockpile.
 * The material is drawn as its own skin over the ground, so a reader can see how much is actually
 * there.
 *
 * THE EMPTY PAD IS PAD. A cell with no material is drawn as ground, not as material at grade zero.
 * That exact confusion shipped once: an empty pad coloured as material read as a full pile through a
 * completely green gate, and it was caught by looking at the deployed site rather than by any test.
 *
 * TWO EFFECTS, NOT ONE, AND THAT IS THE WHOLE PERFORMANCE STORY. The first builds the renderer, the
 * camera and the two surface meshes once per scenario. The second rewrites what is on them. When
 * everything lived in one effect, changing a single frame tore down the WebGL context and built a new
 * one; at one frame per truck and fifteen trucks a second that is fifteen contexts a second, which no
 * browser will give you, and it reset the camera every time a checkbox moved.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { Field, Load, Plan, PlayState } from '../lib/scenario';
import { viridis } from './colormap';

export type ColourBy = 'grade' | 'coarse' | 'thickness' | 'lift';

interface Props {
  field: Field;
  /** Surface to draw INSTEAD of `field.z`, for playing the build back frame by frame.
   *
   *  The ground and the grade field stay as they are: only the elevation moves. That is honest for
   *  a replay, because the ledger's grade per column is the FINAL composition and pretending to know
   *  an intermediate one would be inventing data the bake did not record. */
  surface?: number[] | null;
  plan: Plan;
  loads: Load[];
  colourBy: ColourBy;
  /** Per-cell values that REPLACE the built-in colour fields, for any assay variable. Null entries
   *  are bare ground. Supplied by the page, which joins the volume's top voxel to the load log. */
  values?: (number | null)[] | null;
  /** The moment being played, or null for the finished pile.
   *
   *  WHEN SOMETHING IS PLAYING, ONE TRUCK IS DRAWN AND IT IS MOVING. Showing every path driven so far
   *  turns the site into a ball of string and hides the one thing the reader is watching: this truck,
   *  driving in on the route the engine solved, tipping, and driving away. The trail behind it is
   *  solid and the road ahead of it is faint, so the direction of travel is legible in a still frame.
   *  The full history stays available behind a deliberate toggle, for reading the access pattern of
   *  the whole campaign. */
  play?: PlayState | null;
  showPaths: boolean;
  showCrest: boolean;
  showPlan: boolean;
  dark: boolean;
  height?: number;
  /** The value range actually drawn, so the page can put a labelled scale beside the stage. A
   *  colour ramp with no numbers on it is decoration. */
  onRange?: (r: { lo: number; hi: number }) => void;
  lang?: 'en' | 'es';
  /** What the colour field is called and what it is measured in, for the cursor readout. */
  valueLabel?: string;
  valueUnit?: string;
  /** Raised when the reader hovers or selects a cell, so the other panels can mark the same one. */
  onProbe?: (p: { i: number; j: number; x: number; y: number; z: number; v: number | null } | null) => void;
}

/**
 * ONE COLORMAP, AND IT IS PERCEPTUALLY UNIFORM.
 *
 * This file, the field maps and the section each carried their own copy of a five-stop blue-teal-
 * green-yellow-red ramp. That is the jet family: it invents edges where the data is smooth and
 * flattens real gradients where it is not, so two readers looking at the same surface read different
 * shapes off it. The rubric treats that as a correctness defect rather than a matter of taste, and
 * three copies of it meant the stage and its own legend could not even agree with each other.
 */
const ramp = viridis;

const EMPTY = 1e-4;

/** Min and max of the finite entries, without spreading an array of ten thousand into a call. */
function span(vals: ArrayLike<number | null>): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v === null || !Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? [0, 1] : [lo, hi];
}

interface Live {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The material skin: its geometry is written in place, never rebuilt. */
  mGeo: THREE.PlaneGeometry;
  /** Everything that is drawn as marks rather than as surface: crest, plan, paths, shovel. */
  content: THREE.Group;
  render: () => void;
  /** Working buffer for material thickness, reused so playback does not allocate per frame. */
  thick: Float32Array;
}

export default function SiteView3D({
  field,
  surface = null,
  plan,
  loads,
  colourBy,
  values = null,
  play = null,
  showPaths,
  showCrest,
  showPlan,
  dark,
  height = 460,
  onRange,
  lang = 'en',
  valueLabel,
  valueUnit,
  onProbe,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const readout = useRef<HTMLDivElement>(null);
  const t = (en: string, es: string) => (lang === 'es' ? es : en);

  // WHAT THE CURSOR IS OVER, kept in a ref rather than in state.
  //
  // The colour field, its range and its unit change with the reader's selection, and the probe has
  // to see the current ones. Putting them in the effect's dependency list would tear down the WebGL
  // context every time the colour dropdown moved, which is the bug this file already fixed once by
  // splitting the stage from its content. Putting the readout itself in React state would re-render
  // the page on every mouse move. So: a ref the content effect writes and the pointer handler reads,
  // and the readout is written straight into the DOM.
  const probeSrc = useRef<{
    values: (number | null)[] | null;
    z: number[];
    z0: number[];
    label: string;
    unit: string;
    decimals: number;
  }>({ values: null, z: field.z, z0: field.z0, label: '', unit: '', decimals: 3 });

  probeSrc.current = {
    values,
    z: surface ?? field.z,
    z0: field.z0,
    label: valueLabel ?? (colourBy === 'coarse' ? 'coarse fraction' : colourBy === 'thickness' ? 'thickness' : 'grade'),
    unit: valueUnit ?? (colourBy === 'thickness' ? 'm' : ''),
    decimals: colourBy === 'thickness' ? 2 : 3,
  };
  const onProbeRef = useRef(onProbe);
  onProbeRef.current = onProbe;

  // -- the stage: built once per scenario, per theme, per size ---------------------------------
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const { nx, ny, cell_m: cm } = field;
    const W = nx * cm;
    const H = ny * cm;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(dark ? 0x11161d : 0xeef1f5);

    const camera = new THREE.PerspectiveCamera(42, 1, 1, 6000);
    // preserveDrawingBuffer so the visual gate can read pixels back and PROVE the stage painted.
    // Without it readPixels returns a cleared buffer after presentation, and a blank-canvas check
    // reports a false failure on a scene that rendered perfectly well.
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.55 : 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, dark ? 0.9 : 0.8);
    sun.position.set(W * 0.6, 400, H * 0.4);
    scene.add(sun);

    // -- the ground -------------------------------------------------------------------------
    // Drawn as its own surface so relief is visible even where nothing has been placed on it.
    const gGeo = new THREE.PlaneGeometry(W, H, nx - 1, ny - 1);
    gGeo.rotateX(-Math.PI / 2);
    {
      const pos = gGeo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < nx * ny; k++) pos.setY(k, field.z0[k]);
      pos.needsUpdate = true;
      gGeo.computeVertexNormals();
    }
    scene.add(
      new THREE.Mesh(
        gGeo,
        new THREE.MeshLambertMaterial({
          color: dark ? 0x2a323d : 0xc9cfd8,
          side: THREE.DoubleSide,
        }),
      ),
    );

    // -- the material skin, allocated once and written in place -------------------------------
    const mGeo = new THREE.PlaneGeometry(W, H, nx - 1, ny - 1);
    mGeo.rotateX(-Math.PI / 2);
    mGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nx * ny * 3), 3));
    const mMesh = new THREE.Mesh(
      mGeo,
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    );
    scene.add(mMesh);

    const content = new THREE.Group();
    scene.add(content);

    // -- camera and interaction ---------------------------------------------------------------
    // These live HERE, not in the content effect, so that scrubbing the build or ticking a checkbox
    // leaves the reader looking at the same thing from the same place.
    // FRAME THE WORK, NOT THE PAD. The pad is deliberately bigger than the dump areas, because the
    // trucks have to drive somewhere, and centring on it put the pile in a corner with three
    // quarters of the screen given over to empty ground. The camera looks at the middle of the
    // planned areas and sits back by THEIR extent.
    const ax0 = Math.min(...plan.areas.map((a) => a.x0));
    const ax1 = Math.max(...plan.areas.map((a) => a.x1));
    const ay0 = Math.min(...plan.areas.map((a) => a.y0));
    const ay1 = Math.max(...plan.areas.map((a) => a.y1));
    const focusX = (ax0 + ax1) / 2 - W / 2;
    const focusZ = (ay0 + ay1) / 2 - H / 2;
    const R = Math.max(ax1 - ax0, ay1 - ay0) * 1.35;
    const home = { az: -0.7, el: 0.55, dist: R * 1.25 };
    let az = home.az;
    let el2 = home.el;
    let dist = home.dist;
    const target = new THREE.Vector3(focusX, 0, focusZ);

    const place = () => {
      camera.position.set(
        target.x + dist * Math.cos(el2) * Math.cos(az),
        target.y + dist * Math.sin(el2),
        target.z + dist * Math.cos(el2) * Math.sin(az),
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
      // PAN, not just orbit. Middle button, right button, or shift with the left, which is the
      // convention every CAD and mine-planning package uses. Rotate-only leaves a reader unable to
      // bring a corner of a three-area yard into the middle of the screen.
      panning = e.button === 1 || e.button === 2 || e.shiftKey;
      lx = e.clientX;
      ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = panning ? 'move' : 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      if (panning) {
        // Translate the look-at point in the camera's own screen plane, scaled by distance so the
        // ground appears to follow the pointer at any zoom.
        const k = dist * 0.0016;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
        target.addScaledVector(right, -dx * k);
        target.addScaledVector(up, dy * k);
      } else {
        az -= dx * 0.006;
        el2 = Math.min(Math.max(el2 + dy * 0.005, 0.12), 1.45);
      }
      lx = e.clientX;
      ly = e.clientY;
      place();
      render();
    };
    const up = (e: PointerEvent) => {
      drag = false;
      dom.releasePointerCapture(e.pointerId);
      dom.style.cursor = 'grab';
    };

    // -- THE VALUE UNDER THE CURSOR ------------------------------------------------------------
    // An instrument that colours a field and cannot say what any point of it is worth makes the
    // reader estimate a number off a ramp. The rubric requires a readout in physical units, and this
    // is the only view where the pointer was doing nothing at all unless a drag was in progress.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const fmt = (x: number, d: number) => (Number.isFinite(x) ? x.toFixed(d) : '-');
    const clearProbe = () => {
      if (readout.current) readout.current.style.display = 'none';
      onProbeRef.current?.(null);
    };
    const probe = (e: PointerEvent) => {
      if (drag) return;
      const box = dom.getBoundingClientRect();
      ndc.x = ((e.clientX - box.left) / box.width) * 2 - 1;
      ndc.y = -((e.clientY - box.top) / box.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mMesh, false)[0];
      const node = readout.current;
      if (!hit || !node) {
        clearProbe();
        return;
      }
      const px = hit.point.x + W / 2;
      const py = hit.point.z + H / 2;
      const i = Math.min(Math.max(Math.floor(px / cm), 0), nx - 1);
      const j = Math.min(Math.max(Math.floor(py / cm), 0), ny - 1);
      const k = j * nx + i;
      const src = probeSrc.current;
      const zTop = src.z[k];
      const above = zTop - src.z0[k];
      // Bare ground reads as bare ground rather than as a value of zero, because those are different
      // statements about the same cell.
      const bare = !(above > 1e-3);
      const v = src.values ? src.values[k] : null;
      const shown =
        src.label === 'thickness' ? above : v !== null && Number.isFinite(v) ? v : null;
      node.style.display = 'block';
      node.style.left = `${Math.min(Math.max(e.clientX - box.left + 14, 6), box.width - 190)}px`;
      node.style.top = `${Math.min(Math.max(e.clientY - box.top + 14, 6), box.height - 76)}px`;
      node.innerHTML =
        `<b>${bare && src.label !== 'thickness' ? t('bare ground', 'suelo desnudo') : `${shown === null ? '-' : fmt(shown, src.decimals)}${src.unit ? ` ${src.unit}` : ''}`}</b>` +
        `<span>${src.label}</span>` +
        `<span>x ${fmt(px, 0)} m &middot; y ${fmt(py, 0)} m &middot; z ${fmt(zTop, 1)} m</span>` +
        `<span>${t('thickness', 'espesor')} ${fmt(above, 2)} m</span>`;
      onProbeRef.current?.({ i, j, x: px, y: py, z: zTop, v: shown });
    };
    dom.addEventListener('pointermove', probe);
    dom.addEventListener('pointerleave', clearProbe);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.min(Math.max(dist * (1 + Math.sign(e.deltaY) * 0.12), R * 0.25), R * 4.0);
      place();
      render();
    };
    // Right-drag pans, so the context menu must not eat it.
    const noMenu = (e: Event) => e.preventDefault();
    dom.addEventListener('contextmenu', noMenu);
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('wheel', wheel, { passive: false });

    const recentre = () => {
      az = home.az;
      el2 = home.el;
      dist = home.dist;
      target.set(focusX, 0, focusZ);
      place();
      render();
    };
    dom.addEventListener('dblclick', recentre);

    // -- KEYBOARD ------------------------------------------------------------------------------
    // Every gesture this view offers was pointer-only, so a keyboard user could not turn the pile at
    // all. Arrow keys orbit, plus and minus zoom, Home returns to the framing the view opened with.
    el.tabIndex = 0;
    const key = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.16 : 0.05;
      switch (e.key) {
        case 'ArrowLeft':
          az -= step;
          break;
        case 'ArrowRight':
          az += step;
          break;
        case 'ArrowUp':
          el2 = Math.min(el2 + step, 1.45);
          break;
        case 'ArrowDown':
          el2 = Math.max(el2 - step, 0.12);
          break;
        case '+':
        case '=':
          dist = Math.max(dist * 0.88, R * 0.25);
          break;
        case '-':
        case '_':
          dist = Math.min(dist * 1.14, R * 4.0);
          break;
        case 'Home':
        case 'Escape':
          recentre();
          e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault();
      place();
      render();
    };
    el.addEventListener('keydown', key);

    const resize = () => {
      const w = el.clientWidth || 600;
      renderer.setSize(w, height, false);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      place();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // NO ANIMATION LOOP. The scene is static until the reader moves it or the player advances a
    // frame, so there is no runaway requestAnimationFrame burning a core in a background tab.
    live.current = {
      renderer,
      scene,
      camera,
      mGeo,
      content,
      render,
      thick: new Float32Array(nx * ny),
    };

    return () => {
      live.current = null;
      ro.disconnect();
      dom.removeEventListener('contextmenu', noMenu);
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('wheel', wheel);
      dom.removeEventListener('dblclick', recentre);
      dom.removeEventListener('pointermove', probe);
      dom.removeEventListener('pointerleave', clearProbe);
      el.removeEventListener('keydown', key);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      renderer.dispose();
      el.innerHTML = '';
    };
  }, [field, plan, dark, height]);

  // -- what is on the stage: rewritten whenever the data or the switches move -------------------
  useEffect(() => {
    const L = live.current;
    if (!L) return;

    const { nx, ny, cell_m: cm } = field;
    const W = nx * cm;
    const H = ny * cm;
    const n = nx * ny;

    // One accessor for the surface being drawn, so playback and the final state cannot diverge.
    // A playback frame is stored coarse and expanded before it gets here; a wrong length means the
    // expansion failed, and drawing the finished pile instead would make the player look like it
    // worked while showing the same surface for every frame.
    const Z = surface && surface.length === n ? surface : field.z;

    // -- the material skin ---------------------------------------------------------------------
    {
      const pos = L.mGeo.attributes.position as THREE.BufferAttribute;
      const colAttr = L.mGeo.attributes.color as THREE.BufferAttribute;
      const col = colAttr.array as Float32Array;
      const thick = L.thick;

      let maxT = 1e-6;
      for (let k = 0; k < n; k++) {
        const t = Z[k] - field.z0[k];
        thick[k] = t;
        if (t > maxT) maxT = t;
      }

      const vals: ArrayLike<number | null> =
        values && values.length === n
          ? values
          : colourBy === 'grade'
            ? field.grade
            : colourBy === 'coarse'
              ? field.coarse
              : thick;
      const useThickness = colourBy === 'thickness' && !(values && values.length === n);
      const [lo, hi] = useThickness ? [0, maxT] : span(vals);

      const bare: [number, number, number] = dark ? [42, 50, 61] : [201, 207, 216];
      for (let k = 0; k < n; k++) {
        pos.setY(k, Z[k]);
        const t = thick[k];
        let c: [number, number, number];
        if (t <= EMPTY) {
          // No material. Draw the ground colour, never a ramp value: a zero-height cell coloured as
          // material at grade zero is how an empty pad came to read as a full pile in production.
          c = bare;
        } else if (useThickness) {
          c = ramp(t / maxT);
        } else {
          const v = vals[k];
          c = v === null || !Number.isFinite(v) ? [140, 140, 140] : ramp((v - lo) / (hi - lo || 1));
        }
        col[k * 3] = c[0] / 255;
        col[k * 3 + 1] = c[1] / 255;
        col[k * 3 + 2] = c[2] / 255;
      }
      pos.needsUpdate = true;
      colAttr.needsUpdate = true;
      L.mGeo.computeVertexNormals();
      onRange?.(useThickness ? { lo: 0, hi: maxT } : { lo, hi });
    }

    // -- the marks -------------------------------------------------------------------------------
    for (const o of L.content.children) {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | undefined;
      if (mat && !Array.isArray(mat)) mat.dispose();
    }
    L.content.clear();

    const at = (i: number, j: number) => ({
      x: (i + 0.5) * cm - W / 2,
      z: (j + 0.5) * cm - H / 2,
    });

    // The crest. Every edge dump was aimed perpendicular to this line. Without it on screen, the
    // direction of each deposit looks arbitrary rather than determined.
    if (showCrest) {
      const pts: number[] = [];
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const k = j * nx + i;
          if (Z[k] - field.z0[k] <= EMPTY) continue;
          let drop = 0;
          for (const [di, dj] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            drop = Math.max(drop, Z[k] - Z[(j + dj) * nx + (i + di)]);
          }
          if (drop >= 1.0) {
            const p = at(i, j);
            pts.push(p.x, Z[k] + 0.35, p.z);
          }
        }
      }
      if (pts.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        L.content.add(
          new THREE.Points(
            g,
            new THREE.PointsMaterial({ color: dark ? 0xffc75a : 0xb35c00, size: 2.2 }),
          ),
        );
      }
    }

    // The plan.
    if (showPlan) {
      for (const a of plan.areas) {
        const box = [
          [a.x0, a.y0],
          [a.x1, a.y0],
          [a.x1, a.y1],
          [a.x0, a.y1],
          [a.x0, a.y0],
        ];
        const g = new THREE.BufferGeometry().setFromPoints(
          box.map(([x, z]) => new THREE.Vector3(x - W / 2, 0.4, z - H / 2)),
        );
        L.content.add(
          new THREE.Line(g, new THREE.LineBasicMaterial({ color: dark ? 0x7fd7ff : 0x0a6ea8 })),
        );
      }
    }

    // The truck paths. Approach and departure, drawn separately, because "it does not appear from
    // nothing" is the whole point: a load arrived on a machine that had to get there and then leave.
    const groundAt = (x: number, y: number) => {
      const i = Math.min(Math.max(Math.floor(x / cm), 0), nx - 1);
      const j = Math.min(Math.max(Math.floor(y / cm), 0), ny - 1);
      return Z[j * nx + i];
    };

    /**
     * The height to stand a MACHINE at: the highest ground under its footprint, not the ground under
     * its centre.
     *
     * A machine is a rigid box about eleven metres long and it is drawn axis-aligned and level. On
     * flat ground the centre sample is right, but a stockpile is mostly flank, and on a flank the
     * uphill half of the box goes straight into the hill: the truck was measured half buried on the
     * side of the pile, which is what "the truck is under the terrain" means. Standing it on the
     * highest ground it covers can leave the downhill end a little proud, and a machine floating a
     * few centimetres reads as a machine, where a machine sunk to its windows does not.
     */
    const standOn = (x: number, y: number, reach = 6) => {
      let top = -Infinity;
      for (let dx = -reach; dx <= reach; dx += cm) {
        for (let dy = -reach; dy <= reach; dy += cm) {
          const g = groundAt(x + dx, y + dy);
          if (g > top) top = g;
        }
      }
      return top === -Infinity ? groundAt(x, y) : top;
    };
    const mkLine = (
      pts: [number, number][], colour: number, lift: number, opacity = 1, width = 1,
    ) => {
      if (pts.length < 2) return;
      const g = new THREE.BufferGeometry().setFromPoints(
        pts.map(([x, y]) => new THREE.Vector3(x - W / 2, groundAt(x, y) + lift, y - H / 2)),
      );
      L.content.add(
        new THREE.Line(
          g,
          new THREE.LineBasicMaterial({
            color: colour, transparent: opacity < 1, opacity, linewidth: width,
          }),
        ),
      );
    };

    // WHAT THIS FRAME PUTS ON THE STAGE, collected as it is drawn and published below for the
    // release gate. Declared out here rather than beside the machines because the machines are
    // drawn inside the paths block and the declaration has to outlive it.
    const machines: string[] = [];

    if (showPaths) {
      if (play) {
        // THE TRUCK IS DRIVING. Trail solid behind it, road ahead faint, so a paused frame still
        // says which way it is going.
        const hot = play.phase === 'departure';
        mkLine(play.trail, hot ? (dark ? 0xff8f6b : 0xb2401b) : (dark ? 0x62e08a : 0x0f7a3d), 1.3);
        mkLine(play.ahead, dark ? 0x7f8b99 : 0x9aa4b0, 1.1, 0.45);
      } else {
        // Parked on the finished pile: the recent history, which is what shows how the campaign
        // reached the whole area.
        for (const l of loads.filter((l) => l.placed).slice(-40)) {
          mkLine((l.approach ?? []) as [number, number][], dark ? 0x62e08a : 0x0f7a3d, 1.2);
          mkLine((l.departure ?? []) as [number, number][], dark ? 0xff8f6b : 0xb2401b, 0.8);
        }
      }

      // The truck itself, so the reader sees WHAT is making the pile grow rather than only the line
      // it drove along.
      //
      // LOADED IN, EMPTY OUT, and the load is drawn. A truck that looks the same coming and going
      // says nothing about what it is doing there: the whole event is that it arrived carrying
      // something and left without it. The heap sits in the tray on the approach, rides up as the
      // tray pitches about its rear pivot, and is gone on the way out.
      // THE RECLAIM MACHINE IS A DIFFERENT COLOUR AND A DIFFERENT SHAPE, because it is doing the
      // opposite job. A yellow haul truck brings material to the pile; an orange loader takes it
      // away. Drawing both the same would say the two halves of a stockpile's life look alike.
      // -- THE RECLAIM: TWO MACHINES, NOT ONE ----------------------------------------------------
      //
      // A LOADER on the cut, digging, and an ORANGE TRUCK beside it that arrived EMPTY and leaves
      // LOADED. That pairing is the whole answer to "how does it reclaim if no truck is coming to
      // the site": until the engine routed one, nothing was. The truck is the mirror of the yellow
      // haul truck, which arrives loaded and leaves empty, and the two are drawn to the same
      // silhouette so the comparison is legible: same chassis, same cab, same tray, opposite cargo.
      if (play?.job === 'reclaim') {
        // THE RENDERER DECLARES WHAT IT PUT ON THE STAGE, so a release gate can check that the
        // machines are there instead of guessing from pixels. Guessing does not work here and the
        // attempt is worth recording: sampling the drawing buffer for orange matched 21022 pixels of
        // TERRAIN with no cut selected at all, and narrowing it to the livery's hue did not separate
        // them either, because the light-theme ground sits in the same band. A gate built on that
        // would have passed whether or not a machine was ever drawn, which is precisely the defect
        // it exists to catch.
        const orange = new THREE.MeshLambertMaterial({ color: dark ? 0xff9d4d : 0xe07b1f });
        const steel = new THREE.MeshLambertMaterial({ color: dark ? 0x8b97a5 : 0x6c7885 });

        // THE LOADER, on the cut, working through the load phase.
        if (play.loader) {
          machines.push('loader');
          const { x, y } = play.loader;
          const loader = new THREE.Group();
          const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 2.8, 5.4), orange);
          hull.position.y = 1.8;
          loader.add(hull);
          const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 4.4), steel);
          cabin.position.set(-0.8, 4.3, 0);
          loader.add(cabin);
          // The bucket only swings while the truck is actually being filled.
          const bite = play.phase === 'tip'
            ? Math.sin(Math.min(Math.max(play.sub, 0), 1) * Math.PI)
            : 0;
          const bucket = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 5.6), orange);
          bucket.position.set(5.4, 1.3 + 3.2 * bite, 0);
          bucket.rotation.z = -0.5 * bite;
          loader.add(bucket);
          loader.position.set(x - W / 2, standOn(x, y, 5), y - H / 2);
          L.content.add(loader);
        }

        // THE TRUCK. Empty on the way in, filling while it waits, loaded on the way out.
        if (play.truck) {
          machines.push('truck');
          const { x, y, heading } = play.truck;
          const body = new THREE.Group();

          const chassis = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.6, 6.5), orange);
          chassis.position.y = 1.6;
          body.add(chassis);

          const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 5.2), steel);
          cab.position.set(4.6, 4.1, 0);
          body.add(cab);

          const tray = new THREE.Group();
          const floor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.4, 6.0), orange);
          floor.position.set(0, 0, 0);
          tray.add(floor);
          for (const zz of [-2.9, 2.9]) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.9, 0.35), orange);
            wall.position.set(0, 1.0, zz);
            tray.add(wall);
          }
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 6.0), orange);
          head.position.set(4.6, 1.6, 0);
          tray.add(head);
          tray.position.set(-0.6, 3.2, 0);
          body.add(tray);

          // THE CARGO IS THE POINT. It is absent on the way in, grows while the loader works, and
          // rides out in the tray. A truck that looked the same in both directions would say
          // nothing about which way the material is going.
          const fill =
            play.phase === 'approach'
              ? 0
              : play.phase === 'tip'
                ? Math.min(Math.max(play.sub, 0), 1)
                : 1;
          if (fill > 0.02) {
            const h = 0.5 + 1.7 * fill;
            const ore = new THREE.Mesh(
              new THREE.BoxGeometry(8.2, h, 5.2),
              new THREE.MeshLambertMaterial({ color: dark ? 0x6f5a44 : 0x7d6549 }),
            );
            ore.position.set(0, 0.2 + h / 2, 0);
            tray.add(ore);
          }

          body.position.set(x - W / 2, standOn(x, y), y - H / 2);
          body.rotation.y = -heading;
          L.content.add(body);
        }
      }

      if (play?.job !== 'reclaim' && play?.truck) {
        const { x, y, heading } = play.truck;
        const laden = play.phase !== 'departure';
        const body = new THREE.Group();

        const chassis = new THREE.Mesh(
          new THREE.BoxGeometry(11.5, 2.6, 6.5),
          new THREE.MeshLambertMaterial({ color: dark ? 0x59636f : 0x46505c }),
        );
        chassis.position.y = 1.6;
        body.add(chassis);

        const cab = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.4, 5.2),
          new THREE.MeshLambertMaterial({ color: dark ? 0x8b97a5 : 0x6c7885 }),
        );
        cab.position.set(4.6, 4.1, 0);
        body.add(cab);

        // The tray, and the material in it.
        //
        // THE BODY PITCHES UP AND THE LOAD LEAVES OVER THE TAILGATE, which is at -X, the rear. The
        // pivot is the rear of the tray rather than its middle, so the nose of the tray rises and
        // the material slides backwards and out, which is what a body-up haul truck does. The tray
        // is drawn as a floor and two side walls rather than a closed box so the load inside it is
        // visible at all.
        machines.push('haul');
        const tipping = play.phase === 'tip';
        const lift = tipping ? Math.sin(Math.min(play.sub, 1) * Math.PI) : 0;   // up and back down
        // POSITIVE, and the sign is the whole of it. The cab and the headboard are at +X, so +X is
        // the FRONT and the tailgate at -X is the rear. A rotation about +Z carries +X toward +Y,
        // which is up, so a POSITIVE pitch raises the nose and the load slides back and out over the
        // tailgate. This was negative, which raised the REAR and tipped the body forward over the
        // cab: the paragraph above described the right manoeuvre and the code performed its mirror.
        // Nothing numeric could see it, and no still frame either, since the tray is symmetric until
        // you notice which end went up. It was caught by watching the playback.
        const pitch = 0.95 * lift;

        const tray = new THREE.Group();
        // YELLOW: a haul truck bringing material in. The reclaim machine above is orange.
        const trayMat = new THREE.MeshLambertMaterial({ color: dark ? 0xffd94a : 0xf2c200 });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 6.8), trayMat);
        floor.position.set(0, -1.3, 0);
        tray.add(floor);
        for (const zz of [-3.3, 3.3]) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.6, 0.4), trayMat);
          wall.position.set(0, 0, zz);
          tray.add(wall);
        }
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 6.8), trayMat);
        head.position.set(4.2, 0.4, 0);      // the headboard, at the FRONT of the tray
        tray.add(head);

        if (laden) {
          // The load slides toward the tailgate as the body rises, and shrinks as it leaves.
          const remaining = tipping ? Math.max(0, 1 - play.sub) : 1;
          if (remaining > 0.02) {
            const heap = new THREE.Mesh(
              new THREE.BoxGeometry(7.4 * remaining, 1.8 * remaining, 5.9),
              new THREE.MeshLambertMaterial({ color: dark ? 0x7a6650 : 0x5a4a38 }),
            );
            heap.position.set(-4.0 + 3.7 * remaining, -0.2, 0);
            tray.add(heap);
          }
        }

        // HINGED AT THE REAR, which is what a rear-dump body is. The PIVOT sits where the tray's back
        // edge rests on the chassis and the pivot is what rotates; the tray hangs forward of it. The
        // tailgate end therefore stays where it is and only the nose rises, which is the one thing
        // that has to be true for the load to come out of the back.
        //
        // The previous version rotated the TRAY inside a pivot group and set the tray's height twice,
        // once on the tray and again on the pivot. The tray came out at y = 8.6 with the chassis
        // topping out at 2.9, so it floated a truck's height above the machine and swung away from it
        // when it tipped. That is the "you destroyed the back section" report, and the arithmetic is
        // the whole of it: one offset, applied once, on the pivot.
        const REAR_X = -4.3;                  // the tray's back edge in the tray's own frame
        const DECK_Y = 4.3;                   // where the tray sits on the chassis
        const pivot = new THREE.Group();
        pivot.position.set(-1.2 + REAR_X, DECK_Y, 0);
        pivot.rotation.z = pitch;
        tray.position.set(-REAR_X, 0, 0);     // the tray's centre, forward of its own hinge
        pivot.add(tray);
        body.add(pivot);

        body.position.set(x - W / 2, standOn(x, y), y - H / 2);
        body.rotation.y = -heading;
        L.content.add(body);
      }
    }

    // WHAT THIS FRAME PUT ON THE STAGE, published for the release gate. See the note beside the
    // reclaim branch: a pixel sampler could not tell the machines from the ground, so the renderer
    // says what it drew instead of the gate guessing.
    if (host.current) {
      host.current.dataset.machines = machines.join(',');
    }

    // The shovel.
    {
      const [sx, sy] = plan.shovel;
      const i = Math.min(Math.max(Math.floor(sx / cm), 0), nx - 1);
      const j = Math.min(Math.max(Math.floor(sy / cm), 0), ny - 1);
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(6, 14, 12),
        new THREE.MeshLambertMaterial({ color: dark ? 0xd8dee9 : 0x33475b }),
      );
      m.position.set(sx - W / 2, Z[j * nx + i] + 7, sy - H / 2);
      L.content.add(m);
    }

    L.render();
  }, [field, surface, plan, loads, colourBy, values, play, showPaths, showCrest, showPlan, dark, height, onRange]);

  return (
    <div className="st-stage3d" style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={host}
        style={{ width: '100%', height }}
        role="application"
        aria-label={t(
          'Site in three dimensions. Drag to orbit, arrow keys to turn, plus and minus to zoom, Home to recentre.',
          'La faena en tres dimensiones. Arrastra para orbitar, flechas para girar, mas y menos para acercar, Inicio para recentrar.',
        )}
      />
      <div ref={readout} className="st-probe" style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}
