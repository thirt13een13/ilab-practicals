import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawClamp() {
  if (!state.placed.clamp || !state.placed.stand) return;
  const c = ctx();
  c.save();
  const cx = state.STAND_BASE_X, cy = state.clampY, armLen = 0.30 * state.PX_PER_M;
  const bhW = 22, bhH = 18;
  const bhGrad = c.createLinearGradient(cx - bhW/2, cy, cx + bhW/2, cy);
  bhGrad.addColorStop(0, '#78909c'); bhGrad.addColorStop(0.5, '#cfd8dc'); bhGrad.addColorStop(1, '#546e7a');
  c.fillStyle = bhGrad;
  c.beginPath(); c.roundRect(cx - bhW/2, cy - bhH/2, bhW, bhH, 4); c.fill();
  c.strokeStyle = '#37474f'; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#f59e0b';
  c.beginPath(); c.arc(cx + bhW/2 - 4, cy, 4, 0, Math.PI*2); c.fill();
  c.strokeStyle = '#92610a'; c.lineWidth = 1; c.stroke();
  const armGrad = c.createLinearGradient(cx, cy - 4, cx, cy + 4);
  armGrad.addColorStop(0, '#94a3b8'); armGrad.addColorStop(0.4, '#e2e8f0'); armGrad.addColorStop(1, '#475569');
  c.fillStyle = armGrad;
  c.fillRect(cx + bhW/2, cy - 4, armLen - bhW/2, 8);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.fillRect(cx + bhW/2, cy - 3, armLen - bhW/2, 2);
  const headX = cx + armLen, headY = cy;
  c.fillStyle = '#4a5568';
  c.beginPath(); c.roundRect(headX - 14, headY - 14, 28, 28, 5); c.fill();
  c.strokeStyle = '#2d3748'; c.lineWidth = 1.5; c.stroke();
  for (const ang of [45, 135, 225, 315]) {
    const rad = ang * Math.PI / 180;
    const px = headX + Math.cos(rad)*12, py = headY + Math.sin(rad)*12;
    c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(px, py, 4, 0, Math.PI*2); c.fill();
    c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(px, py, 2, 0, Math.PI*2); c.fill();
  }
  c.fillStyle = '#1e2433';
  c.beginPath(); c.arc(headX, headY, 5, 0, Math.PI*2); c.fill();
  c.fillStyle = 'rgba(100,116,139,0.8)';
  c.font = `9px 'IBM Plex Mono', monospace`;
  c.textAlign = 'left';
  c.fillText(`pos: ${DOM.slClampPos.value} cm`, cx + bhW/2 + 4, cy - 8);
  c.restore();
}
