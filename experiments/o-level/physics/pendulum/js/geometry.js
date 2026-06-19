/* ═══════════════════════════════════════════════════════
   geometry.js — canvas layout calculations
   Converts slider values → pixel coordinates stored in state
   ═══════════════════════════════════════════════════════ */
import { state, DOM } from './state.js';

export function recalcGeometry() {
  const standHeightM = parseInt(DOM.slHeight.value) / 100;
  const clampPosCm   = parseInt(DOM.slClampPos.value);
  state.L_m         = parseInt(DOM.slLength.value) / 100;
  state.mass        = parseInt(DOM.slMass.value) / 1000;
  state.relAngleDeg = parseInt(DOM.slAngle.value);

  const usableH  = state.H * 0.55;
  state.PX_PER_M = Math.min(220, usableH / 1.0);

  state.TABLE_W   = Math.min(state.W * 0.45, 400);
  state.TABLE_H   = 22;
  state.TABLE_X   = (state.W - state.TABLE_W) / 2;
  state.TABLE_TOP = state.H * 0.68;
  state.TABLE_LEG_H = state.H * 0.27;

  state.STAND_BASE_X = state.TABLE_X + state.TABLE_W * 0.4;
  state.STAND_BASE_Y = state.TABLE_TOP;

  state.standRodPx = standHeightM * state.PX_PER_M;
  state.standTopY  = state.STAND_BASE_Y - state.standRodPx;

  const clampFrac = 0.82 + (clampPosCm - 14) / 280;
  state.clampY = state.STAND_BASE_Y
               - state.standRodPx * Math.min(0.98, Math.max(0.55, clampFrac));

  const armLenPx = 0.30 * state.PX_PER_M;
  state.pivotX = state.STAND_BASE_X + armLenPx;
  state.pivotY = state.clampY;

  state.stringPx = state.L_m * state.PX_PER_M;

  if (!state.bobReleased) {
    state.theta = state.relAngleDeg * Math.PI / 180;
    state.omega = 0;
  }
  state.bobX = state.pivotX + Math.sin(state.theta) * state.stringPx;
  state.bobY = state.pivotY + Math.cos(state.theta) * state.stringPx;
}
