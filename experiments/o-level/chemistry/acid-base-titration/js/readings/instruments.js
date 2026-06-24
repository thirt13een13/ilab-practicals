import { state, placed, rigState } from '../state.js';

const buretteReadout     = document.getElementById('burette-readout');
const buretteReadoutFill = document.getElementById('burette-readout-fill');
const expStatus          = document.getElementById('exp-status');
const overlayStatus      = document.getElementById('overlay-status');
const btnToggleValve     = document.getElementById('btn-toggle-valve');
const valveSlider        = document.getElementById('valve-slider');
const valveStateLabel    = document.getElementById('valve-state');
const btnShake           = document.getElementById('btn-shake');
const btnNewTrial        = document.getElementById('btn-new-trial');

export function setStatus(msg, cls) {
  expStatus.textContent = msg;
  expStatus.className   = 'status-msg' + (cls ? ' ' + cls : '');
  overlayStatus.textContent = msg;
}

export function setDot(id, ok) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('ok', !!ok);
}

export function updateBuretteReadout() {
  buretteReadout.innerHTML =
    `${state.buretteFillCc.toFixed(1)}<span style="font-size:14px;color:var(--text-dim)"> cc</span>`;
  buretteReadoutFill.style.width =
    `${(state.buretteFillCc / state.buretteCapacity) * 100}%`;
}

export function updateFlaskStatusList() {
  setDot('chk-naoh',  state.flaskHasBase);
  setDot('chk-ind',   state.flaskHasIndicator);
  setDot('chk-mount', state.flaskMounted);
}

export function updatePanelEnablement() {
  const rigReady = placed.burette && rigState.assembled &&
                   state.flaskMounted && state.flaskHasBase &&
                   state.flaskHasIndicator && state.buretteFillCc > 0;
  btnToggleValve.disabled = !rigReady;
  btnShake.disabled       = !placed.flask || !state.flaskHasBase;
  btnNewTrial.disabled    = !(placed.burette && state.flaskHasBase);
  updateFlaskStatusList();
  updateBuretteReadout();
}

export function closeValveAuto(msg) {
  state.valveOpen = false;
  btnToggleValve.textContent    = 'Open Valve';
  valveSlider.disabled          = true;
  valveStateLabel.textContent   = msg ? 'Empty' : 'Closed';
  if (msg) setStatus('⚠️ ' + msg, 'warn');
}

// Exposed so controls.js can wire the valve button without importing DOM refs.
export function getValveElements() {
  return { btnToggleValve, valveSlider, valveStateLabel };
}
