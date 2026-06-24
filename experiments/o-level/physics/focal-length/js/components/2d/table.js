'use strict';
/* Background grid · fixed floor datum · wooden table surface */

/* Fixed floor — drawn before the zoom/pan transform so it never moves.
   Visually anchors the table: no matter how far you zoom or pan the table,
   the floor remains at its natural position at the bottom of the canvas. */
Lab.drawGround = function () {
  const { ctx, W, H } = Lab;
  const floorY = Lab.TABLE_TOP + Lab.TABLE_H + Lab.TABLE_LEG_H;

  /* Dark floor fill */
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0,   '#1e1208');
  g.addColorStop(0.3, '#130c05');
  g.addColorStop(1,   '#080503');
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);

  /* Floor–wall junction line */
  ctx.strokeStyle = 'rgba(130,80,35,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();

  /* Subtle floorboard seams */
  ctx.strokeStyle = 'rgba(35,22,10,0.55)';
  ctx.lineWidth = 0.6;
  for (let bx = 60; bx < W; bx += 80) {
    ctx.beginPath(); ctx.moveTo(bx, floorY); ctx.lineTo(bx, H); ctx.stroke();
  }
};

Lab.drawBg = function () {
  const { ctx, W, H } = Lab;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0c12');
  g.addColorStop(1, '#0e1018');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(37,43,59,0.6)'; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
};

Lab.drawTable = function () {
  const { ctx, TABLE_X, TABLE_TOP, TABLE_W, TABLE_H, TABLE_LEG_H } = Lab;
  const lx = TABLE_X, ty = TABLE_TOP, tw = TABLE_W;
  const legH = TABLE_LEG_H, legW = 18;

  const legG = ctx.createLinearGradient(0, ty + TABLE_H, 0, ty + TABLE_H + legH);
  legG.addColorStop(0, '#5c3d1a'); legG.addColorStop(1, '#2e1e0c');
  for (const lp of [lx + 28, lx + tw - 28 - legW]) {
    ctx.fillStyle = legG; ctx.fillRect(lp, ty + TABLE_H, legW, legH);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.8;
    for (let g = 0; g < legH; g += 20) {
      ctx.beginPath(); ctx.moveTo(lp + 3, ty + TABLE_H + g); ctx.lineTo(lp + legW - 3, ty + TABLE_H + g + 16); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(lp - 4, ty + TABLE_H + legH - 7, legW + 8, 10, 2); ctx.fill();
  }

  ctx.fillStyle = '#6b3f18';
  ctx.fillRect(lx, ty + TABLE_H, tw, 12);

  const sg = ctx.createLinearGradient(lx, ty, lx, ty + TABLE_H);
  sg.addColorStop(0, '#a06535'); sg.addColorStop(0.35, '#7d4d24'); sg.addColorStop(1, '#5c3a18');
  ctx.fillStyle = sg; ctx.fillRect(lx, ty, tw, TABLE_H);

  ctx.fillStyle = 'rgba(220,160,90,0.20)'; ctx.fillRect(lx, ty, tw, 4);

  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 0.7;
  for (let g = lx + 20; g < lx + tw - 10; g += 24) {
    ctx.beginPath(); ctx.moveTo(g, ty + 2); ctx.lineTo(g + 10, ty + TABLE_H - 2); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(160,100,50,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx, ty + TABLE_H); ctx.lineTo(lx + tw, ty + TABLE_H); ctx.stroke();
};
