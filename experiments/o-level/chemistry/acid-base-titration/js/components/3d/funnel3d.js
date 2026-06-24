import * as THREE from 'three';
import { MAT_GLASS_CLEAR } from './materials.js';

// Glass funnel — all dimensions in cm.
// Local Y = 0  : bottom of stem (tip).
// Local Y = 19 : top of rim.
const STEM_H = 8.0;    // length of the thin stem
const STEM_R = 0.40;   // stem outer radius (8 mm diam.)
const BOWL_H = 10.5;   // height of the conical bowl
const RIM_R  = 7.5;    // radius at the rim

// How many cm of stem are inserted down into the burette tube when mounted.
// In a practical setting the stem sits ~5 cm inside the burette.
export const FUNNEL_STEM_INSERTION = 5.0;

// Single LatheGeometry profile: stem tip → bowl walls → rim lip.
// Wide-angle cone (~37° half-angle from vertical) matching the photo.
function buildFunnelProfile() {
  const jY = STEM_H;                  // junction y (bottom of bowl)
  const top = STEM_H + BOWL_H;        // top of rim

  return [
    new THREE.Vector2(0.00,          0.0),           // sealed tip — closed centre
    new THREE.Vector2(STEM_R,        0.45),           // stem body starts
    new THREE.Vector2(STEM_R,        jY - 0.4),      // top of stem
    new THREE.Vector2(STEM_R * 2.0,  jY + 0.35),     // junction bulge
    new THREE.Vector2(1.10,          jY + 1.10),      // entering cone
    new THREE.Vector2(3.50,          jY + 4.40),      // mid-cone
    new THREE.Vector2(6.00,          jY + 8.00),      // upper cone
    new THREE.Vector2(7.10,          top - 0.55),     // near rim
    new THREE.Vector2(RIM_R,         top - 0.20),     // inner rim edge
    new THREE.Vector2(RIM_R + 0.30,  top),            // outer rim lip
  ];
}

export function createFunnel3D() {
  const group = new THREE.Group();
  group.visible = false;

  const geo = new THREE.LatheGeometry(buildFunnelProfile(), 48);
  group.add(new THREE.Mesh(geo, MAT_GLASS_CLEAR));

  return group;
}

export function updateFunnel3D(group, x, y, z) {
  group.visible = true;
  group.position.set(x, y, z);
}

export function hideFunnel3D(group) {
  group.visible = false;
}
