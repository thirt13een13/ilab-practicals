import { state, placed, loose, currentAcid, currentBase, currentIndicator, currentTitrant } from '../state.js';
import { geo, getFlaskPos } from './geometry.js';
import { flaskColor, getLiquidColorFor, COLOR_LIQUID_NEUTRAL, mixRgba } from '../chemistry/model.js';
import { getShakeState } from '../components/2d/shake.js';
import { pourState } from '../components/2d/pour.js';
import { drops, DRIP_THRESHOLD } from './flow.js';

const canvas = document.getElementById('lab-canvas');
const ctx    = canvas.getContext('2d');

// Hit-box set each frame inside drawFlask(); read by drag.js for mouse testing.
export const hitBoxes = { flask: null };

// ── Master draw ─────────────────────────────────────────────────────────────

export function draw() {
  ctx.clearRect(0, 0, geo.W, geo.H);
  // Background always fills the full canvas regardless of zoom level.
  drawBackground();
  // All world content is scaled/panned by the zoom transform.
  ctx.save();
  ctx.translate(geo.workspacePanX, geo.workspacePanY);
  ctx.scale(geo.workspaceZoom, geo.workspaceZoom);
  drawTable();
  drawStand();
  drawClamp();
  drawBurette();
  drawFunnelMounted();
  drawFlask();
  drawFlowVisualization();
  drawLooseItems();
  drawPourAnimation();
  ctx.restore();
}

// ── Background & table ──────────────────────────────────────────────────────

function drawBackground() {
  // Dark gradient fills the full canvas in screen space.
  const grad = ctx.createLinearGradient(0, 0, 0, geo.H);
  grad.addColorStop(0, '#0a0c12');
  grad.addColorStop(1, '#0e1018');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, geo.W, geo.H);

  // Subtle grid.
  ctx.strokeStyle = 'rgba(37,43,59,0.7)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < geo.W; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, geo.H); ctx.stroke();
  }
  for (let y = 0; y < geo.H; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(geo.W, y); ctx.stroke();
  }

  // ── Datum — fixed reference plane, always at screen Y = geo.H − 60 ─────────
  // The zoom constraint in main.js pins the world table base to this exact Y,
  // so the bench always sits on the datum at every zoom level.
  const groundY = geo.H - 60;

  // Floor fill below the datum
  const floorGrad = ctx.createLinearGradient(0, groundY, 0, geo.H);
  floorGrad.addColorStop(0,    'rgba(18,22,36,1)');
  floorGrad.addColorStop(0.5,  'rgba(10,13,22,1)');
  floorGrad.addColorStop(1,    'rgba(5,7,12,1)');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, groundY, geo.W, geo.H - groundY);

  // Soft contact shadow rising from datum into the scene
  const risingShadow = ctx.createLinearGradient(0, groundY - 36, 0, groundY);
  risingShadow.addColorStop(0, 'rgba(0,0,0,0)');
  risingShadow.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = risingShadow;
  ctx.fillRect(0, groundY - 36, geo.W, 36);

}

function drawTable() {
  const lx = geo.TABLE_X, ty = geo.TABLE_TOP, tw = geo.TABLE_W;
  const legW = 16, legH = geo.TABLE_LEG_H;
  const legGrad = ctx.createLinearGradient(0, ty + geo.TABLE_H, 0, ty + geo.TABLE_H + legH);
  legGrad.addColorStop(0, '#5c3d1a');
  legGrad.addColorStop(1, '#3a2610');

  for (const lp of [lx + 20, lx + tw - 20 - legW]) {
    ctx.fillStyle = legGrad;
    ctx.fillRect(lp, ty + geo.TABLE_H, legW, legH);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let g = 0; g < legH; g += 18) {
      ctx.beginPath();
      ctx.moveTo(lp + 2, ty + geo.TABLE_H + g);
      ctx.lineTo(lp + legW - 2, ty + geo.TABLE_H + g + 14);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(lp - 3, ty + geo.TABLE_H + legH - 6, legW + 6, 8);
  }

  ctx.fillStyle = '#6b3f18';
  ctx.fillRect(lx, ty + geo.TABLE_H, tw, 12);

  const surfGrad = ctx.createLinearGradient(lx, ty, lx, ty + geo.TABLE_H);
  surfGrad.addColorStop(0, '#9a6030');
  surfGrad.addColorStop(0.3, '#7d4d24');
  surfGrad.addColorStop(1, '#5c3a18');
  ctx.fillStyle = surfGrad;
  ctx.fillRect(lx, ty, tw, geo.TABLE_H);
  ctx.fillStyle = 'rgba(200,140,80,0.25)';
  ctx.fillRect(lx, ty, tw, 3);

  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  for (let g = lx + 18; g < lx + tw - 12; g += 24) {
    ctx.beginPath(); ctx.moveTo(g, ty + 2); ctx.lineTo(g + 9, ty + geo.TABLE_H - 2); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(100,116,139,0.7)';
  ctx.font = `9px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('bench ≈ 1 m', lx + legW + 26, ty + geo.TABLE_H + legH + 8);
}

// ── Stand & clamp ───────────────────────────────────────────────────────────

function drawStand() {
  if (!placed.stand) return;
  const bx = geo.STAND_BASE_X, by = geo.STAND_BASE_Y;
  const rodH = geo.standRodPx, rodW = 9;
  const slHeight = document.getElementById('sl-height');
  ctx.save();

  const baseW = 66, baseH = 12;
  const baseGrad = ctx.createLinearGradient(bx - baseW / 2, by - baseH, bx - baseW / 2, by);
  baseGrad.addColorStop(0, '#64748b'); baseGrad.addColorStop(1, '#2d3748');
  ctx.fillStyle = baseGrad;
  ctx.beginPath(); ctx.roundRect(bx - baseW / 2, by - baseH, baseW, baseH, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(bx - baseW / 2 + 4, by - baseH + 2, baseW - 8, 3);

  const rodGrad = ctx.createLinearGradient(bx - rodW / 2, 0, bx + rodW / 2, 0);
  rodGrad.addColorStop(0, '#94a3b8'); rodGrad.addColorStop(0.35, '#e2e8f0');
  rodGrad.addColorStop(0.6, '#94a3b8'); rodGrad.addColorStop(1, '#475569');
  ctx.fillStyle = rodGrad;
  ctx.fillRect(bx - rodW / 2, by - baseH - rodH, rodW, rodH);

  ctx.strokeStyle = 'rgba(200,210,230,0.35)'; ctx.lineWidth = 0.8;
  const mS = geo.PX_PER_M * 0.10;
  for (let my = by - baseH; my > by - baseH - rodH; my -= mS) {
    ctx.beginPath(); ctx.moveTo(bx - rodW / 2 - 3, my); ctx.lineTo(bx - rodW / 2, my); ctx.stroke();
  }
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(bx - rodW / 2 - 2, geo.standTopY, rodW + 4, 12);

  ctx.fillStyle = 'rgba(100,116,139,0.9)';
  ctx.font = `10px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`${slHeight.value} cm`, bx - rodW / 2 - 8, by - rodH / 2);
  ctx.restore();
}

function drawClamp() {
  if (!placed.clamp || !placed.stand) return;
  const slReach = document.getElementById('sl-reach');
  ctx.save();
  const cx = geo.STAND_BASE_X, cy = geo.clampY;
  const bhW = 18, bhH = 14;
  const bhGrad = ctx.createLinearGradient(cx - bhW / 2, cy, cx + bhW / 2, cy);
  bhGrad.addColorStop(0, '#78909c'); bhGrad.addColorStop(0.5, '#cfd8dc'); bhGrad.addColorStop(1, '#546e7a');
  ctx.fillStyle = bhGrad;
  ctx.beginPath(); ctx.roundRect(cx - bhW / 2, cy - bhH / 2, bhW, bhH, 4); ctx.fill();
  ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.arc(cx + bhW / 2 - 3, cy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#92610a'; ctx.lineWidth = 1; ctx.stroke();

  const armGrad = ctx.createLinearGradient(cx, cy - 3, cx, cy + 3);
  armGrad.addColorStop(0, '#94a3b8'); armGrad.addColorStop(0.4, '#e2e8f0'); armGrad.addColorStop(1, '#475569');
  ctx.fillStyle = armGrad;
  ctx.fillRect(cx + bhW / 2, cy - 3, geo.armLenPx - bhW / 2, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(cx + bhW / 2, cy - 2, geo.armLenPx - bhW / 2, 2);

  const headX = cx + geo.armLenPx, headY = cy;
  ctx.fillStyle = '#4a5568';
  ctx.beginPath(); ctx.roundRect(headX - 10, headY - 10, 20, 20, 4); ctx.fill();
  ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 1.5; ctx.stroke();
  for (const ang of [45, 135, 225, 315]) {
    const rad = ang * Math.PI / 180;
    const px = headX + Math.cos(rad) * 8, py = headY + Math.sin(rad) * 8;
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1e2433';
  ctx.beginPath(); ctx.arc(headX, headY, 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(100,116,139,0.8)';
  ctx.font = `9px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`reach: ${slReach.value} cm`, cx + bhW / 2 + 4, cy - 7);
  ctx.restore();

  if (placed.burette) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245,158,11,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(headX - 7, headY - 3); ctx.lineTo(headX + 7, headY - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headX - 7, headY + 3); ctx.lineTo(headX + 7, headY + 3); ctx.stroke();
    ctx.restore();
  }
}

// ── Burette ─────────────────────────────────────────────────────────────────

function drawBurette() {
  if (!placed.burette) return;
  const w = 18;
  const tubeTop    = geo.buretteTopY;
  const tubeBottom = geo.buretteBottomY;
  const tubeH      = tubeBottom - tubeTop;
  const fillFrac   = state.buretteFillCc / state.buretteCapacity;
  const liquidTop  = tubeBottom - tubeH * fillFrac;

  ctx.save();
  ctx.fillStyle  = 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.roundRect(geo.pivotX - w / 2, tubeTop, w, tubeH, 2); ctx.fill(); ctx.stroke();

  if (state.buretteFillCc > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(geo.pivotX - w / 2, tubeTop, w, tubeH); ctx.clip();
    ctx.fillStyle = COLOR_LIQUID_NEUTRAL;
    ctx.fillRect(geo.pivotX - w / 2, liquidTop, w, tubeBottom - liquidTop);

    const pouring    = !!(pourState.anim && pourState.anim._pouring);
    const rippleAmp  = pouring ? 1.4 : 0.4;
    const ripplePhase = performance.now() / 140;
    ctx.beginPath();
    for (let xx = geo.pivotX - w / 2; xx <= geo.pivotX + w / 2; xx += 2) {
      const yy = liquidTop + Math.sin(ripplePhase + xx * 0.6) * rippleAmp;
      if (xx === geo.pivotX - w / 2) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();

    if (pouring) {
      const pulse = (performance.now() / 260) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - pulse;
      ctx.strokeStyle = 'rgba(214,234,246,0.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(geo.pivotX, liquidTop, (w / 2) * (0.4 + pulse * 0.7), 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(geo.pivotX - w / 2 + 2, tubeTop, 3, tubeH);

  if (pourState.anim && pourState.anim._pouring) {
    ctx.save();
    ctx.fillStyle = 'rgba(74,222,128,0.92)';
    ctx.font = `bold 9px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`+${pourState.anim.pouredCc.toFixed(1)} cc`, geo.pivotX + w / 2 + 9, liquidTop - 6);
    ctx.restore();
  }

  ctx.strokeStyle = '#5b6b6f'; ctx.lineWidth = 1;
  ctx.font = `7px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = '#5b6b6f'; ctx.textAlign = 'left';
  const steps = state.buretteCapacity / 5;
  for (let i = 0; i <= steps; i++) {
    const y = tubeTop + tubeH * (i / steps);
    const labeled = i % 2 === 0;
    ctx.beginPath(); ctx.moveTo(geo.pivotX + w / 2 + 1, y); ctx.lineTo(geo.pivotX + w / 2 + (labeled ? 7 : 4), y); ctx.stroke();
    if (labeled) ctx.fillText(String(i * 5), geo.pivotX + w / 2 + 9, y + 2.5);
  }

  ctx.beginPath();
  ctx.moveTo(geo.pivotX - w / 2, tubeBottom); ctx.lineTo(geo.pivotX - 3, tubeBottom + 14);
  ctx.lineTo(geo.pivotX + 3, tubeBottom + 14); ctx.lineTo(geo.pivotX + w / 2, tubeBottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.fillStyle = '#cfd6d8'; ctx.strokeStyle = '#7a8488'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(geo.pivotX - 8, tubeBottom + 12, 16, 13, 3); ctx.fill(); ctx.stroke();

  const angle = state.valveFrac * 80;
  ctx.save();
  ctx.translate(geo.pivotX, tubeBottom + 18.5);
  ctx.rotate(angle * Math.PI / 180);
  ctx.fillStyle = '#c9a368'; ctx.strokeStyle = '#7a5e35'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(-13, -2.3, 26, 4.6, 2.3); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#9c7a45';
  ctx.beginPath(); ctx.arc(geo.pivotX, tubeBottom + 18.5, 2.6, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(geo.pivotX - 2.5, tubeBottom + 25); ctx.lineTo(geo.pivotX - 0.8, geo.buretteTipY);
  ctx.lineTo(geo.pivotX + 0.8, geo.buretteTipY); ctx.lineTo(geo.pivotX + 2.5, tubeBottom + 25);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1; ctx.stroke();

  ctx.restore();
}

// ── Funnel (mounted) ─────────────────────────────────────────────────────────

function drawFunnelMounted() {
  if (!placed.funnel || !placed.burette) return;
  const fx = geo.pivotX, fy = geo.buretteTopY;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(fx - 20, fy - 22); ctx.lineTo(fx + 20, fy - 22);
  ctx.lineTo(fx + 5, fy + 4);   ctx.lineTo(fx - 5, fy + 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(fx, fy - 22, 20, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(100,116,139,0.85)';
  ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillText('funnel', fx, fy - 30);
  ctx.restore();
}

// ── Conical flask ────────────────────────────────────────────────────────────

function drawFlask() {
  if (!placed.flask) return;
  const { x, y: baseY } = getFlaskPos();
  const bodyW = 64, neckW = 16, totalH = 92;
  const topY        = baseY - totalH;
  const neckTopY    = topY;
  const neckBottomY = topY + 26;
  const shoulderY   = neckBottomY + 14;

  const fillFrac  = Math.min(1, state.flaskTotalCc / 150);
  const liquidH   = (baseY - shoulderY + 10) * fillFrac;
  const liquidTopY = baseY - liquidH;
  const color     = flaskColor(state, currentIndicator());

  const { angle: shakeAngle, slosh } = getShakeState();

  ctx.save();

  const shW = bodyW * 0.6;
  const shGrad = ctx.createRadialGradient(x, baseY + 4, 0, x, baseY + 4, shW);
  shGrad.addColorStop(0, 'rgba(0,0,0,0.4)'); shGrad.addColorStop(1, 'transparent');
  ctx.save(); ctx.scale(1, 0.25); ctx.fillStyle = shGrad;
  ctx.beginPath(); ctx.arc(x, (baseY + 4) / 0.25, shW, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  ctx.translate(x, baseY);
  ctx.rotate(shakeAngle);
  ctx.translate(-x, -baseY);

  function flaskPath() {
    ctx.beginPath();
    ctx.moveTo(x - neckW / 2, neckTopY);
    ctx.lineTo(x + neckW / 2, neckTopY);
    ctx.lineTo(x + neckW / 2, neckBottomY);
    ctx.lineTo(x + bodyW / 2, baseY - 10);
    ctx.quadraticCurveTo(x + bodyW / 2, baseY, x, baseY + 4);
    ctx.quadraticCurveTo(x - bodyW / 2, baseY, x - bodyW / 2, baseY - 10);
    ctx.lineTo(x - neckW / 2, neckBottomY);
    ctx.closePath();
  }

  ctx.save();
  flaskPath(); ctx.clip();
  ctx.fillStyle = color;
  if (Math.abs(slosh) > 0.001) {
    const tiltPx = slosh * bodyW * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - bodyW / 2 - 2, liquidTopY + tiltPx);
    ctx.lineTo(x + bodyW / 2 + 2, liquidTopY - tiltPx);
    ctx.lineTo(x + bodyW / 2 + 2, baseY + 10);
    ctx.lineTo(x - bodyW / 2 - 2, baseY + 10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - bodyW / 2 - 2, liquidTopY + tiltPx);
    ctx.lineTo(x + bodyW / 2 + 2, liquidTopY - tiltPx);
    ctx.stroke();
  } else {
    ctx.fillRect(x - bodyW / 2 - 2, liquidTopY, bodyW + 4, baseY - liquidTopY + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - bodyW / 2 - 2, liquidTopY, bodyW + 4, 2);
  }
  ctx.restore();

  flaskPath();
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.save(); flaskPath(); ctx.clip();
  const sheen = ctx.createLinearGradient(x - bodyW / 2, 0, x + bodyW / 2, 0);
  sheen.addColorStop(0,    'rgba(255,255,255,0.03)');
  sheen.addColorStop(0.18, 'rgba(255,255,255,0.35)');
  sheen.addColorStop(0.32, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(1,    'rgba(255,255,255,0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x - bodyW / 2 - 2, topY, bodyW + 4, totalH + 10);
  ctx.restore();

  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(x, neckTopY, neckW / 2, 2.4, 0, 0, Math.PI * 2); ctx.stroke();

  if (state.flaskMounted) {
    ctx.strokeStyle = 'rgba(45,212,191,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, neckTopY - 10); ctx.lineTo(x, baseY + 8); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = 'rgba(100,116,139,0.85)';
  ctx.font = `9px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillText(`${state.flaskTotalCc.toFixed(1)} cc`, x, baseY + 16);

  ctx.restore();

  hitBoxes.flask = { x: x - bodyW / 2 - 6, y: topY - 6, w: bodyW + 12, h: totalH + 20, cx: x, topY: neckTopY };
}

// ── Flow visualisation ───────────────────────────────────────────────────────

function drawFlowVisualization() {
  if (!(state.valveOpen && state.valveFrac > 0 && state.buretteFillCc > 0)) return;

  const surfaceY = state.flaskMounted
    ? getFlaskPos().y - Math.min(1, state.flaskTotalCc / 150) * 70
    : geo.buretteTipY + 40;

  ctx.save();
  if (state.valveFrac < DRIP_THRESHOLD) {
    drops.forEach(d => {
      const stretch = Math.min(2.2, 1 + d.vy / 300);
      ctx.fillStyle = COLOR_LIQUID_NEUTRAL.replace(/[\d.]+\)$/, '0.65)');
      ctx.beginPath();
      ctx.ellipse(geo.pivotX, d.y, 2.1, 2.1 * stretch, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    const topW   = 1.4 + state.valveFrac * 3.2;
    const botW   = topW * 1.4;
    const wobble = Math.sin(performance.now() / 90) * (state.valveFrac * 1.2);
    ctx.fillStyle = 'rgba(214,234,246,0.42)';
    ctx.beginPath();
    ctx.moveTo(geo.pivotX - topW / 2, geo.buretteTipY);
    ctx.lineTo(geo.pivotX + topW / 2, geo.buretteTipY);
    ctx.quadraticCurveTo(geo.pivotX + botW / 2 + wobble, (geo.buretteTipY + surfaceY) / 2, geo.pivotX + botW / 2, surfaceY);
    ctx.lineTo(geo.pivotX - botW / 2, surfaceY);
    ctx.quadraticCurveTo(geo.pivotX - botW / 2 + wobble, (geo.buretteTipY + surfaceY) / 2, geo.pivotX - topW / 2, geo.buretteTipY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(geo.pivotX - topW * 0.15, geo.buretteTipY);
    ctx.lineTo(geo.pivotX - botW * 0.1,  surfaceY);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(214,234,246,0.3)'; ctx.lineWidth = 1;
  const splashR = 4 + Math.sin(performance.now() / 120) * 1.5;
  ctx.beginPath(); ctx.ellipse(geo.pivotX, surfaceY, splashR, splashR * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── Pour animation ───────────────────────────────────────────────────────────

function drawPourAnimation() {
  if (!pourState.anim) return;
  const p = pourState.anim;
  const tiltProgress = Math.min(1, p.elapsed / 0.5);

  const funnelX    = geo.pivotX;
  const buretteTop = geo.buretteTopY;

  // Beaker pivot: upper-left of funnel so at full tilt the lip hangs directly above the funnel mouth
  const bx = funnelX - 35;
  const by = buretteTop - 95;
  const w  = 52, h = 62;

  // Tilt: 12° upright lean → 105° near-inverted (opening faces down into funnel)
  const tiltAngle = (12 + tiltProgress * 93) * Math.PI / 180;
  const ca = Math.cos(tiltAngle), sa = Math.sin(tiltAngle);

  // Use a boosted-alpha version of the neutral liquid colour so the stream is clearly visible
  const streamColor = COLOR_LIQUID_NEUTRAL.replace(/[\d.]+\)$/, '0.75)');
  const liqFrac     = Math.max(0, p.beakerFrac);

  // ── Beaker body ──────────────────────────────────────────────────
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(tiltAngle);

  function beakerPath() {
    ctx.beginPath();
    ctx.moveTo(-w/2,     -h/2);
    ctx.lineTo( w/2,     -h/2);
    ctx.lineTo( w/2 - 5,  h/2);
    ctx.lineTo(-w/2 + 5,  h/2);
    ctx.closePath();
  }

  // Liquid inside beaker — shifts from base toward opening as beaker tilts
  if (liqFrac > 0) {
    ctx.save();
    beakerPath(); ctx.clip();
    const liquidH = h * liqFrac;
    const t       = Math.min(1, tiltProgress * 1.5);
    // Interpolate fill start: bottom of beaker → top (opening) as tilt increases
    const startY  = (h/2 - liquidH) * (1 - t) + (-h/2) * t;
    ctx.fillStyle = streamColor;
    ctx.fillRect(-w/2, startY, w, liquidH);
    // Surface highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-w/2, startY, w, 2.5);
    ctx.restore();
  }

  // Glass walls
  beakerPath();
  ctx.fillStyle   = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.5; ctx.stroke();

  // Thick rim at the opening
  ctx.beginPath();
  ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, -h/2);
  ctx.strokeStyle = 'rgba(200,228,242,0.85)'; ctx.lineWidth = 2.8; ctx.stroke();

  // Pouring spout notch (slight curve on right side of rim)
  ctx.beginPath();
  ctx.moveTo(w/2 - 7, -h/2 - 1);
  ctx.quadraticCurveTo(w/2 + 1, -h/2 - 4, w/2 + 4, -h/2 + 3);
  ctx.strokeStyle = 'rgba(200,228,242,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Left-edge glass sheen
  ctx.save(); beakerPath(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(-w/2 + 3, -h/2, 5, h);
  ctx.restore();

  // Volume graduation ticks
  ctx.strokeStyle = 'rgba(120,160,180,0.55)'; ctx.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    const gy = -h/2 + (h/4) * i;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 4, gy); ctx.lineTo(-w/2 + 4 + (i % 2 === 0 ? 11 : 7), gy); ctx.stroke();
  }

  // Chemical label (counter-rotated; hidden once beaker is near-inverted)
  if (tiltProgress < 0.65) {
    ctx.save();
    ctx.rotate(-tiltAngle);
    ctx.fillStyle = 'rgba(90,210,150,0.9)';
    ctx.font      = `bold 9px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
    ctx.fillText(currentTitrant().formula, 0, 4);
    ctx.restore();
  }

  ctx.restore(); // end beaker transform

  // ── Pour stream ──────────────────────────────────────────────────
  if (tiltProgress > 0.38 && liqFrac > 0.01) {
    const fade = Math.min(1, (tiltProgress - 0.38) / 0.28);

    // Lip world position: top-right corner of beaker in local coords (w/2, -h/2)
    const sx = bx + (w/2) * ca - (-h/2) * sa;
    const sy = by + (w/2) * sa + (-h/2) * ca;

    // Target: just inside the funnel mouth (or burette top if no funnel)
    const tx = funnelX;
    const ty = placed.funnel ? buretteTop - 16 : buretteTop + 2;

    const ddx = tx - sx, ddy = ty - sy;
    const len = Math.hypot(ddx, ddy) || 1;
    const nx  = -ddy / len, ny = ddx / len; // stream perpendicular normal
    const ang = Math.atan2(ddy, ddx);

    const topW   = 8, botW = 3;
    const wobble = Math.sin(performance.now() / 78) * 0.7;
    const cX     = (sx + tx) / 2 + wobble;
    const cY     = (sy + ty) / 2;

    ctx.save();
    ctx.globalAlpha = fade;

    // Stream body (tapered filled bezier strip)
    ctx.fillStyle = streamColor;
    ctx.beginPath();
    ctx.moveTo(sx - nx * topW/2,            sy - ny * topW/2);
    ctx.quadraticCurveTo(cX - nx * (topW + botW)/4, cY - ny * (topW + botW)/4,
                         tx - nx * botW/2,           ty - ny * botW/2);
    ctx.lineTo(tx + nx * botW/2,            ty + ny * botW/2);
    ctx.quadraticCurveTo(cX + nx * (topW + botW)/4, cY + ny * (topW + botW)/4,
                         sx + nx * topW/2,           sy + ny * topW/2);
    ctx.closePath(); ctx.fill();

    // Refraction highlight along leading edge
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(sx - nx * topW * 0.22, sy - ny * topW * 0.22);
    ctx.quadraticCurveTo(cX - nx * topW * 0.18, cY, tx - nx * botW * 0.2, ty);
    ctx.stroke();

    // Animated glints flowing down the stream
    const phase = (p.elapsed * 4.5) % 1;
    for (let k = 0; k < 5; k++) {
      const tk = (phase + k / 5) % 1;
      const gx = (1-tk)*(1-tk)*sx + 2*(1-tk)*tk*cX + tk*tk*tx;
      const gy = (1-tk)*(1-tk)*sy + 2*(1-tk)*tk*cY + tk*tk*ty;
      const gw = topW - (topW - botW) * tk;
      ctx.fillStyle = `rgba(255,255,255,${0.52 - tk * 0.44})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, gw * 0.22, gw * 0.56, ang, 0, Math.PI * 2);
      ctx.fill();
    }

    // Entry splash at funnel mouth
    const sT      = performance.now() / 68;
    const splashR = 4.5 + Math.sin(sT) * 2;
    ctx.fillStyle = streamColor.replace(/[\d.]+\)$/, '0.30)');
    ctx.beginPath();
    ctx.ellipse(tx, ty, splashR, splashR * 0.28, 0, 0, Math.PI * 2); ctx.fill();

    // Micro-droplets radiating from splash
    for (let m = 0; m < 4; m++) {
      const a  = sT * 0.38 + m * Math.PI * 0.5;
      const dr = splashR * 0.85;
      ctx.fillStyle = streamColor.replace(/[\d.]+\)$/, '0.20)');
      ctx.beginPath();
      ctx.arc(tx + Math.cos(a) * dr, ty + Math.sin(a) * dr * 0.28, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Loose items ──────────────────────────────────────────────────────────────

function drawLooseItems() {
  const ind = currentIndicator();
  Object.values(loose).forEach(item => {
    if (pourState.anim && item.id === pourState.anim.beakerLooseId) return;
    switch (item.type) {
      case 'pipette':     drawPipette(item); break;
      case 'dropper':     drawDropper(item); break;
      case 'beaker-hcl':  drawBeaker(item, currentAcid().formula,  '#5a9bb3', getLiquidColorFor('acid', ind)); break;
      case 'beaker-naoh': drawBeaker(item, currentBase().formula,   '#5fae71', getLiquidColorFor('base', ind)); break;
      case 'beaker-ind':  drawBeaker(item, 'Ind.',                 '#c93f72', getLiquidColorFor('indicator', ind)); break;
      case 'funnel':      if (!placed.funnel) drawFunnelLoose(item); break;
    }
  });
}

function drawBeaker(item, label, labelColor, liquidColor) {
  const { x, y } = item;
  const w = 46, h = 56;
  const topY = y - h, baseY = y;
  const liquidH    = h * Math.min(1, item.fillFrac);
  const liquidTopY = baseY - liquidH;

  ctx.save();
  ctx.translate(x, 0);

  ctx.save(); ctx.scale(1, 0.25);
  const shGrad = ctx.createRadialGradient(0, (baseY + 3) / 0.25, 0, 0, (baseY + 3) / 0.25, w * 0.55);
  shGrad.addColorStop(0, 'rgba(0,0,0,0.35)'); shGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shGrad; ctx.beginPath(); ctx.arc(0, (baseY + 3) / 0.25, w * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  function beakerPath() {
    ctx.beginPath();
    ctx.moveTo(-w / 2, topY); ctx.lineTo(w / 2, topY);
    ctx.lineTo(w / 2 - 4, baseY); ctx.lineTo(-w / 2 + 4, baseY);
    ctx.closePath();
  }
  ctx.save(); beakerPath(); ctx.clip();
  ctx.fillStyle = liquidColor;
  ctx.fillRect(-w / 2, liquidTopY, w, baseY - liquidTopY + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-w / 2, liquidTopY, w, 2);
  ctx.restore();

  beakerPath();
  ctx.fillStyle  = 'rgba(255,255,255,0.04)';
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2, topY); ctx.lineTo(-w / 2 - 4, topY - 5); ctx.lineTo(-w / 2 + 4, topY);
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.fillStyle = labelColor; ctx.globalAlpha = 0.9;
  ctx.fillRect(-w / 2 + 6, (topY + baseY) / 2 - 7, w - 12, 13);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.font = `bold 8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillText(label, 0, (topY + baseY) / 2 + 3);
  ctx.restore();

  item._hit = { x: x - w / 2 - 4, y: topY - 8, w: w + 8, h: h + 12 };
}

function drawPipette(item) {
  const { x, y } = item;
  const w = 14, h = 110, bulbR = 9;
  const tubeTop    = y - h + bulbR * 2 + 4;
  const tubeBottom = y - 8;
  const fillFrac   = item.fillCc / state.pipetteVolume;
  const liquidTop  = tubeBottom - (tubeBottom - tubeTop) * Math.min(1, fillFrac);

  ctx.save(); ctx.translate(x, 0);
  ctx.fillStyle  = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, y - h + bulbR, bulbR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-3.2, tubeTop, 6.4, tubeBottom - tubeTop); ctx.fill(); ctx.stroke();

  if (item.fillCc > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(-3.2, tubeTop, 6.4, tubeBottom - tubeTop); ctx.clip();
    ctx.fillStyle = getLiquidColorFor(item.source || 'base', currentIndicator());
    ctx.fillRect(-3.2, liquidTop, 6.4, tubeBottom - liquidTop);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-3.2, tubeBottom); ctx.lineTo(-0.6, y); ctx.lineTo(0.6, y); ctx.lineTo(3.2, tubeBottom);
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(100,116,139,0.85)';
  ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillText(`${state.pipetteVolume}cc`, 0, tubeTop - 6);
  ctx.fillText(`${item.fillCc.toFixed(1)}`, 0, y + 10);
  ctx.restore();

  item._hit = { x: x - 12, y: y - h - 4, w: 24, h: h + 24 };
}

function drawDropper(item) {
  const { x, y } = item;
  const h = 60, bulbR = 7;
  ctx.save(); ctx.translate(x, 0);
  ctx.fillStyle  = '#c75450'; ctx.strokeStyle = '#8f3a37'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(0, y - h + bulbR + 2, bulbR - 1, bulbR + 1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  const tubeTop    = y - h + bulbR * 2 + 2;
  const tubeBottom = y - 6;
  ctx.fillStyle  = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(-2.2, tubeTop, 4.4, tubeBottom - tubeTop); ctx.fill(); ctx.stroke();

  if (item.fillCc > 0) {
    ctx.fillStyle = getLiquidColorFor('indicator', currentIndicator());
    ctx.fillRect(-2.2, tubeBottom - (tubeBottom - tubeTop) * 0.4, 4.4, (tubeBottom - tubeTop) * 0.4);
  }
  ctx.beginPath();
  ctx.moveTo(-2.2, tubeBottom); ctx.lineTo(0, y); ctx.lineTo(2.2, tubeBottom);
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.stroke();
  ctx.restore();

  item._hit = { x: x - 10, y: y - h - 4, w: 20, h: h + 12 };
}

function drawFunnelLoose(item) {
  const { x, y } = item;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle  = 'rgba(255,255,255,0.08)'; ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-20, -22); ctx.lineTo(20, -22); ctx.lineTo(5, 4); ctx.lineTo(-5, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(100,116,139,0.85)';
  ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
  ctx.fillText('funnel', 0, -30);
  ctx.restore();

  item._hit = { x: x - 24, y: y - 30, w: 48, h: 38 };
}
