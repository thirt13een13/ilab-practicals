import * as THREE from 'three';
import { MAT_GLASS_CLEAR, MAT_RUBBER, MAT_LIQUID_NEUTRAL } from './materials.js';

// 1 mL glass dropper — all dimensions in cm.
// Local Y=0 : sealed glass tip (bottom of dropper)
// Local Y=TUBE_H : top of glass tube / base of rubber bulb
// Local Y=TUBE_H+BULB_H : apex of rubber bulb
const TUBE_H = 6.0;
const TUBE_R = 0.30;
const BULB_H = 3.2;

// ── Graduation texture — 0.25, 0.50, 0.75, 1.0 mL scale ─────────────────────
// Drawn onto a canvas and mapped to a thin cylinder around the glass tube,
// matching the printed markings in the photo.
function buildGradTexture() {
  const W = 256, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Canvas V coordinate: CanvasTexture has flipY=true so canvas Y=0 → tube top.
  // canvasY = (1 − localY / TUBE_H) × H
  const marks = [
    { label: '1.0', mLabel: 'mL', y: 5.0 },
    { label: '.75', mLabel: 'mL', y: 4.0 },
    { label: '.50', mLabel: 'mL', y: 3.0 },
    { label: '.25', mLabel: '',   y: 2.0 },
  ];

  for (const { label, mLabel, y } of marks) {
    const cy = (1 - y / TUBE_H) * H;

    // Graduation line (full canvas width → wraps all around the tube)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    ctx.beginPath(); ctx.moveTo(W * 0.32, cy); ctx.lineTo(W, cy); ctx.stroke();

    // Numeric label
    ctx.fillStyle = '#1a1a1a';
    ctx.font      = 'bold 30px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, W * 0.30, cy - 1);

    // "mL" sub-label (smaller, below the number)
    if (mLabel) {
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(mLabel, W * 0.30, cy + 21);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// ── Glass tube profile — LatheGeometry, y = 0 at sealed tip ──────────────────
function buildTubeProfile() {
  return [
    new THREE.Vector2(0.000,     0.0),   // sealed tip point
    new THREE.Vector2(0.05,      0.20),  // very fine opening
    new THREE.Vector2(0.10,      0.50),  // lower taper
    new THREE.Vector2(0.20,      1.20),  // widening to main barrel
    new THREE.Vector2(TUBE_R,    2.00),
    new THREE.Vector2(TUBE_R,    5.60),  // uniform barrel
    new THREE.Vector2(TUBE_R * 1.2, 5.80),  // collar flange at top
    new THREE.Vector2(TUBE_R,    TUBE_H),
  ];
}

// ── Rubber bulb profile — LatheGeometry, y = 0 at base collar ────────────────
// Classic pear shape: narrow collar → wide body → rounded apex.
function buildBulbProfile() {
  return [
    new THREE.Vector2(0.22, 0.0),
    new THREE.Vector2(0.48, 0.35),
    new THREE.Vector2(0.82, 0.85),
    new THREE.Vector2(0.95, 1.55),   // widest point
    new THREE.Vector2(0.88, 2.15),
    new THREE.Vector2(0.65, 2.70),
    new THREE.Vector2(0.38, 3.05),
    new THREE.Vector2(0.12, BULB_H), // rounded apex
  ];
}

export function createDropper3D() {
  const group = new THREE.Group();
  group.visible = false;

  // Glass tube body
  const tubeGeo = new THREE.LatheGeometry(buildTubeProfile(), 28);
  group.add(new THREE.Mesh(tubeGeo, MAT_GLASS_CLEAR));

  // Graduation scale on a hair-thin outer cylinder
  const gradMat  = new THREE.MeshBasicMaterial({
    map:         buildGradTexture(),
    transparent: true,
    side:        THREE.FrontSide,
    depthWrite:  false,
    alphaTest:   0.02,
  });
  const gradGeo  = new THREE.CylinderGeometry(TUBE_R + 0.012, TUBE_R + 0.012, TUBE_H, 28, 1, true);
  const gradMesh = new THREE.Mesh(gradGeo, gradMat);
  gradMesh.position.y  = TUBE_H / 2;   // cylinder spans y=[0, TUBE_H]
  gradMesh.renderOrder = 2;
  group.add(gradMesh);

  // Rubber pear bulb, sitting on top of the tube
  const bulbGeo = new THREE.LatheGeometry(buildBulbProfile(), 28);
  const bulb    = new THREE.Mesh(bulbGeo, MAT_RUBBER);
  bulb.position.y = TUBE_H;
  group.add(bulb);

  // Liquid fill inside tube
  const liqGeo = new THREE.CylinderGeometry(0.20, 0.10, 1, 10);
  group._liquid = new THREE.Mesh(liqGeo, MAT_LIQUID_NEUTRAL.clone());
  group._liquid.visible    = false;
  group._liquid.renderOrder = 1;
  group.add(group._liquid);

  return group;
}

// x, y, z — world position of the dropper tip (y=0 in local space).
export function updateDropper3D(group, x, y, z, fillFrac, liquidColor) {
  group.visible = true;
  group.position.set(x, y, z);

  const maxFill = TUBE_H * 0.72;
  const h = Math.max(0.1, maxFill * Math.min(1, fillFrac));
  group._liquid.visible    = fillFrac > 0.02;
  group._liquid.scale.y    = h;
  group._liquid.position.y = 0.9 + h / 2;

  if (liquidColor && group._liquid.visible) {
    const { r, g, b, a } = liquidColor;
    group._liquid.material.color.setRGB(r / 255, g / 255, b / 255);
    group._liquid.material.opacity    = Math.max(0.4, a);
    group._liquid.material.transparent = true;
  }
}

export function hideDropper3D(group) {
  group.visible = false;
}
