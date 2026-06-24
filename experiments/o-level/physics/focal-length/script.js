/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · script.js
   ─────────────────────────────────────────────────────────────
   Realistic biconvex lens rendering:
   • Standard two-arc lentil silhouette (sharp cusp top & bottom),
     the textbook symbol for a converging lens
   • Multi-layer glass appearance: body, internal gradient,
     specular highlight bar, chromatic edge fringe, rim ring
   • Lens holder: rod + ring, base resting just above the ruler
   • Light cone from bulb through object aperture
   • Three principal rays (parallel, centre, focal) with arrows
   • All optical centres (object cross-wire, lens, screen image)
     share one fixed OPT_AXIS_Y so everything lines up exactly,
     and u/v read directly off the metre rule (object fixed at
     the 0 cm mark, no hidden offsets)
   • Sharpness is judged purely by eye via a real blur effect on
     the projected image — no numeric "clarity" readout, just as
     in a real lab
   • 1/f = 1/u + 1/v
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Canvas refs ───────────────────────────────────────── */
  const canvas = document.getElementById('lab-canvas');
  const ctx    = canvas.getContext('2d');
  const wWrap  = document.getElementById('workspace');
  const cc     = document.getElementById('circuit-canvas');
  const cctx   = cc.getContext('2d');

  /* ── Experiment state ──────────────────────────────────── */
  let placed = {
    metrerule: false, object: false, holder: false,
    lens: false, screen: false, battery: false, bulb: false,
  };
  let assembled        = false;
  let circuitConnected = false;
  let viewMode          = 'front';
  let showRays          = true;   // toggled via the "Rays" header button

  /* ── Physics constants ─────────────────────────────────── */
  const F_TRUE = 15;   // true focal length (cm)
  let   u_cm   = 20;   // object distance  (cm)
  let   v_cm   = 40;   // screen position  (cm from lens)

  /* ── Layout (recalculated on resize) ───────────────────── */
  let W, H;
  let TABLE_TOP, TABLE_W, TABLE_X, TABLE_LEG_H, TABLE_H;
  let BENCH_Y, BENCH_X0, BENCH_X1, BENCH_LEN_PX, CM_TO_PX;
  let RULER_TOP_Y;     // top surface of the metre-rule strip
  let OPT_AXIS_Y;       // single shared optical-axis height for object/lens/screen centres

  /* Base component proportions (px) at full size; scaled down by
     recalcGeometry() on short viewports so nothing runs off-canvas. */
  const BOARD_H_BASE = 120;   // illuminated-object / screen board height
  const BOARD_W_BASE = 58;    // illuminated-object / screen board width
  const LENS_H_BASE  = 92;    // lens vertical extent (height of the biconvex disc)
  const CLEARANCE    = 10;    // gap between component base and top of ruler
  let BOARD_H = BOARD_H_BASE, BOARD_W = BOARD_W_BASE, LENS_H = LENS_H_BASE;

  /* ── DOM shortcuts ─────────────────────────────────────── */
  const slU         = document.getElementById('sl-u');
  const valU        = document.getElementById('val-u');
  const slV         = document.getElementById('sl-screen-v');
  const scVal       = document.getElementById('sc-val');
  const btnRecord   = document.getElementById('btn-record');
  const btnReset    = document.getElementById('btn-reset');
  const btnFront    = document.getElementById('btn-view-front');
  const btnSide     = document.getElementById('btn-view-side');
  const btnRays     = document.getElementById('btn-toggle-rays');
  const overlayEl   = document.getElementById('overlay-status');
  const expStatus   = document.getElementById('exp-status');
  const trialTbody  = document.getElementById('trial-tbody');
  const screenCtrl  = document.getElementById('screen-ctrl');

  /* ── Trial data ────────────────────────────────────────── */
  let trialData    = [];
  let currentTrial = 0;

  /* ══════════════════════════════════════════════════════════
     CIRCUIT
     ══════════════════════════════════════════════════════════ */
  let circBattery = false;
  let circBulb    = false;
  let circWires   = [];
  let wireStart   = null;
  let wiringMode  = false;

  const TERMINALS = {
    bat_pos:  { x: 52,  y: 55 },
    bat_neg:  { x: 52,  y: 85 },
    bulb_in:  { x: 196, y: 55 },
    bulb_out: { x: 196, y: 85 },
  };

  function circDraw() {
    const cw = cc.width, ch = cc.height;
    cctx.clearRect(0, 0, cw, ch);

    /* grid background */
    cctx.fillStyle = '#090b10';
    cctx.fillRect(0, 0, cw, ch);
    cctx.strokeStyle = 'rgba(37,43,59,0.5)';
    cctx.lineWidth = 0.5;
    for (let x = 0; x < cw; x += 16) {
      cctx.beginPath(); cctx.moveTo(x, 0); cctx.lineTo(x, ch); cctx.stroke();
    }
    for (let y = 0; y < ch; y += 16) {
      cctx.beginPath(); cctx.moveTo(0, y); cctx.lineTo(cw, y); cctx.stroke();
    }

    /* drawn wires */
    circWires.forEach(w => {
      cctx.strokeStyle = circuitConnected ? '#4ade80' : '#60a5fa';
      cctx.lineWidth   = 2.5;
      cctx.shadowColor = circuitConnected ? 'rgba(74,222,128,0.6)' : 'transparent';
      cctx.shadowBlur  = circuitConnected ? 6 : 0;
      cctx.beginPath();
      cctx.moveTo(w.x1, w.y1);
      const midY = w.y1 < 70 ? 18 : 122;
      cctx.lineTo(w.x1, midY);
      cctx.lineTo(w.x2, midY);
      cctx.lineTo(w.x2, w.y2);
      cctx.stroke();
      cctx.shadowBlur = 0;
    });

    /* ── Battery ── */
    if (circBattery) {
      const bx = 16, by = 30, bw = 52, bh = 80;
      /* case */
      const caseG = cctx.createLinearGradient(bx, by, bx + bw, by);
      caseG.addColorStop(0, '#1e2a3a');
      caseG.addColorStop(0.5, '#243347');
      caseG.addColorStop(1, '#1e2a3a');
      cctx.fillStyle = caseG;
      cctx.strokeStyle = '#f59e0b';
      cctx.lineWidth = 1.5;
      cctx.beginPath(); cctx.roundRect(bx, by, bw, bh, 5); cctx.fill(); cctx.stroke();
      /* cells */
      for (let i = 0; i < 4; i++) {
        cctx.fillStyle = i % 2 === 0 ? '#2e3f52' : '#1a2636';
        cctx.fillRect(bx + 5, by + 8 + i * 17, bw - 10, 14);
        cctx.strokeStyle = 'rgba(255,255,255,0.06)';
        cctx.lineWidth = 0.5;
        cctx.strokeRect(bx + 5, by + 8 + i * 17, bw - 10, 14);
      }
      /* top cap */
      cctx.fillStyle = '#374151';
      cctx.fillRect(bx + 14, by - 6, bw - 28, 8);
      /* label */
      cctx.fillStyle = 'rgba(245,158,11,0.7)';
      cctx.font = 'bold 9px IBM Plex Mono,monospace';
      cctx.textAlign = 'center';
      cctx.fillText('3 V', bx + bw / 2, by + bh + 11);
      /* terminals */
      [['bat_pos', '#f87171', '+'], ['bat_neg', '#60a5fa', '−']].forEach(([k, col, sym]) => {
        cctx.fillStyle = col;
        cctx.beginPath(); cctx.arc(TERMINALS[k].x, TERMINALS[k].y, 5, 0, Math.PI * 2); cctx.fill();
        cctx.fillStyle = '#f8fafc';
        cctx.font = 'bold 9px IBM Plex Mono,monospace';
        cctx.textAlign = 'center';
        cctx.fillText(sym, TERMINALS[k].x, TERMINALS[k].y + 3);
      });
    } else {
      cctx.strokeStyle = '#2e3650'; cctx.lineWidth = 1; cctx.setLineDash([3, 3]);
      cctx.strokeRect(16, 30, 52, 80); cctx.setLineDash([]);
      cctx.fillStyle = '#3d4a5f'; cctx.font = '9px IBM Plex Mono,monospace'; cctx.textAlign = 'center';
      cctx.fillText('BATTERY', 42, 73);
    }

    /* ── Bulb ── */
    if (circBulb) {
      const lit = circuitConnected;
      const lx = 168, ly = 28;
      /* glow */
      if (lit) {
        const gG = cctx.createRadialGradient(lx + 22, ly + 20, 2, lx + 22, ly + 20, 40);
        gG.addColorStop(0, 'rgba(253,224,71,0.55)');
        gG.addColorStop(1, 'transparent');
        cctx.fillStyle = gG; cctx.beginPath(); cctx.arc(lx + 22, ly + 20, 40, 0, Math.PI * 2); cctx.fill();
      }
      /* glass envelope */
      cctx.fillStyle = lit ? 'rgba(253,224,71,0.82)' : 'rgba(55,65,81,0.9)';
      cctx.strokeStyle = lit ? '#f59e0b' : '#4b5563';
      cctx.lineWidth = 1.5;
      cctx.beginPath();
      cctx.arc(lx + 22, ly + 18, 18, Math.PI, 0, false);
      cctx.lineTo(lx + 40, ly + 38);
      cctx.lineTo(lx + 4, ly + 38);
      cctx.closePath();
      cctx.fill(); cctx.stroke();
      /* filament */
      if (lit) {
        cctx.strokeStyle = '#fff7ed'; cctx.lineWidth = 1.2;
        cctx.beginPath();
        cctx.moveTo(lx + 16, ly + 18);
        for (let i = 0; i < 5; i++) {
          cctx.quadraticCurveTo(lx + 19 + i * 3, ly + 13 - (i % 2) * 5, lx + 22 + i * 3, ly + 18);
        }
        cctx.stroke();
      }
      /* base */
      cctx.fillStyle = '#9ca3af';
      cctx.beginPath(); cctx.roundRect(lx + 10, ly + 38, 24, 10, 2); cctx.fill();
      cctx.fillStyle = '#6b7280';
      cctx.beginPath(); cctx.roundRect(lx + 13, ly + 48, 18, 6, 1); cctx.fill();
      /* terminals */
      [['bulb_in', '#f87171'], ['bulb_out', '#60a5fa']].forEach(([k, col]) => {
        cctx.fillStyle = col;
        cctx.beginPath(); cctx.arc(TERMINALS[k].x, TERMINALS[k].y, 5, 0, Math.PI * 2); cctx.fill();
      });
      cctx.fillStyle = '#94a3b8'; cctx.font = '7px IBM Plex Mono,monospace'; cctx.textAlign = 'center';
      cctx.fillText('BULB', lx + 22, ly + 62);
    } else {
      cctx.strokeStyle = '#2e3650'; cctx.lineWidth = 1; cctx.setLineDash([3, 3]);
      cctx.strokeRect(162, 28, 62, 70); cctx.setLineDash([]);
      cctx.fillStyle = '#3d4a5f'; cctx.font = '9px IBM Plex Mono,monospace'; cctx.textAlign = 'center';
      cctx.fillText('BULB', 193, 66);
    }

    /* hint text */
    if (!circuitConnected && circBattery && circBulb && circWires.length === 0) {
      cctx.fillStyle = 'rgba(245,158,11,0.6)';
      cctx.font = '8px IBM Plex Mono,monospace'; cctx.textAlign = 'center';
      cctx.fillText('Click + terminal → click bulb terminal', cw / 2, 130);
    }
  }

  function checkCircuit() {
    const hasTop = circWires.some(w =>
      (w.t1 === 'bat_pos' && w.t2 === 'bulb_in') ||
      (w.t1 === 'bulb_in' && w.t2 === 'bat_pos'));
    const hasBot = circWires.some(w =>
      (w.t1 === 'bat_neg' && w.t2 === 'bulb_out') ||
      (w.t1 === 'bulb_out' && w.t2 === 'bat_neg'));
    circuitConnected = hasTop && hasBot;
    placed.battery = circBattery;
    placed.bulb    = circBulb;
    updateAssemblyDots();
    circDraw();
  }

  function terminalAt(x, y) {
    for (const [name, pos] of Object.entries(TERMINALS)) {
      if (Math.hypot(x - pos.x, y - pos.y) < 10) return { name, ...pos };
    }
    return null;
  }

  cc.addEventListener('click', e => {
    if (!circBattery || !circBulb) return;
    const rect = cc.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (cc.width / rect.width);
    const y = (e.clientY - rect.top)  * (cc.height / rect.height);
    const t = terminalAt(x, y);
    if (!t) return;
    if (!wireStart) {
      wireStart  = { x: t.x, y: t.y, terminal: t.name };
      wiringMode = true;
      document.getElementById('circuit-hint').textContent = 'Now click the other terminal to complete the wire.';
    } else {
      if (t.name !== wireStart.terminal) {
        circWires.push({ x1: wireStart.x, y1: wireStart.y, x2: t.x, y2: t.y, t1: wireStart.terminal, t2: t.name });
        checkCircuit();
        if (circuitConnected) {
          document.getElementById('circuit-hint').textContent = '✅ Circuit complete — bulb is powered!';
          setStatus('💡 Light source connected! Continue assembling the optical bench.', 'ok');
        }
      }
      wireStart = null; wiringMode = false;
    }
  });

  /* ══════════════════════════════════════════════════════════
     GEOMETRY
     ══════════════════════════════════════════════════════════ */
  function recalcGeometry() {
    TABLE_W     = Math.min(W * 0.80, 720);
    TABLE_H     = 22;
    TABLE_X     = (W - TABLE_W) / 2;
    TABLE_TOP   = H * 0.63;
    TABLE_LEG_H = H * 0.30;
    BENCH_Y     = TABLE_TOP;

    BENCH_X0     = TABLE_X + TABLE_W * 0.05;
    BENCH_X1     = TABLE_X + TABLE_W * 0.95;
    BENCH_LEN_PX = BENCH_X1 - BENCH_X0;
    CM_TO_PX     = BENCH_LEN_PX / 100;

    /* Ruler sits directly on the table surface; its top edge is where
       all apparatus bases rest (clamped immediately above it).        */
    const rulerH = 14;
    RULER_TOP_Y  = BENCH_Y - 7 - rulerH;     // -7 matches drawMetreRule()'s y offset

    /* Scale component heights down on short viewports so the object/
       screen boards and lens never run off the top of the canvas.    */
    const availAbove = RULER_TOP_Y - CLEARANCE - 24;   // 24px margin reserved at top
    const scale = Math.max(0.45, Math.min(1, availAbove / BOARD_H_BASE));
    BOARD_H = BOARD_H_BASE * scale;
    BOARD_W = BOARD_W_BASE * scale;
    LENS_H  = LENS_H_BASE  * scale;

    /* Shared optical axis: every component's centre-line (cross-wire
       centre, lens centre, screen-image centre) sits at this exact Y
       so the system is properly aligned, just above the ruler.       */
    OPT_AXIS_Y = RULER_TOP_Y - CLEARANCE - BOARD_H / 2;
  }

  function cmToPx(cm) { return BENCH_X0 + cm * CM_TO_PX; }

  function getPositions() {
    const objX  = cmToPx(0);
    const lensX = cmToPx(u_cm);
    const scrX  = cmToPx(u_cm + v_cm);
    return { objX, lensX, scrX };
  }

  /* ══════════════════════════════════════════════════════════
     PHYSICS / CLARITY MODEL
     ══════════════════════════════════════════════════════════ */
  function idealV() {
    if (u_cm <= F_TRUE) return Infinity;
    return (u_cm * F_TRUE) / (u_cm - F_TRUE);
  }

  function computeClarity() {
    const vI = idealV();
    if (!isFinite(vI) || vI <= 0) return 0;
    const diff  = Math.abs(v_cm - vI);
    const sigma = 2.0;   // cm — sharpness peak width
    return Math.exp(-(diff * diff) / (2 * sigma * sigma)) * 100;
  }

  function calcF(u, v) {
    return (u * v) / (u + v);
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — BACKGROUND
     ══════════════════════════════════════════════════════════ */
  function drawBg() {
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
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — TABLE
     ══════════════════════════════════════════════════════════ */
  function drawTable() {
    const lx = TABLE_X, ty = TABLE_TOP, tw = TABLE_W;
    const legH = TABLE_LEG_H, legW = 18;

    /* legs */
    const legG = ctx.createLinearGradient(0, ty + TABLE_H, 0, ty + TABLE_H + legH);
    legG.addColorStop(0, '#5c3d1a'); legG.addColorStop(1, '#2e1e0c');
    for (const lp of [lx + 28, lx + tw - 28 - legW]) {
      ctx.fillStyle = legG; ctx.fillRect(lp, ty + TABLE_H, legW, legH);
      /* wood grain */
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.8;
      for (let g = 0; g < legH; g += 20) {
        ctx.beginPath(); ctx.moveTo(lp + 3, ty + TABLE_H + g); ctx.lineTo(lp + legW - 3, ty + TABLE_H + g + 16); ctx.stroke();
      }
      /* foot */
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(lp - 4, ty + TABLE_H + legH - 7, legW + 8, 10, 2); ctx.fill();
    }

    /* apron rail */
    ctx.fillStyle = '#6b3f18';
    ctx.fillRect(lx, ty + TABLE_H, tw, 12);

    /* surface */
    const sg = ctx.createLinearGradient(lx, ty, lx, ty + TABLE_H);
    sg.addColorStop(0, '#a06535'); sg.addColorStop(0.35, '#7d4d24'); sg.addColorStop(1, '#5c3a18');
    ctx.fillStyle = sg; ctx.fillRect(lx, ty, tw, TABLE_H);

    /* surface sheen */
    ctx.fillStyle = 'rgba(220,160,90,0.20)'; ctx.fillRect(lx, ty, tw, 4);

    /* wood grain lines on top */
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 0.7;
    for (let g = lx + 20; g < lx + tw - 10; g += 24) {
      ctx.beginPath(); ctx.moveTo(g, ty + 2); ctx.lineTo(g + 10, ty + TABLE_H - 2); ctx.stroke();
    }

    /* front edge highlight */
    ctx.strokeStyle = 'rgba(160,100,50,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, ty + TABLE_H); ctx.lineTo(lx + tw, ty + TABLE_H); ctx.stroke();
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — METRE RULE
     ══════════════════════════════════════════════════════════ */
  function drawMetreRule() {
    if (!placed.metrerule) return;
    const y = BENCH_Y - 7, h = 14;

    /* body */
    const rg = ctx.createLinearGradient(BENCH_X0, y, BENCH_X0, y + h);
    rg.addColorStop(0, '#fde68a'); rg.addColorStop(0.45, '#f59e0b'); rg.addColorStop(1, '#92610a');
    ctx.fillStyle = rg; ctx.fillRect(BENCH_X0, y, BENCH_LEN_PX, h);

    /* graduations */
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.8;
    for (let cm = 0; cm <= 100; cm++) {
      const x = cmToPx(cm);
      const tH = cm % 10 === 0 ? h : cm % 5 === 0 ? h * 0.65 : h * 0.38;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tH); ctx.stroke();
      if (cm % 10 === 0) {
        ctx.fillStyle = '#451a03'; ctx.font = `7px IBM Plex Mono,monospace`;
        ctx.textAlign = 'center'; ctx.fillText(cm, x, y + h + 9);
      }
    }

    /* border */
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
    ctx.strokeRect(BENCH_X0, y, BENCH_LEN_PX, h);
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — ILLUMINATED OBJECT BOARD
     ══════════════════════════════════════════════════════════ */
  function drawObject() {
    if (!placed.object) return;
    const { objX } = getPositions();
    const bW = BOARD_W, bH = BOARD_H;
    const cx = objX, cy = OPT_AXIS_Y;
    const bTop = cy - bH / 2;
    const bBot = cy + bH / 2;

    /* ── bulb behind board (if lit) ── */
    if (circuitConnected) {
      /* warm light cone spreading rightward from bulb, centred on axis */
      const bulbX = objX - bW / 2 - 24, bulbY = cy;
      const coneG = ctx.createRadialGradient(bulbX, bulbY, 2, bulbX, bulbY, bW * 2.5);
      coneG.addColorStop(0, 'rgba(253,220,60,0.35)');
      coneG.addColorStop(0.5, 'rgba(253,200,50,0.10)');
      coneG.addColorStop(1, 'transparent');
      ctx.fillStyle = coneG;
      ctx.beginPath(); ctx.arc(bulbX, bulbY, bW * 2.5, 0, Math.PI * 2); ctx.fill();

      /* bulb body */
      const bG = ctx.createRadialGradient(bulbX - 2, bulbY - 4, 1, bulbX, bulbY, 10);
      bG.addColorStop(0, '#fff9c4'); bG.addColorStop(0.4, '#fde047'); bG.addColorStop(1, '#f59e0b');
      ctx.fillStyle = bG;
      ctx.beginPath(); ctx.arc(bulbX, bulbY - 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1;
      ctx.stroke();
      /* bulb base */
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath(); ctx.roundRect(bulbX - 4, bulbY + 7, 8, 7, 1); ctx.fill();
      /* wire to board */
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bulbX + 9, bulbY); ctx.lineTo(objX - bW / 2, cy); ctx.stroke();
    }

    /* ── support post: base rests immediately above ruler, never covering it ── */
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 3, bBot, 6, RULER_TOP_Y - bBot);
    /* small foot/clip where post meets the board */
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.roundRect(cx - 9, bBot - 3, 18, 7, 2); ctx.fill();

    /* ── board body ── */
    const boardG = ctx.createLinearGradient(objX - bW / 2, bTop, objX + bW / 2, bTop);
    boardG.addColorStop(0, '#1c2840');
    boardG.addColorStop(0.5, '#222e48');
    boardG.addColorStop(1, '#1c2840');
    ctx.fillStyle = boardG;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(objX - bW / 2, bTop, bW, bH, 4); ctx.fill(); ctx.stroke();

    /* board highlight edge */
    ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(objX - bW / 2 + 2, bTop + 2); ctx.lineTo(objX + bW / 2 - 2, bTop + 2); ctx.stroke();

    /* ── aperture hole, centred exactly on the optical axis ── */
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

    /* ── cross-wire inside hole, centred on (cx, cy) = optical axis ── */
    const wireCol = circuitConnected ? '#1e1a05' : '#4b5563';
    ctx.strokeStyle = wireCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - holeR + 2, cy); ctx.lineTo(cx + holeR - 2, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - holeR + 2); ctx.lineTo(cx, cy + holeR - 2); ctx.stroke();

    /* tiny crosshair dot at the very centre for clarity */
    ctx.fillStyle = wireCol;
    ctx.beginPath(); ctx.arc(cx, cy, 1.3, 0, Math.PI * 2); ctx.fill();

    /* zero-mark indicator: dashed vertical line down to the ruler's 0 cm tick */
    ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, bBot); ctx.lineTo(cx, RULER_TOP_Y); ctx.stroke();
    ctx.setLineDash([]);

    /* label */
    ctx.fillStyle = 'rgba(245,158,11,0.80)'; ctx.font = `9px IBM Plex Mono,monospace`;
    ctx.textAlign = 'center'; ctx.fillText('Object (0 cm)', cx, bTop - 7);
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — LENS HOLDER  (optical rider on rod)
     ══════════════════════════════════════════════════════════ */
  function drawHolder() {
    if (!placed.holder) return;
    const { lensX, objX } = getPositions();
    const ringCy = OPT_AXIS_Y;
    const ringR  = LENS_H / 2 + 6;   // ring wraps just outside the lens disc

    ctx.save();

    /* ── vertical rod: runs from just above the ruler up to the ring ── */
    const rodW = 8;
    const rodBottom = RULER_TOP_Y;
    const rodTop    = ringCy - 2;     // rod meets the ring near its base
    const rodG = ctx.createLinearGradient(lensX - rodW / 2, 0, lensX + rodW / 2, 0);
    rodG.addColorStop(0, '#475569'); rodG.addColorStop(0.3, '#94a3b8');
    rodG.addColorStop(0.7, '#64748b'); rodG.addColorStop(1, '#334155');
    ctx.fillStyle = rodG;
    ctx.fillRect(lensX - rodW / 2, rodTop, rodW, rodBottom - rodTop);

    /* rod thread marks */
    ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 0.7;
    for (let ty2 = rodTop + 4; ty2 < rodBottom; ty2 += 5) {
      ctx.beginPath(); ctx.moveTo(lensX - rodW / 2, ty2); ctx.lineTo(lensX + rodW / 2, ty2); ctx.stroke();
    }

    /* ── small foot/base clip where rod meets the ruler ── */
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.roundRect(lensX - 9, rodBottom - 3, 18, 7, 2); ctx.fill();

    /* ── ring that grips the lens, centred on the optical axis ── */
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(lensX, ringCy, ringR, 0, Math.PI * 2); ctx.stroke();
    /* ring sheen */
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lensX, ringCy, ringR - 1, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
    /* retention screws at 3 o'clock and 9 o'clock */
    for (const ang of [0, Math.PI]) {
      const sx = lensX + Math.cos(ang) * (ringR + 5);
      const sy = ringCy + Math.sin(ang) * (ringR + 5);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.lineTo(sx + 2.5, sy); ctx.stroke();
    }

    /* u-distance dashed line + arrow, drawn at the ruler's reading height */
    const dimY = RULER_TOP_Y - 4;
    ctx.strokeStyle = 'rgba(96,165,250,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(objX, dimY); ctx.lineTo(lensX, dimY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(96,165,250,0.6)';
    ctx.beginPath(); ctx.moveTo(lensX, dimY); ctx.lineTo(lensX - 5, dimY - 3); ctx.lineTo(lensX - 5, dimY + 3); ctx.fill();

    /* u label, positioned above the ring */
    ctx.fillStyle = 'rgba(96,165,250,0.85)'; ctx.font = `bold 9px IBM Plex Mono,monospace`;
    ctx.textAlign = 'center'; ctx.fillText(`u = ${u_cm} cm`, lensX, ringCy - ringR - 10);

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — REALISTIC BICONVEX LENS
     ══════════════════════════════════════════════════════════ */
  function buildLensPath(cx, cy, lH, lW) {
    /* Two circular-arc approach:
       Each face is an arc of a circle whose radius R satisfies
         the sagitta  s = lW/2  for a chord of length lH.
       R = (s² + (lH/2)²) / (2s)  with s = lW/2

       IMPORTANT: canvas arc() sweeps from startAngle to endAngle going
       clockwise when anticlockwise=false, and counter-clockwise when
       anticlockwise=true — but it always takes that direction's full
       distance (it does NOT automatically pick the "short way"). Both
       arcs below must be told to take the SHORT way through angle 0,
       using the SAME flag, or one of them balloons around through
       angle π and the lens stops being a mirror image of itself.   */
    const s  = lW / 2;
    const hH = lH / 2;
    const R  = (s * s + hH * hH) / (2 * s);
    /* centres of curvature */
    const clx = cx - R + s;   // left-face circle centre (x)
    const crx = cx + R - s;   // right-face circle centre (x)
    const aL  = Math.asin(hH / R);

    ctx.beginPath();
    /* left arc: circle centred at crx (to the RIGHT of the lens).
       Sweeps clockwise from the bottom cusp (π−aL) to the top cusp
       (π+aL), bulging left — this is the lens's left face.          */
    ctx.arc(crx, cy, R, Math.PI - aL, Math.PI + aL, false);
    /* right arc: circle centred at clx (to the LEFT of the lens).
       Continues from the top cusp (−aL) to the bottom cusp (aL),
       sweeping clockwise through angle 0 so it bulges RIGHT — the
       exact mirror image of the left arc, closing the path back at
       the bottom cusp where the left arc began.                     */
    ctx.arc(clx, cy, R, -aL, aL, false);
    ctx.closePath();
  }

  function drawLens() {
    if (!placed.lens || !placed.holder) return;
    const { lensX } = getPositions();
    const lH = LENS_H;        // lens height (px) — matches holder ring sizing
    const lW = lH * 0.30;      // standard double-convex proportion (slender lentil)
    const cy = OPT_AXIS_Y;     // exact optical-axis centre, shared with object/screen

    ctx.save();

    /* ── 1. Ambient glass body (slightly blueish transparency) ── */
    buildLensPath(lensX, cy, lH, lW);
    ctx.clip();   /* clip everything to lens silhouette */

    /* base glass fill */
    const bodyG = ctx.createLinearGradient(lensX - lW, cy - lH / 2, lensX + lW, cy + lH / 2);
    bodyG.addColorStop(0,    'rgba(180,210,255,0.12)');
    bodyG.addColorStop(0.35, 'rgba(200,225,255,0.30)');
    bodyG.addColorStop(0.50, 'rgba(210,235,255,0.42)');
    bodyG.addColorStop(0.65, 'rgba(200,225,255,0.30)');
    bodyG.addColorStop(1,    'rgba(180,210,255,0.12)');
    ctx.fillStyle = bodyG;
    ctx.fillRect(lensX - lW - 2, cy - lH / 2 - 2, lW * 2 + 4, lH + 4);

    /* internal refraction colour band (pale rainbow) */
    const refG = ctx.createLinearGradient(lensX - lW, cy, lensX + lW, cy);
    refG.addColorStop(0,    'rgba(255,80,80,0.04)');
    refG.addColorStop(0.25, 'rgba(255,220,60,0.06)');
    refG.addColorStop(0.50, 'rgba(80,200,120,0.07)');
    refG.addColorStop(0.75, 'rgba(60,150,255,0.06)');
    refG.addColorStop(1,    'rgba(160,80,255,0.04)');
    ctx.fillStyle = refG;
    ctx.fillRect(lensX - lW - 2, cy - lH / 2 - 2, lW * 2 + 4, lH + 4);

    /* vertical specular streak (bright bar down the centre) */
    const specG = ctx.createLinearGradient(lensX - lW * 0.5, cy, lensX + lW * 0.5, cy);
    specG.addColorStop(0,    'transparent');
    specG.addColorStop(0.35, 'rgba(255,255,255,0.10)');
    specG.addColorStop(0.48, 'rgba(255,255,255,0.55)');
    specG.addColorStop(0.52, 'rgba(255,255,255,0.55)');
    specG.addColorStop(0.65, 'rgba(255,255,255,0.10)');
    specG.addColorStop(1,    'transparent');
    ctx.fillStyle = specG;
    ctx.fillRect(lensX - lW, cy - lH / 2, lW * 2, lH);

    /* top-left glint (circular highlight) */
    const glintG = ctx.createRadialGradient(lensX - lW * 0.2, cy - lH * 0.28, 0, lensX - lW * 0.2, cy - lH * 0.28, lW * 0.9);
    glintG.addColorStop(0, 'rgba(255,255,255,0.50)');
    glintG.addColorStop(1, 'transparent');
    ctx.fillStyle = glintG;
    ctx.fillRect(lensX - lW, cy - lH / 2, lW * 2, lH);

    ctx.restore();   /* end clip */

    /* ── 2. Lens outline (two arcs) — drawn OUTSIDE clip ── */
    ctx.save();
    buildLensPath(lensX, cy, lH, lW);

    /* subtle chromatic fringe on rim */
    ctx.strokeStyle = 'rgba(96,180,255,0.45)';
    ctx.lineWidth   = 3.5;
    ctx.stroke();
    /* clean white rim */
    buildLensPath(lensX, cy, lH, lW);
    ctx.strokeStyle = 'rgba(200,230,255,0.80)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    /* ── 3. Cusp points top & bottom — the hallmark of the standard
            theoretical biconvex symbol (sharp meeting of both arcs) ── */
    ctx.fillStyle = 'rgba(220,235,255,0.9)';
    ctx.beginPath(); ctx.arc(lensX, cy - lH / 2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lensX, cy + lH / 2, 1.6, 0, Math.PI * 2); ctx.fill();

    /* ── 4. Optical axis, drawn the full bench length ── */
    ctx.strokeStyle = 'rgba(96,165,250,0.22)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(BENCH_X0, cy); ctx.lineTo(BENCH_X1, cy); ctx.stroke();
    ctx.setLineDash([]);

    /* ── 5. Focal-length tick marks directly ON the axis ── */
    const f1x = lensX - F_TRUE * CM_TO_PX;
    const f2x = lensX + F_TRUE * CM_TO_PX;
    [f1x, f2x].forEach(fx => {
      if (fx < BENCH_X0 || fx > BENCH_X1) return;
      ctx.fillStyle = 'rgba(167,139,250,0.70)';
      ctx.beginPath(); ctx.arc(fx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(167,139,250,0.75)';
      ctx.font = `bold 9px IBM Plex Mono,monospace`; ctx.textAlign = 'center';
      ctx.fillText('F', fx, cy + 16);
    });

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — WHITE SCREEN
     ══════════════════════════════════════════════════════════ */
  function drawScreen() {
    if (!placed.screen) return;
    const { scrX, lensX } = getPositions();
    const scW = BOARD_W, scH = BOARD_H;
    const cy  = OPT_AXIS_Y;
    const sTop = cy - scH / 2;
    const sBot = cy + scH / 2;
    const isInBounds = scrX > lensX + 10 && scrX < BENCH_X1 - 12;
    const clarity = computeClarity();   // drives the visual blur only — no numeric HUD

    /* ── support post: base rests immediately above ruler ── */
    ctx.fillStyle = '#334155';
    ctx.fillRect(scrX - 3, sBot, 6, RULER_TOP_Y - sBot);
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.roundRect(scrX - 9, sBot - 3, 18, 7, 2); ctx.fill();

    /* screen face */
    const scG = ctx.createLinearGradient(scrX - scW / 2, sTop, scrX + scW / 2, sTop);
    scG.addColorStop(0, '#cbd5e1');
    scG.addColorStop(0.5, '#f1f5f9');
    scG.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = scG;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(scrX - scW / 2, sTop, scW, scH, 3); ctx.fill(); ctx.stroke();

    /* matte texture gradient */
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath(); ctx.roundRect(scrX - scW / 2, sTop, scW, scH, 3); ctx.fill();

    /* zero-reference dashed line down to ruler (mirrors the object's) */
    ctx.strokeStyle = 'rgba(45,212,191,0.30)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(scrX, sBot); ctx.lineTo(scrX, RULER_TOP_Y); ctx.stroke();
    ctx.setLineDash([]);

    /* ── projected image — centred exactly on the optical axis ── */
    if (isInBounds && circuitConnected && placed.lens && placed.object) {
      const imgSize = 17;              // image size is roughly constant (object is small & on-axis)
      const icx = scrX, icy = cy;      // <- same Y as object cross & lens centre

      ctx.save();
      /* blur filter scales with how far off the true focus we are —
         this is the ONLY sharpness feedback; the user judges it visually,
         exactly as they would when sliding a real screen back and forth. */
      const blurPx = (1 - clarity / 100) * 9;
      if (blurPx > 0.3) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;

      /* soft glow halo (brighter & tighter when sharp) */
      const haloG = ctx.createRadialGradient(icx, icy, 0, icx, icy, imgSize + 14);
      haloG.addColorStop(0, `rgba(253,224,71,${0.25 + 0.55 * clarity / 100})`);
      haloG.addColorStop(1, 'transparent');
      ctx.fillStyle = haloG;
      ctx.beginPath(); ctx.arc(icx, icy, imgSize + 14, 0, Math.PI * 2); ctx.fill();

      /* inverted, real cross-wire image (yellow on white screen) */
      ctx.strokeStyle = `rgba(217,119,6,${0.55 + 0.45 * clarity / 100})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(icx - imgSize, icy); ctx.lineTo(icx + imgSize, icy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx, icy - imgSize); ctx.lineTo(icx, icy + imgSize); ctx.stroke();

      ctx.filter = 'none';
      ctx.restore();
    }

    /* v distance label & dashed dimension line at ruler-reading height */
    const dimY = RULER_TOP_Y - 4;
    ctx.fillStyle = 'rgba(45,212,191,0.85)'; ctx.font = `9px IBM Plex Mono,monospace`;
    ctx.textAlign = 'center'; ctx.fillText(`v = ${v_cm.toFixed(1)} cm`, scrX, sTop - 7);

    ctx.strokeStyle = 'rgba(45,212,191,0.30)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(lensX, dimY); ctx.lineTo(scrX, dimY); ctx.stroke();
    ctx.setLineDash([]);

    /* arrowhead at screen end */
    ctx.fillStyle = 'rgba(45,212,191,0.60)';
    ctx.beginPath(); ctx.moveTo(scrX, dimY); ctx.lineTo(scrX + 5, dimY - 3); ctx.lineTo(scrX + 5, dimY + 3); ctx.fill();
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — PRINCIPAL RAYS
     ══════════════════════════════════════════════════════════ */
  function drawRays() {
    if (!showRays) return;
    if (!assembled || !circuitConnected) return;
    const { objX, lensX, scrX } = getPositions();
    const axisY = OPT_AXIS_Y;          /* shared centre: object cross, lens, screen image */
    const rayOffset = 13;               /* vertical offset of the off-axis ray-launch point
                                            (a point near the tip of the cross-wire's upper/lower arm) */

    if (u_cm <= F_TRUE) return;   /* virtual image — skip rays */

    const vIdeal = idealV();

    ctx.save();

    /* helper to draw a small arrowhead at (x,y) pointing in direction (dx,dy) */
    function arrowHead(x, y, dx, dy, size = 5) {
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

    /* x-position where the ideal (sharp-focus) image forms */
    const vPx     = vIdeal * CM_TO_PX;
    const scrImgX = lensX + vPx;

    /* ── Ray 1: parallel to axis → refracted through F₂ ── */
    const f2x = lensX + F_TRUE * CM_TO_PX;
    ctx.strokeStyle = 'rgba(253,224,71,0.70)'; ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(objX, axisY - rayOffset); ctx.lineTo(lensX, axisY - rayOffset); ctx.stroke();
    const slope1 = rayOffset / (f2x - lensX);
    const y1end  = axisY - rayOffset + slope1 * (scrImgX - lensX);
    ctx.beginPath(); ctx.moveTo(lensX, axisY - rayOffset); ctx.lineTo(scrImgX, y1end); ctx.stroke();
    ctx.fillStyle = 'rgba(253,224,71,0.70)';
    arrowHead(scrImgX, y1end, scrImgX - lensX, y1end - (axisY - rayOffset));

    /* ── Ray 2: through optical centre (undeviated) ── */
    ctx.strokeStyle = 'rgba(251,191,36,0.55)'; ctx.lineWidth = 1.2;
    const slope2 = (axisY - (axisY - rayOffset)) / (scrImgX - objX);
    ctx.beginPath();
    ctx.moveTo(objX, axisY - rayOffset);
    ctx.lineTo(scrImgX, axisY - rayOffset + slope2 * (scrImgX - objX));
    ctx.stroke();
    ctx.fillStyle = 'rgba(251,191,36,0.55)';
    arrowHead(scrImgX, axisY - rayOffset + slope2 * (scrImgX - objX),
              scrImgX - objX, slope2 * (scrImgX - objX));

    /* ── Ray 3: through F₁ → emerges parallel to axis ── */
    const f1x = lensX - F_TRUE * CM_TO_PX;
    const slope3in = (axisY - (axisY + rayOffset)) / (lensX - f1x);
    const y3atLens = axisY + rayOffset + slope3in * (lensX - objX);
    ctx.strokeStyle = 'rgba(253,186,116,0.50)'; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(objX, axisY + rayOffset); ctx.lineTo(lensX, y3atLens); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lensX, y3atLens); ctx.lineTo(scrImgX, y3atLens); ctx.stroke();
    ctx.fillStyle = 'rgba(253,186,116,0.50)';
    arrowHead(scrImgX, y3atLens, scrImgX - lensX, 0);

    /* convergence point dot, exactly on the shared optical axis */
    ctx.fillStyle = 'rgba(253,224,71,0.9)';
    ctx.beginPath(); ctx.arc(scrImgX, axisY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(253,224,71,0.5)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(scrImgX, axisY, 7, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING — SIDE VIEW OVERLAY
     ══════════════════════════════════════════════════════════ */
  function drawSideView() {
    if (viewMode !== 'side') return;
    ctx.save(); ctx.globalAlpha = 0.93;
    const cx = W * 0.5, cy = H * 0.37;
    const sW = 280, sH = 210;

    ctx.fillStyle = 'rgba(15,18,27,0.95)';
    ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx - sW / 2, cy - sH / 2 - 22, sW, sH + 44, 10); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#2dd4bf'; ctx.font = `bold 10px IBM Plex Mono,monospace`; ctx.textAlign = 'center';
    ctx.fillText('SIDE VIEW', cx, cy - sH / 2 - 6);

    /* table + bench */
    ctx.fillStyle = '#7d4d24'; ctx.fillRect(cx - sW / 2 + 24, cy + sH / 2 - 18, sW - 48, 16);
    ctx.fillStyle = '#92610a'; ctx.fillRect(cx - sW / 2 + 34, cy + sH / 2 - 30, sW - 68, 10);

    const oy = cy - 18;
    /* object board (thin edge) */
    ctx.fillStyle = '#1e2940'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx - sW / 2 + 44, oy - 32, 6, 64, 2); ctx.fill(); ctx.stroke();
    if (circuitConnected) {
      ctx.fillStyle = 'rgba(253,200,50,0.55)';
      ctx.beginPath(); ctx.arc(cx - sW / 2 + 38, oy, 10, 0, Math.PI * 2); ctx.fill();
    }

    /* lens (circular from side) */
    ctx.strokeStyle = 'rgba(96,165,250,0.70)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, oy, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(96,165,250,0.15)'; ctx.fill();
    /* lens rim */
    ctx.strokeStyle = 'rgba(200,230,255,0.50)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, oy, 28, 0, Math.PI * 2); ctx.stroke();

    /* screen */
    ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx + sW / 2 - 58, oy - 32, 6, 64, 2); ctx.fill(); ctx.stroke();

    /* optical axis */
    ctx.strokeStyle = 'rgba(96,165,250,0.20)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx - sW / 2 + 34, oy); ctx.lineTo(cx + sW / 2 - 34, oy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     MASTER DRAW
     ══════════════════════════════════════════════════════════ */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    drawTable();
    drawMetreRule();
    drawRays();
    drawObject();
    drawHolder();
    drawLens();
    drawScreen();
    drawSideView();
    circDraw();
    updateMeterCards();
  }

  /* ══════════════════════════════════════════════════════════
     LIVE METER CARDS  (u, v, f)
     ══════════════════════════════════════════════════════════ */
  function updateMeterCards() {
    const clarity = computeClarity();
    if (assembled && circuitConnected) {
      screenCtrl.style.display = 'block';

      const fCalc = calcF(u_cm, v_cm);
      document.getElementById('res-u').textContent    = u_cm.toFixed(1) + ' cm';
      document.getElementById('bar-u').style.width    = (u_cm / 50) * 100 + '%';
      document.getElementById('res-v').textContent    = v_cm.toFixed(1) + ' cm';
      document.getElementById('bar-v').style.width    = (v_cm / 100) * 100 + '%';
      document.getElementById('res-f').textContent    = fCalc.toFixed(2) + ' cm';
      document.getElementById('bar-f').style.width    = Math.min(100, (fCalc / 20) * 100) + '%';

      /* Record is enabled once the visual image is reasonably sharp —
         the user judges sharpness by eye on the screen, just as in a
         real lab; clarity is only used here to gate when recording
         a "good" reading is sensible. */
      btnRecord.disabled = clarity < 80;
    } else {
      screenCtrl.style.display = 'none';
      btnRecord.disabled = true;
    }
  }

  /* ══════════════════════════════════════════════════════════
     ANIMATION LOOP
     ══════════════════════════════════════════════════════════ */
  function loop() { draw(); requestAnimationFrame(loop); }

  /* ══════════════════════════════════════════════════════════
     ASSEMBLY & DRAG-AND-DROP
     ══════════════════════════════════════════════════════════ */
  const ORDER = ['metrerule', 'object', 'holder', 'lens', 'screen', 'battery', 'bulb'];

  function updateAssemblyDots() {
    ['metrerule', 'object', 'holder', 'lens', 'screen'].forEach(k => {
      const el = document.getElementById(`asm-${k}`);
      if (el) el.classList.toggle('ok', placed[k]);
    });
    const circEl = document.getElementById('asm-circuit');
    if (circEl) circEl.classList.toggle('ok', circuitConnected);

    const opticalReady = ['metrerule', 'object', 'holder', 'lens', 'screen'].every(k => placed[k]);
    assembled = opticalReady && circuitConnected;

    slU.disabled = !placed.holder;

    if (assembled) {
      setStatus('✅ All set! Adjust the screen to get a sharp image, then Record Trial.', 'ok');
    }
  }

  function markPlaced(type) {
    placed[type] = true;
    const card = document.getElementById(`card-${type}`);
    if (card) card.classList.add('placed');
    updateAssemblyDots();
    const msgs = {
      metrerule: '📏 Metre rule placed — this is your optical bench. Drop the object next.',
      object:    '✛ Illuminated object placed at 0 cm. Now place the lens holder.',
      holder:    '🔩 Lens holder placed. Drop the converging lens into the ring.',
      lens:      '🔭 Lens mounted! Now place the white screen on the bench.',
      screen:    '🖵 Screen placed. Set up the light source circuit in the left panel.',
      battery:   '🔋 Battery on circuit board. Drop the bulb, then wire them up.',
      bulb:      '💡 Bulb placed. Click the + terminal then a bulb terminal to wire.',
    };
    setStatus(msgs[type]);
  }

  function initDnD() {
    ORDER.forEach(type => {
      const card = document.getElementById(`card-${type}`);
      if (!card) return;
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    /* circuit board drop zone */
    const cWrap = document.getElementById('circuit-wrap');
    cWrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    cWrap.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (type === 'battery') { circBattery = true; markPlaced('battery'); checkCircuit(); }
      if (type === 'bulb')    { circBulb    = true; markPlaced('bulb');    checkCircuit(); }
    });

    /* workspace drop zone */
    wWrap.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      wWrap.classList.add('drag-over');
    });
    wWrap.addEventListener('dragleave', () => wWrap.classList.remove('drag-over'));
    wWrap.addEventListener('drop', e => {
      e.preventDefault();
      wWrap.classList.remove('drag-over');
      const type = e.dataTransfer.getData('text/plain');
      const phys = ['metrerule', 'object', 'holder', 'lens', 'screen'];
      if (!phys.includes(type)) return;
      if (placed[type]) { setStatus(`${type} is already on the bench.`); return; }
      /* enforce sequential assembly */
      const idx = phys.indexOf(type);
      for (let i = 0; i < idx; i++) {
        if (!placed[phys[i]]) {
          setStatus(`⚠️ Place the ${phys[i]} first.`, 'warn');
          return;
        }
      }
      markPlaced(type);
    });
  }

  /* ══════════════════════════════════════════════════════════
     SLIDERS
     ══════════════════════════════════════════════════════════ */
  slU.addEventListener('input', () => {
    u_cm = parseInt(slU.value);
    valU.textContent = u_cm + ' cm';
    /* keep screen within bench (ruler spans 0–100 cm) */
    const maxV = Math.floor(98 - u_cm);
    slV.max = maxV;
    if (parseFloat(slV.value) > maxV) slV.value = maxV;
    v_cm = parseFloat(slV.value);
    scVal.textContent = v_cm.toFixed(1) + ' cm';
    setStatus(`Lens at u = ${u_cm} cm. Move the screen to find a sharp image.`, 'warn');
    btnRecord.disabled = true;
  });

  slV.addEventListener('input', () => {
    v_cm = parseFloat(slV.value);
    scVal.textContent = v_cm.toFixed(1) + ' cm';
  });

  /* ══════════════════════════════════════════════════════════
     RECORD TRIAL
     ══════════════════════════════════════════════════════════ */
  function recordTrial() {
    const clarity = computeClarity();
    if (clarity < 80) { setStatus('⚠️ Image not sharp enough — continue adjusting the screen.', 'warn'); return; }
    const fCalc = calcF(u_cm, v_cm);
    currentTrial++;
    trialData.push({ trial: currentTrial, u: u_cm.toFixed(1), v: v_cm.toFixed(1), f: fCalc.toFixed(2) });
    updateTrialTable();
    computeAggregates();
    setStatus(`✅ Trial ${currentTrial}: u = ${u_cm} cm, v = ${v_cm.toFixed(1)} cm → f = ${fCalc.toFixed(2)} cm`, 'ok');
    /* suggest next u value */
    const nextUs  = [20, 25, 30, 35, 40, 45];
    const doneUs  = trialData.map(r => parseFloat(r.u));
    const nextVal = nextUs.find(x => !doneUs.some(d => Math.abs(d - x) < 0.5));
    if (nextVal) setTimeout(() =>
      setStatus(`💡 Try u = ${nextVal} cm for the next trial. Adjust slider, then find focus.`, 'warn'), 1800);
  }

  btnRecord.addEventListener('click', recordTrial);

  function updateTrialTable() {
    if (!trialData.length) {
      trialTbody.innerHTML = '<tr><td colspan="4" class="empty-row">No trials yet</td></tr>'; return;
    }
    trialTbody.innerHTML = trialData.map(r =>
      `<tr><td>${r.trial}</td><td>${r.u}</td><td>${r.v}</td><td>${r.f}</td></tr>`
    ).join('');
  }

  function computeAggregates() {
    if (!trialData.length) return;
    const fs   = trialData.map(r => parseFloat(r.f));
    const mean = fs.reduce((a, b) => a + b, 0) / fs.length;
    const varF = fs.reduce((s, f) => s + (f - mean) ** 2, 0) / fs.length;
    document.getElementById('mean-f').textContent = mean.toFixed(2) + ' cm';
    document.getElementById('std-f').textContent  = Math.sqrt(varF).toFixed(3);
    document.getElementById('err-f').textContent  = (Math.abs(mean - F_TRUE) / F_TRUE * 100).toFixed(2) + ' %';
  }

  /* ══════════════════════════════════════════════════════════
     STATUS HELPER
     ══════════════════════════════════════════════════════════ */
  function setStatus(msg, cls = '') {
    expStatus.textContent  = msg;
    expStatus.className    = 'status-msg' + (cls ? ' ' + cls : '');
    overlayEl.textContent  = msg;
  }

  /* ══════════════════════════════════════════════════════════
     RESET
     ══════════════════════════════════════════════════════════ */
  function resetAll() {
    placed          = { metrerule: false, object: false, holder: false, lens: false, screen: false, battery: false, bulb: false };
    circBattery     = false; circBulb = false; circWires = [];
    circuitConnected = false; wiringMode = false; wireStart = null;
    assembled       = false;
    trialData       = []; currentTrial = 0;
    u_cm = 20; v_cm = 40;
    slU.value = 20; slV.value = 40; slU.disabled = true;
    valU.textContent = '20 cm'; scVal.textContent = '40.0 cm';

    ORDER.forEach(t => {
      const c = document.getElementById(`card-${t}`); if (c) c.classList.remove('placed');
      const d = document.getElementById(`asm-${t}`);  if (d) d.classList.remove('ok');
    });
    document.getElementById('asm-circuit').classList.remove('ok');

    btnRecord.disabled = true;
    updateTrialTable();
    ['mean-f', 'std-f', 'err-f'].forEach(id => document.getElementById(id).textContent = '—');
    ['res-u', 'res-v', 'res-f'].forEach(id => document.getElementById(id).textContent = '— cm');
    ['bar-u', 'bar-v', 'bar-f'].forEach(id => document.getElementById(id).style.width = '0%');
    document.getElementById('circuit-hint').textContent = 'Drop battery & bulb above, then click terminals to draw wires.';

    screenCtrl.style.display = 'none';
    setStatus('↺ Lab reset — drag the apparatus back onto the bench.');
    circDraw();
  }

  btnReset.addEventListener('click', resetAll);

  /* ══════════════════════════════════════════════════════════
     VIEW TOGGLE
     ══════════════════════════════════════════════════════════ */
  btnFront.addEventListener('click', () => {
    viewMode = 'front';
    btnFront.classList.add('active'); btnSide.classList.remove('active');
  });
  btnSide.addEventListener('click', () => {
    viewMode = 'side';
    btnSide.classList.add('active'); btnFront.classList.remove('active');
  });

  /* ══════════════════════════════════════════════════════════
     RAYS TOGGLE
     ══════════════════════════════════════════════════════════ */
  btnRays.addEventListener('click', () => {
    showRays = !showRays;
    btnRays.classList.toggle('active', showRays);
  });

  /* ══════════════════════════════════════════════════════════
     RESIZE
     ══════════════════════════════════════════════════════════ */
  function resizeCanvas() {
    const rect = wWrap.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    W = canvas.width; H = canvas.height;
    recalcGeometry();
  }
  window.addEventListener('resize', resizeCanvas);

  /* ══════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════ */
  function boot() {
    resizeCanvas();
    initDnD();
    recalcGeometry();
    circDraw();
    requestAnimationFrame(loop);
  }
  boot();

})();