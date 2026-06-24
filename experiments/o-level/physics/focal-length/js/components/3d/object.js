/* Illuminated object board — cross-wire aperture face, fixed at x = 0 */
const OBJ_X  = 0;
const OPT_Y  = 13;
const POST_H = 13;

/* ── Cross-wire aperture texture ────────────────────────── */
function makeCrossTex(lit, THREE) {
  const S   = 512;
  const can = document.createElement('canvas');
  can.width = can.height = S;
  const ctx = can.getContext('2d');

  /* Fully transparent outside the circle */
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2;
  const r  = S * 0.43;

  /* Aperture circle fill */
  if (lit) {
    const g = ctx.createRadialGradient(cx - S*0.05, cy - S*0.05, 0, cx, cy, r);
    g.addColorStop(0,   '#fefce8');
    g.addColorStop(0.3, '#fef08a');
    g.addColorStop(0.7, '#fde047');
    g.addColorStop(1,   '#f59e0b');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#0c0e14';
  }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  /* Cross wires — clipped inside circle */
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = lit ? 'rgba(25,20,4,0.92)' : 'rgba(100,116,139,0.85)';
  ctx.lineWidth   = S * 0.022;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(S * 0.04, cy); ctx.lineTo(S * 0.96, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, S * 0.04); ctx.lineTo(cx, S * 0.96); ctx.stroke();
  ctx.restore();

  /* Aperture ring */
  ctx.strokeStyle = lit ? '#92610a' : '#475569';
  ctx.lineWidth   = S * 0.028;
  ctx.beginPath(); ctx.arc(cx, cy, r - S * 0.015, 0, Math.PI * 2); ctx.stroke();

  /* Centre dot */
  ctx.fillStyle = lit ? '#1c1403' : '#64748b';
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.032, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(can);
  tex.needsUpdate = true;
  return tex;
}

/* ── Component factory ───────────────────────────────────── */
export function createObject(scene, THREE) {
  const group = new THREE.Group();

  /* Support post */
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, POST_H, 8), postMat);
  post.position.set(0, POST_H / 2, 0);
  group.add(post);

  /* Base clamp on bench */
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), postMat);
  clamp.position.set(0, 1, 0);
  group.add(clamp);

  /* Dark board */
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1c2840, roughness: 0.8, metalness: 0.05 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 22, 18), boardMat);
  board.position.set(0, OPT_Y, 0);
  group.add(board);

  /* ── Cross-wire face plane ── */
  const unlitTex = makeCrossTex(false, THREE);
  const litTex   = makeCrossTex(true,  THREE);

  const crossMat = new THREE.MeshStandardMaterial({
    map:         unlitTex,
    transparent: true,
    alphaTest:   0.05,
    roughness:   0.8,
    metalness:   0,
    emissive:    new THREE.Color(0x000000),
    emissiveMap: unlitTex,
    emissiveIntensity: 0,
    depthWrite: false,
  });

  /* PlaneGeometry faces +Z by default; rotate 90° around Y → faces +X (toward lens) */
  const crossPlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), crossMat);
  crossPlane.rotation.y = Math.PI / 2;
  crossPlane.position.set(0.78, OPT_Y, 0);
  group.add(crossPlane);

  /* Glow point light at object (active when circuit connected) */
  const glow = new THREE.PointLight(0xfde047, 0, 50);
  glow.position.set(-5, OPT_Y, 0);
  group.add(glow);

  group.position.x = OBJ_X;
  group.visible    = false;
  scene.add(group);

  let isLit = false;

  return {
    group,
    setVisible(v) { group.visible = v; },
    setLit(on) {
      if (on === isLit) return;   /* skip redundant updates */
      isLit = on;
      crossMat.map              = on ? litTex   : unlitTex;
      crossMat.emissiveMap      = on ? litTex   : null;
      crossMat.emissiveIntensity = on ? 0.55    : 0;
      crossMat.needsUpdate      = true;
      glow.intensity            = on ? 2.5      : 0;
    },
  };
}
