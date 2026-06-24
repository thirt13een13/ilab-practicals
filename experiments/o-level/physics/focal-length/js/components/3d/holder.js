/* Lens holder: vertical rod + metal ring — moves along X */
const OPT_Y = 13;
const POST_H = 13;
const RING_R = 9;   /* ring outer radius in cm */

export function createHolder(scene, THREE) {
  const group = new THREE.Group();

  /* Vertical rod */
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 });
  const rod = new THREE.Mesh(new THREE.BoxGeometry(1.5, POST_H, 1.5), rodMat);
  rod.position.set(0, POST_H / 2, 0);
  group.add(rod);

  /* Base clamp */
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.4 });
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), clampMat);
  clamp.position.set(0, 1, 0);
  group.add(clamp);

  /* Holder ring (torus perpendicular to optical axis) */
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.9, 12, 48), ringMat);
  ring.rotation.y = Math.PI / 2;   /* face the lens: ring lies in YZ plane */
  ring.position.set(0, OPT_Y, 0);
  group.add(ring);

  /* Two screw knobs on the ring */
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c8, roughness: 0.4, metalness: 0.7 });
  for (const sign of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), knobMat);
    knob.position.set(0, OPT_Y + sign * (RING_R + 1.5), 0);
    group.add(knob);
  }

  group.visible = false;
  scene.add(group);

  return {
    group,
    setVisible(v) { group.visible = v; },
    setPosition(x) { group.position.x = x; },
  };
}
