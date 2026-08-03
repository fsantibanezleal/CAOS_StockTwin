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
  /** 0 to 1 through the load sequence. Paths are drawn for loads at or before this point. */
  through?: number;
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

export default function SiteView3D({
  field,
  surface = null,
  plan,
  loads,
  colourBy,
  through = 1,
  showPaths,
  showCrest,
  showPlan,
  dark,
  height = 460,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    frame?: number;
  }>({});

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const { nx, ny, cell_m: cm } = field;
    // One accessor for the surface being drawn, so playback and the final state cannot diverge.
    const Z = surface && surface.length === nx * ny ? surface : field.z;
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
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          pos.setY(j * nx + i, field.z0[j * nx + i]);
        }
      }
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

    // -- the material -----------------------------------------------------------------------
    const mGeo = new THREE.PlaneGeometry(W, H, nx - 1, ny - 1);
    mGeo.rotateX(-Math.PI / 2);
    {
      const pos = mGeo.attributes.position as THREE.BufferAttribute;
      const col = new Float32Array(nx * ny * 3);

      const thick = Z.map((v, i) => v - field.z0[i]);
      const maxT = Math.max(...thick, 1e-6);
      const vals =
        colourBy === 'grade'
          ? field.grade
          : colourBy === 'coarse'
            ? field.coarse
            : thick.map((t) => (t > EMPTY ? t : null));
      const present = vals.filter((v): v is number => v !== null && Number.isFinite(v));
      const lo = present.length ? Math.min(...present) : 0;
      const hi = present.length ? Math.max(...present) : 1;

      for (let k = 0; k < nx * ny; k++) {
        pos.setY(k, Z[k]);
        const t = thick[k];
        let c: [number, number, number];
        if (t <= EMPTY) {
          // No material. Draw the ground colour, never a ramp value: a zero-height cell coloured as
          // material at grade zero is how an empty pad came to read as a full pile in production.
          c = dark ? [42, 50, 61] : [201, 207, 216];
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
      mGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      mGeo.computeVertexNormals();
    }
    scene.add(
      new THREE.Mesh(
        mGeo,
        new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      ),
    );

    const at = (i: number, j: number) => ({
      x: (i + 0.5) * cm - W / 2,
      z: (j + 0.5) * cm - H / 2,
    });

    // -- the crest --------------------------------------------------------------------------
    // Every edge dump was aimed perpendicular to this line. Without it on screen, the direction of
    // each deposit looks arbitrary rather than determined.
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
        scene.add(
          new THREE.Points(
            g,
            new THREE.PointsMaterial({ color: dark ? 0xffc75a : 0xb35c00, size: 2.2 }),
          ),
        );
      }
    }

    // -- the plan ---------------------------------------------------------------------------
    if (showPlan) {
      for (const a of plan.areas) {
        const y = 0.4;
        const box = [
          [a.x0, a.y0],
          [a.x1, a.y0],
          [a.x1, a.y1],
          [a.x0, a.y1],
          [a.x0, a.y0],
        ];
        const g = new THREE.BufferGeometry().setFromPoints(
          box.map(([x, z]) => new THREE.Vector3(x - W / 2, y, z - H / 2)),
        );
        scene.add(
          new THREE.Line(g, new THREE.LineBasicMaterial({ color: dark ? 0x7fd7ff : 0x0a6ea8 })),
        );
      }
    }

    // -- the truck paths --------------------------------------------------------------------
    // Approach and departure, drawn separately, because "it does not appear from nothing" is the
    // whole point: a load arrived on a machine that had to get there and then leave.
    if (showPaths) {
      const cutoff = Math.floor(loads.length * Math.min(Math.max(through, 0), 1));
      const recent = loads
        .filter((l) => l.placed && l.seq <= cutoff)
        .slice(-40); // the last few dozen, so the picture stays legible
      const mk = (pts: [number, number][], colour: number, lift: number) => {
        if (pts.length < 2) return;
        const g = new THREE.BufferGeometry().setFromPoints(
          pts.map(([x, z]) => {
            const i = Math.min(Math.max(Math.floor(x / cm), 0), nx - 1);
            const j = Math.min(Math.max(Math.floor(z / cm), 0), ny - 1);
            return new THREE.Vector3(x - W / 2, Z[j * nx + i] + lift, z - H / 2);
          }),
        );
        scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: colour })));
      };
      for (const l of recent) {
        mk(l.approach ?? [], dark ? 0x62e08a : 0x0f7a3d, 1.2);
        mk(l.departure ?? [], dark ? 0xff8f6b : 0xb2401b, 0.8);
      }
    }

    // -- the shovel ---------------------------------------------------------------------------
    {
      const [sx, sy] = plan.shovel;
      const i = Math.min(Math.max(Math.floor(sx / cm), 0), nx - 1);
      const j = Math.min(Math.max(Math.floor(sy / cm), 0), ny - 1);
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(6, 14, 12),
        new THREE.MeshLambertMaterial({ color: dark ? 0xd8dee9 : 0x33475b }),
      );
      m.position.set(sx - W / 2, Z[j * nx + i] + 7, sy - H / 2);
      scene.add(m);
    }

    // -- camera and interaction ---------------------------------------------------------------
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
      renderer.render(scene, camera);
    };
    dom.addEventListener('dblclick', recentre);

    const resize = () => {
      const w = el.clientWidth || 600;
      const h = height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      place();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // NO ANIMATION LOOP. The scene is static until the reader moves it, so there is no runaway
    // requestAnimationFrame burning a core in a background tab. Every interaction renders once.
    const render = () => renderer.render(scene, camera);
    dom.addEventListener('pointermove', render);
    dom.addEventListener('wheel', render);

    state.current = { renderer, scene, camera };

    return () => {
      ro.disconnect();
      dom.removeEventListener('contextmenu', noMenu);
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('wheel', wheel);
      dom.removeEventListener('dblclick', recentre);
      dom.removeEventListener('pointermove', render);
      dom.removeEventListener('wheel', render);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      el.innerHTML = '';
    };
  }, [field, surface, plan, loads, colourBy, through, showPaths, showCrest, showPlan, dark, height]);

  return <div ref={host} style={{ width: '100%', height }} aria-label="Site in three dimensions" />;
}
