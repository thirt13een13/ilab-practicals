import * as THREE from 'three';
import { MAT_GLASS_CLEAR, makeLiquidMat, MAT_LIQUID_NEUTRAL } from './materials.js';

// 250 ml Erlenmeyer flask profile — flat base, true cone body, cylindrical neck.
// All dimensions in cm. Y=0 is the flat base sitting on the table.

// ── Graduation helpers ───────────────────────────────────────────────────────
// 5 marks evenly spaced in volume (50/100/150/200/250 mL).
// Heights and outer-wall radii are interpolated from buildFlaskProfile points.
// NO torus geometry — each ring is a THREE.LineLoop of 64 points.
const FLASK_GRAD = [
  { vol: 50,  y: 2.6,  r: 8.35 },
  { vol: 100, y: 5.2,  r: 7.20 },
  { vol: 150, y: 7.8,  r: 5.82 },
  { vol: 200, y: 10.4, r: 4.43 },
  { vol: 250, y: 13.0, r: 3.07 },
];

const GRAD_MAT = new THREE.LineBasicMaterial({ color: 0x0d2b6e, transparent: true, opacity: 0.18 });

function makeRing(r, y) {
  const pts = new Float32Array(64 * 3);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts[i * 3]     = Math.cos(a) * r;
    pts[i * 3 + 1] = y;
    pts[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineLoop(geo, GRAD_MAT);
}

function makeGradLabel(text, x, y) {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 160, 64);
  ctx.font         = 'bold 26px Arial, sans-serif';
  ctx.fillStyle    = 'rgba(13,43,110,0.28)';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 4, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map:         new THREE.CanvasTexture(c),
    transparent: true,
    depthWrite:  false,
  }));
  sprite.scale.set(5.5, 2.2, 1);
  sprite.position.set(x, y, 0);
  return sprite;
}

function buildFlaskProfile() {
  return [
    new THREE.Vector2(0,    0),
    new THREE.Vector2(8.2,  0),      // flat base
    new THREE.Vector2(8.8,  0.9),    // rounded base edge
    new THREE.Vector2(8.5,  2.0),
    new THREE.Vector2(7.2,  5.0),    // conical body
    new THREE.Vector2(5.6,  8.0),
    new THREE.Vector2(4.0,  11.0),
    new THREE.Vector2(2.7,  13.5),   // shoulder
    new THREE.Vector2(2.25, 14.8),   // neck base
    new THREE.Vector2(2.20, 19.2),   // neck straight
    new THREE.Vector2(2.45, 19.8),   // rim flare
    new THREE.Vector2(2.30, 20.4),   // lip
  ];
}

// Liquid fill — follows inner wall profile up to fillH.
function buildLiquidProfile(fillH) {
  const h = Math.min(fillH, 13.0);
  const pts = [
    new THREE.Vector2(0,    0.15),
    new THREE.Vector2(8.0,  0.15),
    new THREE.Vector2(8.2,  0.9),
    new THREE.Vector2(8.0,  2.0),
    new THREE.Vector2(6.8,  5.0),
    new THREE.Vector2(5.2,  8.0),
    new THREE.Vector2(3.6,  11.0),
    new THREE.Vector2(2.4,  13.0),
  ].filter(p => p.y <= h);

  // Close off at fillH with a flat surface
  if (pts.length === 0) return [new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0)];
  const lastPt = pts[pts.length - 1];
  if (lastPt.y < h) {
    // Interpolate radius at fillH by walking back through original profile
    pts.push(new THREE.Vector2(lastPt.x * ((h <= 13) ? 1 - (h - lastPt.y) / 4 : 0.1), h));
  }
  pts.push(new THREE.Vector2(0, h));
  return pts;
}

export function createFlask3D() {
  const group = new THREE.Group();
  group.visible = false;

  // Glass shell
  const glassGeo = new THREE.LatheGeometry(buildFlaskProfile(), 44);
  const glass    = new THREE.Mesh(glassGeo, MAT_GLASS_CLEAR);
  group._glass   = glass;
  group.add(glass);

  // Graduation rings — LineLoop circles (no torus geometry).
  for (const { vol, y, r } of FLASK_GRAD) {
    group.add(makeRing(r + 0.15, y));
    group.add(makeGradLabel(`${vol} mL`, r + 0.8, y));
  }

  group._liquid    = null;
  group._liquidKey = null;
  group._lastFillH = -1;

  return group;
}

export function updateFlask3D(group, x, z, fillFrac, liquidColor, shakeAngle) {
  group.visible = true;
  group.position.set(x, 0, z);
  group.rotation.z = shakeAngle || 0;

  const fillH    = fillFrac * 13.0;
  const colorKey = liquidColor ? JSON.stringify(liquidColor) : 'neutral';

  if (Math.abs(fillH - group._lastFillH) > 0.08 || colorKey !== group._liquidKey) {
    if (group._liquid) { group.remove(group._liquid); group._liquid.geometry.dispose(); }

    if (fillH > 0.1) {
      const liqPts = buildLiquidProfile(fillH);
      const liqGeo = new THREE.LatheGeometry(liqPts, 30);
      const mat    = liquidColor
        ? makeLiquidMat(`rgba(${liquidColor.r},${liquidColor.g},${liquidColor.b},${liquidColor.a})`)
        : MAT_LIQUID_NEUTRAL.clone();
      group._liquid = new THREE.Mesh(liqGeo, mat);
      group._liquid.renderOrder = 1;
      group.add(group._liquid);
    }
    group._lastFillH = fillH;
    group._liquidKey = colorKey;
  }
}

export function hideFlask3D(group) {
  group.visible = false;
}
