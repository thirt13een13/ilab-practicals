import * as THREE from 'three';
import { state } from '../../state.js';
import { DRIP_THRESHOLD } from '../../workspace/flow.js';
import { MAT_LIQUID_NEUTRAL } from './materials.js';

const MAX_DROPS = 28;
let _dropMesh   = null;
let _streamMesh = null;
const _dummy = new THREE.Object3D();

// Self-contained 3D drop physics — independent of 2D canvas coordinates.
const _drops3D    = [];
let _dropSpawnAcc = 0;
let _lastNow      = 0;

export function createFlow3D(scene) {
  // Slightly larger, smoother spheres than before
  const dropGeo = new THREE.SphereGeometry(0.42, 8, 6);
  _dropMesh = new THREE.InstancedMesh(dropGeo, MAT_LIQUID_NEUTRAL.clone(), MAX_DROPS);
  _dropMesh.count   = 0;
  _dropMesh.visible = false;
  scene.add(_dropMesh);

  // Stream: tapered cylinder, scale.y set each frame to match tip→surface distance
  const streamGeo = new THREE.CylinderGeometry(0.18, 0.42, 1, 8, 1, true);
  _streamMesh = new THREE.Mesh(streamGeo, MAT_LIQUID_NEUTRAL.clone());
  _streamMesh.visible = false;
  scene.add(_streamMesh);

  _lastNow = performance.now();
}

// buretteTipPos  — THREE.Vector3 of the burette tip in world space
// flaskSurfacePos — THREE.Vector3 of liquid surface in flask, or null
// liquidColor    — { r, g, b, a } parsed rgba from burette contents
export function updateFlow3D(buretteTipPos, flaskSurfacePos, liquidColor) {
  if (!_dropMesh) return;

  // Time delta in seconds, capped to avoid huge jumps after tab/view switches
  const nowMs = performance.now();
  const dt = Math.min((nowMs - _lastNow) / 1000, 0.05);
  _lastNow = nowMs;

  // Tint drops and stream to match burette liquid colour
  if (liquidColor) {
    const c = new THREE.Color(liquidColor.r / 255, liquidColor.g / 255, liquidColor.b / 255);
    _dropMesh.material.color.copy(c);
    _dropMesh.material.opacity    = Math.max(0.60, liquidColor.a);
    _dropMesh.material.transparent = true;
    _streamMesh.material.color.copy(c);
    _streamMesh.material.opacity    = Math.max(0.55, liquidColor.a);
    _streamMesh.material.transparent = true;
  }

  const flowing = state.valveOpen && state.valveFrac > 0 && state.buretteFillCc > 0;

  if (!flowing) {
    _dropMesh.visible = false;
    _streamMesh.visible = false;
    _drops3D.length = 0;
    _dropSpawnAcc   = 0;
    return;
  }

  // Y level where drops disappear (flask liquid surface, or 25 cm below tip)
  const surfaceY = flaskSurfacePos
    ? flaskSurfacePos.y + 0.3   // land just above surface
    : buretteTipPos.y - 25;

  if (state.valveFrac < DRIP_THRESHOLD) {
    // ── Individual drop mode ─────────────────────────────────────────────────
    _streamMesh.visible = false;

    // Spawn drops at the tip — same rate formula as 2D flow.js
    const rate = 0.5 + state.valveFrac * 6;   // drops / second
    _dropSpawnAcc += dt * rate;
    while (_dropSpawnAcc >= 1) {
      _dropSpawnAcc -= 1;
      if (_drops3D.length < MAX_DROPS) {
        _drops3D.push({
          x: buretteTipPos.x,
          y: buretteTipPos.y,
          z: buretteTipPos.z,
          vy: 0,            // starts at rest; gravity accelerates it downward
        });
      }
    }

    // Integrate gravity (200 cm s⁻², chosen to look natural at scene scale)
    for (let i = _drops3D.length - 1; i >= 0; i--) {
      const d = _drops3D[i];
      d.vy -= 200 * dt;
      d.y  += d.vy * dt;
      if (d.y <= surfaceY) _drops3D.splice(i, 1);
    }

    // Write instanced matrices — stretch drops along Y as they accelerate
    let count = 0;
    for (const d of _drops3D) {
      if (count >= MAX_DROPS) break;
      const stretch = Math.min(2.2, 1 + Math.abs(d.vy) / 160);
      _dummy.position.set(d.x, d.y, d.z);
      _dummy.scale.set(1, stretch, 1);
      _dummy.updateMatrix();
      _dropMesh.setMatrixAt(count, _dummy.matrix);
      count++;
    }
    _dropMesh.count = count;
    _dropMesh.visible = count > 0;
    _dropMesh.instanceMatrix.needsUpdate = true;

  } else {
    // ── Continuous stream mode ───────────────────────────────────────────────
    _drops3D.length = 0;
    _dropSpawnAcc   = 0;
    _dropMesh.visible = false;

    const target = flaskSurfacePos
      ?? new THREE.Vector3(buretteTipPos.x, buretteTipPos.y - 30, buretteTipPos.z);
    const h = buretteTipPos.distanceTo(target);
    const mid = new THREE.Vector3().lerpVectors(buretteTipPos, target, 0.5);

    // Scale stream width with valve opening
    const streamW = 0.5 + state.valveFrac * 1.2;
    _streamMesh.position.copy(mid);
    _streamMesh.scale.set(streamW, h, streamW);
    _streamMesh.visible = true;

    const dir = new THREE.Vector3().subVectors(target, buretteTipPos).normalize();
    _streamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }
}

export function disposeFlow3D(scene) {
  if (_dropMesh)   { scene.remove(_dropMesh);   _dropMesh.geometry.dispose();   _dropMesh = null; }
  if (_streamMesh) { scene.remove(_streamMesh); _streamMesh.geometry.dispose(); _streamMesh = null; }
  _drops3D.length = 0;
}
