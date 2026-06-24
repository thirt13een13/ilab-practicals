'use strict';
/* Lens holder rod + ring + dimension annotation */

Lab.drawHolder = function () {
  if (!Lab.placed.holder) return;
  const { ctx, OPT_AXIS_Y, LENS_H, RULER_TOP_Y, u_cm } = Lab;
  const { lensX, objX } = Lab.getPositions();
  const ringCy = OPT_AXIS_Y;
  const ringR  = LENS_H / 2 + 6;

  ctx.save();

  const rodW = 8;
  const rodBottom = RULER_TOP_Y;
  const rodTop    = ringCy - 2;
  const rodG = ctx.createLinearGradient(lensX - rodW / 2, 0, lensX + rodW / 2, 0);
  rodG.addColorStop(0, '#475569'); rodG.addColorStop(0.3, '#94a3b8');
  rodG.addColorStop(0.7, '#64748b'); rodG.addColorStop(1, '#334155');
  ctx.fillStyle = rodG;
  ctx.fillRect(lensX - rodW / 2, rodTop, rodW, rodBottom - rodTop);

  ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 0.7;
  for (let ty2 = rodTop + 4; ty2 < rodBottom; ty2 += 5) {
    ctx.beginPath(); ctx.moveTo(lensX - rodW / 2, ty2); ctx.lineTo(lensX + rodW / 2, ty2); ctx.stroke();
  }

  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.roundRect(lensX - 9, rodBottom - 3, 18, 7, 2); ctx.fill();

  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(lensX, ringCy, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(lensX, ringCy, ringR - 1, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
  for (const ang of [0, Math.PI]) {
    const sx = lensX + Math.cos(ang) * (ringR + 5);
    const sy = ringCy + Math.sin(ang) * (ringR + 5);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.lineTo(sx + 2.5, sy); ctx.stroke();
  }

  const dimY = RULER_TOP_Y - 4;
  ctx.strokeStyle = 'rgba(96,165,250,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(objX, dimY); ctx.lineTo(lensX, dimY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(96,165,250,0.6)';
  ctx.beginPath(); ctx.moveTo(lensX, dimY); ctx.lineTo(lensX - 5, dimY - 3); ctx.lineTo(lensX - 5, dimY + 3); ctx.fill();

  ctx.fillStyle = 'rgba(96,165,250,0.85)'; ctx.font = 'bold 9px IBM Plex Mono,monospace';
  ctx.textAlign = 'center'; ctx.fillText(`u = ${u_cm} cm`, lensX, ringCy - ringR - 10);

  ctx.restore();
};
