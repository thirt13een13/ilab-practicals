import { state, placed, loose, ACIDS, BASES, INDICATORS, currentAcid, currentBase, currentIndicator } from './state.js';
import { geo, resizeCanvas, recalcGeometry, getFlaskPos } from './workspace/geometry.js';
import { draw, hitBoxes } from './workspace/renderer.js';
import { updateFlow, drops } from './workspace/flow.js';
import { tickPour, pourState, startPourAnimation, finishPour } from './components/2d/pour.js';
import { tickShake, shakeState, getShakeState, startShake } from './components/2d/shake.js';
import { tickDispense, addAcidToFlask, dispensePipetteIntoFlask, addIndicatorDrop, logCurrentTrial } from './results/trials.js';
import { initDragAndDrop, handleDropType, addLooseItem } from './components/2d/assembly.js';
import { initCanvasDrag, checkFlaskSnap } from './components/2d/drag.js';
import { initControls, refreshReagentLabels, updateChemInfo, resetAll } from './results/controls.js';
import { updatePanelEnablement, updateBuretteReadout } from './readings/instruments.js';
import { judgeIndicatorFit, estimateEquivalencePh, flaskColor } from './chemistry/model.js';
import { viewMode, setViewMode } from './mode.js';
import { initLab3D, updateLab3D, renderLab3D, showLab3D, hideLab3D, resizeLab3D } from './components/3d/lab3d.js';

const canvas = document.getElementById('lab-canvas');
const wWrap  = document.getElementById('workspace');

let lastTS = 0;

// ── Workspace zoom ──────────────────────────────────────────────────────────
let wsZoom = 1, wsPanX = 0, wsPanY = 0;

function applyZoomTransform() {
  // Zoom is applied by the canvas 2D context in renderer.js — no CSS transform needed.
  geo.workspaceZoom = wsZoom;
  geo.workspacePanX = wsPanX;
  geo.workspacePanY = wsPanY;
  const pctEl = document.getElementById('zoom-pct');
  if (pctEl) pctEl.textContent = Math.round(wsZoom * 100) + '%';
}

function zoomAround(cx, factor) {
  const newZoom = Math.max(0.3, Math.min(3.0, wsZoom * factor));
  // Horizontal: keep the point under the cursor fixed.
  wsPanX = cx - (cx - wsPanX) * (newZoom / wsZoom);
  // Vertical: always pin the table base (world Y = geo.H − 60) to the datum
  // (screen Y = geo.H − 60), so the bench never lifts off the datum line.
  wsPanY = (geo.H - 60) * (1 - newZoom);
  wsZoom = newZoom;
  applyZoomTransform();
}

function resetZoom() {
  wsZoom = 1; wsPanX = 0; wsPanY = 0;
  applyZoomTransform();
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTS) / 1000);
  lastTS = ts;
  updateFlow(dt);
  tickPour(dt);
  tickShake(dt);
  if (state.valveOpen && state.valveFrac > 0) tickDispense(dt);

  if (viewMode === '3d') {
    updateLab3D(geo);
    renderLab3D();
  } else {
    draw();
  }

  requestAnimationFrame(loop);
}

function boot() {
  resizeCanvas(canvas, wWrap);

  // 3D init is optional — a WebGL or runtime failure must not break the 2D app.
  let _3dOk = false;
  try {
    initLab3D(wWrap);
    _3dOk = true;
  } catch (err) {
    console.warn('3D initialisation failed — running in 2D only.', err);
  }

  // ── 2D / 3D mode toggle ────────────────────────────────────────────────────
  const btnToggle = document.getElementById('btn-toggle-3d');
  if (btnToggle) {
    if (!_3dOk) {
      btnToggle.disabled = true;
      btnToggle.title = '3D unavailable — check browser console for details';
    } else {
      btnToggle.addEventListener('click', () => {
        const next = viewMode === '2d' ? '3d' : '2d';
        setViewMode(next);
        if (next === '3d') {
          showLab3D();
          canvas.style.display = 'none';
          document.querySelector('.zoom-controls')?.style.setProperty('display', 'none');
          btnToggle.textContent = '2D View';
        } else {
          hideLab3D();
          canvas.style.display = '';
          document.querySelector('.zoom-controls')?.style.removeProperty('display');
          btnToggle.textContent = '3D View';
        }
      });
    }
  }

  window.addEventListener('resize', () => {
    resetZoom();
    resizeCanvas(canvas, wWrap);
    resizeLab3D(wWrap);
  });

  // Scroll-wheel zooms the workspace; cursor X steers horizontal pan, Y is
  // locked to the datum constraint inside zoomAround.
  wWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = wWrap.getBoundingClientRect();
    zoomAround(e.clientX - rect.left, e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  // Zoom control buttons — zoom toward the horizontal centre.
  document.getElementById('btn-zoom-in').addEventListener('click', () =>
    zoomAround(wWrap.clientWidth / 2, 1.25));
  document.getElementById('btn-zoom-out').addEventListener('click', () =>
    zoomAround(wWrap.clientWidth / 2, 1 / 1.25));
  document.getElementById('btn-zoom-reset').addEventListener('click', resetZoom);

  // Reset Lab also resets the zoom.
  window.addEventListener('lab:reset-zoom', resetZoom);

  initDragAndDrop(wWrap);
  initCanvasDrag(canvas);
  initControls();
  updatePanelEnablement();
  refreshReagentLabels();
  updateChemInfo();
  requestAnimationFrame(ts => { lastTS = ts; loop(ts); });
}

// Headless test hook — mirrors the original window.__titrationTest surface.
window.__titrationTest = {
  state, placed, loose,
  ACIDS, BASES, INDICATORS,
  currentAcid, currentBase, currentIndicator,
  judgeIndicatorFit, estimateEquivalencePh,
  recalcGeometry, handleDropType, addLooseItem,
  dispensePipetteIntoFlask, addIndicatorDrop,
  startPourAnimation, finishPour, tickPour, tickDispense,
  addAcidToFlask,
  flaskColor, updatePanelEnablement, logCurrentTrial,
  checkFlaskSnap, getFlaskPos,
  refreshReagentLabels, updateChemInfo,
  tickShake, getShakeState,
  triggerShake: () => { shakeState.anim = { elapsed: 0, duration: 1.6 }; },
  getPourPouringFlag: () => !!(pourState.anim && pourState.anim._pouring),
  get pivotX()      { return geo.pivotX; },
  get pivotY()      { return geo.pivotY; },
  get buretteTopY() { return geo.buretteTopY; },
  get buretteTipY() { return geo.buretteTipY; },
  get STAND_BASE_Y(){ return geo.STAND_BASE_Y; },
  get flaskBaseY()  { return geo.flaskBaseY; },
};

boot();
