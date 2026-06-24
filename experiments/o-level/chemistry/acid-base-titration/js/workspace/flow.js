import { state } from '../state.js';
import { geo, getFlaskPos } from './geometry.js';

export const drops = [];
let dropSpawnAcc = 0;

// Below this valve fraction: individual drops. Above: continuous stream.
export const DRIP_THRESHOLD = 0.34;

export function updateFlow(dt) {
  if (!(state.valveOpen && state.valveFrac > 0 && state.buretteFillCc > 0)) return;

  const { y: flaskBaseAtY } = getFlaskPos();
  const surfaceY = state.flaskMounted
    ? flaskBaseAtY - Math.min(1, state.flaskTotalCc / 150) * 70
    : geo.buretteTipY + 40;

  if (state.valveFrac < DRIP_THRESHOLD) {
    const rate = 0.5 + state.valveFrac * 6; // drops/sec
    dropSpawnAcc += dt * rate;
    while (dropSpawnAcc >= 1) {
      dropSpawnAcc -= 1;
      drops.push({ y: geo.buretteTipY, vy: 20 });
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += 480 * dt;
      d.y  += d.vy * dt;
      if (d.y >= surfaceY) drops.splice(i, 1);
    }
  } else {
    drops.length = 0;
  }
}
