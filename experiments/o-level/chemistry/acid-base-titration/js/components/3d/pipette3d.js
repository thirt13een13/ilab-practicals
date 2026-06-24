import * as THREE from 'three';
import { MAT_GLASS_CLEAR, makeLiquidMat, MAT_LIQUID_NEUTRAL } from './materials.js';

// 20 ml Class-A volumetric pipette — all dimensions in cm.
// Profile: y=0 is the sealed tip; y=44 is the mouthpiece opening.
// Key proportions from photo: very long fine tip taper (~17 cm), short lower
// stem, oval bulb, long upper stem, amber calibration band near the top.
function buildPipetteProfile() {
  return [
    new THREE.Vector2(0.00,  0.0),   // sealed tip — closed centre
    new THREE.Vector2(0.07,  0.4),   // very fine tip (0.7 mm radius)
    new THREE.Vector2(0.13,  3.5),   // long gradual lower taper
    new THREE.Vector2(0.20,  8.0),
    new THREE.Vector2(0.27,  13.5),
    new THREE.Vector2(0.30,  17.5),  // reaches lower-stem diameter
    new THREE.Vector2(0.30,  21.5),  // lower stem (4 cm of thin tube)
    new THREE.Vector2(0.55,  22.8),  // taper into bulb
    new THREE.Vector2(1.25,  24.2),  // lower bulb
    new THREE.Vector2(1.40,  26.8),  // bulb widest point
    new THREE.Vector2(1.25,  29.4),  // upper bulb
    new THREE.Vector2(0.55,  30.8),  // taper out of bulb
    new THREE.Vector2(0.30,  31.8),  // upper stem start
    new THREE.Vector2(0.30,  42.5),  // upper stem (long thin tube)
    new THREE.Vector2(0.36,  43.2),  // slight mouth flare
    new THREE.Vector2(0.30,  44.0),  // mouthpiece opening
  ];
}

// Bulb geometry centre (for liquid fill)
const BULB_CY = 26.8;
const BULB_R  = 1.3;

// Calibration band sits on the upper stem near the top, ~1.5 cm from mouth
const BAND_Y  = 41.0;

export function createPipette3D() {
  const group = new THREE.Group();
  group.visible = false;

  // Glass body (lathe — DoubleSide so walls are visible from inside)
  const bodyGeo = new THREE.LatheGeometry(buildPipetteProfile(), 40);
  group.add(new THREE.Mesh(bodyGeo, MAT_GLASS_CLEAR));

  // Amber calibration band — thin painted cylinder on the upper stem
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xb87010, roughness: 0.55, metalness: 0,
  });
  const bandGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.5, 24);
  const band    = new THREE.Mesh(bandGeo, bandMat);
  band.position.y = BAND_Y;
  group.add(band);

  // Liquid fill — oval sphere approximating the bulb volume
  const liqGeo  = new THREE.SphereGeometry(BULB_R, 22, 16);
  group._liquid  = new THREE.Mesh(liqGeo, MAT_LIQUID_NEUTRAL.clone());
  group._liquid.scale.y     = 1.55; // stretch vertically to match oval bulb
  group._liquid.position.y  = BULB_CY;
  group._liquid.visible     = false;
  group._liquid.renderOrder = 1;
  group.add(group._liquid);

  return group;
}

// y = world Y of the pipette tip (the very bottom of the group).
export function updatePipette3D(group, x, y, z, fillFrac, liquidColor) {
  group.visible = true;
  group.position.set(x, y, z);

  group._liquid.visible = fillFrac > 0.02;
  group._liquid.scale.set(
    Math.max(0.05, fillFrac),
    Math.max(0.05, fillFrac) * 1.55,
    Math.max(0.05, fillFrac),
  );

  if (liquidColor && group._liquid.visible) {
    const { r, g, b, a } = liquidColor;
    group._liquid.material.color.setRGB(r / 255, g / 255, b / 255);
    group._liquid.material.opacity    = Math.max(0.3, a);
    group._liquid.material.transparent = true;
  }
}

export function hidePipette3D(group) {
  group.visible = false;
}
