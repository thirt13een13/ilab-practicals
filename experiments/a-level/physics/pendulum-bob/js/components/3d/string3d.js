import * as THREE from 'three';
import { state } from '../../state.js';

let stringLine, stringGeom;

export function createString3d(scene) {
  stringGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(6); // 2 points × 3 coords
  positions[0] = 0; positions[1] = 0; positions[2] = 0; // pivot at origin
  positions[3] = 0; positions[4] = -state.L_m; positions[5] = 0; // initial bob position
  stringGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({ color: 0xd4c89a, linewidth: 2 });
  stringLine = new THREE.Line(stringGeom, mat);
  scene.add(stringLine);
  updateString3d();
}

export function updateString3d() {
  if (!stringLine) return;
  const pos = stringGeom.attributes.position.array;
  pos[3] = Math.sin(state.theta) * state.L_m;
  pos[4] = -Math.cos(state.theta) * state.L_m;
  pos[5] = 0;
  stringGeom.attributes.position.needsUpdate = true;
  stringLine.visible = state.placed.string && state.placed.clamp;
}
