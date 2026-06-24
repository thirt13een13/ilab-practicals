import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let scene, camera, controls, renderer3d;

export function initScene(canvas) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c12);
  scene.fog = new THREE.Fog(0x0a0c12, 6, 14);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 50);
  camera.position.set(0.8, 0.1, 2.2);

  renderer3d = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer3d.setPixelRatio(window.devicePixelRatio);
  renderer3d.shadowMap.enabled = true;
  renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new OrbitControls(camera, canvas);
  controls.target.set(-0.1, -0.45, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 6;
  controls.update();
}

export function renderScene() {
  const canvas = renderer3d.domElement;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w > 0 && h > 0) {
    const size = renderer3d.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) {
      renderer3d.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  controls.update();
  renderer3d.render(scene, camera);
}
