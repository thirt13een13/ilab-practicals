'use strict';
/* Side-view floating overlay panel */

Lab.drawSideView = function () {
  if (Lab.viewMode !== 'side') return;
  const { ctx, W, H, circuitConnected } = Lab;
  ctx.save(); ctx.globalAlpha = 0.93;
  const cx = W * 0.5, cy = H * 0.37;
  const sW = 280, sH = 210;

  ctx.fillStyle = 'rgba(15,18,27,0.95)';
  ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(cx - sW / 2, cy - sH / 2 - 22, sW, sH + 44, 10); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#2dd4bf'; ctx.font = 'bold 10px IBM Plex Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText('SIDE VIEW', cx, cy - sH / 2 - 6);

  ctx.fillStyle = '#7d4d24'; ctx.fillRect(cx - sW / 2 + 24, cy + sH / 2 - 18, sW - 48, 16);
  ctx.fillStyle = '#92610a'; ctx.fillRect(cx - sW / 2 + 34, cy + sH / 2 - 30, sW - 68, 10);

  const oy = cy - 18;
  ctx.fillStyle = '#1e2940'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - sW / 2 + 44, oy - 32, 6, 64, 2); ctx.fill(); ctx.stroke();
  if (circuitConnected) {
    ctx.fillStyle = 'rgba(253,200,50,0.55)';
    ctx.beginPath(); ctx.arc(cx - sW / 2 + 38, oy, 10, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = 'rgba(96,165,250,0.70)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, oy, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(96,165,250,0.15)'; ctx.fill();
  ctx.strokeStyle = 'rgba(200,230,255,0.50)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, oy, 28, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx + sW / 2 - 58, oy - 32, 6, 64, 2); ctx.fill(); ctx.stroke();

  ctx.strokeStyle = 'rgba(96,165,250,0.20)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(cx - sW / 2 + 34, oy); ctx.lineTo(cx + sW / 2 - 34, oy); ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
};
