import * as THREE from 'three';
import { MAT_METAL, MAT_METAL_DARK, MAT_RUBBER } from './materials.js';

export function createClamp3D() {
  const group = new THREE.Group();
  group.visible = false;

  // Head that grips the rod — 4×6×4 cm matches a real boss-head
  const headGeo = new THREE.BoxGeometry(4, 6, 4);
  group._head = new THREE.Mesh(headGeo, MAT_METAL_DARK);
  group.add(group._head);

  // Screw knob on head
  const knobGeo = new THREE.CylinderGeometry(0.9, 0.65, 2.2, 8);
  const knob = new THREE.Mesh(knobGeo, MAT_METAL);
  knob.rotation.z = Math.PI / 2;
  group._head.add(knob);
  knob.position.set(3.3, 0, 0);

  // Horizontal arm — 1.6 cm tall keeps it slender like a real clamp arm
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 2.5), MAT_METAL);
  group._arm = armMesh;
  group.add(armMesh);

  // Burette clamp jaws — 2 cm wide, 5.5 cm tall, sized for a 1.7 cm burette.
  // Jaw centres are placed so their inner faces clear the burette outer wall (r=0.85).
  const jawGeo = new THREE.BoxGeometry(2.0, 5.5, 1.5);
  group._jawL = new THREE.Mesh(jawGeo, MAT_METAL_DARK);
  group._jawR = group._jawL.clone();
  // Rubber pad inner face sits exactly at the burette outer surface (r=0.85 cm).
  const padGeo = new THREE.BoxGeometry(0.4, 5.0, 1.2);
  const padL = new THREE.Mesh(padGeo, MAT_RUBBER);
  const padR = padL.clone();
  padL.position.x =  0.85;   // in jaw-local space, positive X faces the burette
  padR.position.x = -0.85;
  group._jawL.add(padL);
  group._jawR.add(padR);
  group.add(group._jawL, group._jawR);

  return group;
}

// Update clamp geometry from layout values (all cm).
export function updateClamp3D(group, standX, standZ, clampY, buretteX) {
  const reach = buretteX - standX;        // arm length in cm
  const armCX = standX + reach / 2;       // arm center X

  group._head.position.set(standX, clampY, standZ);
  group._arm.scale.set(reach, 1, 1);
  group._arm.position.set(armCX, clampY, standZ);

  // Jaw centres offset so their inner walls clear the burette (r=0.85) by ~0.05 cm.
  // offset = burette_radius + jaw_half_width + clearance = 0.85 + 1.0 + 0.05 = 1.9 cm
  group._jawL.position.set(buretteX - 1.9, clampY, standZ);
  group._jawR.position.set(buretteX + 1.9, clampY, standZ);
}
