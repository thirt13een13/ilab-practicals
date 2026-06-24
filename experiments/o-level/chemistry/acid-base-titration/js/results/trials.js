import { state, placed, currentAcid, currentBase, currentIndicator,
         currentTitrant, currentAnalyte, titrantMolarity, analyteMolarity,
         titrantEqFactor, analyteEqFactor } from '../state.js';
import {
  setStatus, updateBuretteReadout, updateFlaskStatusList,
  updatePanelEnablement, closeValveAuto,
} from '../readings/instruments.js';

const trialTbody = document.getElementById('trial-tbody');

// ── Dispensing ─────────────────────────────────────────────────────────────

export function tickDispense(dt) {
  if (state.buretteFillCc <= 0) {
    closeValveAuto('Burette is empty.');
    return;
  }
  const rateCcPerSec = state.valveFrac * 6;
  const amt = Math.min(rateCcPerSec * dt, state.buretteFillCc);
  state.buretteFillCc -= amt;
  updateBuretteReadout();
  if (state.flaskMounted) addAcidToFlask(amt);
}

export function addAcidToFlask(cc) {
  const mol = (cc / 1000) * titrantMolarity();
  const eq  = mol * titrantEqFactor();
  state.flaskEqAcidAdded += eq;
  state.flaskTotalCc     += cc;

  if (state.flaskEqBase - state.flaskEqAcidAdded <= 0 && !state.flaskNeutralized) {
    state.flaskNeutralized = true;
    onEndpointReached();
  }
}

function onEndpointReached() {
  const ind = currentIndicator();
  setStatus(
    `🎯 Endpoint! Solution turns ${describeNeutralColor()} (${ind.name}). ` +
    `Close the valve and log this trial.`,
    'ok',
  );
  closeValveAuto(null);
}

function describeIndicatorColor(side) {
  const key = state.indicatorKey;
  if (key === 'phenolphthalein') return side === 'acid' ? 'colourless' : 'pink';
  if (key === 'methylorange')    return side === 'acid' ? 'red' : 'yellow';
  return side;
}

function describeNeutralColor() {
  if (state.indicatorKey === 'methylorange') return 'orange';
  if (state.indicatorKey === 'phenolphthalein') {
    // Acid titrant neutralises a basic flask → solution turns colourless at equivalence.
    // Base titrant neutralises an acidic flask → first permanent pale pink at equivalence.
    return state.buretteRole === 'acid' ? 'colourless' : 'pale pink';
  }
  return 'transition colour';
}

// ── Trials ─────────────────────────────────────────────────────────────────

export function startTrialIfNeeded() {
  if (state.currentTrialActive) return;
  state.currentTrialActive     = true;
  state.buretteInitialReading  = state.buretteCapacity - state.buretteFillCc;
}

export function logCurrentTrial() {
  if (!placed.burette) { setStatus('No burette on the bench.', 'warn'); return; }
  const initial = state.buretteInitialReading != null ? state.buretteInitialReading : 0;
  const final   = state.buretteCapacity - state.buretteFillCc;
  const used    = Math.max(0, final - initial);

  state.trials.push({ n: state.trials.length + 1, initial, final, used });
  renderTrialTable();
  computeResult();
  resetForNextTrial();
  setStatus(`Trial ${state.trials.length} logged: ${used.toFixed(2)} cc of ${currentTitrant().formula} used.`, 'ok');
}

export function resetForNextTrial() {
  state.flaskHasBase        = false;
  state.flaskHasIndicator   = false;
  state.flaskBaseCc         = 0;
  state.flaskTotalCc        = 0;
  state.flaskEqBase         = 0;
  state.flaskEqAcidAdded    = 0;
  state.flaskNeutralized    = false;
  state.currentTrialActive  = false;
  state.buretteInitialReading = null;
  updateFlaskStatusList();
  updatePanelEnablement();
}

export function renderTrialTable() {
  trialTbody.innerHTML = state.trials.map(t => `
    <tr class="trial-row-new">
      <td>${t.n}</td><td>${t.initial.toFixed(1)}</td><td>${t.final.toFixed(1)}</td><td>${t.used.toFixed(2)}</td>
    </tr>`).join('');
}

// C(analyte) = C(titrant) · V(titrant) · titrantEqFactor / (V(analyte) · analyteEqFactor)
export function computeResult() {
  if (!state.trials.length) return;
  const vols = state.trials.map(t => t.used).filter(v => v > 0);
  if (!vols.length) return;
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  document.getElementById('result-mean').textContent = mean.toFixed(2) + ' cc';

  const vAnalyte   = state.pipetteVolume;
  const concAnalyte = (titrantMolarity() * mean * titrantEqFactor()) / (vAnalyte * analyteEqFactor());
  document.getElementById('result-conc').textContent = concAnalyte.toFixed(3) + ' M';
}

// ── Flask-side additions ────────────────────────────────────────────────────

export function dispensePipetteIntoFlask(pipetteItem) {
  const vol     = pipetteItem.fillCc;
  const analyte = currentAnalyte();
  const mol     = (vol / 1000) * analyteMolarity();
  const eq      = mol * analyteEqFactor();

  state.flaskHasBase  = true;   // flag = "flask has analyte" regardless of which it is
  state.flaskBaseCc  += vol;
  state.flaskEqBase  += eq;
  state.flaskTotalCc += vol;
  pipetteItem.fillCc  = 0;
  pipetteItem.source  = null;

  setStatus(`Dispensed ${vol.toFixed(1)} cc of ${analyte.formula} into the conical flask.`, 'ok');
  updateFlaskStatusList();
  updatePanelEnablement();
}

export function addIndicatorDrop() {
  state.flaskHasIndicator = true;
  const ind      = currentIndicator();
  const initSide = state.buretteRole === 'acid' ? 'base' : 'acid';
  const colorNote = state.flaskHasBase
    ? ` Solution appears ${describeIndicatorColor(initSide)}.`
    : '';
  setStatus(`Added a drop of ${ind.name}.${colorNote}`, 'ok');
  updateFlaskStatusList();
  updatePanelEnablement();
}
