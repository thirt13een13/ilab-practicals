import * as THREE from 'three';
import { MAT_GLASS_CLEAR, makeLiquidMat, MAT_LIQUID_NEUTRAL } from './materials.js';

// 500 ml lab beaker — nearly straight walls, flat bottom, pour spout.
// Dimensions in cm.  Y=0 = base on table surface.
const BK_H  = 13.5;   // height to rim
const BK_R  = 4.8;    // body radius

// ── Graduation texture ───────────────────────────────────────────────────────
// 100–500 mL marks drawn on a canvas, mapped onto a thin outer cylinder.
// CylinderGeometry UV: v=0 at top, v=1 at bottom of cylinder.
// The overlay cylinder spans Y=0 to Y=BK_H (same as glass shell).
// Mark at physical height h:  canvasY = (1 − h/BK_H) * H
function buildBeakerGradTexture() {
  const W = 256, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Max fill height is BK_H − 2.0 = 11.5 cm  (from buildLiquidProfile cap).
  const maxFillH = BK_H - 2.0;

  for (let vol = 100; vol <= 500; vol += 100) {
    const h = (vol / 500) * maxFillH;
    const cy = (1 - h / BK_H) * H;
    const big = (vol % 200 === 0);

    ctx.strokeStyle = '#0d2b6e';
    ctx.lineWidth   = big ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.30, cy);
    ctx.lineTo(W * 0.82, cy);
    ctx.stroke();

    ctx.fillStyle = '#0d2b6e';
    ctx.font      = `${big ? 'bold ' : ''}${big ? 28 : 22}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${vol}`, W * 0.28, cy + 9);
  }

  return new THREE.CanvasTexture(canvas);
}

// ── Label sprite ─────────────────────────────────────────────────────────────
// Writes chemical formula / indicator name onto the group's sprite.
// Only re-creates the texture when the text changes.
export function setBeakerLabel(group, text, color = '#0d2b6e') {
  if (!group._label) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthWrite: false }),
    );
    sprite.scale.set(9, 4, 1);
    sprite.position.set(0, BK_H * 0.62, BK_R + 1.0);
    group._label = sprite;
    group.add(sprite);
  }
  if (group._labelText === text && group._labelColor === color) return;
  group._labelText  = text;
  group._labelColor = color;

  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 96);
  ctx.font         = 'bold 36px Arial, sans-serif';
  ctx.fillStyle    = color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 48);

  const oldTex = group._label.material.map;
  group._label.material.map = new THREE.CanvasTexture(c);
  group._label.material.needsUpdate = true;
  if (oldTex) oldTex.dispose();
}

function buildBeakerProfile() {
  return [
    new THREE.Vector2(0,        0),
    new THREE.Vector2(BK_R - 0.3, 0),      // flat bottom
    new THREE.Vector2(BK_R,       0.6),     // base curve
    new THREE.Vector2(BK_R,       BK_H - 1.2), // straight side
    new THREE.Vector2(BK_R + 0.45, BK_H - 0.4), // rim flare
    new THREE.Vector2(BK_R + 0.25, BK_H),   // lip top
  ];
}

function buildLiquidProfile(fillH) {
  const h = Math.max(0.1, Math.min(fillH, BK_H - 1.5));
  return [
    new THREE.Vector2(0,          0.18),
    new THREE.Vector2(BK_R - 0.5, 0.18),
    new THREE.Vector2(BK_R - 0.3, 0.5),
    new THREE.Vector2(BK_R - 0.3, h),
    new THREE.Vector2(0,          h),
  ];
}

export function createBeaker3D() {
  const group = new THREE.Group();
  group.visible = false;

  // Glass shell
  const glassGeo = new THREE.LatheGeometry(buildBeakerProfile(), 36);
  const glass    = new THREE.Mesh(glassGeo, MAT_GLASS_CLEAR);
  group._glass   = glass;
  group.add(glass);

  // Graduation scale — thin outer cylinder spanning the straight-wall section.
  const gradMat = new THREE.MeshBasicMaterial({
    map:         buildBeakerGradTexture(),
    transparent: true,
    side:        THREE.FrontSide,
    depthWrite:  false,
    alphaTest:   0.02,
  });
  const gradGeo  = new THREE.CylinderGeometry(BK_R + 0.02, BK_R + 0.02, BK_H, 36, 1, true);
  const gradMesh = new THREE.Mesh(gradGeo, gradMat);
  gradMesh.position.y  = BK_H / 2;  // cylinder is centred; shift up so base = y=0
  gradMesh.renderOrder = 2;
  group.add(gradMesh);

  // Pour spout — small beak on the rim at one side
  const spoutPts = [
    new THREE.Vector2(0,    0),
    new THREE.Vector2(1.0,  0),
    new THREE.Vector2(1.4,  0.8),
    new THREE.Vector2(0.8,  1.4),
    new THREE.Vector2(0.2,  1.4),
    new THREE.Vector2(0,    1.0),
  ];
  const spoutShape = new THREE.Shape(spoutPts);
  const spoutGeo   = new THREE.ExtrudeGeometry(spoutShape, { depth: 0.25, bevelEnabled: false });
  const spout      = new THREE.Mesh(spoutGeo, MAT_GLASS_CLEAR);
  spout.rotation.x = -Math.PI / 2;
  spout.position.set(BK_R - 0.1, BK_H - 0.8, -0.5);
  group.add(spout);

  group._liquid    = null;
  group._liquidKey = null;
  group._lastFillH = -1;

  return group;
}

export function updateBeaker3D(group, x, z, fillFrac, liquidColor) {
  group.visible = true;
  group.position.set(x, 0, z);

  const fillH    = fillFrac * (BK_H - 2.0);
  const colorKey = liquidColor ? JSON.stringify(liquidColor) : 'neutral';

  if (Math.abs(fillH - group._lastFillH) > 0.05 || colorKey !== group._liquidKey) {
    if (group._liquid) { group.remove(group._liquid); group._liquid.geometry.dispose(); }
    if (fillH > 0.1) {
      const liqGeo = new THREE.LatheGeometry(buildLiquidProfile(fillH), 28);
      const mat    = liquidColor
        ? makeLiquidMat(`rgba(${liquidColor.r},${liquidColor.g},${liquidColor.b},${liquidColor.a})`)
        : MAT_LIQUID_NEUTRAL.clone();
      group._liquid = new THREE.Mesh(liqGeo, mat);
      group._liquid.renderOrder = 1;
      group.add(group._liquid);
    }
    group._lastFillH = fillH;
    group._liquidKey  = colorKey;
  }
}

export function hideBeaker3D(group) {
  group.visible = false;
}
