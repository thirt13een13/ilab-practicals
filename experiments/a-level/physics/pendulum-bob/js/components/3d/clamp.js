import * as THREE from 'three';
import { state } from '../../state.js';

const clampMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.7, roughness: 0.3 });
let clampGroup;

export function createClamp(scene) {
  clampGroup = new THREE.Group();

  // Boss-head on the rod
  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), clampMat);
  boss.position.set(-0.30, 0, 0);
  clampGroup.add(boss);

  // Horizontal arm from rod to pivot
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.30, 8), clampMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-0.15, 0, 0);
  clampGroup.add(arm);

  // 4-prong head at pivot end
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), clampMat);
  head.position.set(-0.01, 0, 0);
  clampGroup.add(head);

  // Screw knob on boss
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.5 });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.015, 6), knobMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(-0.30, 0, 0.022);
  clampGroup.add(knob);

  clampGroup.castShadow = true;
  scene.add(clampGroup);
  updateClamp();
}

export function updateClamp() {
  if (!clampGroup) return;
  clampGroup.visible = state.placed.clamp && state.placed.stand;
}
