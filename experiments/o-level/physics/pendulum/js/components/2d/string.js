import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawString() {
  if (!state.placed.string || !state.placed.clamp) return;
  const c = ctx();
  c.save();
  const numSeg  = 30;
  const windBow = state.windSpeed * 8;
  c.strokeStyle = '#d4c89a'; c.lineWidth = 1.8;
  c.shadowColor = 'rgba(180,160,100,0.3)'; c.shadowBlur = 3;
  c.beginPath(); c.moveTo(state.pivotX, state.pivotY);
  for (let i = 1; i <= numSeg; i++) {
    const t = i / numSeg;
    const x = state.pivotX + (state.bobX - state.pivotX)*t + windBow * Math.sin(Math.PI*t) * 0.3;
    const y = state.pivotY + (state.bobY - state.pivotY)*t;
    c.lineTo(x, y);
  }
  c.stroke(); c.shadowBlur = 0;
  c.strokeStyle = 'rgba(200,185,140,0.4)'; c.lineWidth = 0.7;
  for (let i = 1; i < numSeg; i += 4) {
    const t = i / numSeg;
    const x = state.pivotX + (state.bobX - state.pivotX)*t;
    const y = state.pivotY + (state.bobY - state.pivotY)*t;
    c.beginPath(); c.moveTo(x - 2, y - 2); c.lineTo(x + 2, y + 2); c.stroke();
  }
  c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(state.pivotX, state.pivotY - 6); c.lineTo(state.pivotX, state.pivotY + 2);
  c.arc(state.pivotX, state.pivotY + 4, 4, -Math.PI/2, Math.PI/2);
  c.stroke();
  const midX = (state.pivotX + state.bobX)/2 - 28;
  const midY = (state.pivotY + state.bobY)/2;
  c.fillStyle = 'rgba(245,158,11,0.75)';
  c.font = `9px 'IBM Plex Mono', monospace`;
  c.textAlign = 'right';
  c.fillText(`L=${(state.L_m*100).toFixed(0)} cm`, midX, midY);
  c.restore();
}
