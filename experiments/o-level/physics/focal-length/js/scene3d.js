/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · scene3d.js  (ES module)
   ─────────────────────────────────────────────────────────────
   Three.js 3D view — loaded as type="module", runs after DOM parse.
   Reads/writes window.Lab for all physics & component state.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls }   from 'three/examples/jsm/controls/OrbitControls.js';
import { createTable }     from './components/3d/table.js';
import { createMetreRule } from './components/3d/metrerule.js';
import { createObject }    from './components/3d/object.js';
import { createHolder }    from './components/3d/holder.js';
import { createLens }      from './components/3d/lens.js';
import { createScreen }    from './components/3d/screen.js';
import { createRays }      from './components/3d/rays.js';

/* ── Renderer ────────────────────────────────────────────── */
const canvas3d = document.getElementById('canvas-3d');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0c12);
renderer.shadowMap.enabled = true;

/* ── Scene ───────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0c12, 0.004);  /* halved density — less darkening on zoom-in */

/* ── Camera ──────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(50, 48, 115);

/* ── Controls ────────────────────────────────────────────── */
const controls = new OrbitControls(camera, canvas3d);
controls.target.set(50, 8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance   = 20;
controls.maxDistance   = 300;
controls.update();

/* ── Lighting ────────────────────────────────────────────── */

/* Hemisphere: sky (cool blue-white) above, warm ground bounce below */
const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x5c3d1a, 1.2);
scene.add(hemi);

/* Ambient: ensures no surface is ever fully black at any zoom level */
scene.add(new THREE.AmbientLight(0xffffff, 0.75));

/* Key/sun light — warm, from upper-right-front */
const sun = new THREE.DirectionalLight(0xfff5d0, 2.0);
sun.position.set(70, 90, 60);
sun.castShadow = true;
scene.add(sun);

/* Fill light — cool, from upper-left-back to lift shadowed faces */
const fill = new THREE.DirectionalLight(0x90b0e0, 0.9);
fill.position.set(-60, 50, -40);
scene.add(fill);

/* Front camera-aligned light: stays bright regardless of orbit angle */
const camLight = new THREE.DirectionalLight(0xffffff, 0.5);
camLight.position.set(50, 30, 200);   /* roughly toward camera */
scene.add(camLight);

/* ── Environment grid ────────────────────────────────────── */
const grid = new THREE.GridHelper(200, 20, 0x1a2535, 0x111827);
grid.position.set(50, -35, 0);
scene.add(grid);

/* ── Component objects ───────────────────────────────────── */
const parts = {
  table:     createTable(scene, THREE),
  metrerule: createMetreRule(scene, THREE),
  object:    createObject(scene, THREE),
  holder:    createHolder(scene, THREE),
  lens:      createLens(scene, THREE),
  screen:    createScreen(scene, THREE),
  rays:      createRays(scene, THREE),
};

/* ── Helpers ─────────────────────────────────────────────── */
function resize() {
  const wrap = document.getElementById('workspace');
  const w    = wrap.clientWidth  || 800;
  const h    = wrap.clientHeight || 500;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function show() {
  canvas3d.style.display = 'block';
  resize();
}

function hide() {
  canvas3d.style.display = 'none';
}

/* ── Main update (called from Lab.loop when viewMode==='3d') */
function update() {
  const Lab = window.Lab;

  /* ── Component visibility ─────────────────────────────── */
  parts.metrerule.setVisible(Lab.placed.metrerule);
  parts.object.setVisible(Lab.placed.object);

  const holderLensVisible = Lab.placed.holder;
  parts.holder.setVisible(holderLensVisible);
  parts.lens.setVisible(holderLensVisible && Lab.placed.lens);

  parts.screen.setVisible(Lab.placed.screen);

  /* ── Positions along bench (X) ───────────────────────── */
  parts.holder.setPosition(Lab.u_cm);
  parts.lens.setPosition(Lab.u_cm);
  parts.screen.setPosition(Lab.u_cm + Lab.v_cm);

  /* ── Light source / circuit ──────────────────────────── */
  if (Lab.placed.object) {
    parts.object.setLit(Lab.circuitConnected);
  }

  /* ── Screen image clarity ────────────────────────────── */
  if (Lab.placed.screen) {
    parts.screen.setClarity(Lab.computeClarity());
  }

  /* ── Principal rays ──────────────────────────────────── */
  const raysOn = Lab.showRays
    && Lab.assembled
    && Lab.circuitConnected
    && Lab.u_cm > Lab.F_TRUE;
  parts.rays.update(Lab.u_cm, Lab.idealV(), Lab.F_TRUE, raysOn);

  controls.update();
  renderer.render(scene, camera);
}

/* ── Expose API to Lab namespace ─────────────────────────── */
window.Lab.scene3d = { show, hide, update, resize };

/* Run an initial resize once the module boots */
resize();
