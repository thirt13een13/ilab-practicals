/* Three principal ray lines in 3D — updated every frame */
const OPT_Y  = 13;
const OBJ_H  = 5;    /* tip of object above optical axis, cm */

function makeLine(scene, THREE, color, opacity) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const geo = new THREE.BufferGeometry();
  geo.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const line = new THREE.Line(geo, mat);
  line.visible = false;
  scene.add(line);
  return line;
}

function setPoints(line, pts) {
  line.geometry.setFromPoints(pts);
}

export function createRays(scene, THREE) {
  /* Ray 1 — yellow  (parallel → through image)        */
  /* Ray 2 — gold    (through lens centre, undeviated)  */
  /* Ray 3 — orange  (through F1 → exits parallel)      */
  const line1 = makeLine(scene, THREE, 0xfde047, 0.72);
  const line2 = makeLine(scene, THREE, 0xfbbf24, 0.58);
  const line3 = makeLine(scene, THREE, 0xfb923c, 0.50);

  /* Convergence glow at image point */
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfde047, emissive: 0xfde047, emissiveIntensity: 3,
    transparent: true, opacity: 0,
  });
  const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), glowMat);
  glowSphere.visible = false;
  scene.add(glowSphere);

  function setVisible(v) {
    [line1, line2, line3, glowSphere].forEach(o => { o.visible = v; });
  }

  function update(u, vIdeal, fTrue, visible) {
    setVisible(visible);
    if (!visible || !isFinite(vIdeal) || vIdeal <= 0) return;

    const objX  = 0;
    const lensX = u;
    const imgX  = lensX + vIdeal;
    const f1x   = lensX - fTrue;
    const h     = OBJ_H;                      /* object tip height above axis */
    const hI    = -h * vIdeal / u;            /* image tip height (inverted)  */

    /* Ray 1: parallel to axis from tip → after lens through focal point to image */
    setPoints(line1, [
      new THREE.Vector3(objX,  OPT_Y + h,  0),
      new THREE.Vector3(lensX, OPT_Y + h,  0),
      new THREE.Vector3(imgX,  OPT_Y + hI, 0),
    ]);

    /* Ray 2: straight through lens centre (undeviated) */
    setPoints(line2, [
      new THREE.Vector3(objX,  OPT_Y + h,  0),
      new THREE.Vector3(lensX, OPT_Y,      0),
      new THREE.Vector3(imgX,  OPT_Y + hI, 0),
    ]);

    /* Ray 3: aimed at F1, exits parallel to axis at height yL */
    const yL = OPT_Y + h + (-h / Math.max(0.01, u - fTrue)) * u;
    setPoints(line3, [
      new THREE.Vector3(objX,  OPT_Y + h, 0),
      new THREE.Vector3(lensX, yL,         0),
      new THREE.Vector3(imgX,  yL,         0),
    ]);

    /* Glow at image convergence point */
    glowSphere.position.set(imgX, OPT_Y, 0);
    glowMat.opacity = 0.75;
  }

  return { setVisible, update };
}
