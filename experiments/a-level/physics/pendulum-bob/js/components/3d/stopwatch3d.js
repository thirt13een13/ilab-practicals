import * as THREE from 'three';
import { state, DOM } from '../../state.js';

const BODY_R = 0.032;
const BODY_H = 0.014;
// All cylinders rotated x=+π/2 so axis lies along world Z (face toward viewer).
const FACE_ROT = Math.PI / 2;

let swGroup, handMesh;

export function createStopwatch3d(scene) {
  swGroup = new THREE.Group();

  const rimMat   = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.55, roughness: 0.35 });
  const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.75 });
  const faceMat  = new THREE.MeshStandardMaterial({ color: 0x090d18, roughness: 0.9 });
  const handMat  = new THREE.MeshStandardMaterial({ color: 0xf87171, metalness: 0.2 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.65, roughness: 0.3 });
  const tickMat  = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

  // Outer amber rim — axis along Z
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(BODY_R, BODY_R, BODY_H, 64), rimMat);
  rim.rotation.x = FACE_ROT;
  swGroup.add(rim);

  // Dark inner body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(BODY_R - 0.003, BODY_R - 0.003, BODY_H + 0.0005, 64), bodyMat);
  body.rotation.x = FACE_ROT;
  swGroup.add(body);

  // Face disc — sits at front face (+Z side), face toward viewer
  const face = new THREE.Mesh(new THREE.CylinderGeometry(BODY_R - 0.005, BODY_R - 0.005, 0.0005, 64), faceMat);
  face.rotation.x = FACE_ROT;
  face.position.z = BODY_H / 2 + 0.0003;
  swGroup.add(face);

  // 12 tick marks in the XY plane (face plane)
  for (let i = 0; i < 12; i++) {
    const angle   = (i / 12) * Math.PI * 2;
    const isMajor = i % 3 === 0;
    const tickLen = isMajor ? 0.008 : 0.004;
    const tickR   = BODY_R - 0.007 - tickLen / 2;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.0015, tickLen, 0.0008),
      tickMat
    );
    tick.position.set(
      Math.sin(angle) * tickR,
      Math.cos(angle) * tickR,
      BODY_H / 2 + 0.001
    );
    tick.rotation.z = -angle;
    swGroup.add(tick);
  }

  // Second hand — elongated along Y, rotates around Z (clockwise from viewer)
  handMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.0018, 0.022, 0.001),
    handMat
  );
  handMesh.geometry.translate(0, 0.004, 0); // shift so pivot is off-center
  handMesh.position.z = BODY_H / 2 + 0.0015;
  swGroup.add(handMesh);

  // Center hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.003, 16), rimMat);
  hub.rotation.x = FACE_ROT;
  hub.position.z = BODY_H / 2 + 0.001;
  swGroup.add(hub);

  // Crown/start-stop button — vertical cylinder protruding from top of case
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.016, 12), crownMat);
  crown.position.set(0, BODY_R + 0.009, 0);
  swGroup.add(crown);

  // Knurled grip above crown
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.005, 12), bodyMat);
  grip.position.set(0, BODY_R + 0.019, 0);
  swGroup.add(grip);

  // Running indicator LED on face (lower area, 6 o'clock region)
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0,
  });
  const led = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.001, 12), ledMat);
  led.rotation.x = FACE_ROT;
  led.position.set(0, -0.014, BODY_H / 2 + 0.001);
  led.name = 'sw-led';
  swGroup.add(led);

  scene.add(swGroup);
  updateStopwatch3d();
}

export function updateStopwatch3d() {
  if (!swGroup) return;

  swGroup.visible = state.placed.stopwatch;
  if (!state.placed.stopwatch) return;

  // Stand on table surface — center at y = tableTop + BODY_R
  const standH = parseInt(DOM.slHeight.value) / 100;
  swGroup.position.set(0.22, -standH + BODY_R + 0.001, 0.05);

  // Second hand sweeps clockwise — rotate around Z
  const secAngle = (state.swElapsed % 60) / 60 * Math.PI * 2;
  if (handMesh) handMesh.rotation.z = -secAngle;

  // LED glows green when stopwatch is running
  const led = swGroup.getObjectByName('sw-led');
  if (led) led.material.emissiveIntensity = state.swRunning ? 1.5 : 0;
}
