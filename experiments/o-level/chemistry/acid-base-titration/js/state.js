import { ACIDS, BASES, INDICATORS } from './chemistry/model.js';

export { ACIDS, BASES, INDICATORS };

export const state = {
  acidKey: 'hcl',
  baseKey: 'naoh',
  indicatorKey: 'phenolphthalein',
  acidMolarity: 1.0,
  baseMolarity: 1.0,
  pipetteVolume: 20,
  buretteRole: 'acid',   // 'acid' = acid in burette + base via pipette; 'base' = reversed

  buretteCapacity: 50,
  buretteFillCc: 0,
  buretteInitialReading: null,

  valveOpen: false,
  valveFrac: 0,

  flaskHasBase: false,
  flaskHasIndicator: false,
  flaskBaseCc: 0,
  flaskTotalCc: 0,
  flaskEqBase: 0,
  flaskEqAcidAdded: 0,
  flaskNeutralized: false,
  flaskMounted: false,

  pipetteFillCc: 0,
  pipetteSource: null,

  dropperFillCc: 0,
  dropperSource: null,

  trials: [],
  currentTrialActive: false,
};

// Assembly placement flags — mutated in-place; never reassigned.
export const placed = { stand: false, clamp: false, burette: false, flask: false, funnel: false };

// Freely-positioned loose apparatus items — mutated in-place.
export const loose = {};

// Wrapped in an object so primitive reassignment stays visible across modules.
export const rigState = { assembled: false };
export const nextLooseId = { value: 1 };

export function currentAcid()      { return ACIDS[state.acidKey]; }
export function currentBase()      { return BASES[state.baseKey]; }
export function currentIndicator() { return INDICATORS[state.indicatorKey]; }

// Role-aware helpers — use these instead of currentAcid/currentBase where the role matters.
export function currentTitrant()    { return state.buretteRole === 'acid' ? currentAcid() : currentBase(); }
export function currentAnalyte()    { return state.buretteRole === 'acid' ? currentBase() : currentAcid(); }
export function titrantMolarity()   { return state.buretteRole === 'acid' ? state.acidMolarity : state.baseMolarity; }
export function analyteMolarity()   { return state.buretteRole === 'acid' ? state.baseMolarity : state.acidMolarity; }
export function titrantBeakerType() { return state.buretteRole === 'acid' ? 'beaker-hcl' : 'beaker-naoh'; }
export function analyteBeakerType() { return state.buretteRole === 'acid' ? 'beaker-naoh' : 'beaker-hcl'; }
// Equivalent-count factor: basicity for acids, acidity for bases.
export function titrantEqFactor()   { return state.buretteRole === 'acid' ? currentAcid().basicity : currentBase().acidity; }
export function analyteEqFactor()   { return state.buretteRole === 'acid' ? currentBase().acidity  : currentAcid().basicity; }
