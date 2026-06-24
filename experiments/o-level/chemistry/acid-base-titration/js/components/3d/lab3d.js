import * as THREE from 'three';
import { Scene3D }      from './scene.js';
import { createLabBench }  from './lab-bench.js';
import { createStand3D,  updateStand3D  }                    from './stand3d.js';
import { createClamp3D,  updateClamp3D  }                    from './clamp3d.js';
import { createBurette3D, updateBurette3D, getBuretteTipY }  from './burette3d.js';
import { createFlask3D,  updateFlask3D,  hideFlask3D  }      from './flask3d.js';
import { createFunnel3D, updateFunnel3D, hideFunnel3D,
         FUNNEL_STEM_INSERTION }                              from './funnel3d.js';
import { updateLooseItems3D, disposeLooseItems3D }            from './loose-items3d.js';
import { createFlow3D,  updateFlow3D,  disposeFlow3D  }      from './flow3d.js';
import { createPour3D,  updatePour3D,  disposePour3D  }      from './pour3d.js';
import { initDrag3D, registerDraggable, disposeDrag3D, addTapListener } from './drag3d.js';
import { handleTap3D, setInteractionRig }                     from './interact3d.js';
import { state, placed }                                      from '../../state.js';
import { flaskColor, getLiquidColorFor, parseRgba, COLOR_LIQUID_NEUTRAL } from '../../chemistry/model.js';
import { getShakeState }                                      from '../2d/shake.js';
import { geo as geoLive, getFlaskPos }                       from '../../workspace/geometry.js';
import { currentIndicator }                                   from '../../state.js';

let _s3d     = null;
let _bench   = null;
let _stand   = null;
let _clamp   = null;
let _burette = null;
let _flask   = null;
let _funnel  = null;

// 3D depth (Z) of the free flask — persists across frames so it isn't reset
// every tick.  Resets to default when the lab is cleared.
let _flaskFreeZ = 2;

// Burette axis in 3D world space — updated every frame in updateLab3D so the
// flask drag handler can snap to it without stale coordinates.
let _burettePos3D = null;

// ── Slider DOM helpers ───────────────────────────────────────────────────────
const slH   = () => document.getElementById('sl-height');
const slR   = () => document.getElementById('sl-reach');
const slCH  = () => document.getElementById('sl-clamp-height');
const slBH  = () => document.getElementById('sl-burette-height');

// ── 2D → 3D coordinate mapping ───────────────────────────────────────────────
// The 2D table spans [TABLE_X, TABLE_X + TABLE_W] in canvas pixels.
// The 3D bench is 100 cm wide, centred at X = 0 (X ∈ [−50, +50]).
function cx3d(canvasX, g) {
  return ((canvasX - g.TABLE_X) / g.TABLE_W - 0.5) * 100;
}

// Convert 3D world X → 2D canvas X (inverse of cx3d).
function x3dToCanvas(x3d, g) {
  return (x3d / 100 + 0.5) * g.TABLE_W + g.TABLE_X;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function initLab3D(container) {
  _s3d     = new Scene3D(container);
  _bench   = createLabBench();
  _stand   = createStand3D();
  _clamp   = createClamp3D();
  _burette = createBurette3D();
  _flask   = createFlask3D();
  _funnel  = createFunnel3D();

  _s3d.scene.add(_bench, _stand, _clamp, _burette, _flask, _funnel);

  createFlow3D(_s3d.scene);
  createPour3D(_s3d.scene);
  initDrag3D(_s3d.scene, _s3d.camera, _s3d.controls, _s3d.canvas);
  addTapListener(handleTap3D);

  // Flask: horizontal drag (both X and Z on the table surface).
  // When dragged within 6 cm of the burette axis the flask auto-mounts
  // (axes align); dragging it further away auto-unmounts.
  registerDraggable(_flask, '__flask__', (nx, ny, nz) => {
    if (!placed.flask) return false;

    if (_burettePos3D && placed.burette) {
      const dx = Math.abs(nx - _burettePos3D.x);
      const dz = Math.abs(nz - _burettePos3D.z);
      if (dx < 6 && dz < 6) {
        // Close enough — snap axes and mount
        state.flaskMounted = true;
        geoLive.flaskPlacedFree.x = x3dToCanvas(_burettePos3D.x, geoLive);
        return;   // Z locked to standZ by updateLab3D while mounted
      }
      if (state.flaskMounted) state.flaskMounted = false;  // pulled away
    }

    geoLive.flaskPlacedFree.x = x3dToCanvas(nx, geoLive);
    geoLive.flaskPlacedFree.y = geoLive.STAND_BASE_Y;
    _flaskFreeZ = nz;
  }, false /* horizontal XZ plane */);

  // Reset free-Z when the lab is cleared.
  window.addEventListener('lab:reset-zoom', () => { _flaskFreeZ = 2; });
}

export function updateLab3D(geo) {
  if (!_s3d) return;

  const standHeightCm   = parseInt(slH().value)  || 80;
  const clampHeightCm   = Math.min(parseInt(slCH().value) || 60, standHeightCm - 5);
  const buretteOffsetCm = parseInt(slBH().value)  || 0;

  // Stand X — derived from 2D canvas layout so 3D and 2D are horizontally aligned.
  const standX = cx3d(geo.STAND_BASE_X, geo);
  const standZ = 0;

  // Burette / funnel X — use the exact same 2D pivot point so arm-reach slider
  // moves the burette identically in both views.
  const buretteX = cx3d(geo.pivotX, geo);
  _burettePos3D = placed.burette ? { x: buretteX, z: standZ } : null;

  // ── Stand ────────────────────────────────────────────────────────────────
  if (placed.stand) {
    _stand.visible = true;
    updateStand3D(_stand, standX, standZ, standHeightCm, clampHeightCm);
  } else {
    _stand.visible = false;
  }

  // ── Clamp ────────────────────────────────────────────────────────────────
  if (placed.clamp && placed.stand) {
    _clamp.visible = true;
    updateClamp3D(_clamp, standX, standZ, clampHeightCm, buretteX);
  } else {
    _clamp.visible = false;
  }

  // ── Burette ──────────────────────────────────────────────────────────────
  // Positive buretteOffset slides the tube DOWN in the jaws (same as 2D).
  const buretteTopY  = clampHeightCm - buretteOffsetCm;
  // Computed outside the placed-guard so the flow animation can use it too.
  const buretteColor = parseRgba(getLiquidColorFor(state.buretteRole || 'acid', currentIndicator()));
  if (placed.burette) {
    _burette.visible = true;
    const fillFrac  = state.buretteFillCc / state.buretteCapacity;
    const valveFrac = state.valveFrac;
    updateBurette3D(_burette, buretteX, standZ, buretteTopY, fillFrac, buretteColor, valveFrac);
  } else {
    _burette.visible = false;
  }

  // ── Funnel ───────────────────────────────────────────────────────────────
  // Lower by FUNNEL_STEM_INSERTION so the narrow stem sits inside the burette
  // tube rather than perching on top — matches how it looks in a practical.
  if (placed.funnel && placed.burette) {
    updateFunnel3D(_funnel, buretteX, buretteTopY - FUNNEL_STEM_INSERTION, standZ);
  } else {
    hideFunnel3D(_funnel);
  }

  // ── Flask ────────────────────────────────────────────────────────────────
  // When mounted the flask shares the burette's exact Z so both axes are
  // co-axial (same X and Z).  When free the user can slide it in XZ freely.
  const flaskZ3D = state.flaskMounted ? standZ : _flaskFreeZ;
  let _flaskX3D = 0;
  if (placed.flask) {
    const fp    = getFlaskPos();
    _flaskX3D   = cx3d(fp.x, geo);
    const fillFrac = Math.min(1, state.flaskTotalCc / 150);
    const color    = parseRgba(flaskColor(state, currentIndicator()));
    updateFlask3D(_flask, _flaskX3D, flaskZ3D, fillFrac, color, getShakeState().angle);
  } else {
    hideFlask3D(_flask);
  }

  // ── Flow (drops / stream) ────────────────────────────────────────────────
  const tipY3D = getBuretteTipY(_burette);
  const tipPos = new THREE.Vector3(buretteX, tipY3D, standZ);
  let flaskSurface = null;
  if (placed.flask && state.flaskMounted) {
    const fillH = Math.min(1, state.flaskTotalCc / 150) * 13.5;
    flaskSurface = new THREE.Vector3(_flaskX3D, fillH, flaskZ3D);
  }
  updateFlow3D(tipPos, flaskSurface, buretteColor);

  // ── Pour animation ───────────────────────────────────────────────────────
  // When a funnel is mounted the stream should aim into the bowl, not the
  // bare burette mouth.  Bowl base is STEM_H − FUNNEL_STEM_INSERTION above
  // buretteTopY; aim at ~half bowl height above that (≈ +8 cm total).
  const pourTargetY = (placed.funnel && placed.burette)
    ? buretteTopY + 8
    : buretteTopY;
  updatePour3D(new THREE.Vector3(buretteX, pourTargetY, standZ));

  // ── Loose items (beakers, pipettes, dropper, loose funnel) ───────────────
  // rigPos carries burette + flask positions so loose items can constrain their
  // vertical motion (dropper → into flask, pipette → into beaker, funnel → into burette).
  const rigPos = {
    ...(placed.burette ? { buretteX, buretteTopY, standZ } : {}),
    flask: placed.flask ? { x: _flaskX3D, z: flaskZ3D, topY: 20 } : null,
  };
  setInteractionRig(rigPos);
  updateLooseItems3D(_s3d.scene, geo, rigPos);
}

export function renderLab3D()  { if (_s3d) _s3d.render(); }
export function showLab3D()    { if (_s3d) _s3d.show(); }
export function hideLab3D()    { if (_s3d) _s3d.hide(); }
export function resizeLab3D(container) { if (_s3d) _s3d.resize(container); }
