import * as THREE from 'three';
import { loose, placed, state, currentIndicator, currentAcid, currentBase } from '../../state.js';
import { getLiquidColorFor, parseRgba } from '../../chemistry/model.js';
import { geo } from '../../workspace/geometry.js';
import { registerDraggable, unregisterDraggable } from './drag3d.js';
import { createBeaker3D,  updateBeaker3D, setBeakerLabel  } from './beaker3d.js';
import { createPipette3D, updatePipette3D  } from './pipette3d.js';
import { createDropper3D, updateDropper3D  } from './dropper3d.js';
import { createFunnel3D,  updateFunnel3D, hideFunnel3D } from './funnel3d.js';
import { pourState } from '../2d/pour.js';

// Pool of Three.js groups per loose item id.
const pool = {};

// Current rig context (burette + flask positions) — updated each frame so
// onMove closures can enforce physical constraints without stale data.
let _lastRigPos = null;

// ── Coordinate helpers ───────────────────────────────────────────────────────
function x3dToCanvas(x3d) {
  return (x3d / 100 + 0.5) * geo.TABLE_W + geo.TABLE_X;
}
function canvasToX3d(canvasX) {
  return ((canvasX - geo.TABLE_X) / geo.TABLE_W - 0.5) * 100;
}

// ── Pool management ──────────────────────────────────────────────────────────
function getOrCreate(id, type, scene) {
  if (pool[id]) return pool[id];

  let group;
  switch (type) {
    case 'beaker-hcl':
    case 'beaker-naoh':
    case 'beaker-ind': group = createBeaker3D();  break;
    case 'pipette':    group = createPipette3D(); break;
    case 'dropper':    group = createDropper3D(); break;
    case 'funnel':     group = createFunnel3D();  break;
    default: return null;
  }

  scene.add(group);
  pool[id] = group;

  // Acid/base beakers can be lifted vertically so the user can pour them into
  // the burette.  The indicator beaker and all hand-tools keep their previous
  // plane rules (indicator stays flat; dropper/pipette/funnel use vertical).
  const verticalMove = (type === 'beaker-hcl' || type === 'beaker-naoh')
    ? true
    : !type.startsWith('beaker-');

  registerDraggable(group, id, (nx, ny, nz) => {
    const item = loose[id];
    if (!item) return false;

    if (type === 'beaker-hcl' || type === 'beaker-naoh') {
      // Allow lifting to burette-top height when near the burette;
      // elsewhere clamp the beaker close to the table so it doesn't float.
      const rig = _lastRigPos;
      const maxY = (rig?.buretteX != null && Math.abs(nx - rig.buretteX) < 18)
        ? (rig.buretteTopY ?? 60) + 18   // near burette — can reach funnel level
        : 6;                              // elsewhere — stays near table surface
      ny = Math.max(0, Math.min(ny, maxY));
    }

    if (type === 'dropper') {
      // Dropper can dip into the indicator beaker OR into the flask neck,
      // but must stay above table level elsewhere.
      const f = _lastRigPos?.flask;
      const indBeakers = Object.values(loose)
        .filter(it => it.type === 'beaker-ind')
        .map(it => ({ x: canvasToX3d(it.x), z: it._z3d ?? 8 }));
      const aboveIndBeaker = indBeakers.some(
        bk => Math.abs(nx - bk.x) < 4 && Math.abs(nz - bk.z) < 4,
      );

      if (f) {
        const aboveFlask = Math.abs(nx - f.x) < 2.5 && Math.abs(nz - f.z) < 2.5;
        if (aboveFlask) {
          ny = Math.max(ny, 15);          // into flask neck
        } else if (aboveIndBeaker) {
          ny = Math.max(ny, 10);          // into indicator beaker
        } else {
          ny = Math.max(ny, f.topY + 2);  // clear of everything else
        }
      } else if (aboveIndBeaker) {
        ny = Math.max(ny, 10);
      }
    }

    if (type === 'pipette') {
      // Pipette can only descend into a beaker when positioned above one.
      // Beaker rim ≈ Y 13.5 cm. No constraint if no beakers are on the table.
      const beakerXs = Object.values(loose)
        .filter(it => it.type.startsWith('beaker-'))
        .map(it => canvasToX3d(it.x));
      if (beakerXs.length > 0) {
        const aboveBeaker = beakerXs.some(bx => Math.abs(nx - bx) < 5.5);
        if (!aboveBeaker) ny = Math.max(ny, 15);
      }
    }

    item.x    = x3dToCanvas(nx);
    item._y3d = ny;
    item._z3d = nz;
  }, verticalMove);

  return group;
}

function removeStale(scene) {
  for (const id of Object.keys(pool)) {
    if (!loose[id]) {
      scene.remove(pool[id]);
      unregisterDraggable(id);
      delete pool[id];
    }
  }
}

// ── Main update ──────────────────────────────────────────────────────────────
// rigPos = { buretteX?, buretteTopY?, standZ?, flask? }
//   buretteX/Top/Z — for funnel snap detection
//   flask           — for dropper vertical constraint { x, z, topY }
export function updateLooseItems3D(scene, _geoParam, rigPos) {
  _lastRigPos = rigPos;
  removeStale(scene);

  const ind = currentIndicator();
  const toDelete = [];

  for (const item of Object.values(loose)) {
    const group = getOrCreate(item.id, item.type, scene);
    if (!group) continue;

    const x = canvasToX3d(item.x);
    const y = item._y3d ?? 0;
    // Beakers default to Z=4 (nearer the burette stand at Z=0).
    // Other loose items keep the original Z=8 default.
    const z = item._z3d ?? (item.type.startsWith('beaker-') ? 4 : 8);

    switch (item.type) {

      case 'beaker-hcl': {
        const p = parseRgba(getLiquidColorFor('acid', ind));
        updateBeaker3D(group, x, z, item.fillFrac, p);
        group.position.y = y;
        setBeakerLabel(group, currentAcid().formula, '#8B0000');
        // Hide while the 3D pour animation is playing this beaker.
        if (pourState.anim?.beakerLooseId === item.id) group.visible = false;
        break;
      }

      case 'beaker-naoh': {
        const p = parseRgba(getLiquidColorFor('base', ind));
        updateBeaker3D(group, x, z, item.fillFrac, p);
        group.position.y = y;
        setBeakerLabel(group, currentBase().formula, '#003366');
        if (pourState.anim?.beakerLooseId === item.id) group.visible = false;
        break;
      }

      case 'beaker-ind': {
        const p = parseRgba(getLiquidColorFor('indicator', ind));
        updateBeaker3D(group, x, z, item.fillFrac ?? 0.6, p);
        group.position.y = y;
        setBeakerLabel(group, ind.name, '#4B0082');
        break;
      }

      case 'pipette': {
        const col = item.source
          ? getLiquidColorFor(item.source, ind)
          : getLiquidColorFor('base', ind);
        updatePipette3D(group, x, y, z, item.fillCc / (state.pipetteVolume || 20), parseRgba(col));
        break;
      }

      case 'dropper': {
        const p = parseRgba(getLiquidColorFor('indicator', ind));
        updateDropper3D(group, x, y, z, item.fillCc > 0 ? 0.7 : 0, p);
        break;
      }

      case 'funnel': {
        if (placed.funnel) { hideFunnel3D(group); break; }

        // Snap to burette top when close enough (mirrors 2D logic).
        if (placed.burette && rigPos?.buretteX !== undefined) {
          const dx = x - rigPos.buretteX;
          const dy = y - rigPos.buretteTopY;
          if (Math.hypot(dx, dy) < 8) {
            placed.funnel = true;
            toDelete.push(item.id);
            hideFunnel3D(group);
            break;
          }
        }

        updateFunnel3D(group, x, y, z);
        break;
      }
    }
  }

  for (const id of toDelete) delete loose[id];
}

export function disposeLooseItems3D(scene) {
  for (const id of Object.keys(pool)) {
    scene.remove(pool[id]);
    unregisterDraggable(id);
  }
  for (const k of Object.keys(pool)) delete pool[k];
}
