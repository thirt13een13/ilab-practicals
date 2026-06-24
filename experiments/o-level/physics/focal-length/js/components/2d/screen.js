'use strict';
/* White screen with image projection and blur effect */

Lab.drawScreen = function () {
  if (!Lab.placed.screen) return;
  const { ctx, OPT_AXIS_Y, BOARD_W, BOARD_H, RULER_TOP_Y, circuitConnected } = Lab;
  const { scrX, lensX } = Lab.getPositions();
  const scW = BOARD_W, scH = BOARD_H;
  const cy  = OPT_AXIS_Y;
  const sTop = cy - scH / 2;
  const sBot = cy + scH / 2;
  const isInBounds = scrX > lensX + 10 && scrX < Lab.BENCH_X1 - 12;
  const clarity = Lab.computeClarity();

  ctx.fillStyle = '#334155';
  ctx.fillRect(scrX - 3, sBot, 6, RULER_TOP_Y - sBot);
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.roundRect(scrX - 9, sBot - 3, 18, 7, 2); ctx.fill();

  const scG = ctx.createLinearGradient(scrX - scW / 2, sTop, scrX + scW / 2, sTop);
  scG.addColorStop(0, '#cbd5e1');
  scG.addColorStop(0.5, '#f1f5f9');
  scG.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = scG;
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(scrX - scW / 2, sTop, scW, scH, 3); ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.beginPath(); ctx.roundRect(scrX - scW / 2, sTop, scW, scH, 3); ctx.fill();

  ctx.strokeStyle = 'rgba(45,212,191,0.30)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(scrX, sBot); ctx.lineTo(scrX, RULER_TOP_Y); ctx.stroke();
  ctx.setLineDash([]);

  if (isInBounds && circuitConnected && Lab.placed.lens && Lab.placed.object) {
    const imgSize = 17;
    const icx = scrX, icy = cy;

    ctx.save();
    const blurPx = (1 - clarity / 100) * 9;
    if (blurPx > 0.3) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;

    const haloG = ctx.createRadialGradient(icx, icy, 0, icx, icy, imgSize + 14);
    haloG.addColorStop(0, `rgba(253,224,71,${0.25 + 0.55 * clarity / 100})`);
    haloG.addColorStop(1, 'transparent');
    ctx.fillStyle = haloG;
    ctx.beginPath(); ctx.arc(icx, icy, imgSize + 14, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(217,119,6,${0.55 + 0.45 * clarity / 100})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(icx - imgSize, icy); ctx.lineTo(icx + imgSize, icy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(icx, icy - imgSize); ctx.lineTo(icx, icy + imgSize); ctx.stroke();

    ctx.filter = 'none';
    ctx.restore();
  }

  const dimY = RULER_TOP_Y - 4;
  ctx.fillStyle = 'rgba(45,212,191,0.85)'; ctx.font = '9px IBM Plex Mono,monospace';
  ctx.textAlign = 'center'; ctx.fillText(`v = ${Lab.v_cm.toFixed(1)} cm`, scrX, sTop - 7);

  ctx.strokeStyle = 'rgba(45,212,191,0.30)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(lensX, dimY); ctx.lineTo(scrX, dimY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(45,212,191,0.60)';
  ctx.beginPath(); ctx.moveTo(scrX, dimY); ctx.lineTo(scrX + 5, dimY - 3); ctx.lineTo(scrX + 5, dimY + 3); ctx.fill();
};
