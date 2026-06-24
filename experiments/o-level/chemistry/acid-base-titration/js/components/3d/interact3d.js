import { geo } from '../../workspace/geometry.js';
import { loose, placed, state, currentIndicator, titrantBeakerType, analyteBeakerType } from '../../state.js';
import { getLiquidColorFor, parseRgba } from '../../chemistry/model.js';
import { dispensePipetteIntoFlask, addIndicatorDrop } from '../../results/trials.js';
import { startPourAnimation, pourState } from '../2d/pour.js';

// Current rig snapshot — updated each frame from lab3d.js before rendering.
let _rig = null;

export function setInteractionRig(rig) {
  _rig = rig;
}

// Convert canvas-pixel X to 3D world X (cm).
function toX3d(canvasX) {
  return ((canvasX - geo.TABLE_X) / geo.TABLE_W - 0.5) * 100;
}

// Called by drag3d.js tap listeners when a draggable is tapped (pointer down+up
// with movement < 8px). Routes to the correct interaction handler.
export function handleTap3D(id, _worldPos) {
  const item = loose[id];
  if (!item) return;

  const ix = toX3d(item.x);
  const iz = item._z3d ?? 8;

  switch (item.type) {
    case 'dropper':    handleDropperTap(item, ix, iz);    break;
    case 'pipette':    handlePipetteTap(item, ix, iz);    break;
    case 'beaker-hcl':
    case 'beaker-naoh': handleBeakerTap(id, item, ix, iz); break;
  }
}

// ── Dropper ─────────────────────────────────────────────────────────────────
// Near indicator beaker → fill. Near flask (with liquid) → add drop.

function handleDropperTap(item, ix, iz) {
  const f = _rig?.flask;

  // Dropper has liquid and is above the flask opening → deliver a drop.
  if (item.fillCc > 0 && f && placed.flask) {
    if (Math.abs(ix - f.x) < 5 && Math.abs(iz - f.z) < 5) {
      addIndicatorDrop();
      item.fillCc = Math.max(0, item.fillCc - 1);
      return;
    }
  }

  // Dropper is near an indicator beaker → fill from it.
  for (const bk of Object.values(loose)) {
    if (bk.type !== 'beaker-ind') continue;
    const bx = toX3d(bk.x);
    const bz = bk._z3d ?? 8;
    if (Math.abs(ix - bx) < 7 && Math.abs(iz - bz) < 7) {
      if ((bk.fillFrac ?? 0.6) > 0.02) {
        item.fillCc = 5;   // enough for several drops
        return;
      }
    }
  }
}

// ── Pipette ──────────────────────────────────────────────────────────────────
// Near analyte beaker → fill. Near flask (with liquid) → dispense into flask.

function handlePipetteTap(item, ix, iz) {
  const f = _rig?.flask;

  // Has liquid and is above the flask → dispense.
  if (item.fillCc > 0 && f && placed.flask) {
    if (Math.abs(ix - f.x) < 5 && Math.abs(iz - f.z) < 5) {
      dispensePipetteIntoFlask(item);
      return;
    }
  }

  // Near the analyte beaker → draw solution.
  const aType = analyteBeakerType();
  for (const bk of Object.values(loose)) {
    if (bk.type !== aType) continue;
    const bx = toX3d(bk.x);
    const bz = bk._z3d ?? 8;
    if (Math.abs(ix - bx) < 7 && Math.abs(iz - bz) < 7) {
      if ((bk.fillFrac ?? 1) > 0.02) {
        item.fillCc = state.pipetteVolume;
        // 'source' drives the liquid colour in loose-items3d.js
        item.source = state.buretteRole === 'acid' ? 'base' : 'acid';
        const draw = state.pipetteVolume / (state.buretteCapacity * 2);
        bk.fillFrac = Math.max(0, (bk.fillFrac ?? 1) - draw);
        return;
      }
    }
  }
}

// ── Beaker (titrant) ─────────────────────────────────────────────────────────
// Tap the titrant beaker when it is near the burette position → pour animation.

function handleBeakerTap(id, item, ix, iz) {
  if (!placed.burette || _rig?.buretteX == null) return;
  if (item.type !== titrantBeakerType()) return;

  const dx = Math.abs(ix - _rig.buretteX);
  const dz = Math.abs(iz - (_rig.standZ ?? 0));

  // Proximity check: beaker must be near the burette X/Z position.
  if (dx < 12 && dz < 12) {
    startPourAnimation(id);

    // Inject 3D context into pourState.anim so pour3d.js can animate from
    // the beaker's actual world position and use the correct liquid colour.
    if (pourState.anim) {
      // Beaker centre is at half its height above its Y base position.
      const iy = item._y3d ?? 0;
      pourState.anim._startPos3D   = { x: ix, y: iy + 6.75, z: iz };
      pourState.anim._liquidColor  = parseRgba(
        getLiquidColorFor(state.buretteRole === 'acid' ? 'acid' : 'base', currentIndicator()),
      );
    }
  }
}
