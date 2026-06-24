'use strict';
/* Amber metre rule with tick marks */

Lab.drawMetreRule = function () {
  if (!Lab.placed.metrerule) return;
  const { ctx, BENCH_Y, BENCH_X0, BENCH_LEN_PX } = Lab;
  const y = BENCH_Y - 7, h = 14;

  const rg = ctx.createLinearGradient(BENCH_X0, y, BENCH_X0, y + h);
  rg.addColorStop(0, '#fde68a'); rg.addColorStop(0.45, '#f59e0b'); rg.addColorStop(1, '#92610a');
  ctx.fillStyle = rg; ctx.fillRect(BENCH_X0, y, BENCH_LEN_PX, h);

  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.8;
  for (let cm = 0; cm <= 100; cm++) {
    const x = Lab.cmToPx(cm);
    const tH = cm % 10 === 0 ? h : cm % 5 === 0 ? h * 0.65 : h * 0.38;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tH); ctx.stroke();
    if (cm % 10 === 0) {
      ctx.fillStyle = '#451a03'; ctx.font = '7px IBM Plex Mono,monospace';
      ctx.textAlign = 'center'; ctx.fillText(cm, x, y + h + 9);
    }
  }

  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
  ctx.strokeRect(BENCH_X0, y, BENCH_LEN_PX, h);
};
