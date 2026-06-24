/* Biconvex glass lens — LatheGeometry revolved around Y, rotated to sit on X axis */
const OPT_Y  = 13;
const HALF_H = 1.2;   /* half-thickness in cm  */
const R_MAX  = 7;     /* lens half-diameter cm  */

function buildBiconvexPoints(THREE) {
  /* Sinusoidal lens profile: r = Rmax * sin(π*t), y = -H to +H */
  const N = 36;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = HALF_H * (2 * t - 1);
    const r = R_MAX * Math.sin(Math.PI * t);
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
}

export function createLens(scene, THREE) {
  const group = new THREE.Group();

  const geo = new THREE.LatheGeometry(buildBiconvexPoints(THREE), 48);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xadd8ff,
    transmission: 0.88,
    roughness: 0.04,
    metalness: 0,
    ior: 1.52,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  /* LatheGeometry revolves around Y; rotate so optical axis aligns with X */
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(0, OPT_Y, 0);
  group.add(mesh);

  /* Optical axis dashed line (extends full bench) */
  const axisMat = new THREE.LineDashedMaterial({
    color: 0x60a5fa, transparent: true, opacity: 0.25,
    dashSize: 3, gapSize: 4, linewidth: 1,
  });
  const axisPts = [new THREE.Vector3(-5, OPT_Y, 0), new THREE.Vector3(105, OPT_Y, 0)];
  const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPts);
  const axisLine = new THREE.LineSegments(axisGeo, axisMat);
  axisLine.computeLineDistances();
  group.add(axisLine);

  /* Focal-point markers */
  const fpMat = new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x7c3aed, emissiveIntensity: 0.4 });
  [-1, 1].forEach(side => {
    const fp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), fpMat);
    /* position relative to group origin (lens x) */
    fp.position.set(side * 15, OPT_Y, 0);  /* 15 cm = F_TRUE; updated in scene3d.js */
    group.add(fp);
  });

  group.visible = false;
  scene.add(group);

  return {
    group,
    setVisible(v) { group.visible = v; },
    setPosition(x) { group.position.x = x; },
    /* Allow scene3d to update focal markers if F_TRUE changes */
    focalMarkers: group.children.filter((c, i) => i >= 2),
  };
}
