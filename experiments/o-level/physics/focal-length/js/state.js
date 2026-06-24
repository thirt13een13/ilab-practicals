/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · state.js
   ─────────────────────────────────────────────────────────────
   Shared Lab namespace — all state, constants, and DOM refs.
   Loaded first; every other JS file reads/writes via Lab.*
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const Lab = {

  /* ── Canvas refs (assigned in boot) ─────────────────── */
  canvas: null,
  ctx:    null,
  wWrap:  null,
  cc:     null,
  cctx:   null,

  /* ── Experiment state ────────────────────────────────── */
  placed: {
    metrerule: false, object: false, holder: false,
    lens: false, screen: false, battery: false, bulb: false,
  },
  assembled:        false,
  circuitConnected: false,
  viewMode:         'front',
  showRays:         true,

  /* ── Physics constants ───────────────────────────────── */
  F_TRUE: 15,
  u_cm:   20,
  v_cm:   40,

  /* ── Layout (recalculated on resize) ─────────────────── */
  W: 0, H: 0,
  TABLE_TOP: 0, TABLE_W: 0, TABLE_X: 0, TABLE_LEG_H: 0, TABLE_H: 0,
  BENCH_Y: 0, BENCH_X0: 0, BENCH_X1: 0, BENCH_LEN_PX: 0, CM_TO_PX: 0,
  RULER_TOP_Y: 0,
  OPT_AXIS_Y:  0,

  /* Base component proportions — scaled down by recalcGeometry on short viewports */
  BOARD_H_BASE: 120,
  BOARD_W_BASE: 58,
  LENS_H_BASE:  92,
  CLEARANCE:    10,
  BOARD_H: 120,
  BOARD_W: 58,
  LENS_H:  92,

  /* ── DOM shortcuts (assigned in boot) ───────────────── */
  slU:       null,
  valU:      null,
  slV:       null,
  scVal:     null,
  btnRecord: null,
  btnReset:  null,
  btnFront:  null,
  btnSide:   null,
  btnRays:    null,
  btnView3d:  null,
  overlayEl:  null,
  expStatus: null,
  trialTbody: null,
  screenCtrl: null,

  /* ── Trial data ──────────────────────────────────────── */
  trialData:    [],
  currentTrial: 0,

  /* ── Circuit state ───────────────────────────────────── */
  circBattery: false,
  circBulb:    false,
  circWires:   [],
  wireStart:   null,
  wiringMode:  false,

  /* ── Assembly order (used by components.js and main.js) */
  ORDER: ['metrerule', 'object', 'holder', 'lens', 'screen', 'battery', 'bulb'],

  /* ── Workspace zoom / pan ────────────────────────────── */
  zoom: 1,
  panX: 0,
  panY: 0,

  /* ── Three.js 3D controller (set by scene3d.js at load) */
  scene3d: null,
};

/* `const` doesn't attach to window — ES module scene3d.js needs window.Lab */
window.Lab = Lab;
