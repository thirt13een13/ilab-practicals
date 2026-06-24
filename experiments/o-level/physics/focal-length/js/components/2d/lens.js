'use strict';
/* Biconvex lens with glass reflections and focal points */

function buildLensPath(cx, cy, lH, lW) {
  const ctx = Lab.ctx;
  const s  = lW / 2;
  const hH = lH / 2;
  const R  = (s * s + hH * hH) / (2 * s);
  const clx = cx - R + s;
  const crx = cx + R - s;
  const aL  = Math.asin(hH / R);

  ctx.beginPath();
  ctx.arc(crx, cy, R, Math.PI - aL, Math.PI + aL, false);
  ctx.arc(clx, cy, R, -aL, aL, false);
  ctx.closePath();
}

Lab.drawLens = function () {
  if (!Lab.placed.lens || !Lab.placed.holder) return;
  const { ctx, OPT_AXIS_Y, LENS_H, BENCH_X0, BENCH_X1, F_TRUE, CM_TO_PX } = Lab;
  const { lensX } = Lab.getPositions();
  const lH = LENS_H;
  const lW = lH * 0.30;
  const cy = OPT_AXIS_Y;

  ctx.save();

  buildLensPath(lensX, cy, lH, lW);
  ctx.clip();

  const bodyG = ctx.createLinearGradient(lensX - lW, cy - lH / 2, lensX + lW, cy + lH / 2);
  bodyG.addColorStop(0,    'rgba(180,210,255,0.12)');
  bodyG.addColorStop(0.35, 'rgba(200,225,255,0.30)');
  bodyG.addColorStop(0.50, 'rgba(210,235,255,0.42)');
  bodyG.addColorStop(0.65, 'rgba(200,225,255,0.30)');
  bodyG.addColorStop(1,    'rgba(180,210,255,0.12)');
  ctx.fillStyle = bodyG;
  ctx.fillRect(lensX - lW - 2, cy - lH / 2 - 2, lW * 2 + 4, lH + 4);

  const refG = ctx.createLinearGradient(lensX - lW, cy, lensX + lW, cy);
  refG.addColorStop(0,    'rgba(255,80,80,0.04)');
  refG.addColorStop(0.25, 'rgba(255,220,60,0.06)');
  refG.addColorStop(0.50, 'rgba(80,200,120,0.07)');
  refG.addColorStop(0.75, 'rgba(60,150,255,0.06)');
  refG.addColorStop(1,    'rgba(160,80,255,0.04)');
  ctx.fillStyle = refG;
  ctx.fillRect(lensX - lW - 2, cy - lH / 2 - 2, lW * 2 + 4, lH + 4);

  const specG = ctx.createLinearGradient(lensX - lW * 0.5, cy, lensX + lW * 0.5, cy);
  specG.addColorStop(0,    'transparent');
  specG.addColorStop(0.35, 'rgba(255,255,255,0.10)');
  specG.addColorStop(0.48, 'rgba(255,255,255,0.55)');
  specG.addColorStop(0.52, 'rgba(255,255,255,0.55)');
  specG.addColorStop(0.65, 'rgba(255,255,255,0.10)');
  specG.addColorStop(1,    'transparent');
  ctx.fillStyle = specG;
  ctx.fillRect(lensX - lW, cy - lH / 2, lW * 2, lH);

  const glintG = ctx.createRadialGradient(lensX - lW * 0.2, cy - lH * 0.28, 0, lensX - lW * 0.2, cy - lH * 0.28, lW * 0.9);
  glintG.addColorStop(0, 'rgba(255,255,255,0.50)');
  glintG.addColorStop(1, 'transparent');
  ctx.fillStyle = glintG;
  ctx.fillRect(lensX - lW, cy - lH / 2, lW * 2, lH);

  ctx.restore();

  ctx.save();
  buildLensPath(lensX, cy, lH, lW);
  ctx.strokeStyle = 'rgba(96,180,255,0.45)';
  ctx.lineWidth   = 3.5;
  ctx.stroke();
  buildLensPath(lensX, cy, lH, lW);
  ctx.strokeStyle = 'rgba(200,230,255,0.80)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,235,255,0.9)';
  ctx.beginPath(); ctx.arc(lensX, cy - lH / 2, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(lensX, cy + lH / 2, 1.6, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(96,165,250,0.22)'; ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(BENCH_X0, cy); ctx.lineTo(BENCH_X1, cy); ctx.stroke();
  ctx.setLineDash([]);

  const f1x = lensX - F_TRUE * CM_TO_PX;
  const f2x = lensX + F_TRUE * CM_TO_PX;
  [f1x, f2x].forEach(fx => {
    if (fx < BENCH_X0 || fx > BENCH_X1) return;
    ctx.fillStyle = 'rgba(167,139,250,0.70)';
    ctx.beginPath(); ctx.arc(fx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(167,139,250,0.75)';
    ctx.font = 'bold 9px IBM Plex Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText('F', fx, cy + 16);
  });

  ctx.restore();
};
