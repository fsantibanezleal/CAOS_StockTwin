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

import type { Field, Load, Plan } from '../lib/scenario';

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
  /** Sequence number of the load being worked right now, or null for the finished pile.
   *
   *  WHEN SOMETHING IS PLAYING, ONLY THE ACTIVE TRUCK IS DRAWN. Showing every path driven so far
   *  turns the site into a ball of string and hides the one thing the reader is watching: where this
   *  load came from and where it went. The full history is still available, as a deliberate toggle,
   *  for reading the access pattern of the whole campaign. */
  activeSeq?: number | null;
  showPaths: boolean;
  showCrest: boolean;
  showPlan: boolean;
  dark: boolean;
  height?: number;
}

/** Perceptually ordered ramp, readable in both themes and safe for the common colour deficiencies. */
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
  activeSeq = null,
  showPaths,
  showCrest,
  showPlan,
  dark,
  height = 460,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);

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
    scene.add(
      new THREE.Mesh(
        mGeo,
        new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      ),
    );

    const content = new THREE.Group();
    scene.add(content);

    // -- camera and interaction ---------------------------------------------------------------
    // These live HERE, not in the content effect, so that scrubbing the build or ticking a checkbox
    // leaves the reader looking at the same thing from the same place.
    const R = Math.max(W, H);
    let az = -0.7;
    let el2 = 0.62;
    let dist = R * 1.15;
    const target = new THREE.Vector3(0, 0, 0);

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
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.min(Math.max(dist * (1 + Math.sign(e.deltaY) * 0.12), R * 0.35), R * 2.6);
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
      az = -0.7;
      el2 = 0.62;
      dist = R * 1.15;
      target.set(0, 0, 0);
      place();
      render();
    };
    dom.addEventListener('dblclick', recentre);

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
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      renderer.dispose();
      el.innerHTML = '';
    };
  }, [field, dark, height]);

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
        colourBy === 'grade' ? field.grade : colourBy === 'coarse' ? field.coarse : thick;
      const [lo, hi] = colourBy === 'thickness' ? [0, maxT] : span(vals);

      const bare: [number, number, number] = dark ? [42, 50, 61] : [201, 207, 216];
      for (let k = 0; k < n; k++) {
        pos.setY(k, Z[k]);
        const t = thick[k];
        let c: [number, number, number];
        if (t <= EMPTY) {
          // No material. Draw the ground colour, never a ramp value: a zero-height cell coloured as
          // material at grade zero is how an empty pad came to read as a full pile in production.
          c = bare;
        } else if (colourBy === 'thickness') {
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
    if (showPaths) {
      // Playing: the truck working right now, and nothing else. Parked: the recent history, which
      // is what shows how the campaign reached the whole area.
      const recent =
        activeSeq === null
          ? loads.filter((l) => l.placed).slice(-40)
          : loads.filter((l) => l.placed && l.seq <= activeSeq).slice(-1);
      // The active truck gets a heavier line, because on its own it has to carry the frame.
      const solo = activeSeq !== null;
      const mk = (pts: [number, number][], colour: number, lift: number) => {
        if (pts.length < 2) return;
        const g = new THREE.BufferGeometry().setFromPoints(
          pts.map(([x, z]) => {
            const i = Math.min(Math.max(Math.floor(x / cm), 0), nx - 1);
            const j = Math.min(Math.max(Math.floor(z / cm), 0), ny - 1);
            return new THREE.Vector3(x - W / 2, Z[j * nx + i] + lift, z - H / 2);
          }),
        );
        L.content.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: colour })));
      };
      for (const l of recent) {
        mk(l.approach ?? [], dark ? 0x62e08a : 0x0f7a3d, 1.2);
        mk(l.departure ?? [], dark ? 0xff8f6b : 0xb2401b, 0.8);
      }
      // The truck itself, sitting where it tipped, so the reader can see WHAT is making the pile
      // grow rather than only the line it drove along.
      const l = solo ? recent[recent.length - 1] : undefined;
      if (l && l.x !== undefined && l.y !== undefined) {
        const i = Math.min(Math.max(Math.floor(l.x / cm), 0), nx - 1);
        const j = Math.min(Math.max(Math.floor(l.y / cm), 0), ny - 1);
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(9, 5, 13),
          new THREE.MeshLambertMaterial({ color: dark ? 0xffd479 : 0xc27a00 }),
        );
        box.position.set(l.x - W / 2, Z[j * nx + i] + 3.2, l.y - H / 2);
        L.content.add(box);
      }
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
  }, [field, surface, plan, loads, colourBy, activeSeq, showPaths, showCrest, showPlan, dark, height]);

  return <div ref={host} style={{ width: '100%', height }} aria-label="Site in three dimensions" />;
}
