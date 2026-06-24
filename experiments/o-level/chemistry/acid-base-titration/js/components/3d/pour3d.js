import * as THREE from 'three';
import { pourState } from '../../components/2d/pour.js';
import { makeLiquidMat, MAT_GLASS_CLEAR } from './materials.js';
import { COLOR_LIQUID_NEUTRAL } from '../../chemistry/model.js';

// Beaker dimensions — match beaker3d.js constants.
const BK_H = 13.5;
const BK_R  = 4.8;

let _beakerGroup = null;
let _stream      = null;
let _scene       = null;

// Pre-built Vector3s reused each frame.
const _mouthLocal  = new THREE.Vector3();
const _mouthWorld  = new THREE.Vector3();
const _streamDir   = new THREE.Vector3();
const _UP          = new THREE.Vector3(0, 1, 0);
const _startPos    = new THREE.Vector3();
const _pourPos     = new THREE.Vector3();

export function createPour3D(scene) {
  _scene = scene;

  // ── Animated beaker ────────────────────────────────────────────────────────
  _beakerGroup = new THREE.Group();
  _beakerGroup.visible = false;

  // Body — proportioned like the real beaker (BK_H × BK_R).
  const bodyPts = [
    new THREE.Vector2(0,        0),
    new THREE.Vector2(BK_R - 0.3, 0),
    new THREE.Vector2(BK_R,       0.6),
    new THREE.Vector2(BK_R,       BK_H - 1.2),
    new THREE.Vector2(BK_R + 0.45, BK_H - 0.4),
    new THREE.Vector2(BK_R + 0.25, BK_H),
  ];
  // Shift so the group origin is at the beaker centre (mid-height).
  const shifted = bodyPts.map(p => new THREE.Vector2(p.x, p.y - BK_H / 2));
  const bodyGeo = new THREE.LatheGeometry(shifted, 28);
  const glass   = new THREE.Mesh(bodyGeo, MAT_GLASS_CLEAR);
  _beakerGroup.add(glass);

  // Liquid fill inside (starts full height, scales as fraction).
  const liqGeo = new THREE.CylinderGeometry(BK_R - 0.55, BK_R - 0.55, 1, 20);
  _beakerGroup._liq    = new THREE.Mesh(liqGeo, makeLiquidMat(COLOR_LIQUID_NEUTRAL));
  _beakerGroup._liq.renderOrder = 1;
  _beakerGroup.add(_beakerGroup._liq);

  scene.add(_beakerGroup);

  // ── Pour stream ────────────────────────────────────────────────────────────
  // Tapered cylinder that bridges the beaker mouth to the funnel opening.
  const streamGeo = new THREE.CylinderGeometry(0.25, 0.8, 1, 8);
  _stream = new THREE.Mesh(streamGeo, makeLiquidMat(COLOR_LIQUID_NEUTRAL));
  _stream.visible = false;
  scene.add(_stream);
}

// buretteTipPos: THREE.Vector3 — the burette TOP opening in world space.
// (lab3d.js passes `new THREE.Vector3(buretteX, buretteTopY, standZ)`)
export function updatePour3D(buretteTipPos) {
  if (!_beakerGroup) return;

  if (!pourState.anim) {
    _beakerGroup.visible = false;
    _stream.visible = false;
    return;
  }

  const p = pourState.anim;

  // ── Phase timing ────────────────────────────────────────────────────────────
  // Phase 1 (0 → LIFT_DUR s): beaker lifts from table to pour position.
  // Phase 2 (LIFT_DUR → end):  beaker tilts and pours.
  const LIFT_DUR  = 0.4;
  const liftT     = Math.min(1, p.elapsed / LIFT_DUR);         // 0→1 during lift
  const pourT     = Math.min(1, Math.max(0, (p.elapsed - LIFT_DUR) / 0.35)); // 0→1 tilt

  // ── Pouring position: above-left of the funnel/burette top ─────────────────
  // Offset chosen so the tilted beaker mouth aligns over the funnel.
  _pourPos.copy(buretteTipPos).add(new THREE.Vector3(-9, 15, 5));

  // ── Beaker world position: lerp from start to pour position ────────────────
  if (p._startPos3D) {
    _startPos.set(p._startPos3D.x, p._startPos3D.y, p._startPos3D.z);
  } else {
    _startPos.copy(_pourPos);
  }
  _beakerGroup.position.lerpVectors(_startPos, _pourPos, liftT);
  _beakerGroup.visible = true;

  // ── Tilt around local Z: 0° upright → −115° fully pouring ─────────────────
  _beakerGroup.rotation.z = pourT * (-115 * Math.PI / 180);

  // ── Liquid level shrinks as fluid is poured ─────────────────────────────────
  // beakerFrac is the fill fraction at animation start; subtract what's poured.
  const startFrac  = p.beakerFrac ?? 1;
  const pouredFrac = (p.pouredCc ?? 0) / 50;          // 50 cc burette capacity
  const liqFrac    = Math.max(0.01, startFrac - pouredFrac);
  const liqH       = liqFrac * (BK_H - 2.0);

  _beakerGroup._liq.scale.y    = Math.max(0.01, liqH);
  // As beaker tilts the liquid surface shifts toward the open rim.
  _beakerGroup._liq.position.y = -BK_H / 2 + liqH / 2 + 0.15 + pourT * 2.5;

  // Update liquid colour if supplied.
  if (p._liquidColor) {
    const { r, g, b } = p._liquidColor;
    _beakerGroup._liq.material.color.setRGB(r / 255, g / 255, b / 255);
    _beakerGroup._liq.material.opacity = Math.max(0.35, p._liquidColor.a);
    _stream.material.color.setRGB(r / 255, g / 255, b / 255);
    _stream.material.opacity = Math.max(0.45, p._liquidColor.a);
  }

  // ── Stream: visible once beaker is tilting and liquid is flowing ────────────
  const fullyLifted = liftT >= 1;
  if (fullyLifted && pourT > 0.3 && liqFrac > 0.01) {
    // Compute the world-space position of the beaker mouth as it tilts.
    // Mouth is at local (0, +BK_H/2, 0) before rotation.
    // After rotation.z = θ:  x' = -sin(θ)*(BK_H/2),  y' = cos(θ)*(BK_H/2)
    const theta = _beakerGroup.rotation.z;
    _mouthLocal.set(
      -Math.sin(theta) * (BK_H / 2) + BK_R * Math.cos(theta + Math.PI / 2) * 0.5,
      Math.cos(theta)  * (BK_H / 2),
      0,
    );
    _mouthWorld.copy(_beakerGroup.position).add(_mouthLocal);

    // Stream from mouth down to funnel top.
    _streamDir.subVectors(buretteTipPos, _mouthWorld).normalize();
    const streamLen = _mouthWorld.distanceTo(buretteTipPos);

    _stream.position.lerpVectors(_mouthWorld, buretteTipPos, 0.5);
    _stream.scale.y = Math.max(0.1, streamLen);
    _stream.quaternion.setFromUnitVectors(_UP, _streamDir);
    _stream.visible = true;
  } else {
    _stream.visible = false;
  }
}

export function disposePour3D() {
  if (_beakerGroup) { _scene.remove(_beakerGroup); _beakerGroup = null; }
  if (_stream)       { _scene.remove(_stream);       _stream = null; }
}
