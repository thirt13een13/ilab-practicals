import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawTable() {
  const c = ctx();
  const lx = state.TABLE_X, ty = state.TABLE_TOP, tw = state.TABLE_W;
  const legW = 14, legH = state.TABLE_LEG_H;
  const legGrad = c.createLinearGradient(0, ty + state.TABLE_H, 0, ty + state.TABLE_H + legH);
  legGrad.addColorStop(0, '#5c3d1a');
  legGrad.addColorStop(1, '#3a2610');
  for (const lp of [lx + 18, lx + tw - 18 - legW]) {
    c.fillStyle = legGrad;
    c.fillRect(lp, ty + state.TABLE_H, legW, legH);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
    for (let g = 0; g < legH; g += 18) {
      c.beginPath();
      c.moveTo(lp + 2, ty + state.TABLE_H + g);
      c.lineTo(lp + legW - 2, ty + state.TABLE_H + g + 14);
      c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(lp - 3, ty + state.TABLE_H + legH - 6, legW + 6, 8);
  }
  c.fillStyle = '#6b3f18';
  c.fillRect(lx, ty + state.TABLE_H, tw, 12);
  const surfGrad = c.createLinearGradient(lx, ty, lx, ty + state.TABLE_H);
  surfGrad.addColorStop(0, '#9a6030');
  surfGrad.addColorStop(0.3, '#7d4d24');
  surfGrad.addColorStop(1, '#5c3a18');
  c.fillStyle = surfGrad;
  c.fillRect(lx, ty, tw, state.TABLE_H);
  c.fillStyle = 'rgba(200,140,80,0.25)';
  c.fillRect(lx, ty, tw, 3);
  c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
  for (let g = lx + 15; g < lx + tw - 10; g += 22) {
    c.beginPath();
    c.moveTo(g, ty + 2); c.lineTo(g + 8, ty + state.TABLE_H - 2);
    c.stroke();
  }
}
