/* ═══════════════════════════════════════════════════════
   physics.js — RK4 integrator + physics step
   Equation of motion:
     θ'' = -(g/L)·sin θ  −  b·θ'  +  F_wind/(mL)
   ═══════════════════════════════════════════════════════ */
import { state, CONSTANTS } from './state.js';

export function derivatives(th, om) {
  const b_total = CONSTANTS.AIR_B[state.airResistanceLevel]
                + CONSTANTS.FRIC_B[state.frictionLevel];
  const windAcc = state.windSpeed * state.windSpeed * 0.35;
  const alpha   = -(CONSTANTS.G_TRUE / state.L_m) * Math.sin(th)
                  - b_total * om
                  + (windAcc / state.L_m) * Math.cos(th);
  return [om, alpha];
}

export function rk4Step(th, om, dt) {
  const [k1a, k1b] = derivatives(th, om);
  const [k2a, k2b] = derivatives(th + 0.5*dt*k1a, om + 0.5*dt*k1b);
  const [k3a, k3b] = derivatives(th + 0.5*dt*k2a, om + 0.5*dt*k2b);
  const [k4a, k4b] = derivatives(th + dt*k3a, om + dt*k3b);
  return [
    th + (dt/6)*(k1a + 2*k2a + 2*k3a + k4a),
    om + (dt/6)*(k1b + 2*k2b + 2*k3b + k4b),
  ];
}

export function physicsStep(dt) {
  if (!state.bobReleased || !state.assembled) return;

  const subSteps = 4;
  const h = dt / subSteps;
  for (let s = 0; s < subSteps; s++) {
    [state.theta, state.omega] = rk4Step(state.theta, state.omega, h);
  }

  const b_total = CONSTANTS.AIR_B[state.airResistanceLevel]
                + CONSTANTS.FRIC_B[state.frictionLevel];
  state.currentAmplitude = Math.max(
    state.currentAmplitude * Math.exp(-b_total * dt * 0.5),
    Math.abs(state.theta)
  );

  state.bobX = state.pivotX + Math.sin(state.theta) * state.stringPx;
  state.bobY = state.pivotY + Math.cos(state.theta) * state.stringPx;

  // Live amplitude meter
  if (state.initAngle > 0.001) {
    document.getElementById('res-amp').textContent =
      `${(state.currentAmplitude * 180 / Math.PI).toFixed(1)}°`;
    document.getElementById('bar-amp').style.width =
      `${Math.min(100, (state.currentAmplitude / state.initAngle) * 100)}%`;
  }
}
