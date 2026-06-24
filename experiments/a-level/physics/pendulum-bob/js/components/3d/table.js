import * as THREE from 'three';
import { DOM } from '../../state.js';

const woodMat = new THREE.MeshStandardMaterial({ color: 0x7d4d24, roughness: 0.85, metalness: 0.0 });
let tableGroup;

export function createTable(scene) {
  tableGroup = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.45), woodMat);
  tableGroup.add(top);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3a18, roughness: 0.9 });
  const legGeo = new THREE.BoxGeometry(0.04, 0.65, 0.04);
  for (const [lx, lz] of [[-0.44, 0.18], [0.44, 0.18], [-0.44, -0.18], [0.44, -0.18]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, -0.025/2 - 0.65/2, lz);
    leg.castShadow = true;
    tableGroup.add(leg);
  }

  top.castShadow = true;
  top.receiveShadow = true;
  scene.add(tableGroup);
  updateTable();
}

export function updateTable() {
  if (!tableGroup) return;
  const standH = parseInt(DOM.slHeight.value) / 100;
  // top surface at y = -standH; group center is midpoint of tabletop
  tableGroup.position.set(-0.14, -standH - 0.0125, 0);
}
