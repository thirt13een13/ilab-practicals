import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawBob() {
  if (!state.placed.bob || !state.placed.string) return;
  const c = ctx();
  c.save();
  const r = Math.max(10, Math.min(18, 10 + (state.mass*1000 - 50)*0.16));
  const sX = state.bobX, sY = state.TABLE_TOP + 6;
  const sRx = r*1.4, sRy = r*0.3;
  const sG = c.createRadialGradient(sX, sY, 0, sX, sY, sRx);
  sG.addColorStop(0, 'rgba(0,0,0,0.4)'); sG.addColorStop(1, 'transparent');
  c.save(); c.scale(1, sRy/sRx); c.fillStyle = sG;
  c.beginPath(); c.arc(sX, sY*(sRx/sRy), sRx, 0, Math.PI*2); c.fill(); c.restore();
  c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(state.bobX, state.bobY - r); c.lineTo(state.bobX, state.bobY - r - 6);
  c.arc(state.bobX, state.bobY - r - 8, 4, Math.PI/2, -Math.PI/2, false);
  c.stroke();
  const shX = state.bobX - r*0.3, shY = state.bobY - r*0.35;
  const bG = c.createRadialGradient(shX, shY, r*0.05, state.bobX, state.bobY, r);
  bG.addColorStop(0, '#e2e8f0'); bG.addColorStop(0.25, '#94a3b8');
  bG.addColorStop(0.6, '#3d4f6e'); bG.addColorStop(1, '#0f1829');
  c.fillStyle = bG;
  c.shadowColor='rgba(0,0,0,0.7)'; c.shadowBlur=14; c.shadowOffsetX=3; c.shadowOffsetY=5;
  c.beginPath(); c.arc(state.bobX, state.bobY, r, 0, Math.PI*2); c.fill();
  c.shadowBlur=0; c.shadowOffsetX=0; c.shadowOffsetY=0;
  const spG = c.createRadialGradient(shX, shY, 0, shX, shY, r*0.55);
  spG.addColorStop(0, 'rgba(255,255,255,0.65)'); spG.addColorStop(1, 'transparent');
  c.fillStyle = spG; c.beginPath(); c.arc(state.bobX, state.bobY, r, 0, Math.PI*2); c.fill();
  if (r > 13) {
    c.fillStyle = 'rgba(245,158,11,0.85)';
    c.font = `bold 9px 'IBM Plex Mono', monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`${(state.mass*1000).toFixed(0)}g`, state.bobX, state.bobY + r + 10);
  }
  c.restore();
}
