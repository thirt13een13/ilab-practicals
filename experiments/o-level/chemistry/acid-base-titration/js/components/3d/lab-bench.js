import * as THREE from 'three';
import { MAT_WOOD, MAT_WOOD_LIGHT, MAT_FLOOR } from './materials.js';

// Lab bench — all units in cm.
// Coordinate origin: top surface of the bench = Y 0.
// Table outer dims: 100 wide (X) × 44 deep (Z) × 3.5 thick top.
// Leg height below top surface: LEG_H.  Floor at Y = -(3.5 + LEG_H).

const TOP_W  = 100;
const TOP_D  = 44;
const TOP_T  = 3.5;   // tabletop thickness
const LEG_H  = 86;    // leg height from underside of top to floor
const LEG_W  = 4.5;   // leg cross-section width
const LEG_D  = 4.5;

// Leg inset from table edge
const INSET_X = 5;
const INSET_Z = 4;

// Derived
const LEG_X   = TOP_W / 2 - INSET_X;   // 45
const LEG_Z   = TOP_D / 2 - INSET_Z;   // 18
const TOP_BOT = -TOP_T;                 // bottom of tabletop slab (Y = -3.5)
const LEG_CY  = TOP_BOT - LEG_H / 2;   // leg centre Y so top of leg = TOP_BOT
const FLOOR_Y = TOP_BOT - LEG_H;       // -89.5

export function createLabBench() {
  const group = new THREE.Group();

  // ── Tabletop slab ──────────────────────────────────────────────────────────
  // Top face at Y=0, bottom at Y=TOP_BOT.
  const topGeo = new THREE.BoxGeometry(TOP_W, TOP_T, TOP_D);
  const top    = new THREE.Mesh(topGeo, MAT_WOOD_LIGHT);
  top.position.y  = TOP_BOT / 2;   // centre = -1.75
  top.receiveShadow = true;
  top.castShadow    = true;
  group.add(top);

  // Subtle edge chamfer band around top perimeter
  const chamferMat = new THREE.MeshStandardMaterial({ color: 0x6b3d18, roughness: 0.75 });
  [
    // front / back long edges
    { pos: [0, TOP_BOT / 2, TOP_D / 2],  size: [TOP_W + 0.2, TOP_T + 0.4, 0.5] },
    { pos: [0, TOP_BOT / 2, -TOP_D / 2], size: [TOP_W + 0.2, TOP_T + 0.4, 0.5] },
    // left / right short edges
    { pos: [TOP_W / 2,  TOP_BOT / 2, 0], size: [0.5, TOP_T + 0.4, TOP_D + 0.2] },
    { pos: [-TOP_W / 2, TOP_BOT / 2, 0], size: [0.5, TOP_T + 0.4, TOP_D + 0.2] },
  ].forEach(({ pos, size }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), chamferMat);
    m.position.set(...pos);
    group.add(m);
  });

  // ── Four legs ──────────────────────────────────────────────────────────────
  // Each leg top edge flush with tabletop bottom (TOP_BOT).
  const legGeo = new THREE.BoxGeometry(LEG_W, LEG_H, LEG_D);
  const LEG_POSITIONS = [
    [-LEG_X,  LEG_Z],
    [ LEG_X,  LEG_Z],
    [-LEG_X, -LEG_Z],
    [ LEG_X, -LEG_Z],
  ];
  LEG_POSITIONS.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, MAT_WOOD);
    leg.position.set(lx, LEG_CY, lz);
    leg.castShadow    = true;
    leg.receiveShadow = true;
    group.add(leg);
  });

  // ── Apron boards (rails just under the top, connecting adjacent legs) ──────
  // Front/back aprons (along X, connecting left+right legs on each side)
  const apronFBGeo = new THREE.BoxGeometry(TOP_W - INSET_X * 2 - LEG_W, 6, 2.2);
  [-LEG_Z, LEG_Z].forEach(az => {
    const apron = new THREE.Mesh(apronFBGeo, MAT_WOOD);
    apron.position.set(0, TOP_BOT - 3, az);
    group.add(apron);
  });

  // Side aprons (along Z, connecting front+back legs on each side)
  const apronSideGeo = new THREE.BoxGeometry(2.2, 6, TOP_D - INSET_Z * 2 - LEG_D);
  [-LEG_X, LEG_X].forEach(ax => {
    const apron = new THREE.Mesh(apronSideGeo, MAT_WOOD);
    apron.position.set(ax, TOP_BOT - 3, 0);
    group.add(apron);
  });

  // ── Lower stretcher rails (X direction, front and back, at 1/3 leg height) ─
  const stretcherY  = TOP_BOT - LEG_H * 0.65; // about 2/3 down the leg
  const stretcherGeo = new THREE.BoxGeometry(TOP_W - INSET_X * 2 - LEG_W, 3, 2.5);
  [-LEG_Z, LEG_Z].forEach(sz => {
    const s = new THREE.Mesh(stretcherGeo, MAT_WOOD);
    s.position.set(0, stretcherY, sz);
    group.add(s);
  });

  // ── Floor plane ────────────────────────────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(2000, 2000);
  const floor     = new THREE.Mesh(floorGeo, MAT_FLOOR);
  floor.rotation.x  = -Math.PI / 2;
  floor.position.y  = FLOOR_Y;
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}
