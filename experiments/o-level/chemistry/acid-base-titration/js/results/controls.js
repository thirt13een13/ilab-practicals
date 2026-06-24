import { state, placed, loose, rigState, nextLooseId,
         currentAcid, currentBase, currentIndicator,
         currentTitrant, currentAnalyte } from '../state.js';
import { ACIDS, BASES, INDICATORS, judgeIndicatorFit } from '../chemistry/model.js';
import { geo, recalcGeometry } from '../workspace/geometry.js';
import {
  setStatus, updateBuretteReadout, updateFlaskStatusList,
  updatePanelEnablement, closeValveAuto, getValveElements,
} from '../readings/instruments.js';
import { renderTrialTable } from './trials.js';
import { startTrialIfNeeded, logCurrentTrial } from './trials.js';
import { drops } from '../workspace/flow.js';
import { pourState } from '../components/2d/pour.js';
import { shakeState, startShake } from '../components/2d/shake.js';

// ── DOM refs ────────────────────────────────────────────────────────────────

const slHeight        = document.getElementById('sl-height');
const slReach         = document.getElementById('sl-reach');
const slClampHeight   = document.getElementById('sl-clamp-height');
const slBuretteHeight = document.getElementById('sl-burette-height');
const valHeight       = document.getElementById('val-height');
const valReach        = document.getElementById('val-reach');
const valClampHeight  = document.getElementById('val-clamp-height');
const valBuretteHeight = document.getElementById('val-burette-height');

const selAcid       = document.getElementById('sel-acid');
const selBase       = document.getElementById('sel-base');
const selIndicator  = document.getElementById('sel-indicator');
const acidSlider    = document.getElementById('acid-molarity');
const baseSlider    = document.getElementById('base-molarity');
const acidVal       = document.getElementById('acid-molarity-val');
const baseVal       = document.getElementById('base-molarity-val');
const chemInfoBox   = document.getElementById('chem-info-box');
const descBeakerAcid = document.getElementById('desc-beaker-acid');
const descBeakerBase = document.getElementById('desc-beaker-base');
const descBeakerInd  = document.getElementById('desc-beaker-ind');
const formulaMainEl  = document.getElementById('formula-main');
const formulaSubEl   = document.getElementById('formula-sub');

const btnReset = document.getElementById('btn-reset');
const btnShake = document.getElementById('btn-shake');
const btnNewTrial = document.getElementById('btn-new-trial');
const modalOverlay = document.getElementById('modal-overlay');

// ── Public exports ───────────────────────────────────────────────────────────

export function initControls() {
  const { btnToggleValve, valveSlider, valveStateLabel } = getValveElements();

  // Valve
  btnToggleValve.addEventListener('click', () => {
    state.valveOpen = !state.valveOpen;
    btnToggleValve.textContent      = state.valveOpen ? 'Close Valve' : 'Open Valve';
    valveSlider.disabled            = !state.valveOpen;
    valveStateLabel.textContent     = state.valveOpen ? 'Open' : 'Closed';
    if (state.valveOpen) startTrialIfNeeded();
  });
  valveSlider.addEventListener('input', () => {
    state.valveFrac = parseInt(valveSlider.value) / 100;
  });

  // Geometry sliders
  slHeight.addEventListener('input', () => {
    valHeight.textContent = `${slHeight.value} cm`; recalcGeometry();
  });
  slReach.addEventListener('input', () => {
    valReach.textContent = `${slReach.value} cm`; recalcGeometry();
  });
  slClampHeight.addEventListener('input', () => {
    valClampHeight.textContent = `${slClampHeight.value} cm`; recalcGeometry();
  });
  slBuretteHeight.addEventListener('input', () => {
    const v = parseInt(slBuretteHeight.value);
    valBuretteHeight.textContent = `${v > 0 ? '+' : ''}${v} cm`;
    recalcGeometry();
  });

  // Reagent selects
  selAcid.addEventListener('change', () => {
    state.acidKey = selAcid.value; refreshReagentLabels(); updateChemInfo();
  });
  selBase.addEventListener('change', () => {
    state.baseKey = selBase.value; refreshReagentLabels(); updateChemInfo();
  });
  selIndicator.addEventListener('change', () => {
    state.indicatorKey = selIndicator.value; refreshReagentLabels(); updateChemInfo();
  });

  // Molarity sliders
  acidSlider.addEventListener('input', () => {
    state.acidMolarity = parseFloat(acidSlider.value);
    acidVal.textContent = state.acidMolarity.toFixed(2) + ' M';
  });
  baseSlider.addEventListener('input', () => {
    state.baseMolarity = parseFloat(baseSlider.value);
    baseVal.textContent = state.baseMolarity.toFixed(2) + ' M';
  });

  // Burette-role toggle
  document.querySelectorAll('#seg-burette-role .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-burette-role .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.buretteRole = btn.dataset.role;
      refreshReagentLabels();
      updateChemInfo();
    });
  });

  // Pipette volume segmented control
  document.querySelectorAll('#seg-pipette-vol .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-pipette-vol .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.pipetteVolume = parseInt(btn.dataset.vol);
    });
  });

  // Right-panel buttons
  btnShake.addEventListener('click', startShake);
  btnNewTrial.addEventListener('click', logCurrentTrial);
  btnReset.addEventListener('click', resetAll);

  // Help modal
  document.getElementById('btn-help').addEventListener('click', () => modalOverlay.classList.add('open'));
  document.getElementById('btn-close-help').addEventListener('click', () => modalOverlay.classList.remove('open'));
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
}

export function refreshReagentLabels() {
  const acid     = currentAcid(), base = currentBase(), ind = currentIndicator();
  const titrant  = currentTitrant(), analyte = currentAnalyte();
  const acidRole = state.buretteRole === 'acid';

  descBeakerAcid.textContent = `${acid.formula} stock${acid.strong ? '' : ' (weak)'}`;
  descBeakerBase.textContent = `${base.formula} stock${base.strong ? '' : ' (weak)'}`;
  descBeakerInd.textContent  = `${ind.name} stock`;

  // Role-dependent section titles
  const titrantEl = document.getElementById('title-titrant');
  const analyteEl = document.getElementById('title-analyte');
  if (titrantEl) titrantEl.textContent = acidRole ? '🧫 Acid (burette)'          : '🧫 Base (burette)';
  if (analyteEl) analyteEl.textContent = acidRole ? '🧪 Base (flask, via pipette)' : '🧪 Acid (flask, via pipette)';

  // Flask-contents dot label
  const flaskLbl = document.getElementById('lbl-flask-analyte');
  if (flaskLbl) flaskLbl.textContent = acidRole ? 'Base' : 'Acid';

  // Result panel label
  const resultLbl = document.getElementById('label-result-conc');
  if (resultLbl) resultLbl.textContent = acidRole ? 'Calculated base conc.' : 'Calculated acid conc.';

  // Chemistry formula (same equation, roles don't change the chemistry)
  formulaMainEl.textContent = `${acid.basicity > 1 ? acid.basicity + ' ' : ''}${base.formula} + ${acid.formula} → salt + H₂O`;
  formulaSubEl.textContent  = `${acid.basicity} eq H⁺/${acid.formula}  ·  ${base.acidity} eq OH⁻/${base.formula}`;
}

export function updateChemInfo() {
  const acid = currentAcid(), base = currentBase();
  const fit  = judgeIndicatorFit(acid, base, state.indicatorKey);
  const strengthLine = `${acid.name} (${acid.strong ? 'strong' : 'weak'}) + ${base.name} (${base.strong ? 'strong' : 'weak'})`;
  const cls  = fit.severity === 'good' ? 'chem-good' : 'chem-warn';
  chemInfoBox.innerHTML = `
    <div class="chem-line">${strengthLine}</div>
    <div class="chem-line ${cls}">${fit.msg}</div>
  `;
}

export function resetAll() {
  // Reset placed flags in-place
  Object.assign(placed, { stand: false, clamp: false, burette: false, flask: false, funnel: false });
  // Clear loose items in-place
  Object.keys(loose).forEach(k => delete loose[k]);
  // Reset animation state
  pourState.anim   = null;
  shakeState.anim  = null;
  drops.length     = 0;
  rigState.assembled = false;
  nextLooseId.value  = 1;

  // Reset role toggle UI to default
  document.querySelectorAll('#seg-burette-role .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === 'acid');
  });

  // Reset chemistry state in-place
  Object.assign(state, {
    buretteRole: 'acid',
    buretteFillCc: 0, valveOpen: false, valveFrac: 0,
    buretteInitialReading: null,
    flaskHasBase: false, flaskHasIndicator: false,
    flaskBaseCc: 0, flaskTotalCc: 0,
    flaskEqBase: 0, flaskEqAcidAdded: 0,
    flaskNeutralized: false, flaskMounted: false,
    trials: [], currentTrialActive: false,
  });

  // DOM cleanup
  ['stand', 'clamp', 'burette', 'flask', 'funnel'].forEach(t => {
    const card = document.getElementById(`card-${t}`);
    if (card) card.classList.remove('placed-single');
    const dot = document.getElementById(`asm-${t}`);
    if (dot) dot.classList.remove('ok');
  });

  const { btnToggleValve, valveSlider, valveStateLabel } = getValveElements();
  [slHeight, slReach, slClampHeight, slBuretteHeight].forEach(s => { s.disabled = true; });
  slBuretteHeight.value = 0;
  valBuretteHeight.textContent = '0 cm';
  btnToggleValve.disabled = true; btnToggleValve.textContent = 'Open Valve';
  valveSlider.disabled    = true; valveSlider.value = 0;
  valveStateLabel.textContent = 'Closed';
  btnShake.disabled    = true;
  btnNewTrial.disabled = true;

  renderTrialTable();
  document.getElementById('result-mean').textContent = '—';
  document.getElementById('result-conc').textContent = '—';
  updateFlaskStatusList();
  updateBuretteReadout();
  setStatus('↺ Lab reset — drag the apparatus back onto the bench.');
  recalcGeometry();
  window.dispatchEvent(new Event('lab:reset-zoom'));
}
