import { setStatus } from '../../readings/instruments.js';

// Wrapped in an object so primitive reassignment is visible to the renderer.
export const shakeState = { anim: null };

export function startShake() {
  shakeState.anim = { elapsed: 0, duration: 1.6 };
  setStatus('🌀 Swirling flask to mix contents…');
}

export function tickShake(dt) {
  if (!shakeState.anim) return;
  shakeState.anim.elapsed += dt;
  if (shakeState.anim.elapsed > shakeState.anim.duration) shakeState.anim = null;
}

// Returns the current flask rotation angle (radians) and liquid-surface
// tilt, decaying naturally so the swirl settles rather than stopping abruptly.
export function getShakeState() {
  if (!shakeState.anim) return { angle: 0, slosh: 0 };
  const t        = shakeState.anim.elapsed;
  const envelope = Math.max(0, 1 - t / shakeState.anim.duration);
  const angle    = Math.sin(t * 14) * 0.16 * envelope;
  const slosh    = Math.sin(t * 14 - 0.6) * 0.22 * envelope;
  return { angle, slosh };
}
