import { state, DOM, CONSTANTS } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawAngleIndicator() {
  if (!state.assembled || !state.bobReleased) return;
  const c = ctx();
  c.save();
  const arcR = 40;
  c.strokeStyle = 'rgba(245,158,11,0.4)'; c.lineWidth = 1.5;
  c.setLineDash([3,3]);
  c.beginPath();
  c.arc(state.pivotX, state.pivotY, arcR,
        Math.PI/2 - 0.02, Math.PI/2 + Math.abs(state.theta), state.theta < 0);
  c.stroke(); c.setLineDash([]);
  c.strokeStyle = 'rgba(99,179,237,0.3)'; c.lineWidth = 1;
  c.setLineDash([4,5]);
  c.beginPath();
  c.moveTo(state.pivotX, state.pivotY);
  c.lineTo(state.pivotX, state.pivotY + state.stringPx + 20);
  c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(245,158,11,0.85)';
  c.font = `10px 'IBM Plex Mono', monospace`; c.textAlign = 'center';
  c.fillText(`θ=${(state.theta*180/Math.PI).toFixed(1)}°`,
             state.pivotX + 55, state.pivotY + arcR);
  c.restore();
}

export function drawTrajectoryArc() {
  if (!state.assembled) return;
  const amp = state.bobReleased ? state.currentAmplitude : Math.abs(state.theta);
  if (amp < 0.01) return;
  const c = ctx();
  c.save();
  c.strokeStyle = 'rgba(96,165,250,0.2)'; c.lineWidth = 1.2;
  c.setLineDash([2,4]);
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = -amp + (2*amp*i/60);
    const x = state.pivotX + Math.sin(a)*state.stringPx;
    const y = state.pivotY + Math.cos(a)*state.stringPx;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke(); c.setLineDash([]); c.restore();
}

export function drawDampingIndicator() {
  if (!state.bobReleased || !state.assembled) return;
  const totalDamp = CONSTANTS.AIR_B[state.airResistanceLevel]
                  + CONSTANTS.FRIC_B[state.frictionLevel];
  if (totalDamp < 0.001 || state.initAngle < 0.01) return;
  const c = ctx();
  c.save();
  c.globalAlpha = 0.4; c.strokeStyle = 'rgba(248,113,113,0.6)';
  c.lineWidth = 1.5; c.setLineDash([2,3]);
  const trailR = state.stringPx * 0.85;
  c.beginPath();
  c.arc(state.pivotX, state.pivotY, trailR,
        Math.PI/2 - state.initAngle, Math.PI/2 - state.currentAmplitude, true);
  c.stroke();
  c.beginPath();
  c.arc(state.pivotX, state.pivotY, trailR,
        Math.PI/2 + state.currentAmplitude, Math.PI/2 + state.initAngle, false);
  c.stroke();
  c.setLineDash([]); c.globalAlpha = 1; c.restore();
}
