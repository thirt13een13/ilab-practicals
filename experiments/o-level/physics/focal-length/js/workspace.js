/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · workspace.js
   ─────────────────────────────────────────────────────────────
   Geometry · physics · master draw dispatcher · zoom/pan · loop
   Drawing functions live in js/components/2d/*.js
   Depends on: state.js
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════
   GEOMETRY
   ══════════════════════════════════════════════════════════ */
Lab.recalcGeometry = function () {
  const W = Lab.W, H = Lab.H;
  Lab.TABLE_W   = Math.min(W * 0.80, 720);
  Lab.TABLE_H   = 22;
  Lab.TABLE_X   = (W - Lab.TABLE_W) / 2;
  Lab.TABLE_TOP = H * 0.63;
  Lab.TABLE_LEG_H = H * 0.30;
  Lab.BENCH_Y   = Lab.TABLE_TOP;

  Lab.BENCH_X0     = Lab.TABLE_X + Lab.TABLE_W * 0.05;
  Lab.BENCH_X1     = Lab.TABLE_X + Lab.TABLE_W * 0.95;
  Lab.BENCH_LEN_PX = Lab.BENCH_X1 - Lab.BENCH_X0;
  Lab.CM_TO_PX     = Lab.BENCH_LEN_PX / 100;

  const rulerH    = 14;
  Lab.RULER_TOP_Y = Lab.BENCH_Y - 7 - rulerH;

  const availAbove = Lab.RULER_TOP_Y - Lab.CLEARANCE - 24;
  const scale      = Math.max(0.45, Math.min(1, availAbove / Lab.BOARD_H_BASE));
  Lab.BOARD_H = Lab.BOARD_H_BASE * scale;
  Lab.BOARD_W = Lab.BOARD_W_BASE * scale;
  Lab.LENS_H  = Lab.LENS_H_BASE  * scale;

  Lab.OPT_AXIS_Y = Lab.RULER_TOP_Y - Lab.CLEARANCE - Lab.BOARD_H / 2;
};

Lab.cmToPx = function (cm) {
  return Lab.BENCH_X0 + cm * Lab.CM_TO_PX;
};

Lab.getPositions = function () {
  const objX  = Lab.cmToPx(0);
  const lensX = Lab.cmToPx(Lab.u_cm);
  const scrX  = Lab.cmToPx(Lab.u_cm + Lab.v_cm);
  return { objX, lensX, scrX };
};

/* ══════════════════════════════════════════════════════════
   PHYSICS / CLARITY MODEL
   ══════════════════════════════════════════════════════════ */
Lab.idealV = function () {
  if (Lab.u_cm <= Lab.F_TRUE) return Infinity;
  return (Lab.u_cm * Lab.F_TRUE) / (Lab.u_cm - Lab.F_TRUE);
};

Lab.computeClarity = function () {
  const vI = Lab.idealV();
  if (!isFinite(vI) || vI <= 0) return 0;
  const diff  = Math.abs(Lab.v_cm - vI);
  const sigma = 2.0;
  return Math.exp(-(diff * diff) / (2 * sigma * sigma)) * 100;
};

Lab.calcF = function (u, v) {
  return (u * v) / (u + v);
};

/* ══════════════════════════════════════════════════════════
   MASTER DRAW  (2D canvas — skipped when viewMode==='3d')
   ══════════════════════════════════════════════════════════ */
Lab.draw = function () {
  const { ctx, W, H } = Lab;
  ctx.clearRect(0, 0, W, H);

  Lab.drawBg();            /* full-canvas grid — not zoomed          */
  Lab.drawGround();        /* fixed floor datum — never panned/zoomed */

  ctx.save();
  ctx.translate(Lab.panX, Lab.panY);
  ctx.scale(Lab.zoom, Lab.zoom);
  Lab.drawTable();         /* table zooms with everything else        */
  Lab.drawMetreRule();
  Lab.drawRays();
  Lab.drawObject();
  Lab.drawHolder();
  Lab.drawLens();
  Lab.drawScreen();
  ctx.restore();

  Lab.drawSideView();      /* floating overlay — not zoomed */
  Lab.circDraw();          /* separate canvas — unaffected  */
  Lab.updateMeterCards();
};

/* ══════════════════════════════════════════════════════════
   CANVAS ZOOM & PAN
   ══════════════════════════════════════════════════════════ */
Lab.initCanvasZoom = function () {
  let isDragging = false;
  let lastX = 0;

  /* panY is never free — always derived from zoom so the table base
     stays exactly on the fixed ground line: floorY = TABLE_TOP + TABLE_H + TABLE_LEG_H.
     Proof: canvasY(floorWorld) = panY + zoom*floorY = floorY*(1-zoom) + zoom*floorY = floorY ✓ */
  function pinToGround() {
    const floorY = Lab.TABLE_TOP + Lab.TABLE_H + Lab.TABLE_LEG_H;
    Lab.panY = floorY * (1 - Lab.zoom);
  }

  Lab.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect   = Lab.canvas.getBoundingClientRect();
    const mx     = (e.clientX - rect.left) * (Lab.W / rect.width);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.5, Math.min(6, Lab.zoom * factor));
    /* Zoom toward cursor X; Y is pinned to ground */
    Lab.panX = mx - (mx - Lab.panX) * (newZoom / Lab.zoom);
    Lab.zoom  = newZoom;
    pinToGround();
  }, { passive: false });

  Lab.canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isDragging = true;
    lastX = e.clientX;
    Lab.canvas.style.cursor = 'grabbing';
  });
  /* Horizontal pan only — vertical is fixed by pinToGround */
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    Lab.panX += e.clientX - lastX;
    lastX = e.clientX;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    Lab.canvas.style.cursor = '';
  });

  /* Double-click resets to default view */
  Lab.canvas.addEventListener('dblclick', () => {
    Lab.zoom = 1; Lab.panX = 0;
    pinToGround(); /* panY = floorY*(1-1) = 0 */
  });
};

/* ══════════════════════════════════════════════════════════
   ANIMATION LOOP
   ══════════════════════════════════════════════════════════ */
Lab.loop = function () {
  if (Lab.viewMode === '3d') {
    if (Lab.scene3d) Lab.scene3d.update();
  } else {
    Lab.draw();
  }
  requestAnimationFrame(Lab.loop);
};
