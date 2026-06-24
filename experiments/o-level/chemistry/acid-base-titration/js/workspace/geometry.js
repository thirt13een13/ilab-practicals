import { state, loose } from '../state.js';

// All layout variables live on this single mutable object so every
// importer always reads the post-recalc values without needing live
// primitive bindings (which ES modules don't support for re-exports).
export const geo = {
  W: 0, H: 0,
  TABLE_TOP: 0, TABLE_W: 0, TABLE_H: 0, TABLE_X: 0, TABLE_LEG_H: 0,
  STAND_BASE_X: 0, STAND_BASE_Y: 0,
  PX_PER_M: 220,
  standRodPx: 0, standTopY: 0,
  clampY: 0, armLenPx: 0,
  pivotX: 0, pivotY: 0,
  buretteTopY: 0, buretteBottomY: 0, buretteTipY: 0,
  flaskX: 0, flaskBaseY: 0,
  flaskPlacedFree: { x: 0, y: 0 },
  // Workspace zoom/pan — updated by main.js, read by drag handlers.
  workspaceZoom: 1,
  workspacePanX: 0,
  workspacePanY: 0,
};

const slHeight        = document.getElementById('sl-height');
const slReach         = document.getElementById('sl-reach');
const slClampHeight   = document.getElementById('sl-clamp-height');
const slBuretteHeight = document.getElementById('sl-burette-height');

export function recalcGeometry() {
  const standHeightCm   = parseInt(slHeight.value);
  const standHeightM    = standHeightCm / 100;
  const reachCm         = parseInt(slReach.value);
  const clampHeightCm   = parseInt(slClampHeight.value);
  const buretteOffsetCm = parseInt(slBuretteHeight.value);

  const usableH = geo.H * 0.62;
  geo.PX_PER_M = Math.min(230, usableH / standHeightM);

  geo.TABLE_W   = Math.min(geo.W * 0.5, 460);
  geo.TABLE_H   = 22;
  geo.TABLE_X   = (geo.W - geo.TABLE_W) / 2;
  geo.TABLE_LEG_H = Math.min(geo.H * 0.30, 1.0 * geo.PX_PER_M * 0.62);
  geo.TABLE_TOP   = geo.H - 60 - geo.TABLE_LEG_H - geo.TABLE_H;

  geo.STAND_BASE_X = geo.TABLE_X + geo.TABLE_W * 0.32;
  geo.STAND_BASE_Y = geo.TABLE_TOP;

  geo.standRodPx = standHeightM * geo.PX_PER_M;
  geo.standTopY  = geo.STAND_BASE_Y - geo.standRodPx;

  const clampHeightClamped = Math.min(clampHeightCm, standHeightCm - 5);
  const clampFrac = Math.min(0.97, Math.max(0.05, clampHeightClamped / standHeightCm));
  geo.clampY = geo.STAND_BASE_Y - geo.standRodPx * clampFrac;

  geo.armLenPx = (reachCm / 100) * geo.PX_PER_M;
  geo.pivotX   = geo.STAND_BASE_X + geo.armLenPx;

  const buretteOffsetPx = (buretteOffsetCm / 100) * geo.PX_PER_M;
  geo.pivotY = geo.clampY + buretteOffsetPx;

  geo.buretteTopY    = geo.pivotY - 6;
  geo.buretteBottomY = geo.pivotY + 230;
  geo.buretteTipY    = geo.buretteBottomY + 26;

  geo.flaskX     = geo.pivotX;
  geo.flaskBaseY = geo.STAND_BASE_Y;

  // Reset to default free position when the flask hasn't been dropped yet.
  // '__flaskRefUnused__' is a sentinel key that never exists in loose,
  // so this branch always fires — preserving the original behaviour.
  if (!loose['__flaskRefUnused__']) {
    geo.flaskPlacedFree = { x: geo.TABLE_X + geo.TABLE_W * 0.75, y: geo.STAND_BASE_Y };
  }
}

export function getFlaskPos() {
  if (state.flaskMounted) return { x: geo.flaskX, y: geo.flaskBaseY };
  return { x: geo.flaskPlacedFree.x, y: geo.flaskPlacedFree.y };
}

export function resizeCanvas(canvas, wWrap) {
  const rect = wWrap.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
  geo.W = canvas.width;
  geo.H = canvas.height;
  recalcGeometry();
}
