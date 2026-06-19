import * as THREE from 'three';
import { state, DOM } from '../../state.js';

const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
let base, rod, standGroup;

export function createStand(scene) {
  standGroup = new THREE.Group();

  base = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), steelMat);
  base.castShadow = true;
  standGroup.add(base);

  // Unit-height cylinder scaled per update
  rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), steelMat);
  rod.castShadow = true;
  standGroup.add(rod);

  standGroup.position.x = -0.30;
  scene.add(standGroup);
  updateStand();
}

export function updateStand() {
  if (!standGroup) return;
  const standH = parseInt(DOM.slHeight.value) / 100;
  const rodH   = standH + 0.10;

  base.position.y = -standH + 0.01;
  rod.scale.y     = rodH;
  rod.position.y  = (-standH + 0.10) / 2;

  standGroup.visible = state.placed.stand;
}
