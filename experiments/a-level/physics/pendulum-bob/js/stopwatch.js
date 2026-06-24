/* ═══════════════════════════════════════════════════════
   stopwatch.js — independent timer logic + button wiring
   ═══════════════════════════════════════════════════════ */
import { state, DOM } from './state.js';

export function formatSW() {
  const m  = Math.floor(state.swElapsed / 60);
  const s  = Math.floor(state.swElapsed % 60);
  const ms = Math.floor((state.swElapsed % 1) * 1000);
  if (m > 0) return `${m}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
  return `${s}.${String(ms).padStart(3,'0')} s`;
}

export function tickStopwatch(nowTS) {
  if (!state.swRunning || state.swLastTS === null) return;
  state.swElapsed += (nowTS - state.swLastTS) / 1000;
  state.swLastTS   = nowTS;
  DOM.swTimeEl.textContent = formatSW();
}

export function swStart() {
  state.swRunning             = true;
  state.swLastTS              = performance.now();
  DOM.btnSwStartStop.textContent = '⏸ Stop';
  DOM.swStateEl.textContent      = 'Running…';
  DOM.swStateEl.className        = 'sw-state running';
  DOM.btnRecord.disabled         = true;
}

export function swStop() {
  state.swRunning  = false;
  state.swLastTS   = null;
  DOM.btnSwStartStop.textContent = '▶ Start';
  DOM.swStateEl.textContent      = 'Stopped — record your n below';
  DOM.swStateEl.className        = 'sw-state done';
  DOM.btnRecord.disabled         = !state.assembled;
}

export function swResetFn() {
  state.swRunning  = false;
  state.swElapsed  = 0;
  state.swLastTS   = null;
  DOM.swTimeEl.textContent       = '0.000 s';
  DOM.btnSwStartStop.textContent = '▶ Start';
  DOM.swStateEl.textContent      = 'Ready';
  DOM.swStateEl.className        = 'sw-state';
  DOM.btnRecord.disabled         = true;
}

export function initStopwatch() {
  DOM.btnSwStartStop.addEventListener('click', () => {
    if (!state.placed.stopwatch) return;
    if (state.swRunning) swStop(); else swStart();
  });
  DOM.btnSwReset.addEventListener('click', swResetFn);
}
