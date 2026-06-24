/* White projection screen — projected cross image fades in with clarity */
const OPT_Y  = 13;
const POST_H = 13;

/* ── Projected cross-wire image texture ─────────────────── */
function makeImageTex(THREE) {
  const S   = 512;
  const can = document.createElement('canvas');
  can.width = can.height = S;
  const ctx = can.getContext('2d');

  ctx.clearRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2;
  const r  = S * 0.38;

  /* Outer warm halo */
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.55);
  halo.addColorStop(0,   'rgba(254,249,195,0.95)');
  halo.addColorStop(0.45,'rgba(253,224,71, 0.75)');
  halo.addColorStop(0.8, 'rgba(251,191,36, 0.35)');
  halo.addColorStop(1,   'rgba(245,158,11, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2); ctx.fill();

  /* Bright aperture circle fill */
  const fill = ctx.createRadialGradient(cx - S*0.04, cy - S*0.04, 0, cx, cy, r);
  fill.addColorStop(0,   '#fefce8');
  fill.addColorStop(0.5, '#fef08a');
  fill.addColorStop(1,   '#fde047');
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  /* Projected cross wires — the image is real & inverted, but a cross
     is rotationally symmetric so it looks the same after inversion     */
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(146, 75, 5, 0.90)';
  ctx.lineWidth   = S * 0.022;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(S * 0.04, cy); ctx.lineTo(S * 0.96, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, S * 0.04); ctx.lineTo(cx, S * 0.96); ctx.stroke();
  ctx.restore();

  /* Aperture ring */
  ctx.strokeStyle = 'rgba(180, 100, 8, 0.80)';
  ctx.lineWidth   = S * 0.026;
  ctx.beginPath(); ctx.arc(cx, cy, r - S * 0.015, 0, Math.PI * 2); ctx.stroke();

  /* Centre dot */
  ctx.fillStyle = 'rgba(146,75,5,0.92)';
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.03, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(can);
  tex.needsUpdate = true;
  return tex;
}

/* ── Component factory ───────────────────────────────────── */
export function createScreen(scene, THREE) {
  const group = new THREE.Group();

  /* Support post */
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, POST_H, 8), postMat);
  post.position.set(0, POST_H / 2, 0);
  group.add(post);

  /* Base clamp */
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), postMat);
  clamp.position.set(0, 1, 0);
  group.add(clamp);

  /* Screen face — white board */
  const screenMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.95, metalness: 0 });
  const screenBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 18), screenMat);
  screenBoard.position.set(0, OPT_Y, 0);
  group.add(screenBoard);

  /* ── Projected cross image ── */
  const imageTex = makeImageTex(THREE);

  const imageMat = new THREE.MeshStandardMaterial({
    map:              imageTex,
    emissiveMap:      imageTex,
    emissive:         new THREE.Color(0xfde047),
    emissiveIntensity: 0,
    transparent:      true,
    opacity:          0,
    alphaTest:        0.01,
    depthWrite:       false,
  });

  /* PlaneGeometry faces +Z by default; rotate -90° around Y → faces -X (toward object) */
  const imagePlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), imageMat);
  imagePlane.rotation.y = -Math.PI / 2;
  imagePlane.position.set(-0.65, OPT_Y, 0);
  group.add(imagePlane);

  /* Soft point light that brightens the scene around the image when focused */
  const focusLight = new THREE.PointLight(0xfde047, 0, 30);
  focusLight.position.set(-2, OPT_Y, 0);
  group.add(focusLight);

  group.visible = false;
  scene.add(group);

  return {
    group,
    imageMat,
    setVisible(v) { group.visible = v; },
    setPosition(x) { group.position.x = x; },
    setClarity(c) {
      const t = Math.max(0, Math.min(1, c / 100));
      imageMat.opacity           = t * 0.92;
      imageMat.emissiveIntensity = t * 1.8;
      focusLight.intensity       = t * 1.4;
      imageMat.needsUpdate       = true;
    },
  };
}
