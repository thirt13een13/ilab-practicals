'use strict';
/* Three principal ray construction lines */

Lab.drawRays = function () {
  if (!Lab.showRays) return;
  if (!Lab.assembled || !Lab.circuitConnected) return;
  if (Lab.u_cm <= Lab.F_TRUE) return;

  const { ctx, OPT_AXIS_Y, F_TRUE, CM_TO_PX } = Lab;
  const { objX, lensX } = Lab.getPositions();
  const axisY    = OPT_AXIS_Y;
  const rayOffset = 13;
  const vIdeal   = Lab.idealV();

  ctx.save();

  function arrowHead(x, y, dx, dy, size) {
    size = size || 5;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * size + px * size * 0.5, y - uy * size + py * size * 0.5);
    ctx.lineTo(x - ux * size - px * size * 0.5, y - uy * size - py * size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  const vPx     = vIdeal * CM_TO_PX;
  const scrImgX = lensX + vPx;
  const f2x     = lensX + F_TRUE * CM_TO_PX;

  ctx.strokeStyle = 'rgba(253,224,71,0.70)'; ctx.lineWidth = 1.4;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(objX, axisY - rayOffset); ctx.lineTo(lensX, axisY - rayOffset); ctx.stroke();
  const slope1 = rayOffset / (f2x - lensX);
  const y1end  = axisY - rayOffset + slope1 * (scrImgX - lensX);
  ctx.beginPath(); ctx.moveTo(lensX, axisY - rayOffset); ctx.lineTo(scrImgX, y1end); ctx.stroke();
  ctx.fillStyle = 'rgba(253,224,71,0.70)';
  arrowHead(scrImgX, y1end, scrImgX - lensX, y1end - (axisY - rayOffset));

  ctx.strokeStyle = 'rgba(251,191,36,0.55)'; ctx.lineWidth = 1.2;
  const slope2 = (axisY - (axisY - rayOffset)) / (scrImgX - objX);
  ctx.beginPath();
  ctx.moveTo(objX, axisY - rayOffset);
  ctx.lineTo(scrImgX, axisY - rayOffset + slope2 * (scrImgX - objX));
  ctx.stroke();
  ctx.fillStyle = 'rgba(251,191,36,0.55)';
  arrowHead(scrImgX, axisY - rayOffset + slope2 * (scrImgX - objX),
            scrImgX - objX, slope2 * (scrImgX - objX));

  const f1x = lensX - F_TRUE * CM_TO_PX;
  const slope3in = (axisY - (axisY + rayOffset)) / (lensX - f1x);
  const y3atLens = axisY + rayOffset + slope3in * (lensX - objX);
  ctx.strokeStyle = 'rgba(253,186,116,0.50)'; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(objX, axisY + rayOffset); ctx.lineTo(lensX, y3atLens); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lensX, y3atLens); ctx.lineTo(scrImgX, y3atLens); ctx.stroke();
  ctx.fillStyle = 'rgba(253,186,116,0.50)';
  arrowHead(scrImgX, y3atLens, scrImgX - lensX, 0);

  ctx.fillStyle = 'rgba(253,224,71,0.9)';
  ctx.beginPath(); ctx.arc(scrImgX, axisY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(253,224,71,0.5)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(scrImgX, axisY, 7, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
};
