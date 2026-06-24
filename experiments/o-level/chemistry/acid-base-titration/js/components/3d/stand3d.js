import * as THREE from 'three';
import { MAT_CHROME, MAT_IRON } from './materials.js';

// Retort stand: heavy flat rectangular cast-iron base + stainless-steel rod.
// Proportions: base 22×14 cm footprint, 1.5 cm thick; rod ⌀1.3 cm.
export function createStand3D() {
  const group = new THREE.Group();
  group.visible = false;

  // ── Base plate (cast-iron) ────────────────────────────────────────────────
  const baseGeo = new THREE.BoxGeometry(22, 1.5, 14);
  const base    = new THREE.Mesh(baseGeo, MAT_IRON);
  base.position.y   = 0.75; // top of base at Y=1.5
  base.castShadow   = true;
  base.receiveShadow = true;
  group.add(base);

  // Raised edge lip around base perimeter
  const lipMat = MAT_IRON;
  [
    { size: [22.4, 0.5, 0.8], pos: [0, 1.75, 7.1] },
    { size: [22.4, 0.5, 0.8], pos: [0, 1.75, -7.1] },
    { size: [0.8, 0.5, 14.4], pos: [11.1, 1.75, 0] },
    { size: [0.8, 0.5, 14.4], pos: [-11.1, 1.75, 0] },
  ].forEach(({ size, pos }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), lipMat);
    m.position.set(...pos);
    group.add(m);
  });

  // Corner screw bosses
  const screwBodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12);
  const screwMat     = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.3, metalness: 0.8 });
  const slotMat      = new THREE.MeshStandardMaterial({ color: 0x333333 });
  [[-8, -5], [8, -5], [-8, 5], [8, 5]].forEach(([sx, sz]) => {
    const boss = new THREE.Mesh(screwBodyGeo, screwMat);
    boss.position.set(sx, 1.7, sz);
    group.add(boss);
    // Phillips cross-slot
    [[0.9, 0.14, 0.22], [0.22, 0.14, 0.9]].forEach(s => {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(...s), slotMat);
      slot.position.y = 0.21;
      boss.add(slot);
    });
  });

  // ── Vertical rod (stainless steel) ────────────────────────────────────────
  // Unit-height cylinder; scaled in update.
  const rodGeo  = new THREE.CylinderGeometry(0.65, 0.65, 1, 20);
  group._rod    = new THREE.Mesh(rodGeo, MAT_CHROME);
  group._rod.castShadow = true;
  group.add(group._rod);

  // Hemispherical top cap
  const capGeo   = new THREE.SphereGeometry(0.67, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  group._rodCap  = new THREE.Mesh(capGeo, MAT_CHROME);
  group.add(group._rodCap);

  // Collar where rod meets base
  const collarGeo = new THREE.CylinderGeometry(1.15, 1.15, 1.2, 18);
  const collar    = new THREE.Mesh(collarGeo, MAT_CHROME);
  collar.position.set(0, 2.1, 0);
  group.add(collar);

  // ── Boss-head (movable clamp collar) ─────────────────────────────────────
  // A wider collar that sits at the clamp height
  const bossGeo  = new THREE.CylinderGeometry(1.55, 1.55, 2.5, 18);
  group._boss    = new THREE.Mesh(bossGeo, MAT_CHROME);
  group.add(group._boss);

  // Tightening screw on boss (small hex stub)
  const hexGeo  = new THREE.CylinderGeometry(0.55, 0.55, 2.5, 6);
  group._bossScrew = new THREE.Mesh(hexGeo, screwMat);
  group._bossScrew.rotation.z = Math.PI / 2;
  group._bossScrew.position.x = 1.8;
  group._boss.add(group._bossScrew);

  return group;
}

// All lengths in cm.  Y=0 is the bench surface.
export function updateStand3D(group, standX, standZ, standH, clampY) {
  group.visible = true;
  group.position.set(standX, 0, standZ);

  // Rod sits on top of base (Y=1.5) and reaches standH.
  const rodBase = 1.5;
  const rodH    = Math.max(0.5, standH - rodBase);
  group._rod.scale.set(1, rodH, 1);
  group._rod.position.set(0, rodBase + rodH / 2, 0);

  group._rodCap.position.set(0, rodBase + rodH, 0);
  group._boss.position.set(0, clampY, 0);
}
