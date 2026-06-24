import { state, placed, loose, currentTitrant, titrantBeakerType } from '../../state.js';
import { setStatus, updateBuretteReadout, updatePanelEnablement } from '../../readings/instruments.js';

// Wrapped so the renderer can always read the current animation via pourState.anim.
export const pourState = { anim: null };

export function startPourAnimation(beakerLooseId) {
  const beaker = loose[beakerLooseId];
  if (!beaker || beaker.type !== titrantBeakerType()) return;
  if (!placed.burette) { setStatus('⚠️ Mount a burette in the clamp first.', 'warn'); return; }
  const space = state.buretteCapacity - state.buretteFillCc;
  if (space <= 0.5) { setStatus('⚠️ Burette is already full.', 'warn'); return; }

  pourState.anim = {
    elapsed: 0,
    duration: 1.8,
    beakerLooseId,
    beakerFrac: beaker.fillFrac,
    pouredCc: 0,
  };
  setStatus(`🥃 Pouring ${currentTitrant().formula} into the burette` + (placed.funnel ? ' through the funnel…' : '…'));
}

export function finishPour() {
  if (!pourState.anim) return;
  const beaker = loose[pourState.anim.beakerLooseId];
  if (beaker) {
    beaker.fillFrac = Math.max(0,
      pourState.anim.beakerFrac - pourState.anim.pouredCc / state.buretteCapacity);
  }
  setStatus(`✓ Poured ${pourState.anim.pouredCc.toFixed(1)} cc of ${currentTitrant().formula} into the burette.`, 'ok');
  pourState.anim = null;
  updatePanelEnablement();
}

export function tickPour(dt) {
  if (!pourState.anim) return;
  pourState.anim.elapsed += dt;
  const tiltProgress   = Math.min(1, pourState.anim.elapsed / 0.5);
  const activelyPouring = tiltProgress > 0.55 && pourState.anim.beakerFrac > 0.02;
  pourState.anim._pouring = activelyPouring;

  if (activelyPouring) {
    const space    = state.buretteCapacity - state.buretteFillCc;
    const pourRate = 14; // cc/sec
    const amt      = Math.min(space, pourRate * dt,
      pourState.anim.beakerFrac * state.buretteCapacity - pourState.anim.pouredCc);
    if (amt > 0) {
      state.buretteFillCc      += amt;
      pourState.anim.pouredCc  += amt;
      updateBuretteReadout();
    }
  }
  if (pourState.anim.elapsed > pourState.anim.duration) finishPour();
}
