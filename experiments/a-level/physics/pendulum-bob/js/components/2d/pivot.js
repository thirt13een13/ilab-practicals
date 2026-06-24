import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawPivot() {
  if (!state.placed.clamp) return;
  const c = ctx();
  c.save();
  c.fillStyle = '#64748b';
  c.beginPath(); c.arc(state.pivotX, state.pivotY, 5, 0, Math.PI*2); c.fill();
  c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath(); c.arc(state.pivotX - 1.5, state.pivotY - 1.5, 1.5, 0, Math.PI*2); c.fill();
  c.restore();
}
