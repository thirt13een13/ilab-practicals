/* ═══════════════════════════════════════════════════════
   state.js — shared mutable state, DOM refs, constants
   All other modules import from here; no circular deps.
   ═══════════════════════════════════════════════════════ */

export const CONSTANTS = {
  G_TRUE: 9.81,
  AIR_B:  [0, 0.008, 0.025, 0.07],
  FRIC_B: [0, 0.004, 0.014, 0.04],
  ORDER:  ['stand', 'clamp', 'string', 'bob', 'stopwatch'],
};

export const state = {
  // Assembly
  placed:      { stand: false, clamp: false, string: false, bob: false, stopwatch: false },
  assembled:   false,
  bobReleased: false,
  viewMode:    'front',

  // Physics
  theta:              0,
  omega:              0,
  currentAmplitude:   0,
  initAngle:          0,
  L_m:                0.60,
  mass:               0.075,
  relAngleDeg:        10,
  airResistanceLevel: 0,
  windSpeed:          0,
  frictionLevel:      0,

  // Layout (px) — populated by recalcGeometry()
  W: 0, H: 0,
  TABLE_TOP: 0, TABLE_W: 0, TABLE_H: 0, TABLE_X: 0, TABLE_LEG_H: 0,
  STAND_BASE_X: 0, STAND_BASE_Y: 0,
  standRodPx: 0, standTopY: 0, clampY: 0,
  pivotX: 0, pivotY: 0, bobX: 0, bobY: 0, stringPx: 0,
  PX_PER_M: 220,

  // Stopwatch (independent of physics)
  swRunning: false,
  swElapsed: 0,
  swLastTS:  null,

  // Experiment data
  trialData:    [],
  currentTrial: 0,

  // Wind particle system
  dustParticles: [],

  // Canvas view transform (mouse-wheel zoom)
  viewScale:   1,
  viewOffsetX: 0,
  viewOffsetY: 0,
};

// ES modules are deferred so the DOM is ready by the time this runs.
export const DOM = {
  canvas:    document.getElementById('lab-canvas'),
  ctx:       document.getElementById('lab-canvas').getContext('2d'),
  wWrap:     document.getElementById('workspace'),

  // Sliders
  slHeight:   document.getElementById('sl-height'),
  slClampPos: document.getElementById('sl-clamp-pos'),
  slLength:   document.getElementById('sl-length'),
  slMass:     document.getElementById('sl-mass'),
  slAngle:    document.getElementById('sl-angle'),
  slWind:     document.getElementById('sl-wind'),

  // Slider value displays
  valHeight:   document.getElementById('val-height'),
  valClampPos: document.getElementById('val-clamp-pos'),
  valLength:   document.getElementById('val-length'),
  valMass:     document.getElementById('val-mass'),
  valAngle:    document.getElementById('val-angle'),
  valWind:     document.getElementById('val-wind'),

  windDisplay:   document.getElementById('wind-val-display'),
  windIndicator: document.getElementById('wind-indicator'),

  // Header buttons
  btnRelease: document.getElementById('btn-release'),
  btnStopBob: document.getElementById('btn-stop-bob'),
  btnReset:   document.getElementById('btn-reset'),
  btnFront:   document.getElementById('btn-view-front'),
  btn3d:      document.getElementById('btn-view-3d'),
  canvas3d:   document.getElementById('lab-canvas-3d'),

  // Status displays
  overlayStatus: document.getElementById('overlay-status'),
  expStatus:     document.getElementById('exp-status'),
  trialTbody:    document.getElementById('trial-tbody'),

  // Stopwatch panel
  swBox:          document.getElementById('stopwatch-apparatus'),
  swTimeEl:       document.getElementById('sw-time'),
  swStateEl:      document.getElementById('sw-state'),
  btnSwStartStop: document.getElementById('btn-sw-startstop'),
  btnSwReset:     document.getElementById('btn-sw-reset'),

  // Compute-g inputs
  inpN:      document.getElementById('inp-n'),
  inpTrials: document.getElementById('inp-trials'),
  btnRecord: document.getElementById('btn-record-trial'),
};
