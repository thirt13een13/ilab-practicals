import * as THREE from 'three';

export function createEnvironment(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffd580, 1.2);
  sun.position.set(-1.5, 2, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far  = 10;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -2;
  sun.shadow.camera.right = sun.shadow.camera.top   =  2;
  scene.add(sun);

  const fill = new THREE.PointLight(0x94c8ff, 0.4, 8);
  fill.position.set(1, 0.5, 1);
  scene.add(fill);

  const grid = new THREE.GridHelper(4, 20, 0x252b3b, 0x1a1e2b);
  grid.position.y = -1.5;
  scene.add(grid);
}
