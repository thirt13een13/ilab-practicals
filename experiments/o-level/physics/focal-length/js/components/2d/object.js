'use strict';
/* Illuminated object board with bulb glow */

Lab.drawObject = function () {
  if (!Lab.placed.object) return;
  const { ctx, OPT_AXIS_Y, BOARD_W, BOARD_H, RULER_TOP_Y, circuitConnected } = Lab;
  const { objX } = Lab.getPositions();
  const bW = BOARD_W, bH = BOARD_H;
  const cx = objX, cy = OPT_AXIS_Y;
  const bTop = cy - bH / 2;
  const bBot = cy + bH / 2;

  if (circuitConnected) {
    const bulbX = objX - bW / 2 - 24, bulbY = cy;
    const coneG = ctx.createRadialGradient(bulbX, bulbY, 2, bulbX, bulbY, bW * 2.5);
    coneG.addColorStop(0, 'rgba(253,220,60,0.35)');
    coneG.addColorStop(0.5, 'rgba(253,200,50,0.10)');
    coneG.addColorStop(1, 'transparent');
    ctx.fillStyle = coneG;
    ctx.beginPath(); ctx.arc(bulbX, bulbY, bW * 2.5, 0, Math.PI * 2); ctx.fill();

    const bG = ctx.createRadialGradient(bulbX - 2, bulbY - 4, 1, bulbX, bulbY, 10);
    bG.addColorStop(0, '#fff9c4'); bG.addColorStop(0.4, '#fde047'); bG.addColorStop(1, '#f59e0b');
    ctx.fillStyle = bG;
    ctx.beginPath(); ctx.arc(bulbX, bulbY - 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath(); ctx.roundRect(bulbX - 4, bulbY + 7, 8, 7, 1); ctx.fill();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bulbX + 9, bulbY); ctx.lineTo(objX - bW / 2, cy); ctx.stroke();
  }

  ctx.fillStyle = '#334155';
  ctx.fillRect(cx - 3, bBot, 6, RULER_TOP_Y - bBot);
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.roundRect(cx - 9, bBot - 3, 18, 7, 2); ctx.fill();

  const boardG = ctx.createLinearGradient(objX - bW / 2, bTop, objX + bW / 2, bTop);
  boardG.addColorStop(0, '#1c2840');
  boardG.addColorStop(0.5, '#222e48');
  boardG.addColorStop(1, '#1c2840');
  ctx.fillStyle = boardG;
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(objX - bW / 2, bTop, bW, bH, 4); ctx.fill(); ctx.stroke();

  ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(objX - bW / 2 + 2, bTop + 2); ctx.lineTo(objX + bW / 2 - 2, bTop + 2); ctx.stroke();

  const holeR = 15;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
  if (circuitConnected) {
    const hG = ctx.createRadialGradient(cx, cy, 1, cx, cy, holeR);
    hG.addColorStop(0, '#fef9c3'); hG.addColorStop(0.5, '#fde047'); hG.addColorStop(1, '#f59e0b');
    ctx.fillStyle = hG;
  } else {
    ctx.fillStyle = '#0c0e14';
  }
  ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  const wireCol = circuitConnected ? '#1e1a05' : '#4b5563';
  ctx.strokeStyle = wireCol; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - holeR + 2, cy); ctx.lineTo(cx + holeR - 2, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - holeR + 2); ctx.lineTo(cx, cy + holeR - 2); ctx.stroke();

  ctx.fillStyle = wireCol;
  ctx.beginPath(); ctx.arc(cx, cy, 1.3, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(cx, bBot); ctx.lineTo(cx, RULER_TOP_Y); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(245,158,11,0.80)'; ctx.font = '9px IBM Plex Mono,monospace';
  ctx.textAlign = 'center'; ctx.fillText('Object (0 cm)', cx, bTop - 7);
};
