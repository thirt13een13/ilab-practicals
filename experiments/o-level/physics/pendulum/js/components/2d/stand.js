import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawStand() {
  if (!state.placed.stand) return;
  const c = ctx();
  const bx = state.STAND_BASE_X, by = state.STAND_BASE_Y;
  const rodH = state.standRodPx, rodW = 11;
  c.save();
  const baseW = 80, baseH = 16;
  const baseGrad = c.createLinearGradient(bx - baseW/2, by - baseH, bx - baseW/2, by);
  baseGrad.addColorStop(0, '#64748b'); baseGrad.addColorStop(1, '#2d3748');
  c.fillStyle = baseGrad;
  c.beginPath(); c.roundRect(bx - baseW/2, by - baseH, baseW, baseH, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(bx - baseW/2 + 4, by - baseH + 2, baseW - 8, 3);
  const rodGrad = c.createLinearGradient(bx - rodW/2, 0, bx + rodW/2, 0);
  rodGrad.addColorStop(0, '#94a3b8'); rodGrad.addColorStop(0.35, '#e2e8f0');
  rodGrad.addColorStop(0.6, '#94a3b8'); rodGrad.addColorStop(1, '#475569');
  c.fillStyle = rodGrad;
  c.fillRect(bx - rodW/2, by - baseH - rodH, rodW, rodH);
  c.strokeStyle = 'rgba(200,210,230,0.35)'; c.lineWidth = 0.8;
  const mS = state.PX_PER_M * 0.10;
  for (let my = by - baseH; my > by - baseH - rodH; my -= mS) {
    c.beginPath(); c.moveTo(bx - rodW/2 - 3, my); c.lineTo(bx - rodW/2, my); c.stroke();
  }
  c.fillStyle = '#4a5568';
  c.fillRect(bx - rodW/2 - 2, state.standTopY, rodW + 4, 14);
  c.fillStyle = 'rgba(100,116,139,0.9)';
  c.font = `10px 'IBM Plex Mono', monospace`;
  c.textAlign = 'right';
  c.fillText(`${DOM.slHeight.value} cm`, bx - rodW/2 - 8, by - rodH/2);
  c.restore();
}
