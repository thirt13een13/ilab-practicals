import * as THREE from 'three';
import { MAT_GLASS_CLEAR, MAT_STOPCOCK, MAT_LIQUID_NEUTRAL } from './materials.js';

// 50 ml Class-A burette — all dimensions in cm.
const TUBE_H   = 52;
const OUTER_R  = 0.85;
const INNER_R  = 0.65;
const TIP_H    = 4.5;
const BARREL_L = 5.0;   // PTFE barrel length (horizontal) — compact
const BARREL_R = 0.85;  // PTFE barrel radius — compact

// ── Graduation scale texture ─────────────────────────────────────────────────
// Drawn on a canvas and mapped onto a thin outer cylinder so the markings
// look printed on the glass, exactly like the real instrument.
function buildGradTexture() {
  const W = 256, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);  // fully transparent background

  // Graduation marks span 50 ml over (TUBE_H − 2) cm
  // (1 cm of bare glass at each end of the tube).
  const vStart = 1 / TUBE_H;
  const vSpan  = (TUBE_H - 2) / TUBE_H;

  for (let i = 0; i <= 500; i++) {
    const ml      = i / 10;
    const canvasY = (vStart + (ml / 50) * vSpan) * H;

    const isTen  = i % 100 === 0;   // 0, 10, 20 … 50 ml  (longest mark + bold label)
    const isFive = i % 50  === 0;   // 5, 15, 25 … 45 ml  (long mark + label)
    const isOne  = i % 10  === 0;   // every 1 ml           (medium mark)
    const isHalf = i % 5   === 0;   // every 0.5 ml         (short mark)
    //  else                         // every 0.1 ml         (tiny mark)

    if (isTen) {
      ctx.strokeStyle = '#0d2b6e';
      ctx.lineWidth   = 3;
      ctx.beginPath(); ctx.moveTo(W * 0.18, canvasY); ctx.lineTo(W, canvasY); ctx.stroke();
      ctx.fillStyle   = '#0d2b6e';
      ctx.font        = 'bold 36px Arial, sans-serif';
      ctx.textAlign   = 'right';
      ctx.fillText(Math.round(ml).toString(), W * 0.16, canvasY + 13);

    } else if (isFive) {
      ctx.strokeStyle = '#1a3f8c';
      ctx.lineWidth   = 2.5;
      ctx.beginPath(); ctx.moveTo(W * 0.26, canvasY); ctx.lineTo(W, canvasY); ctx.stroke();
      ctx.fillStyle   = '#1a3f8c';
      ctx.font        = '26px Arial, sans-serif';
      ctx.textAlign   = 'right';
      ctx.fillText(Math.round(ml).toString(), W * 0.24, canvasY + 9);

    } else if (isOne) {
      ctx.strokeStyle = '#2255aa';
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.moveTo(W * 0.36, canvasY); ctx.lineTo(W, canvasY); ctx.stroke();

    } else if (isHalf) {
      ctx.strokeStyle = '#3366bb';
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(W * 0.48, canvasY); ctx.lineTo(W, canvasY); ctx.stroke();

    } else {
      ctx.strokeStyle = '#4477cc';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(W * 0.60, canvasY); ctx.lineTo(W, canvasY); ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

export function createBurette3D() {
  const group = new THREE.Group();
  group.visible = false;

  // ── Glass tube (open cylinder) ───────────────────────────────────────────
  const tubeGeo = new THREE.CylinderGeometry(OUTER_R, OUTER_R, TUBE_H, 32, 1, true);
  group.add(new THREE.Mesh(tubeGeo, MAT_GLASS_CLEAR));

  // ── Graduation scale on a paper-thin outer cylinder ──────────────────────
  const gradMat  = new THREE.MeshBasicMaterial({
    map:         buildGradTexture(),
    transparent: true,
    side:        THREE.FrontSide,
    depthWrite:  false,
    alphaTest:   0.02,
  });
  const gradGeo  = new THREE.CylinderGeometry(OUTER_R + 0.012, OUTER_R + 0.012, TUBE_H, 32, 1, true);
  const gradMesh = new THREE.Mesh(gradGeo, gradMat);
  gradMesh.renderOrder = 2;
  group.add(gradMesh);

  // ── Top rim flare ────────────────────────────────────────────────────────
  const rimPts = [
    new THREE.Vector2(OUTER_R,        0),
    new THREE.Vector2(OUTER_R + 0.28, 0.35),
    new THREE.Vector2(OUTER_R + 0.12, 0.85),
    new THREE.Vector2(OUTER_R,        1.05),
  ];
  const rim = new THREE.Mesh(new THREE.LatheGeometry(rimPts, 28), MAT_GLASS_CLEAR);
  rim.position.y = TUBE_H / 2 - 0.5;
  group.add(rim);

  // ── Bottom taper connecting tube to barrel ───────────────────────────────
  const taperPts = [
    new THREE.Vector2(OUTER_R,          0),
    new THREE.Vector2(OUTER_R * 0.85,  -1.0),
    new THREE.Vector2(BARREL_R,        -1.8),
  ];
  const taper = new THREE.Mesh(new THREE.LatheGeometry(taperPts, 24), MAT_GLASS_CLEAR);
  taper.position.y = -TUBE_H / 2;
  group.add(taper);

  // ── PTFE Stopcock — compact horizontal barrel ────────────────────────────
  const valveY   = -TUBE_H / 2 - 1.8 - BARREL_R;

  const barrelGeo = new THREE.CylinderGeometry(BARREL_R, BARREL_R, BARREL_L, 22);
  const barrel    = new THREE.Mesh(barrelGeo, MAT_STOPCOCK);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.y  = valveY;
  group.add(barrel);

  // Hexagonal locking nuts
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x888898, roughness: 0.3, metalness: 0.85 });
  const nutGeo = new THREE.CylinderGeometry(BARREL_R + 0.3, BARREL_R + 0.3, 0.9, 6);
  for (const s of [-1, 1]) {
    const nut = new THREE.Mesh(nutGeo, nutMat);
    nut.rotation.z = Math.PI / 2;
    nut.position.set(s * (BARREL_L / 2 + 0.45), valveY, 0);
    group.add(nut);
  }

  // Lever handle — compact flat paddle, rotates on valve open/close
  const handleGeo = new THREE.BoxGeometry(1.0, 0.65, 6.5);
  group._valveHandle = new THREE.Mesh(handleGeo, MAT_STOPCOCK);
  group._valveHandle.position.y = valveY;
  group.add(group._valveHandle);

  // ── Glass tip below barrel ───────────────────────────────────────────────
  const tipPts = [
    new THREE.Vector2(OUTER_R * 0.55,  0),
    new THREE.Vector2(OUTER_R * 0.38,  TIP_H * 0.45),
    new THREE.Vector2(0.20,             TIP_H * 0.82),
    new THREE.Vector2(0.09,             TIP_H),
  ];
  const tip = new THREE.Mesh(new THREE.LatheGeometry(tipPts, 18), MAT_GLASS_CLEAR);
  tip.rotation.x = Math.PI;
  tip.position.y  = valveY - BARREL_R - 0.15;
  group.add(tip);

  // ── Liquid fill ──────────────────────────────────────────────────────────
  const liqGeo = new THREE.CylinderGeometry(INNER_R, INNER_R, 1, 18);
  group._liquid = new THREE.Mesh(liqGeo, MAT_LIQUID_NEUTRAL.clone());
  group._liquid.visible    = false;
  group._liquid.renderOrder = 1;
  group.add(group._liquid);

  // Local Y of the drip tip (for flow3d drop spawn)
  group._tipLocalY = valveY - BARREL_R - TIP_H;

  return group;
}

export function updateBurette3D(group, bx, bz, buretteTopY, fillFrac, liquidColor, valveFrac) {
  const midY = buretteTopY - TUBE_H / 2;
  group.position.set(bx, midY, bz);

  if (group._valveHandle) {
    group._valveHandle.rotation.y = valveFrac * Math.PI / 2;
  }

  const h = Math.max(0.01, TUBE_H * Math.min(1, fillFrac));
  group._liquid.visible    = fillFrac > 0.005;
  group._liquid.scale.y    = h;
  // Liquid fills from the bottom (tip) upward; the level (top surface) drops
  // as liquid is dispensed — anchoring the bottom at -TUBE_H/2, not the top.
  group._liquid.position.y = -TUBE_H / 2 + h / 2;

  if (liquidColor) {
    const { r, g, b, a } = liquidColor;
    group._liquid.material.color.setRGB(r / 255, g / 255, b / 255);
    group._liquid.material.opacity = Math.max(0.3, a);
  }
}

export function getBuretteTipY(group) {
  return group.position.y + group._tipLocalY;
}
