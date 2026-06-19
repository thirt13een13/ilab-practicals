/* ═══════════════════════════════════════════════════════
   app.js — entry point
   Owns the animation loop, release/stop/reset actions,
   and canvas resize. All other modules are initialised
   from boot().
   ═══════════════════════════════════════════════════════ */
import { state, DOM, CONSTANTS } from './state.js';
import { physicsStep } from './physics.js';
import { recalcGeometry } from './geometry.js';
import { draw } from './renderer.js';
import { init3D, draw3D } from './renderer3d.js';
import { tickStopwatch, swResetFn, initStopwatch } from './stopwatch.js';
import { initDragAndDrop } from './assembly.js';
import { updateTrialTable, initExperiment } from './experiment.js';
import { setStatus, initControls } from './controls.js';

/* ── Canvas resize ───────────────────────────────────── */
function resizeCanvas() {
  const rect      = DOM.wWrap.getBoundingClientRect();
  DOM.canvas.width  = rect.width;
  DOM.canvas.height = rect.height;
  state.W = DOM.canvas.width;
  state.H = DOM.canvas.height;
  recalcGeometry();
}

/* ── Release bob ─────────────────────────────────────── */
function releaseBob() {
  if (!state.assembled) return;
  recalcGeometry();
  state.initAngle        = state.relAngleDeg * Math.PI / 180;
  state.theta            = state.initAngle;
  state.omega            = 0;
  state.currentAmplitude = state.initAngle;
  state.bobReleased      = true;
  DOM.btnStopBob.disabled    = false;
  DOM.btnRelease.textContent = '⟳ Re-release';
  setStatus('🕰️ Pendulum swinging. Start the stopwatch, count your oscillations, then Stop.', 'warn');
}

/* ── Stop & reset bob ────────────────────────────────── */
function stopAndResetBob() {
  if (!state.assembled) return;
  state.bobReleased      = false;
  state.omega            = 0;
  state.currentAmplitude = 0;
  state.theta = parseInt(DOM.slAngle.value) * Math.PI / 180;
  recalcGeometry();
  swResetFn();
  DOM.btnStopBob.disabled    = true;
  DOM.btnRelease.textContent = '⟳ Release Bob';
  setStatus('⏹ Bob stopped & reset to initial position. Adjust parameters if needed, then Release Bob for the next trial.', 'ok');
}

/* ── Full lab reset ──────────────────────────────────── */
function resetAll() {
  state.placed       = { stand:false, clamp:false, string:false, bob:false, stopwatch:false };
  state.assembled    = false;
  state.bobReleased  = false;
  state.theta        = 10 * Math.PI / 180;
  state.omega        = 0;
  state.currentAmplitude = 0;
  state.initAngle    = 0;
  state.trialData    = [];
  state.currentTrial = 0;
  state.dustParticles = [];
  swResetFn();

  CONSTANTS.ORDER.forEach(t => {
    const card = document.getElementById(`card-${t}`);
    if (card) card.classList.remove('placed');
    const dot = document.getElementById(`asm-${t}`);
    if (dot) dot.classList.remove('ok');
  });

  DOM.swBox.style.opacity       = '0.4';
  DOM.swBox.style.pointerEvents = 'none';
  DOM.btnSwStartStop.disabled   = true;
  DOM.btnSwReset.disabled       = true;
  DOM.btnRelease.disabled       = true;
  DOM.btnRelease.textContent    = '⟳ Release Bob';
  DOM.btnStopBob.disabled       = true;

  [DOM.slHeight, DOM.slClampPos, DOM.slLength, DOM.slMass, DOM.slAngle]
    .forEach(s => s.disabled = true);
  DOM.btnRecord.disabled = true;

  updateTrialTable();
  ['mean-T','mean-g','std-g'].forEach(id => document.getElementById(id).textContent = '—');
  ['res-T','res-g','res-err','res-amp'].forEach(id => document.getElementById(id).textContent = '—');
  ['bar-L','bar-T','bar-g','bar-err','bar-amp'].forEach(id => document.getElementById(id).style.width = '0%');
  document.getElementById('res-L').textContent = '— cm';

  setStatus('↺ Lab reset — drag the apparatus back onto the bench.');
  recalcGeometry();
}

/* ── Animation loop ──────────────────────────────────── */
let lastTS = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTS) / 1000);
  lastTS = ts;
  tickStopwatch(ts);
  if (state.assembled && state.bobReleased) physicsStep(dt);
  if (state.viewMode === '3d') { draw3D(); } else { draw(); }
  requestAnimationFrame(loop);
}

/* ── Boot ────────────────────────────────────────────── */
function boot() {
  resizeCanvas();
  init3D();
  initDragAndDrop();
  initStopwatch();
  initExperiment();
  initControls();

  DOM.btnRelease.addEventListener('click', releaseBob);
  DOM.btnStopBob.addEventListener('click', stopAndResetBob);
  DOM.btnReset.addEventListener('click', resetAll);

  window.addEventListener('resize', resizeCanvas);

  recalcGeometry();
  requestAnimationFrame(ts => { lastTS = ts; loop(ts); });
}

boot();
