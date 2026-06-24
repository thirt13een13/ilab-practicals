import { state, DOM } from '../../state.js';
const ctx = () => DOM.ctx;

export function drawWindParticles() {
  if (state.windSpeed < 0.05) return;
  if (Math.random() < state.windSpeed * 6) {
    state.dustParticles.push({
      x:     -10,
      y:     state.TABLE_TOP - Math.random() * state.standRodPx * 0.8,
      vx:    50 + state.windSpeed*180 + Math.random()*30,
      vy:    (Math.random() - 0.5)*15,
      life:  1.0,
      decay: 0.008 + Math.random()*0.01,
      size:  1 + Math.random()*2,
    });
  }
  const c = ctx();
  c.save();
  for (let i = state.dustParticles.length - 1; i >= 0; i--) {
    const p = state.dustParticles[i];
    p.x += p.vx*0.016; p.y += p.vy*0.016; p.life -= p.decay;
    if (p.life <= 0 || p.x > state.W + 10) { state.dustParticles.splice(i, 1); continue; }
    c.globalAlpha = p.life * 0.5;
    c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI*2); c.fill();
  }
  c.globalAlpha = 1; c.restore();
}
