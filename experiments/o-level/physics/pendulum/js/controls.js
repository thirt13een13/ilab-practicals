/* ═══════════════════════════════════════════════════════
   controls.js — slider, segmented button, view-toggle
   wiring + shared setStatus utility
   ═══════════════════════════════════════════════════════ */
import { state, DOM } from './state.js';
import { recalcGeometry } from './geometry.js';

export function setStatus(msg, cls = '') {
  DOM.expStatus.textContent     = msg;
  DOM.expStatus.className       = 'status-msg' + (cls ? ' ' + cls : '');
  DOM.overlayStatus.textContent = msg;
}

export function initControls() {
  /* ── Geometry sliders ─────────────────────────────── */
  DOM.slHeight.addEventListener('input', () => {
    DOM.valHeight.textContent = `${DOM.slHeight.value} cm`;
    if (!state.bobReleased) recalcGeometry();
  });
  DOM.slClampPos.addEventListener('input', () => {
    DOM.valClampPos.textContent = `${DOM.slClampPos.value} cm`;
    if (!state.bobReleased) recalcGeometry();
  });
  DOM.slLength.addEventListener('input', () => {
    DOM.valLength.textContent = `${DOM.slLength.value} cm`;
    document.getElementById('res-L').textContent = `${DOM.slLength.value} cm`;
    document.getElementById('bar-L').style.width =
      `${(parseInt(DOM.slLength.value)/120)*100}%`;
    if (!state.bobReleased) recalcGeometry();
  });
  DOM.slMass.addEventListener('input', () => {
    DOM.valMass.textContent = `${DOM.slMass.value} g`;
    state.mass = parseInt(DOM.slMass.value) / 1000;
  });
  DOM.slAngle.addEventListener('input', () => {
    DOM.valAngle.textContent = `${DOM.slAngle.value}°`;
    if (!state.bobReleased) {
      state.theta = parseInt(DOM.slAngle.value) * Math.PI / 180;
      recalcGeometry();
    }
  });

  /* ── Environment sliders ──────────────────────────── */
  DOM.slWind.addEventListener('input', () => {
    state.windSpeed = parseFloat(DOM.slWind.value);
    DOM.valWind.textContent = `${state.windSpeed.toFixed(2)} m/s`;
    if (DOM.windDisplay)   DOM.windDisplay.textContent = state.windSpeed.toFixed(2);
    if (DOM.windIndicator) DOM.windIndicator.style.display = state.windSpeed > 0.01 ? 'block' : 'none';
  });

  /* ── Segmented controls ───────────────────────────── */
  document.querySelectorAll('#seg-air .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-air .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.airResistanceLevel = parseInt(btn.dataset.val);
    });
  });
  document.querySelectorAll('#seg-friction .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-friction .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.frictionLevel = parseInt(btn.dataset.val);
    });
  });

  /* ── Canvas wheel zoom ────────────────────────────── */
  DOM.wWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect   = DOM.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newScale = Math.max(0.4, Math.min(4, state.viewScale * factor));
    state.viewOffsetX = mouseX - (mouseX - state.viewOffsetX) * (newScale / state.viewScale);
    state.viewOffsetY = mouseY - (mouseY - state.viewOffsetY) * (newScale / state.viewScale);
    state.viewScale   = newScale;
  }, { passive: false });

  /* ── View toggle ──────────────────────────────────── */
  DOM.btnFront.addEventListener('click', () => {
    state.viewMode = 'front';
    DOM.canvas.style.display   = 'block';
    DOM.canvas3d.style.display = 'none';
    DOM.btnFront.classList.add('active');
    DOM.btn3d.classList.remove('active');
  });
  DOM.btn3d.addEventListener('click', () => {
    state.viewMode = '3d';
    DOM.canvas.style.display   = 'none';
    DOM.canvas3d.style.display = 'block';
    DOM.btn3d.classList.add('active');
    DOM.btnFront.classList.remove('active');
  });
}
