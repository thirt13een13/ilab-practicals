import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawBackground() {
  const c = ctx();
  const x0   = -state.viewOffsetX / state.viewScale;
  const y0   = -state.viewOffsetY / state.viewScale;
  const visW =  state.W / state.viewScale;
  const visH =  state.H / state.viewScale;

  const grad = c.createLinearGradient(x0, y0, x0, y0 + visH);
  grad.addColorStop(0, '#0a0c12');
  grad.addColorStop(1, '#0e1018');
  c.fillStyle = grad;
  c.fillRect(x0, y0, visW, visH);

  c.strokeStyle = 'rgba(37,43,59,0.7)';
  c.lineWidth   = 0.5;
  const step   = 32;
  const startX = Math.floor(x0 / step) * step;
  const startY = Math.floor(y0 / step) * step;
  for (let x = startX; x < x0 + visW; x += step) {
    c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + visH); c.stroke();
  }
  for (let y = startY; y < y0 + visH; y += step) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + visW, y); c.stroke();
  }

  const floorGrad = c.createLinearGradient(
    0, state.TABLE_TOP + state.TABLE_LEG_H, 0, y0 + visH
  );
  floorGrad.addColorStop(0, 'rgba(20,25,38,0.9)');
  floorGrad.addColorStop(1, 'rgba(8,10,16,1)');
  c.fillStyle = floorGrad;
  c.fillRect(x0, state.TABLE_TOP + state.TABLE_LEG_H + state.TABLE_H - 4, visW, visH);
}
