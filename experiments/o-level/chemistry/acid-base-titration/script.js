/* ═══════════════════════════════════════════════════════════════
   iLab Chemistry · Acid–Base Titration · script.js

   Canvas-based rig (mirrors the iLab Physics pendulum renderer):
   table → retort stand → clamp → burette, with a conical flask
   that snaps so its central axis aligns under the burette tip and
   its base rests on the same table surface as the stand's base.

   CHEMISTRY MODEL
   ─────────────────────────────────────────────────────────────
   Any acid can be titrated against any base. Each reagent carries
   its strength (strong/weak) and the number of H+ / OH- it donates
   per formula unit (its "basicity"/"acidity"), so neutralization
   uses real equivalents rather than assuming a 1:1 mole ratio:

       eq(acid) = mol(acid) × basicity     [H+ available]
       eq(base) = mol(base) × acidity      [OH- available]
       endpoint when eq(acid added) ≈ eq(base present)

   The expected equivalence-point pH is approximated from the
   strong/weak classification of the pair (strong–strong ≈ 7,
   weak acid–strong base > 7, strong acid–weak base < 7, weak–weak
   has no sharp endpoint). The chosen indicator's colour-change pH
   range is compared against that estimate so the simulation can
   tell the user, just as a real titration would, when an indicator
   choice will not give a clean endpoint.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Canvas & context ─────────────────────────────────────────── */
  const canvas = document.getElementById('lab-canvas');
  const ctx    = canvas.getContext('2d');
  const wWrap  = document.getElementById('workspace');

  /* ── Assembly / placement state ───────────────────────────────── */
  let placed = { stand: false, clamp: false, burette: false, flask: false, funnel: false };
  let assembled = false; // stand+clamp+burette mounted, ready for liquid

  /* ══════════════════════════════════════════════════════════════
     REAGENT DATABASE
     basicity = number of H+ ions released per formula unit (acids)
     acidity  = number of OH- ions released per formula unit (bases)
     pKa/pKb given for reference; only strong/weak classification
     and basicity/acidity actually drive the stoichiometry below.
     ══════════════════════════════════════════════════════════════ */
  const ACIDS = {
    hcl:     { name: 'Hydrochloric acid', formula: 'HCl',      strong: true,  basicity: 1 },
    hno3:    { name: 'Nitric acid',       formula: 'HNO₃',     strong: true,  basicity: 1 },
    h2so4:   { name: 'Sulfuric acid',     formula: 'H₂SO₄',    strong: true,  basicity: 2 },
    ch3cooh: { name: 'Acetic acid',       formula: 'CH₃COOH',  strong: false, basicity: 1, pKa: 4.76 },
    h3po4:   { name: 'Phosphoric acid',   formula: 'H₃PO₄',    strong: false, basicity: 1, pKa: 2.15 },
  };
  const BASES = {
    naoh:   { name: 'Sodium hydroxide',   formula: 'NaOH',      strong: true,  acidity: 1 },
    koh:    { name: 'Potassium hydroxide',formula: 'KOH',       strong: true,  acidity: 1 },
    caoh2:  { name: 'Calcium hydroxide',  formula: 'Ca(OH)₂',   strong: true,  acidity: 2 },
    nh3:    { name: 'Ammonia solution',   formula: 'NH₃',       strong: false, acidity: 1, pKb: 4.75 },
  };
  const INDICATORS = {
    phenolphthalein: {
      name: 'Phenolphthalein', range: [8.2, 10],
      colorAcid: 'rgba(214,234,246,0.30)',   // colourless
      colorBase: 'rgba(236,111,163,0.80)',   // pink
    },
    methylorange: {
      name: 'Methyl orange', range: [3.1, 4.4],
      colorAcid: 'rgba(217,77,58,0.78)',     // red
      colorBase: 'rgba(247,196,56,0.72)',    // yellow
    },
  };

  // Approximate equivalence-point pH for a given acid/base strength
  // pairing — enough to judge whether a chosen indicator will show a
  // sharp, accurate endpoint, the same judgement call made in a real
  // titration when picking an indicator before starting.
  function estimateEquivalencePh(acid, base) {
    if (acid.strong && base.strong)   return 7.0;
    if (!acid.strong && base.strong)  return 8.8;  // weak acid + strong base -> basic at equivalence
    if (acid.strong && !base.strong)  return 5.3;  // strong acid + weak base -> acidic at equivalence
    return null; // weak + weak: no reliably sharp endpoint
  }

  function judgeIndicatorFit(acid, base, indicatorKey) {
    const ind = INDICATORS[indicatorKey];
    const eqPh = estimateEquivalencePh(acid, base);
    if (eqPh === null) {
      return { ok: false, severity: 'warn',
        msg: 'Weak acid + weak base gives no sharp endpoint with any indicator — the colour change will be gradual and the reading unreliable, just as in a real lab.' };
    }
    const [lo, hi] = ind.range;
    // A tolerance of ±2 pH units reflects the fact that the steep
    // section of the equivalence-point jump in a strong-acid/strong-base
    // titration spans roughly pH 4–10, so either common indicator works
    // even though neither changes colour exactly at pH 7.
    const within = eqPh >= lo - 2.0 && eqPh <= hi + 2.0;
    if (within) {
      return { ok: true, severity: 'good',
        msg: `${ind.name} is a good choice here — its colour-change range (pH ${lo}–${hi}) brackets the expected equivalence point (pH ≈ ${eqPh.toFixed(1)}).` };
    }
    return { ok: false, severity: 'warn',
      msg: `${ind.name} (pH ${lo}–${hi}) will change colour well before or after the true equivalence point (pH ≈ ${eqPh.toFixed(1)}) — expect an inaccurate titre with this combination.` };
  }

  /* ── Chemistry state ──────────────────────────────────────────── */
  const state = {
    acidKey: 'hcl',
    baseKey: 'naoh',
    indicatorKey: 'phenolphthalein',
    acidMolarity: 1.0,
    baseMolarity: 1.0,
    pipetteVolume: 20,

    buretteCapacity: 50,     // cc
    buretteFillCc: 0,        // cc of acid currently in burette
    buretteInitialReading: null,

    valveOpen: false,
    valveFrac: 0,            // 0..1

    flaskHasBase: false,
    flaskHasIndicator: false,
    flaskBaseCc: 0,
    flaskTotalCc: 0,         // total liquid volume in flask (visual fill)
    flaskEqBase: 0,          // equivalents of OH- present (mol base × acidity)
    flaskEqAcidAdded: 0,     // equivalents of H+ added so far (mol acid × basicity)
    flaskNeutralized: false,
    flaskMounted: false,     // axis-aligned under burette tip, base on table

    pipetteFillCc: 0,
    pipetteSource: null,

    dropperFillCc: 0,
    dropperSource: null,

    trials: [],
    currentTrialActive: false,
  };

  function currentAcid()      { return ACIDS[state.acidKey]; }
  function currentBase()      { return BASES[state.baseKey]; }
  function currentIndicator() { return INDICATORS[state.indicatorKey]; }

  /* ── Colours: liquids are visually colourless on their own; the
       indicator carries whatever colour pair it's defined with,
       and we interpolate between its acid/base colours based on
       how much of the base's equivalents remain unneutralised. ── */
  const COLOR_LIQUID_NEUTRAL = 'rgba(214,234,246,0.35)';

  function flaskColor() {
    if (!state.flaskHasIndicator || !state.flaskHasBase) return COLOR_LIQUID_NEUTRAL;
    const ind = currentIndicator();
    if (state.flaskEqBase <= 0) return ind.colorAcid;
    const fracBaseRemaining = Math.max(0, Math.min(1, (state.flaskEqBase - state.flaskEqAcidAdded) / state.flaskEqBase));
    return mixRgba(ind.colorBase, ind.colorAcid, 1 - fracBaseRemaining);
  }
  function mixRgba(c1, c2, t) {
    const p1 = parseRgba(c1), p2 = parseRgba(c2);
    const r = Math.round(p1.r + (p2.r - p1.r) * t);
    const g = Math.round(p1.g + (p2.g - p1.g) * t);
    const b = Math.round(p1.b + (p2.b - p1.b) * t);
    const a = p1.a + (p2.a - p1.a) * t;
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }
  function parseRgba(str) {
    const m = str.match(/rgba?\(([^)]+)\)/)[1].split(',').map(s => parseFloat(s));
    return { r: m[0], g: m[1], b: m[2], a: m[3] !== undefined ? m[3] : 1 };
  }

  /* ── Layout / geometry (px) ───────────────────────────────────── */
  let W, H;
  let TABLE_TOP, TABLE_W, TABLE_H, TABLE_X, TABLE_LEG_H;
  let STAND_BASE_X, STAND_BASE_Y;
  let PX_PER_M = 220;
  let standRodPx, standTopY, clampY, armLenPx, pivotX, pivotY;     // pivot = burette tip
  let buretteTopY, buretteBottomY, buretteTipY;
  let flaskX, flaskBaseY;     // flask position when mounted/placed
  let flaskPlacedFree = { x: 0, y: 0 }; // free position when not mounted

  /* ── DOM refs ──────────────────────────────────────────────────── */
  const slHeight      = document.getElementById('sl-height');
  const slReach        = document.getElementById('sl-reach');
  const slClampHeight  = document.getElementById('sl-clamp-height');
  const slBuretteHeight = document.getElementById('sl-burette-height');
  const valHeight      = document.getElementById('val-height');
  const valReach        = document.getElementById('val-reach');
  const valClampHeight  = document.getElementById('val-clamp-height');
  const valBuretteHeight = document.getElementById('val-burette-height');

  const selAcid       = document.getElementById('sel-acid');
  const selBase        = document.getElementById('sel-base');
  const selIndicator   = document.getElementById('sel-indicator');
  const acidSlider     = document.getElementById('acid-molarity');
  const baseSlider     = document.getElementById('base-molarity');
  const acidVal        = document.getElementById('acid-molarity-val');
  const baseVal         = document.getElementById('base-molarity-val');
  const chemInfoBox     = document.getElementById('chem-info-box');
  const descBeakerAcid  = document.getElementById('desc-beaker-acid');
  const descBeakerBase  = document.getElementById('desc-beaker-base');
  const descBeakerInd   = document.getElementById('desc-beaker-ind');
  const formulaMainEl   = document.getElementById('formula-main');
  const formulaSubEl    = document.getElementById('formula-sub');

  const overlayStatus = document.getElementById('overlay-status');
  const expStatus      = document.getElementById('exp-status');
  const trialTbody      = document.getElementById('trial-tbody');

  const valveSlider      = document.getElementById('valve-slider');
  const valveStateLabel  = document.getElementById('valve-state');
  const btnToggleValve   = document.getElementById('btn-toggle-valve');
  const buretteReadout      = document.getElementById('burette-readout');
  const buretteReadoutFill  = document.getElementById('burette-readout-fill');
  const btnShake     = document.getElementById('btn-shake');
  const btnNewTrial   = document.getElementById('btn-new-trial');

  const btnReset = document.getElementById('btn-reset');

  /* ── Drag-and-drop "loose" apparatus (flask, pipette, dropper,
       beakers, funnel) — these are positioned freely on the canvas
       and tracked as simple objects we draw + hit-test ourselves ── */
  let nextLooseId = 1;
  let loose = {}; // id -> {type,x,y,...}
  let dragLoose = null; // {id, ox, oy}
  let pourAnim = null;  // active beaker-tilt pour animation state

  /* ══════════════════════════════════════════════════════════════
     GEOMETRY
     ══════════════════════════════════════════════════════════════ */
  function recalcGeometry() {
    const standHeightCm = parseInt(slHeight.value);
    const standHeightM = standHeightCm / 100;
    const reachCm        = parseInt(slReach.value);
    const clampHeightCm  = parseInt(slClampHeight.value);
    const buretteOffsetCm = parseInt(slBuretteHeight.value);

    const usableH = H * 0.62; // vertical budget for the stand rod itself
    // Scale px-per-metre so even the tallest stand (1.5 m) fits within
    // the usable canvas height, while shorter stands aren't tiny.
    PX_PER_M = Math.min(230, usableH / standHeightM);

    TABLE_W   = Math.min(W * 0.5, 460);
    TABLE_H   = 22;
    TABLE_X   = (W - TABLE_W) / 2;
    // Table represents ~1 m total height (legs). Keep its top fixed
    // relative to floor so the stand (resting on it) reads correctly.
    TABLE_LEG_H = Math.min(H * 0.30, 1.0 * PX_PER_M * 0.62);
    TABLE_TOP   = H - 60 - TABLE_LEG_H - TABLE_H;

    STAND_BASE_X = TABLE_X + TABLE_W * 0.32;
    STAND_BASE_Y = TABLE_TOP; // stand base rests on table surface

    standRodPx = standHeightM * PX_PER_M;
    standTopY  = STAND_BASE_Y - standRodPx;

    // clampHeightCm is the clamp's position measured in cm up the rod.
    // Clamp it to the rod's actual height (it can't sit above the rod's
    // top), then convert to a fraction of this stand's height.
    const clampHeightClamped = Math.min(clampHeightCm, standHeightCm - 5);
    const clampFrac = Math.min(0.97, Math.max(0.05, clampHeightClamped / standHeightCm));
    clampY = STAND_BASE_Y - standRodPx * clampFrac;

    armLenPx = (reachCm / 100) * PX_PER_M;
    pivotX = STAND_BASE_X + armLenPx;   // burette hangs at clamp arm tip

    // Burette can slide vertically within the clamp's jaws (independent
    // of where the clamp itself sits on the rod).
    const buretteOffsetPx = (buretteOffsetCm / 100) * PX_PER_M;
    pivotY = clampY + buretteOffsetPx;

    // Burette body hangs below the clamp jaws
    buretteTopY    = pivotY - 6;
    buretteBottomY = pivotY + 230;       // fixed visual tube length
    buretteTipY    = buretteBottomY + 26; // nozzle tip (drip origin)

    // Flask, when mounted, has its central axis = pivotX (burette tip x)
    // and its base on the SAME surface the stand stands on.
    flaskX     = pivotX;
    flaskBaseY = STAND_BASE_Y;

    if (!loose[flaskFreeKey()]) {
      flaskPlacedFree = { x: TABLE_X + TABLE_W * 0.75, y: STAND_BASE_Y };
    }
  }

  function flaskFreeKey() { return '__flaskRefUnused__'; }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — background, table
     ══════════════════════════════════════════════════════════════ */
  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0c12');
    grad.addColorStop(1, '#0e1018');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(37,43,59,0.7)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const floorGrad = ctx.createLinearGradient(0, TABLE_TOP + TABLE_LEG_H, 0, H);
    floorGrad.addColorStop(0, 'rgba(20,25,38,0.9)');
    floorGrad.addColorStop(1, 'rgba(8,10,16,1)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, TABLE_TOP + TABLE_LEG_H + TABLE_H - 4, W, H);
  }

  function drawTable() {
    const lx = TABLE_X, ty = TABLE_TOP, tw = TABLE_W;
    const legW = 16, legH = TABLE_LEG_H;
    const legGrad = ctx.createLinearGradient(0, ty+TABLE_H, 0, ty+TABLE_H+legH);
    legGrad.addColorStop(0, '#5c3d1a'); legGrad.addColorStop(1, '#3a2610');
    for (const lp of [lx+20, lx+tw-20-legW]) {
      ctx.fillStyle = legGrad;
      ctx.fillRect(lp, ty+TABLE_H, legW, legH);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let g=0; g<legH; g+=18) {
        ctx.beginPath(); ctx.moveTo(lp+2, ty+TABLE_H+g); ctx.lineTo(lp+legW-2, ty+TABLE_H+g+14); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(lp-3, ty+TABLE_H+legH-6, legW+6, 8);
    }
    ctx.fillStyle = '#6b3f18';
    ctx.fillRect(lx, ty+TABLE_H, tw, 12);
    const surfGrad = ctx.createLinearGradient(lx, ty, lx, ty+TABLE_H);
    surfGrad.addColorStop(0, '#9a6030'); surfGrad.addColorStop(0.3, '#7d4d24'); surfGrad.addColorStop(1, '#5c3a18');
    ctx.fillStyle = surfGrad;
    ctx.fillRect(lx, ty, tw, TABLE_H);
    ctx.fillStyle = 'rgba(200,140,80,0.25)';
    ctx.fillRect(lx, ty, tw, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    for (let g=lx+18; g<lx+tw-12; g+=24) {
      ctx.beginPath(); ctx.moveTo(g, ty+2); ctx.lineTo(g+9, ty+TABLE_H-2); ctx.stroke();
    }
    // ~1 m height label near a leg
    ctx.fillStyle = 'rgba(100,116,139,0.7)';
    ctx.font = `9px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('bench ≈ 1 m', lx+legW+26, ty+TABLE_H+legH+8);
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — retort stand & clamp (style ported from iLab Physics)
     ══════════════════════════════════════════════════════════════ */
  function drawStand() {
    if (!placed.stand) return;
    const bx = STAND_BASE_X, by = STAND_BASE_Y;
    const rodH = standRodPx, rodW = 11;
    ctx.save();
    const baseW = 80, baseH = 16;
    const baseGrad = ctx.createLinearGradient(bx-baseW/2, by-baseH, bx-baseW/2, by);
    baseGrad.addColorStop(0, '#64748b'); baseGrad.addColorStop(1, '#2d3748');
    ctx.fillStyle = baseGrad;
    ctx.beginPath(); ctx.roundRect(bx-baseW/2, by-baseH, baseW, baseH, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx-baseW/2+4, by-baseH+2, baseW-8, 3);

    const rodGrad = ctx.createLinearGradient(bx-rodW/2, 0, bx+rodW/2, 0);
    rodGrad.addColorStop(0, '#94a3b8'); rodGrad.addColorStop(0.35, '#e2e8f0');
    rodGrad.addColorStop(0.6, '#94a3b8'); rodGrad.addColorStop(1, '#475569');
    ctx.fillStyle = rodGrad;
    ctx.fillRect(bx-rodW/2, by-baseH-rodH, rodW, rodH);

    ctx.strokeStyle = 'rgba(200,210,230,0.35)'; ctx.lineWidth = 0.8;
    const mS = PX_PER_M * 0.10;
    for (let my=by-baseH; my>by-baseH-rodH; my-=mS) {
      ctx.beginPath(); ctx.moveTo(bx-rodW/2-3, my); ctx.lineTo(bx-rodW/2, my); ctx.stroke();
    }
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(bx-rodW/2-2, standTopY, rodW+4, 14);
    ctx.fillStyle = 'rgba(100,116,139,0.9)';
    ctx.font = `10px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${slHeight.value} cm`, bx-rodW/2-8, by-rodH/2);
    ctx.restore();
  }

  function drawClamp() {
    if (!placed.clamp || !placed.stand) return;
    ctx.save();
    const cx = STAND_BASE_X, cy = clampY;
    const bhW = 22, bhH = 18;
    const bhGrad = ctx.createLinearGradient(cx-bhW/2, cy, cx+bhW/2, cy);
    bhGrad.addColorStop(0, '#78909c'); bhGrad.addColorStop(0.5, '#cfd8dc'); bhGrad.addColorStop(1, '#546e7a');
    ctx.fillStyle = bhGrad;
    ctx.beginPath(); ctx.roundRect(cx-bhW/2, cy-bhH/2, bhW, bhH, 4); ctx.fill();
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1; ctx.stroke();
    // screw (boss-head adjustment)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(cx+bhW/2-4, cy, 4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#92610a'; ctx.lineWidth = 1; ctx.stroke();

    const armGrad = ctx.createLinearGradient(cx, cy-4, cx, cy+4);
    armGrad.addColorStop(0, '#94a3b8'); armGrad.addColorStop(0.4, '#e2e8f0'); armGrad.addColorStop(1, '#475569');
    ctx.fillStyle = armGrad;
    ctx.fillRect(cx+bhW/2, cy-4, armLenPx-bhW/2, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(cx+bhW/2, cy-3, armLenPx-bhW/2, 2);

    // 4-prong clamp head gripping the burette
    const headX = cx + armLenPx, headY = cy;
    ctx.fillStyle = '#4a5568';
    ctx.beginPath(); ctx.roundRect(headX-14, headY-14, 28, 28, 5); ctx.fill();
    ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 1.5; ctx.stroke();
    for (const ang of [45, 135, 225, 315]) {
      const rad = ang * Math.PI / 180;
      const px = headX + Math.cos(rad)*12, py = headY + Math.sin(rad)*12;
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#1e2433';
    ctx.beginPath(); ctx.arc(headX, headY, 5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(100,116,139,0.8)';
    ctx.font = `9px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`reach: ${slReach.value} cm`, cx+bhW/2+4, cy-8);
    ctx.restore();

    // Grip band: shows where the jaws actually clamp the burette tube,
    // which may sit above/below the jaw centre once slid vertically.
    if (placed.burette) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245,158,11,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(headX-9, headY-3); ctx.lineTo(headX+9, headY-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headX-9, headY+3); ctx.lineTo(headX+9, headY+3); ctx.stroke();
      ctx.restore();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — burette (graduated tube + tap valve)
     ══════════════════════════════════════════════════════════════ */
  function drawBurette() {
    if (!placed.burette) return;
    const w = 18;
    const tubeTop = buretteTopY, tubeBottom = buretteBottomY;
    const tubeH = tubeBottom - tubeTop;
    const fillFrac = state.buretteFillCc / state.buretteCapacity;
    const liquidTop = tubeBottom - tubeH * fillFrac;

    ctx.save();
    // glass tube
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(pivotX-w/2, tubeTop, w, tubeH, 2); ctx.fill(); ctx.stroke();

    // liquid
    if (state.buretteFillCc > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(pivotX-w/2, tubeTop, w, tubeH); ctx.clip();
      ctx.fillStyle = COLOR_LIQUID_NEUTRAL;
      ctx.fillRect(pivotX-w/2, liquidTop, w, tubeBottom-liquidTop);

      // Meniscus: brighter highlight on the surface, with a gentle
      // ripple while liquid is actively being poured in.
      const pouring = !!(pourAnim && pourAnim._pouring);
      const rippleAmp = pouring ? 1.4 : 0.4;
      const ripplePhase = performance.now() / 140;
      ctx.beginPath();
      for (let xx = pivotX-w/2; xx <= pivotX+w/2; xx += 2) {
        const yy = liquidTop + Math.sin(ripplePhase + xx*0.6) * rippleAmp;
        if (xx === pivotX-w/2) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // Rising-level pulse ring right at the surface while pouring,
      // to make the real-time fill obviously visible.
      if (pouring) {
        const pulse = (performance.now() / 260) % 1;
        ctx.save();
        ctx.globalAlpha = 1 - pulse;
        ctx.strokeStyle = 'rgba(214,234,246,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(pivotX, liquidTop, (w/2)*(0.4+pulse*0.7), 2.2, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }
    }
    // glass highlight streak
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(pivotX-w/2+2, tubeTop, 3, tubeH);

    // Live "filling" badge while a pour is actively transferring liquid
    if (pourAnim && pourAnim._pouring) {
      ctx.save();
      ctx.fillStyle = 'rgba(74,222,128,0.92)';
      ctx.font = `bold 9px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`+${pourAnim.pouredCc.toFixed(1)} cc`, pivotX+w/2+9, liquidTop-6);
      ctx.restore();
    }

    // graduation marks every 5cc
    ctx.strokeStyle = '#5b6b6f'; ctx.lineWidth = 1; ctx.font = `7px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = '#5b6b6f'; ctx.textAlign = 'left';
    const steps = state.buretteCapacity / 5;
    for (let i=0; i<=steps; i++) {
      const y = tubeTop + tubeH * (i/steps);
      const labeled = i % 2 === 0;
      ctx.beginPath(); ctx.moveTo(pivotX+w/2+1, y); ctx.lineTo(pivotX+w/2+(labeled?7:4), y); ctx.stroke();
      if (labeled) ctx.fillText(String(i*5), pivotX+w/2+9, y+2.5);
    }

    // tapered section to stopcock
    ctx.beginPath();
    ctx.moveTo(pivotX-w/2, tubeBottom); ctx.lineTo(pivotX-3, tubeBottom+14);
    ctx.lineTo(pivotX+3, tubeBottom+14); ctx.lineTo(pivotX+w/2, tubeBottom);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2; ctx.stroke();

    // stopcock body
    ctx.fillStyle = '#cfd6d8'; ctx.strokeStyle = '#7a8488'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(pivotX-8, tubeBottom+12, 16, 13, 3); ctx.fill(); ctx.stroke();

    // tap handle — rotates with valve openness
    const angle = state.valveFrac * 80;
    ctx.save();
    ctx.translate(pivotX, tubeBottom+18.5);
    ctx.rotate(angle * Math.PI/180);
    ctx.fillStyle = '#c9a368'; ctx.strokeStyle = '#7a5e35'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(-13, -2.3, 26, 4.6, 2.3); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#9c7a45';
    ctx.beginPath(); ctx.arc(pivotX, tubeBottom+18.5, 2.6, 0, Math.PI*2); ctx.fill();

    // nozzle / jet tip down to drip origin
    ctx.beginPath();
    ctx.moveTo(pivotX-2.5, tubeBottom+25); ctx.lineTo(pivotX-0.8, buretteTipY);
    ctx.lineTo(pivotX+0.8, buretteTipY); ctx.lineTo(pivotX+2.5, tubeBottom+25);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — funnel (optional, sits at burette top opening)
     ══════════════════════════════════════════════════════════════ */
  function drawFunnelMounted() {
    if (!placed.funnel || !placed.burette) return;
    const fx = pivotX, fy = buretteTopY;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(fx-20, fy-22); ctx.lineTo(fx+20, fy-22);
    ctx.lineTo(fx+5, fy+4); ctx.lineTo(fx-5, fy+4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(fx, fy-22, 20, 4, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(100,116,139,0.85)';
    ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
    ctx.fillText('funnel', fx, fy-30);
    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — conical flask (mounted under burette OR free-placed)
     ══════════════════════════════════════════════════════════════ */
  function getFlaskPos() {
    if (state.flaskMounted) return { x: flaskX, y: flaskBaseY };
    return { x: flaskPlacedFree.x, y: flaskPlacedFree.y };
  }

  function drawFlask() {
    if (!placed.flask) return;
    const { x, y: baseY } = getFlaskPos();
    const bodyW = 64, neckW = 16, totalH = 92;
    const topY = baseY - totalH;
    const neckTopY = topY;
    const neckBottomY = topY + 26;
    const shoulderY = neckBottomY + 14;

    const fillFrac = Math.min(1, state.flaskTotalCc / 150);
    const liquidH = (baseY - shoulderY + 10) * fillFrac;
    const liquidTopY = baseY - liquidH;
    const color = flaskColor();

    // Shake/swirl: rotate the whole flask about its base-centre point
    // so the base stays put (aligned with the stand base) while the
    // body and liquid visibly rock back and forth.
    const { angle: shakeAngle, slosh } = getShakeState();

    ctx.save();

    // shadow on table (drawn unrotated, at the true base position)
    const shW = bodyW * 0.6;
    const shGrad = ctx.createRadialGradient(x, baseY+4, 0, x, baseY+4, shW);
    shGrad.addColorStop(0, 'rgba(0,0,0,0.4)'); shGrad.addColorStop(1, 'transparent');
    ctx.save(); ctx.scale(1, 0.25); ctx.fillStyle = shGrad;
    ctx.beginPath(); ctx.arc(x, (baseY+4)/0.25, shW, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // Pivot the flask body about (x, baseY) for the rocking motion
    ctx.translate(x, baseY);
    ctx.rotate(shakeAngle);
    ctx.translate(-x, -baseY);

    // flask outline path (clip for liquid)
    function flaskPath() {
      ctx.beginPath();
      ctx.moveTo(x-neckW/2, neckTopY);
      ctx.lineTo(x+neckW/2, neckTopY);
      ctx.lineTo(x+neckW/2, neckBottomY);
      ctx.lineTo(x+bodyW/2, baseY-10);
      ctx.quadraticCurveTo(x+bodyW/2, baseY, x, baseY+4);
      ctx.quadraticCurveTo(x-bodyW/2, baseY, x-bodyW/2, baseY-10);
      ctx.lineTo(x-neckW/2, neckBottomY);
      ctx.closePath();
    }

    // liquid fill (clipped) — surface tilts with the slosh while shaking
    ctx.save();
    flaskPath(); ctx.clip();
    ctx.fillStyle = color;
    if (Math.abs(slosh) > 0.001) {
      const tiltPx = slosh * bodyW * 0.5;
      ctx.beginPath();
      ctx.moveTo(x-bodyW/2-2, liquidTopY + tiltPx);
      ctx.lineTo(x+bodyW/2+2, liquidTopY - tiltPx);
      ctx.lineTo(x+bodyW/2+2, baseY+10);
      ctx.lineTo(x-bodyW/2-2, baseY+10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x-bodyW/2-2, liquidTopY + tiltPx);
      ctx.lineTo(x+bodyW/2+2, liquidTopY - tiltPx);
      ctx.stroke();
    } else {
      ctx.fillRect(x-bodyW/2-2, liquidTopY, bodyW+4, baseY-liquidTopY+10);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x-bodyW/2-2, liquidTopY, bodyW+4, 2);
    }
    ctx.restore();

    // glass outline + sheen
    flaskPath();
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); flaskPath(); ctx.clip();
    const sheen = ctx.createLinearGradient(x-bodyW/2, 0, x+bodyW/2, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0.03)');
    sheen.addColorStop(0.18, 'rgba(255,255,255,0.35)');
    sheen.addColorStop(0.32, 'rgba(255,255,255,0.05)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x-bodyW/2-2, topY, bodyW+4, totalH+10);
    ctx.restore();

    // rim
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x, neckTopY, neckW/2, 2.4, 0, 0, Math.PI*2); ctx.stroke();

    // axis guide (helps visualize alignment when mounted)
    if (state.flaskMounted) {
      ctx.strokeStyle = 'rgba(45,212,191,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(x, neckTopY-10); ctx.lineTo(x, baseY+8); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = 'rgba(100,116,139,0.85)';
    ctx.font = `9px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
    ctx.fillText(`${state.flaskTotalCc.toFixed(1)} cc`, x, baseY+16);

    ctx.restore();

    // store hit box for drag/snap logic
    flaskHitBox = { x: x-bodyW/2-6, y: topY-6, w: bodyW+12, h: totalH+20, cx: x, topY: neckTopY };
  }
  let flaskHitBox = null;

  /* ══════════════════════════════════════════════════════════════
     DRAWING — liquid flow: drops (low flow) vs laminar stream (high)
     ══════════════════════════════════════════════════════════════ */
  let drops = [];        // {y, t}
  let dropSpawnAcc = 0;
  const DRIP_THRESHOLD = 0.34; // below this fraction -> discrete drops; above -> stream

  function updateFlow(dt) {
    if (!(state.valveOpen && state.valveFrac > 0 && state.buretteFillCc > 0)) return;
    const { y: flaskBaseAtY } = getFlaskPos();
    const surfaceY = state.flaskMounted
      ? flaskBaseAtY - Math.min(1, state.flaskTotalCc/150) * 70
      : buretteTipY + 40;

    if (state.valveFrac < DRIP_THRESHOLD) {
      // discrete drops, rate scales with valveFrac
      const rate = 0.5 + state.valveFrac * 6; // drops/sec
      dropSpawnAcc += dt * rate;
      while (dropSpawnAcc >= 1) {
        dropSpawnAcc -= 1;
        drops.push({ y: buretteTipY, vy: 20 });
      }
      for (let i = drops.length-1; i>=0; i--) {
        const d = drops[i];
        d.vy += 480 * dt;
        d.y  += d.vy * dt;
        if (d.y >= surfaceY) drops.splice(i,1);
      }
    } else {
      drops.length = 0; // stream mode draws continuous shape instead
    }
  }

  function drawFlowVisualization() {
    if (!(state.valveOpen && state.valveFrac > 0 && state.buretteFillCc > 0)) return;
    const surfaceY = state.flaskMounted
      ? getFlaskPos().y - Math.min(1, state.flaskTotalCc/150) * 70
      : buretteTipY + 40;

    ctx.save();
    if (state.valveFrac < DRIP_THRESHOLD) {
      // drops
      drops.forEach(d => {
        const stretch = Math.min(2.2, 1 + d.vy/300);
        ctx.fillStyle = COLOR_LIQUID_NEUTRAL.replace(/[\d.]+\)$/, '0.65)');
        ctx.beginPath();
        ctx.ellipse(pivotX, d.y, 2.1, 2.1*stretch, 0, 0, Math.PI*2);
        ctx.fill();
      });
    } else {
      // laminar stream: tapered translucent ribbon, width grows with valveFrac
      const topW = 1.4 + state.valveFrac * 3.2;
      const botW = topW * 1.4;
      const wobble = Math.sin(performance.now()/90) * (state.valveFrac*1.2);
      ctx.fillStyle = 'rgba(214,234,246,0.42)';
      ctx.beginPath();
      ctx.moveTo(pivotX-topW/2, buretteTipY);
      ctx.lineTo(pivotX+topW/2, buretteTipY);
      ctx.quadraticCurveTo(pivotX+botW/2+wobble, (buretteTipY+surfaceY)/2, pivotX+botW/2, surfaceY);
      ctx.lineTo(pivotX-botW/2, surfaceY);
      ctx.quadraticCurveTo(pivotX-botW/2+wobble, (buretteTipY+surfaceY)/2, pivotX-topW/2, buretteTipY);
      ctx.closePath();
      ctx.fill();
      // highlight streak
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(pivotX-topW*0.15, buretteTipY); ctx.lineTo(pivotX-botW*0.1, surfaceY); ctx.stroke();
    }
    // splash ring at surface
    ctx.strokeStyle = 'rgba(214,234,246,0.3)'; ctx.lineWidth = 1;
    const splashR = 4 + Math.sin(performance.now()/120)*1.5;
    ctx.beginPath(); ctx.ellipse(pivotX, surfaceY, splashR, splashR*0.3, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — pour animation (beaker tilted over burette top)
     ══════════════════════════════════════════════════════════════ */
  function drawPourAnimation() {
    if (!pourAnim) return;
    const p = pourAnim;
    const tiltProgress = Math.min(1, p.elapsed / 0.5);
    const tiltAngle = tiltProgress * -65 * Math.PI/180; // tilt to pour

    const bx = pivotX - 70, by = buretteTopY - 90; // beaker hover position above burette top
    const w = 46, h = 56;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tiltAngle);
    // beaker body
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, -h/2);
    ctx.lineTo(w/2-4, h/2); ctx.lineTo(-w/2+4, h/2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // liquid in beaker
    const liqFrac = Math.max(0, p.beakerFrac);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, -h/2);
    ctx.lineTo(w/2-4, h/2); ctx.lineTo(-w/2+4, h/2);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = COLOR_LIQUID_NEUTRAL.replace(/[\d.]+\)$/,'0.6)');
    ctx.fillRect(-w/2, h/2 - h*liqFrac, w, h*liqFrac+4);
    ctx.restore();
    // label
    ctx.fillStyle = 'rgba(95,174,113,0.8)';
    ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
    ctx.fillText(currentAcid().formula, 0, 4);
    ctx.restore();

    // pour stream (only once tilted enough) — animated flow, not a static line
    if (tiltProgress > 0.55 && p.beakerFrac > 0.02) {
      const sx = bx + (w/2 - 4) * Math.cos(tiltAngle) - (-h/2) * Math.sin(tiltAngle);
      const sy = by + (w/2 - 4) * Math.sin(tiltAngle) + (-h/2) * Math.cos(tiltAngle);
      const targetX = pivotX;
      const targetY = buretteTopY - (placed.funnel ? 22 : 0);
      const midX = (sx+targetX)/2, midY = (sy+targetY)/2 - 8;

      ctx.save();
      // Base stream (thin, translucent ribbon)
      ctx.strokeStyle = 'rgba(214,234,246,0.4)'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.quadraticCurveTo(midX, midY, targetX, targetY);
      ctx.stroke();

      // Flowing highlight segments that travel along the stream over time,
      // giving the pour a visible real-time motion cue.
      const flowPhase = (p.elapsed * 2.6) % 1;
      for (let k = 0; k < 3; k++) {
        const t = (flowPhase + k / 3) % 1;
        const px = (1-t)*(1-t)*sx + 2*(1-t)*t*midX + t*t*targetX;
        const py = (1-t)*(1-t)*sy + 2*(1-t)*t*midY + t*t*targetY;
        ctx.fillStyle = `rgba(255,255,255,${0.55 - t*0.35})`;
        ctx.beginPath();
        ctx.ellipse(px, py, 1.6, 3.2, Math.atan2(targetY-sy, targetX-sx), 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function startPourAnimation(beakerLooseId) {
    const beaker = loose[beakerLooseId];
    if (!beaker || beaker.type !== 'beaker-hcl') return;
    if (!placed.burette) { setStatus('⚠️ Mount a burette in the clamp first.', 'warn'); return; }
    const space = state.buretteCapacity - state.buretteFillCc;
    if (space <= 0.5) { setStatus('⚠️ Burette is already full.', 'warn'); return; }

    pourAnim = {
      elapsed: 0,
      duration: 1.8,
      beakerLooseId,
      beakerFrac: beaker.fillFrac,
      pouredCc: 0,
    };
    setStatus('🥃 Pouring HCl into the burette' + (placed.funnel ? ' through the funnel…' : '…'));
  }

  function finishPour() {
    if (!pourAnim) return;
    const beaker = loose[pourAnim.beakerLooseId];
    if (beaker) {
      beaker.fillFrac = Math.max(0, pourAnim.beakerFrac - pourAnim.pouredCc / state.buretteCapacity);
    }
    setStatus(`✓ Poured ${pourAnim.pouredCc.toFixed(1)} cc of HCl into the burette.`, 'ok');
    pourAnim = null;
    updatePanelEnablement();
  }

  function tickPour(dt) {
    if (!pourAnim) return;
    pourAnim.elapsed += dt;
    const tiltProgress = Math.min(1, pourAnim.elapsed / 0.5);
    const activelyPouring = tiltProgress > 0.55 && pourAnim.beakerFrac > 0.02;
    pourAnim._pouring = activelyPouring;
    if (activelyPouring) {
      const space = state.buretteCapacity - state.buretteFillCc;
      const pourRate = 14; // cc/sec
      const amt = Math.min(space, pourRate * dt, pourAnim.beakerFrac * state.buretteCapacity - pourAnim.pouredCc);
      if (amt > 0) {
        state.buretteFillCc += amt;
        pourAnim.pouredCc += amt;
        updateBuretteReadout();
      }
    }
    if (pourAnim.elapsed > pourAnim.duration) finishPour();
  }

  /* ══════════════════════════════════════════════════════════════
     DRAWING — loose apparatus (pipette, dropper, beakers, funnel
     when not yet mounted)
     ══════════════════════════════════════════════════════════════ */
  function drawLooseItems() {
    Object.values(loose).forEach(item => {
      if (pourAnim && item.id === pourAnim.beakerLooseId) return; // drawn by pour anim instead
      switch (item.type) {
        case 'pipette':    drawPipette(item); break;
        case 'dropper':    drawDropper(item); break;
        case 'beaker-hcl': drawBeaker(item, currentAcid().formula, '#5a9bb3', getLiquidColorFor('acid')); break;
        case 'beaker-naoh':drawBeaker(item, currentBase().formula, '#5fae71', getLiquidColorFor('base')); break;
        case 'beaker-ind': drawBeaker(item, 'Ind.', '#c93f72', getLiquidColorFor('indicator')); break;
        case 'funnel':     if (!placed.funnel) drawFunnelLoose(item); break;
      }
    });
  }

  // Stock-bottle colours (before mixing into the flask). Acid and base
  // stocks are themselves colourless in solution; the indicator stock
  // carries a faint tint matching its own un-reacted (acid-side) form,
  // since that's how the bottle actually looks on the shelf.
  function getLiquidColorFor(kind) {
    if (kind === 'acid') return COLOR_LIQUID_NEUTRAL;
    if (kind === 'base') return COLOR_LIQUID_NEUTRAL;
    if (kind === 'indicator') {
      const ind = currentIndicator();
      return mixRgba(ind.colorAcid, COLOR_LIQUID_NEUTRAL, 0.55); // pale, mostly-neutral stock tint
    }
    return 'transparent';
  }

  function drawBeaker(item, label, labelColor, liquidColor) {
    const { x, y } = item;
    const w = 46, h = 56;
    const topY = y - h, baseY = y;
    const liquidH = h * Math.min(1, item.fillFrac);
    const liquidTopY = baseY - liquidH;
    ctx.save();
    ctx.translate(x, 0);
    // shadow
    ctx.save(); ctx.scale(1,0.25);
    const shGrad = ctx.createRadialGradient(0,(baseY+3)/0.25,0,0,(baseY+3)/0.25,w*0.55);
    shGrad.addColorStop(0,'rgba(0,0,0,0.35)'); shGrad.addColorStop(1,'transparent');
    ctx.fillStyle = shGrad; ctx.beginPath(); ctx.arc(0,(baseY+3)/0.25,w*0.55,0,Math.PI*2); ctx.fill();
    ctx.restore();

    function beakerPath() {
      ctx.beginPath();
      ctx.moveTo(-w/2, topY); ctx.lineTo(w/2, topY);
      ctx.lineTo(w/2-4, baseY); ctx.lineTo(-w/2+4, baseY);
      ctx.closePath();
    }
    ctx.save(); beakerPath(); ctx.clip();
    ctx.fillStyle = liquidColor;
    ctx.fillRect(-w/2, liquidTopY, w, baseY-liquidTopY+4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-w/2, liquidTopY, w, 2);
    ctx.restore();

    beakerPath();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.4; ctx.stroke();
    // pour spout notch
    ctx.beginPath(); ctx.moveTo(-w/2, topY); ctx.lineTo(-w/2-4, topY-5); ctx.lineTo(-w/2+4, topY);
    ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2; ctx.stroke();
    // label stripe
    ctx.fillStyle = labelColor; ctx.globalAlpha = 0.9;
    ctx.fillRect(-w/2+6, (topY+baseY)/2-7, w-12, 13);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = `bold 8px 'IBM Plex Mono', monospace`; ctx.textAlign='center';
    ctx.fillText(label, 0, (topY+baseY)/2+3);

    ctx.restore();
    item._hit = { x: x-w/2-4, y: topY-8, w: w+8, h: h+12 };
  }

  function drawPipette(item) {
    const { x, y } = item;
    const w = 14, h = 110, bulbR = 9;
    const tubeTop = y-h+bulbR*2+4, tubeBottom = y-8;
    const fillFrac = item.fillCc / state.pipetteVolume;
    const liquidTop = tubeBottom - (tubeBottom-tubeTop) * Math.min(1,fillFrac);

    ctx.save(); ctx.translate(x, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, y-h+bulbR, bulbR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-3.2, tubeTop, 6.4, tubeBottom-tubeTop); ctx.fill(); ctx.stroke();
    if (item.fillCc > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(-3.2, tubeTop, 6.4, tubeBottom-tubeTop); ctx.clip();
      ctx.fillStyle = getLiquidColorFor(item.source || 'base');
      ctx.fillRect(-3.2, liquidTop, 6.4, tubeBottom-liquidTop);
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-3.2, tubeBottom); ctx.lineTo(-0.6, y); ctx.lineTo(0.6, y); ctx.lineTo(3.2, tubeBottom);
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(100,116,139,0.85)'; ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign='center';
    ctx.fillText(`${state.pipetteVolume}cc`, 0, tubeTop-6);
    ctx.fillText(`${item.fillCc.toFixed(1)}`, 0, y+10);
    ctx.restore();
    item._hit = { x: x-12, y: y-h-4, w: 24, h: h+24 };
  }

  function drawDropper(item) {
    const { x, y } = item;
    const w = 12, h = 60, bulbR = 7;
    ctx.save(); ctx.translate(x, 0);
    ctx.fillStyle = '#c75450'; ctx.strokeStyle = '#8f3a37'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(0, y-h+bulbR+2, bulbR-1, bulbR+1, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    const tubeTop = y-h+bulbR*2+2, tubeBottom = y-6;
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(-2.2, tubeTop, 4.4, tubeBottom-tubeTop); ctx.fill(); ctx.stroke();
    if (item.fillCc > 0) {
      ctx.fillStyle = getLiquidColorFor('indicator');
      ctx.fillRect(-2.2, tubeBottom-(tubeBottom-tubeTop)*0.4, 4.4, (tubeBottom-tubeTop)*0.4);
    }
    ctx.beginPath(); ctx.moveTo(-2.2, tubeBottom); ctx.lineTo(0, y); ctx.lineTo(2.2, tubeBottom);
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.stroke();
    ctx.restore();
    item._hit = { x: x-10, y: y-h-4, w: 20, h: h+12 };
  }

  function drawFunnelLoose(item) {
    const { x, y } = item;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.strokeStyle = '#7fa8b3'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-20, -22); ctx.lineTo(20, -22); ctx.lineTo(5, 4); ctx.lineTo(-5, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(100,116,139,0.85)'; ctx.font = `8px 'IBM Plex Mono', monospace`; ctx.textAlign='center';
    ctx.fillText('funnel', 0, -30);
    ctx.restore();
    item._hit = { x: x-24, y: y-30, w: 48, h: 38 };
  }

  /* ══════════════════════════════════════════════════════════════
     MASTER DRAW
     ══════════════════════════════════════════════════════════════ */
  function draw() {
    ctx.clearRect(0,0,W,H);
    drawBackground();
    drawTable();
    drawStand();
    drawClamp();
    drawBurette();
    drawFunnelMounted();
    drawFlask();
    drawFlowVisualization();
    drawLooseItems();
    drawPourAnimation();
  }

  /* ══════════════════════════════════════════════════════════════
     ANIMATION LOOP
     ══════════════════════════════════════════════════════════════ */
  let lastTS = 0;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTS)/1000);
    lastTS = ts;
    updateFlow(dt);
    tickPour(dt);
    tickShake(dt);
    if (state.valveOpen && state.valveFrac > 0) tickDispense(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ══════════════════════════════════════════════════════════════
     CHEMISTRY — dispensing from burette into flask
     ══════════════════════════════════════════════════════════════ */
  function tickDispense(dt) {
    if (state.buretteFillCc <= 0) {
      closeValveAuto('Burette is empty.');
      return;
    }
    // flow rate scales with valveFrac; capped sensible cc/s
    const rateCcPerSec = state.valveFrac * 6;
    const amt = Math.min(rateCcPerSec * dt, state.buretteFillCc);
    state.buretteFillCc -= amt;
    updateBuretteReadout();

    if (state.flaskMounted) addAcidToFlask(amt);
  }

  function addAcidToFlask(cc) {
    const acid = currentAcid();
    const mol = (cc/1000) * state.acidMolarity;
    const eq = mol * acid.basicity;       // H+ equivalents delivered
    state.flaskEqAcidAdded += eq;
    state.flaskTotalCc += cc;

    const remainingEq = state.flaskEqBase - state.flaskEqAcidAdded;
    if (remainingEq <= 0 && !state.flaskNeutralized) {
      state.flaskNeutralized = true;
      onEndpointReached();
    }
  }

  function onEndpointReached() {
    const ind = currentIndicator();
    setStatus(`🎯 Endpoint reached — indicator has shifted to its acid-side colour (${ind.name}: ${describeIndicatorColor(ind, 'acid')})! Close the valve and log this trial.`, 'ok');
    closeValveAuto(null);
  }

  function describeIndicatorColor(ind, side) {
    // Human-readable colour name for status messages, derived from
    // the indicator's defined colours rather than hard-coded per case.
    const key = state.indicatorKey;
    if (key === 'phenolphthalein') return side === 'acid' ? 'colourless' : 'pink';
    if (key === 'methylorange')    return side === 'acid' ? 'red' : 'yellow';
    return side;
  }

  function closeValveAuto(msg) {
    state.valveOpen = false;
    btnToggleValve.textContent = 'Open Valve';
    valveSlider.disabled = true;
    valveStateLabel.textContent = msg ? 'Empty' : 'Closed';
    if (msg) setStatus('⚠️ ' + msg, 'warn');
  }

  /* ══════════════════════════════════════════════════════════════
     VALVE CONTROLS
     ══════════════════════════════════════════════════════════════ */
  btnToggleValve.addEventListener('click', () => {
    state.valveOpen = !state.valveOpen;
    btnToggleValve.textContent = state.valveOpen ? 'Close Valve' : 'Open Valve';
    valveSlider.disabled = !state.valveOpen;
    valveStateLabel.textContent = state.valveOpen ? 'Open' : 'Closed';
    if (state.valveOpen) startTrialIfNeeded();
  });
  valveSlider.addEventListener('input', () => {
    state.valveFrac = parseInt(valveSlider.value) / 100;
  });

  function updateBuretteReadout() {
    buretteReadout.innerHTML = `${state.buretteFillCc.toFixed(1)}<span style="font-size:14px;color:var(--text-dim)"> cc</span>`;
    buretteReadoutFill.style.width = `${(state.buretteFillCc/state.buretteCapacity)*100}%`;
  }

  /* ══════════════════════════════════════════════════════════════
     TRIALS
     ══════════════════════════════════════════════════════════════ */
  function startTrialIfNeeded() {
    if (state.currentTrialActive) return;
    state.currentTrialActive = true;
    state.buretteInitialReading = state.buretteCapacity - state.buretteFillCc;
  }

  btnNewTrial.addEventListener('click', logCurrentTrial);

  function logCurrentTrial() {
    if (!placed.burette) { setStatus('No burette on the bench.', 'warn'); return; }
    const initial = state.buretteInitialReading != null ? state.buretteInitialReading : 0;
    const final = state.buretteCapacity - state.buretteFillCc;
    const used = Math.max(0, final - initial);

    state.trials.push({ n: state.trials.length+1, initial, final, used });
    renderTrialTable();
    computeResult();
    resetForNextTrial();
    setStatus(`Trial ${state.trials.length} logged: ${used.toFixed(2)} cc of ${currentAcid().formula} used.`, 'ok');
  }

  function resetForNextTrial() {
    state.flaskHasBase = false;
    state.flaskHasIndicator = false;
    state.flaskBaseCc = 0;
    state.flaskTotalCc = 0;
    state.flaskEqBase = 0;
    state.flaskEqAcidAdded = 0;
    state.flaskNeutralized = false;
    state.currentTrialActive = false;
    state.buretteInitialReading = null;
    updateFlaskStatusList();
    updatePanelEnablement();
  }

  function renderTrialTable() {
    trialTbody.innerHTML = state.trials.map(t => `
      <tr class="trial-row-new">
        <td>${t.n}</td><td>${t.initial.toFixed(1)}</td><td>${t.final.toFixed(1)}</td><td>${t.used.toFixed(2)}</td>
      </tr>`).join('');
  }

  // General concentration back-calculation, valid for any acid/base
  // pair regardless of how many H+/OH- each formula unit carries:
  //
  //   mol(acid) × basicity(acid) = mol(base) × acidity(base)   [at equivalence]
  //   C(acid)·V(acid)·basicity   = C(base)·V(base)·acidity
  //   C(base) = C(acid)·V(acid)·basicity / (V(base)·acidity)
  function computeResult() {
    if (!state.trials.length) return;
    const vols = state.trials.map(t => t.used).filter(v => v > 0);
    if (!vols.length) return;
    const mean = vols.reduce((a,b)=>a+b,0)/vols.length;
    document.getElementById('result-mean').textContent = mean.toFixed(2)+' cc';

    const acid = currentAcid(), base = currentBase();
    const vBase = state.pipetteVolume;
    const concBase = (state.acidMolarity * mean * acid.basicity) / (vBase * base.acidity);
    document.getElementById('result-conc').textContent = concBase.toFixed(3)+' M';
  }

  /* ══════════════════════════════════════════════════════════════
     SWIRL / SHAKE  — drives a real, visible rocking motion of the
     conical flask (pivoting about its base so the base stays put)
     and a sloshing tilt of the liquid surface inside it.
     ══════════════════════════════════════════════════════════════ */
  let shakeAnim = null; // { elapsed, duration }
  btnShake.addEventListener('click', () => {
    shakeAnim = { elapsed: 0, duration: 1.6 };
    setStatus('🌀 Swirling flask to mix contents…');
  });
  function tickShake(dt) {
    if (!shakeAnim) return;
    shakeAnim.elapsed += dt;
    if (shakeAnim.elapsed > shakeAnim.duration) shakeAnim = null;
  }
  // Current flask rotation angle (radians) + liquid-surface tilt,
  // derived from the active shake animation with a decaying envelope
  // so the swirl settles down naturally rather than stopping abruptly.
  function getShakeState() {
    if (!shakeAnim) return { angle: 0, slosh: 0 };
    const t = shakeAnim.elapsed;
    const envelope = Math.max(0, 1 - t / shakeAnim.duration);
    const angle = Math.sin(t * 14) * 0.16 * envelope;
    const slosh = Math.sin(t * 14 - 0.6) * 0.22 * envelope;
    return { angle, slosh };
  }

  /* ══════════════════════════════════════════════════════════════
     STATUS / CHECKLISTS
     ══════════════════════════════════════════════════════════════ */
  function setStatus(msg, cls) {
    expStatus.textContent = msg;
    expStatus.className = 'status-msg' + (cls ? ' '+cls : '');
    overlayStatus.textContent = msg;
  }

  function updateFlaskStatusList() {
    setDot('chk-naoh', state.flaskHasBase);
    setDot('chk-ind', state.flaskHasIndicator);
    setDot('chk-mount', state.flaskMounted);
  }
  function setDot(id, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('ok', !!ok);
  }

  function updatePanelEnablement() {
    const rigReady = placed.burette && assembled && state.flaskMounted &&
                      state.flaskHasBase && state.flaskHasIndicator && state.buretteFillCc > 0;
    btnToggleValve.disabled = !rigReady;
    btnShake.disabled = !placed.flask || !state.flaskHasBase;
    btnNewTrial.disabled = !(placed.burette && state.flaskHasBase);
    updateFlaskStatusList();
    updateBuretteReadout();
  }

  /* ══════════════════════════════════════════════════════════════
     ASSEMBLY: stand / clamp / burette / flask placement (drag from
     shelf cards). Stand+clamp+burette are geometry-driven (sliders);
     flask + small apparatus are loose, drag-positioned objects.
     ══════════════════════════════════════════════════════════════ */
  const RIG_ORDER = ['stand','clamp','burette'];

  function updateAssemblyDots() {
    ['stand','clamp','burette','flask'].forEach(k => {
      const el = document.getElementById(`asm-${k}`);
      if (el) el.classList.toggle('ok', !!placed[k]);
    });
    assembled = ['stand','clamp','burette'].every(k => placed[k]);

    if (placed.stand)  { slHeight.disabled = false; }
    if (placed.clamp)  { slReach.disabled = false; slClampHeight.disabled = false; }
    if (placed.burette) { slBuretteHeight.disabled = false; }

    if (assembled) setStatus('✅ Stand, clamp & burette assembled. Pour in HCl, then build the flask side.', 'ok');
  }

  function markRigPlaced(type) {
    placed[type] = true;
    const card = document.getElementById(`card-${type}`);
    if (card) card.classList.add('placed-single');
    updateAssemblyDots();
    recalcGeometry();
  }

  function initDragAndDrop() {
    RIG_ORDER.concat(['flask']).forEach(type => {
      const card = document.getElementById(`card-${type}`);
      if (!card) return;
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
    ['pipette','dropper','beaker-hcl','beaker-naoh','beaker-ind','funnel'].forEach(type => {
      const card = document.getElementById(`card-${type}`);
      if (!card) return;
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    wWrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; wWrap.classList.add('drag-over'); });
    wWrap.addEventListener('dragleave', () => wWrap.classList.remove('drag-over'));
    wWrap.addEventListener('drop', e => {
      e.preventDefault();
      wWrap.classList.remove('drag-over');
      const type = e.dataTransfer.getData('text/plain');
      if (!type) return;
      const rect = wWrap.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      handleDropType(type, x, y);
    });
  }

  function handleDropType(type, x, y) {
    if (RIG_ORDER.includes(type)) {
      if (placed[type]) { setStatus(`${type} already on the bench.`, 'warn'); return; }
      const idx = RIG_ORDER.indexOf(type);
      for (let i=0;i<idx;i++) {
        if (!placed[RIG_ORDER[i]]) { setStatus(`⚠️ Place the ${RIG_ORDER[i]} first.`, 'warn'); return; }
      }
      markRigPlaced(type);
      const msgs = {
        stand: '🧪 Retort stand placed. Drop the clamp next.',
        clamp: '🗜️ Clamp attached. Drop the burette into its jaws.',
        burette: '🧫 Burette mounted! Pour in HCl, or add a funnel first.',
      };
      setStatus(msgs[type]);
      return;
    }

    if (type === 'flask') {
      if (placed.flask) { setStatus('Flask already on the bench.', 'warn'); return; }
      placed.flask = true;
      flaskPlacedFree = { x, y };
      const card = document.getElementById('card-flask');
      if (card) card.classList.add('placed-single');
      updateAssemblyDots();
      checkFlaskSnap();
      setStatus('🧪 Conical flask placed. Drag it under the burette to mount it.');
      return;
    }

    if (type === 'funnel') {
      // funnel is single-use; if dropped near burette top, mount it
      if (placed.funnel) { setStatus('Funnel already on the bench.', 'warn'); return; }
      if (placed.burette && Math.hypot(x-pivotX, y-buretteTopY) < 60) {
        placed.funnel = true;
        const card = document.getElementById('card-funnel');
        if (card) card.classList.add('placed-single');
        setStatus('🔺 Funnel mounted at the burette opening.');
      } else {
        addLooseItem('funnel', x, y);
      }
      return;
    }

    // remaining loose, freely-positioned apparatus
    addLooseItem(type, x, y);
  }

  function addLooseItem(type, x, y) {
    const id = 'L' + (nextLooseId++);
    const item = { id, type, x, y };
    if (type === 'pipette') item.fillCc = 0;
    if (type === 'dropper') item.fillCc = 0;
    if (type === 'beaker-hcl')  item.fillFrac = 0.75;
    if (type === 'beaker-naoh') item.fillFrac = 0.75;
    if (type === 'beaker-ind')  item.fillFrac = 0.6;
    loose[id] = item;
    makeLooseDraggable(id);
  }

  /* ══════════════════════════════════════════════════════════════
     LOOSE-ITEM DRAG (canvas-space, mouse events)
     ══════════════════════════════════════════════════════════════ */
  function makeLooseDraggable(id) {
    // handled centrally in canvas mouse handlers (hit-test by _hit box)
  }

  function findLooseAt(px, py) {
    for (const id in loose) {
      const item = loose[id];
      const hb = item._hit;
      if (hb && px>=hb.x && px<=hb.x+hb.w && py>=hb.y && py<=hb.y+hb.h) return item;
    }
    return null;
  }

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    // dragging the flask?
    if (placed.flask && flaskHitBox &&
        x>=flaskHitBox.x && x<=flaskHitBox.x+flaskHitBox.w &&
        y>=flaskHitBox.y && y<=flaskHitBox.y+flaskHitBox.h) {
      dragLoose = { kind:'flask', ox: x-getFlaskPos().x, oy: y-getFlaskPos().y };
      state.flaskMounted = false;
      return;
    }
    const item = findLooseAt(x, y);
    if (item) { dragLoose = { kind:'loose', id:item.id, ox: x-item.x, oy: y-item.y }; }
  });

  canvas.addEventListener('mousemove', e => {
    if (!dragLoose) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (dragLoose.kind === 'flask') {
      flaskPlacedFree = { x: x-dragLoose.ox, y: y-dragLoose.oy };
    } else {
      const item = loose[dragLoose.id];
      if (item) { item.x = x-dragLoose.ox; item.y = y-dragLoose.oy; }
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (!dragLoose) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (dragLoose.kind === 'flask') {
      checkFlaskSnap();
    } else {
      const item = loose[dragLoose.id];
      if (item) handleLooseRelease(item, x, y);
    }
    dragLoose = null;
  });

  function checkFlaskSnap() {
    if (!placed.burette) { state.flaskMounted = false; updatePanelEnablement(); return; }
    const dist = Math.abs(flaskPlacedFree.x - pivotX);
    if (dist < 45) {
      state.flaskMounted = true;
      flaskPlacedFree.x = pivotX; // exact axis alignment with burette tip
      setStatus('📍 Flask aligned under the burette tip, base resting on the bench.', 'ok');
    } else {
      state.flaskMounted = false;
    }
    updateFlaskStatusList();
    updatePanelEnablement();
  }

  function handleLooseRelease(item, x, y) {
    // Acid beaker dropped near burette top -> pour animation
    if (item.type === 'beaker-hcl' && placed.burette) {
      const distToTop = Math.hypot(x-pivotX, y-buretteTopY);
      if (distToTop < 70) { startPourAnimation(item.id); return; }
    }
    // Pipette dropped on base beaker -> draw; dropped on flask -> dispense
    if (item.type === 'pipette') {
      const baseBeaker = Object.values(loose).find(o => o.type==='beaker-naoh' && nearItem(o, x, y));
      if (baseBeaker && item.fillCc < state.pipetteVolume - 0.01) {
        item.fillCc = state.pipetteVolume;
        item.source = 'base';
        setStatus(`Pipette drew ${state.pipetteVolume} cc of ${currentBase().formula} solution.`, 'ok');
        return;
      }
      if (placed.flask && item.fillCc > 0 && item.source === 'base' && nearFlask(x, y)) {
        dispensePipetteIntoFlask(item);
        return;
      }
    }
    // Dropper dropped on indicator beaker -> fill
    if (item.type === 'dropper') {
      const indBeaker = Object.values(loose).find(o => o.type==='beaker-ind' && nearItem(o, x, y));
      if (indBeaker) {
        item.fillCc = 2;
        item.source = 'indicator';
        setStatus('Dropper filled with phenolphthalein indicator.', 'ok');
      }
    }
  }

  function nearItem(item, x, y) {
    const hb = item._hit;
    if (!hb) return Math.hypot(item.x-x, item.y-y) < 40;
    return x>=hb.x-20 && x<=hb.x+hb.w+20 && y>=hb.y-20 && y<=hb.y+hb.h+20;
  }
  function nearFlask(x, y) {
    if (!flaskHitBox) return false;
    return x>=flaskHitBox.x-20 && x<=flaskHitBox.x+flaskHitBox.w+20 &&
           y>=flaskHitBox.y-20 && y<=flaskHitBox.y+flaskHitBox.h+20;
  }

  // click (not drag) handling for dropper -> flask, since adding a
  // drop is a discrete action rather than a release-based drop
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const item = findLooseAt(x, y);
    if (item && item.type === 'dropper' && item.source === 'indicator' && item.fillCc > 0) {
      if (nearFlask(item.x, item.y) || nearFlask(x,y)) addIndicatorDrop();
    }
  });

  function dispensePipetteIntoFlask(pipetteItem) {
    const vol = pipetteItem.fillCc;
    const base = currentBase();
    const mol = (vol/1000) * state.baseMolarity;
    const eq = mol * base.acidity; // OH- equivalents delivered
    state.flaskHasBase = true;
    state.flaskBaseCc += vol;
    state.flaskEqBase += eq;
    state.flaskTotalCc += vol;
    pipetteItem.fillCc = 0;
    pipetteItem.source = null;
    setStatus(`Dispensed ${vol.toFixed(1)} cc of ${base.formula} into the conical flask.`, 'ok');
    updateFlaskStatusList();
    updatePanelEnablement();
  }

  function addIndicatorDrop() {
    state.flaskHasIndicator = true;
    const ind = currentIndicator();
    const colorNote = state.flaskHasBase ? ` Solution turns ${describeIndicatorColor(ind, 'base')} in the base.` : '';
    setStatus(`Added a drop of ${ind.name}.${colorNote}`, 'ok');
    updateFlaskStatusList();
    updatePanelEnablement();
  }

  /* ══════════════════════════════════════════════════════════════
     RESET
     ══════════════════════════════════════════════════════════════ */
  function resetAll() {
    placed = { stand:false, clamp:false, burette:false, flask:false, funnel:false };
    assembled = false;
    loose = {};
    pourAnim = null;
    drops = [];

    state.buretteFillCc = 0;
    state.valveOpen = false;
    state.valveFrac = 0;
    state.buretteInitialReading = null;
    state.flaskHasBase = false;
    state.flaskHasIndicator = false;
    state.flaskBaseCc = 0;
    state.flaskTotalCc = 0;
    state.flaskEqBase = 0;
    state.flaskEqAcidAdded = 0;
    state.flaskNeutralized = false;
    state.flaskMounted = false;
    state.trials = [];
    state.currentTrialActive = false;

    ['stand','clamp','burette','flask','funnel'].forEach(t => {
      const card = document.getElementById(`card-${t}`);
      if (card) card.classList.remove('placed-single');
      const dot = document.getElementById(`asm-${t}`);
      if (dot) dot.classList.remove('ok');
    });

    [slHeight, slReach, slClampHeight, slBuretteHeight].forEach(s => s.disabled = true);
    slBuretteHeight.value = 0;
    valBuretteHeight.textContent = '0 cm';
    btnToggleValve.disabled = true; btnToggleValve.textContent = 'Open Valve';
    valveSlider.disabled = true; valveSlider.value = 0;
    valveStateLabel.textContent = 'Closed';
    btnShake.disabled = true; btnNewTrial.disabled = true;

    renderTrialTable();
    document.getElementById('result-mean').textContent = '—';
    document.getElementById('result-conc').textContent = '—';
    updateFlaskStatusList();
    updateBuretteReadout();
    setStatus('↺ Lab reset — drag the apparatus back onto the bench.');
    recalcGeometry();
  }
  btnReset.addEventListener('click', resetAll);

  /* ══════════════════════════════════════════════════════════════
     SLIDER & REAGENT WIRING
     ══════════════════════════════════════════════════════════════ */
  slHeight.addEventListener('input', () => { valHeight.textContent = `${slHeight.value} cm`; recalcGeometry(); });
  slReach.addEventListener('input', () => { valReach.textContent = `${slReach.value} cm`; recalcGeometry(); });
  slClampHeight.addEventListener('input', () => { valClampHeight.textContent = `${slClampHeight.value} cm`; recalcGeometry(); });
  slBuretteHeight.addEventListener('input', () => {
    const v = parseInt(slBuretteHeight.value);
    valBuretteHeight.textContent = `${v > 0 ? '+' : ''}${v} cm`;
    recalcGeometry();
  });

  acidSlider.addEventListener('input', () => {
    state.acidMolarity = parseFloat(acidSlider.value);
    acidVal.textContent = state.acidMolarity.toFixed(2) + ' M';
  });
  baseSlider.addEventListener('input', () => {
    state.baseMolarity = parseFloat(baseSlider.value);
    baseVal.textContent = state.baseMolarity.toFixed(2) + ' M';
  });
  selAcid.addEventListener('change', () => {
    state.acidKey = selAcid.value;
    refreshReagentLabels();
    updateChemInfo();
  });
  selBase.addEventListener('change', () => {
    state.baseKey = selBase.value;
    refreshReagentLabels();
    updateChemInfo();
  });
  selIndicator.addEventListener('change', () => {
    state.indicatorKey = selIndicator.value;
    refreshReagentLabels();
    updateChemInfo();
  });
  document.querySelectorAll('#seg-pipette-vol .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-pipette-vol .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.pipetteVolume = parseInt(btn.dataset.vol);
    });
  });

  // Keep the toolbar beaker descriptions and the reaction formula box
  // in sync with whatever acid/base/indicator is currently selected.
  function refreshReagentLabels() {
    const acid = currentAcid(), base = currentBase(), ind = currentIndicator();
    descBeakerAcid.textContent = `${acid.formula} stock${acid.strong ? '' : ' (weak)'}`;
    descBeakerBase.textContent = `${base.formula} stock${base.strong ? '' : ' (weak)'}`;
    descBeakerInd.textContent  = `${ind.name} stock`;
    formulaMainEl.textContent = `${acid.basicity > 1 ? acid.basicity + ' ' : ''}${base.formula} + ${acid.formula} → salt + H₂O`;
    formulaSubEl.textContent  = `${acid.basicity} eq H⁺/${acid.formula}  ·  ${base.acidity} eq OH⁻/${base.formula}`;
  }

  // Live chemistry guidance — mirrors the judgement call a student
  // makes in a real lab before starting: is this indicator going to
  // give a sharp, accurate endpoint for this acid/base pairing?
  function updateChemInfo() {
    const acid = currentAcid(), base = currentBase();
    const fit = judgeIndicatorFit(acid, base, state.indicatorKey);
    const strengthLine = `${acid.name} (${acid.strong ? 'strong' : 'weak'}) + ${base.name} (${base.strong ? 'strong' : 'weak'})`;
    const cls = fit.severity === 'good' ? 'chem-good' : (fit.ok === false && fit.severity === 'warn' ? 'chem-warn' : 'chem-caution');
    chemInfoBox.innerHTML = `
      <div class="chem-line">${strengthLine}</div>
      <div class="chem-line ${cls}">${fit.msg}</div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     HELP MODAL
     ══════════════════════════════════════════════════════════════ */
  const modalOverlay = document.getElementById('modal-overlay');
  document.getElementById('btn-help').addEventListener('click', () => modalOverlay.classList.add('open'));
  document.getElementById('btn-close-help').addEventListener('click', () => modalOverlay.classList.remove('open'));
  modalOverlay.addEventListener('click', e => { if (e.target===modalOverlay) modalOverlay.classList.remove('open'); });

  /* ══════════════════════════════════════════════════════════════
     CANVAS RESIZE
     ══════════════════════════════════════════════════════════════ */
  function resizeCanvas() {
    const rect = wWrap.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    W = canvas.width; H = canvas.height;
    recalcGeometry();
  }
  window.addEventListener('resize', resizeCanvas);

  /* ══════════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════════ */
  function boot() {
    resizeCanvas();
    initDragAndDrop();
    recalcGeometry();
    updatePanelEnablement();
    refreshReagentLabels();
    updateChemInfo();
    requestAnimationFrame(ts => { lastTS = ts; loop(ts); });
  }

  // Expose for headless testing
  window.__titrationTest = {
    state, placed, loose,
    ACIDS, BASES, INDICATORS,
    currentAcid, currentBase, currentIndicator,
    judgeIndicatorFit, estimateEquivalencePh,
    recalcGeometry, handleDropType, addLooseItem,
    dispensePipetteIntoFlask, addIndicatorDrop,
    startPourAnimation, finishPour, tickPour, tickDispense,
    addAcidToFlask,
    flaskColor, updatePanelEnablement, logCurrentTrial,
    checkFlaskSnap, getFlaskPos,
    refreshReagentLabels, updateChemInfo,
    tickShake, getShakeState,
    triggerShake: () => { shakeAnim = { elapsed: 0, duration: 1.6 }; },
    getPourPouringFlag: () => !!(pourAnim && pourAnim._pouring),
    get pivotX()     { return pivotX; },    get pivotY()      { return pivotY; },
    get buretteTopY(){ return buretteTopY; },get buretteTipY() { return buretteTipY; },
    get STAND_BASE_Y(){ return STAND_BASE_Y; },get flaskBaseY() { return flaskBaseY; },
  };

  boot();
})();