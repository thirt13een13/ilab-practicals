/* Metre rule — canvas texture baked face with mm/cm/10cm graduations + numbers */

const RULER_W  = 100;   /* cm — length along X */
const RULER_H  = 1.4;   /* cm — thickness      */
const RULER_D  = 5.5;   /* cm — width along Z  */

/* ── Canvas texture ──────────────────────────────────────── */
function makeRulerTexture(THREE) {
  /* Pixels per cm — higher = sharper text at close zoom */
  const PPC  = 24;
  const TW   = RULER_W * PPC;   /* 2400 px */
  const TH   = RULER_D * PPC;   /* 132 px  */

  const c   = document.createElement('canvas');
  c.width   = TW;
  c.height  = TH;
  const ctx = c.getContext('2d');

  /* ── Amber wood background gradient ── */
  const bg = ctx.createLinearGradient(0, 0, 0, TH);
  bg.addColorStop(0,    '#fef3b0');
  bg.addColorStop(0.12, '#fde68a');
  bg.addColorStop(0.40, '#f5c230');
  bg.addColorStop(0.70, '#e8a820');
  bg.addColorStop(0.88, '#d49518');
  bg.addColorStop(1,    '#b87814');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TW, TH);

  /* ── Subtle wood grain ── */
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const y = (TH / 18) * i + 2;
    const ofs = (Math.random() - 0.5) * 4;
    ctx.strokeStyle = `rgba(${200 + (i % 3) * 8}, ${138 + (i % 4) * 6}, 28, 0.18)`;
    ctx.lineWidth = 0.8 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y + ofs);
    ctx.bezierCurveTo(TW * 0.3, y + ofs * 1.4, TW * 0.7, y - ofs * 0.8, TW, y + ofs * 0.5);
    ctx.stroke();
  }
  ctx.restore();

  /* ── Outer border ── */
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, TW - 3, TH - 3);

  /* ── Graduated tick marks (1 mm resolution) ── */
  const topEdge = 2;
  const botEdge = TH - 2;

  for (let mm = 0; mm <= 1000; mm++) {
    const x = (mm / 10) * PPC;
    let topH, botH, lw;

    if      (mm % 100 === 0) { topH = TH * 0.66; botH = TH * 0.66; lw = 2.0; }
    else if (mm % 50  === 0) { topH = TH * 0.50; botH = TH * 0.50; lw = 1.5; }
    else if (mm % 10  === 0) { topH = TH * 0.38; botH = TH * 0.38; lw = 1.2; }
    else if (mm % 5   === 0) { topH = TH * 0.24; botH = TH * 0.24; lw = 0.8; }
    else                     { topH = TH * 0.14; botH = TH * 0.14; lw = 0.5; }

    ctx.strokeStyle = '#4a2c04';
    ctx.lineWidth   = lw;

    /* top ticks */
    ctx.beginPath(); ctx.moveTo(x, topEdge); ctx.lineTo(x, topEdge + topH); ctx.stroke();
    /* bottom ticks */
    ctx.beginPath(); ctx.moveTo(x, botEdge); ctx.lineTo(x, botEdge - botH); ctx.stroke();
  }

  /* ── Numbers every 10 cm ── */
  const bigSize = Math.round(TH * 0.42);
  ctx.fillStyle    = '#2d1a02';
  ctx.font         = `bold ${bigSize}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const midY = TH * 0.5;
  for (let cm = 0; cm <= 100; cm += 10) {
    if (cm === 0 || cm === 100) continue;  /* too close to edges */
    ctx.fillText(String(cm), cm * PPC, midY);
  }

  /* ── Small numbers every 5 cm ── */
  const smSize = Math.round(TH * 0.24);
  ctx.fillStyle = '#7a5010';
  ctx.font      = `${smSize}px Arial, sans-serif`;
  for (let cm = 5; cm < 100; cm += 10) {
    ctx.fillText(String(cm), cm * PPC, midY);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy  = 8;     /* sharper at oblique angles */
  tex.needsUpdate = true;
  return tex;
}

/* ── Component factory ───────────────────────────────────── */
export function createMetreRule(scene, THREE) {
  const group = new THREE.Group();

  /* Face texture (top + bottom share same look) */
  const faceTex = makeRulerTexture(THREE);

  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.55,
    metalness: 0.02,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color:     0xc88a18,
    roughness: 0.7,
    metalness: 0,
  });
  const endMat = new THREE.MeshStandardMaterial({
    color:     0xa07010,
    roughness: 0.8,
    metalness: 0,
  });

  /* BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z */
  const materials = [
    endMat,   /* right end  (+X) */
    endMat,   /* left end   (-X) */
    faceMat,  /* top face   (+Y) ← ruler face */
    faceMat,  /* bottom     (-Y) */
    sideMat,  /* front edge (+Z) */
    sideMat,  /* back edge  (-Z) */
  ];

  const geo  = new THREE.BoxGeometry(RULER_W, RULER_H, RULER_D);
  const mesh = new THREE.Mesh(geo, materials);
  /* Centred on x=50; sits on bench surface (y=0 → y=RULER_H) */
  mesh.position.set(50, RULER_H / 2, 0);
  group.add(mesh);

  /* Thin bevel strip along each long front/back edge */
  const bevelMat = new THREE.MeshStandardMaterial({
    color:     0x8a6010,
    roughness: 0.5,
    metalness: 0.05,
  });
  for (const dz of [-RULER_D / 2, RULER_D / 2]) {
    const bevel = new THREE.Mesh(
      new THREE.BoxGeometry(100, 0.18, 0.18),
      bevelMat
    );
    bevel.position.set(50, RULER_H, dz);
    group.add(bevel);
  }

  group.visible = false;
  scene.add(group);

  return {
    group,
    setVisible(v) { group.visible = v; },
  };
}
