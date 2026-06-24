/* Wooden lab table — always visible in 3D scene */
export function createTable(scene, THREE) {
  const group = new THREE.Group();

  /* Table surface */
  const surfMat = new THREE.MeshStandardMaterial({ color: 0x7d4d24, roughness: 0.85, metalness: 0 });
  const surface = new THREE.Mesh(new THREE.BoxGeometry(120, 3, 50), surfMat);
  surface.position.set(50, -1.5, 0);
  group.add(surface);

  /* Lighter top strip */
  const topMat = new THREE.MeshStandardMaterial({ color: 0xa06535, roughness: 0.7 });
  const topStrip = new THREE.Mesh(new THREE.BoxGeometry(120, 0.6, 50), topMat);
  topStrip.position.set(50, 0.3, 0);
  group.add(topStrip);

  /* Four legs */
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1a, roughness: 0.9 });
  const legGeo = new THREE.BoxGeometry(4, 32, 4);
  for (const [lx, lz] of [[8, 20], [92, 20], [8, -20], [92, -20]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, -19, lz);
    group.add(leg);
  }

  scene.add(group);
  return { group };
}
