import { state, DOM } from '../../state.js';
import { formatSW } from '../../stopwatch.js';
const ctx = () => DOM.ctx;

export function drawStopwatchOnBench() {
  if (!state.placed.stopwatch) return;
  const c = ctx();
  c.save();
  const swX = state.TABLE_X + state.TABLE_W - 36;
  const swY = state.TABLE_TOP - 44;
  const r   = 28;
  c.fillStyle = '#1a2236';
  c.strokeStyle = '#f59e0b'; c.lineWidth = 2;
  c.beginPath(); c.arc(swX, swY, r, 0, Math.PI*2); c.fill(); c.stroke();
  c.fillStyle = '#f59e0b';
  c.fillRect(swX - 4, swY - r - 9, 8, 10);
  c.strokeStyle = 'rgba(200,210,230,0.5)'; c.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a  = (i/12)*Math.PI*2 - Math.PI/2;
    const r1 = i%3 === 0 ? r - 8 : r - 5;
    c.beginPath();
    c.moveTo(swX + Math.cos(a)*(r - 4), swY + Math.sin(a)*(r - 4));
    c.lineTo(swX + Math.cos(a)*r1,      swY + Math.sin(a)*r1);
    c.stroke();
  }
  const secAngle = (state.swElapsed % 60) / 60 * Math.PI*2 - Math.PI/2;
  c.strokeStyle = '#f87171'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(swX, swY);
  c.lineTo(swX + Math.cos(secAngle)*(r - 8), swY + Math.sin(secAngle)*(r - 8));
  c.stroke();
  c.fillStyle = '#f59e0b';
  c.font = `bold 7px 'IBM Plex Mono', monospace`; c.textAlign = 'center';
  c.fillText(formatSW(), swX, swY + 5);
  if (state.swRunning) {
    c.fillStyle = '#4ade80';
    c.beginPath(); c.arc(swX, swY - 10, 3, 0, Math.PI*2); c.fill();
  }
  c.restore();
}
