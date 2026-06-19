/* ═══════════════════════════════════════════════════════
   experiment.js — trial recording, meters, data table
   ═══════════════════════════════════════════════════════ */
import { state, DOM, CONSTANTS } from './state.js';
import { swResetFn } from './stopwatch.js';
import { setStatus } from './controls.js';

export function updateMeters(T, gCalc, errPct) {
  document.getElementById('res-L').textContent  = `${(state.L_m*100).toFixed(1)} cm`;
  document.getElementById('bar-L').style.width  = `${(state.L_m/1.2)*100}%`;
  document.getElementById('res-T').textContent  = `${T.toFixed(4)} s`;
  document.getElementById('bar-T').style.width  = `${Math.min(100,(T/2.5)*100)}%`;
  document.getElementById('res-g').textContent  = `${gCalc.toFixed(3)} m/s²`;
  document.getElementById('bar-g').style.width  = `${Math.min(100,(gCalc/12)*100)}%`;
  document.getElementById('res-err').textContent = `${errPct.toFixed(2)} %`;
  document.getElementById('bar-err').style.width = `${Math.min(100, errPct*3)}%`;
}

export function updateTrialTable() {
  if (!state.trialData.length) {
    DOM.trialTbody.innerHTML = '<tr><td colspan="6" class="empty-row">No trials yet</td></tr>';
    return;
  }
  DOM.trialTbody.innerHTML = state.trialData.map(r =>
    `<tr>
      <td>${r.trial}</td>
      <td>${r.L_cm}</td>
      <td>${r.n}</td>
      <td>${r.t}</td>
      <td>${r.T}</td>
      <td>${r.g}</td>
    </tr>`
  ).join('');
}

export function computeAggregates() {
  if (!state.trialData.length) return;
  const gs    = state.trialData.map(r => parseFloat(r.g));
  const ts    = state.trialData.map(r => parseFloat(r.T));
  const meanG = gs.reduce((a,b) => a+b, 0) / gs.length;
  const meanT = ts.reduce((a,b) => a+b, 0) / ts.length;
  const varG  = gs.reduce((s,g) => s + (g - meanG)**2, 0) / gs.length;
  document.getElementById('mean-T').textContent = meanT.toFixed(4) + ' s';
  document.getElementById('mean-g').textContent = meanG.toFixed(3) + ' m/s²';
  document.getElementById('std-g').textContent  = Math.sqrt(varG).toFixed(4);
}

function recordTrial() {
  if (state.swRunning) { setStatus('⚠️ Stop the stopwatch first!', 'warn'); return; }
  const n = parseInt(DOM.inpN.value);
  const t = state.swElapsed;
  if (!n || n < 1) { setStatus('⚠️ Enter the number of oscillations you counted.', 'warn'); return; }
  if (t < 0.1)     { setStatus('⚠️ Stopwatch reads 0 — did you forget to time?', 'warn'); return; }

  /*  T = t / n          (period per one complete oscillation)
      g = 4π²L / T²      (from T = 2π√(L/g))
         = 4π²L·n² / t²  */
  const T      = t / n;
  const gCalc  = (4 * Math.PI * Math.PI * state.L_m * n * n) / (t * t);
  const errPct = Math.abs((gCalc - CONSTANTS.G_TRUE) / CONSTANTS.G_TRUE) * 100;

  state.currentTrial++;
  state.trialData.push({
    trial: state.currentTrial,
    L_cm:  (state.L_m * 100).toFixed(1),
    n,
    t:     t.toFixed(3),
    T:     T.toFixed(4),
    g:     gCalc.toFixed(4),
    err:   errPct.toFixed(2),
  });

  updateMeters(T, gCalc, errPct);
  updateTrialTable();
  computeAggregates();
  setStatus(
    `Trial ${state.currentTrial}: t=${t.toFixed(3)} s, n=${n}, T=${T.toFixed(4)} s → g=${gCalc.toFixed(3)} m/s² (err ${errPct.toFixed(2)} %)`,
    'ok'
  );
  swResetFn();
}

export function initExperiment() {
  DOM.btnRecord.addEventListener('click', recordTrial);
}
