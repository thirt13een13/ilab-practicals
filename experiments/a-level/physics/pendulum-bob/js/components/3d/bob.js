import * as THREE from 'three';
import { state } from '../../state.js';

const BASE_R = 0.04;
const bobMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });
let bobMesh, pivotMesh;

export function createBob3d(scene) {
  bobMesh = new THREE.Mesh(new THREE.SphereGeometry(BASE_R, 32, 32), bobMat);
  bobMesh.castShadow = true;
  scene.add(bobMesh);

  // Small pivot sphere at origin
  const pivotMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
  pivotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), pivotMat);
  pivotMesh.position.set(0, 0, 0);
  scene.add(pivotMesh);

  updateBob3d();
}

export function updateBob3d() {
  if (!bobMesh) return;
  const r = 0.025 + (state.mass * 1000 - 50) * 0.0003;
  bobMesh.scale.setScalar(r / BASE_R);
  bobMesh.position.set(
    Math.sin(state.theta) * state.L_m,
    -Math.cos(state.theta) * state.L_m,
    0
  );
  bobMesh.visible = state.placed.bob && state.placed.string;
  pivotMesh.visible = state.placed.clamp;
}
