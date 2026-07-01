(function(){
"use strict";

/* ============================================================
   STATE
   ============================================================ */
const PX_PER_CM = 16; // visual scale for block thickness / radius

const state = {
  placed: { board:false, raybox:false, protractor:false, setsquare:false, ruler:false, pencil:false, pins:false },
  blockPlaced: false,
  activeBlockType: 'block-a',
  blocks: {
    'block-a':    { name:'Glass Block A',     n:1.52, mode:'rect' },
    'block-b':    { name:'Glass Block B',     n:1.65, mode:'rect' },
    'block-semi': { name:'Semicircular Block',n:1.50, mode:'semi' },
    'prism':      { name:'Triangular Prism',  n:1.52, mode:'prism' }
  },
  board: { x:380, y:120, w:480, h:560 },
  sizeCm: 6,          // thickness (rect) or radius (semi), in cm
  entryOffsetCm: 3,   // distance from left block edge to the normal point, in cm
  protractorAngle: 0, // rotation of the protractor relative to the normal, in degrees
  angleI: 35,         // degrees, measured from the normal
  unit: 'deg',
  trials: [],
  zoom: 1,
  pan: { x:0, y:0 },
  /* ── Pin tracing state ── */
  pins2D: {
    P1: { t: 0.38 },  // t ∈ (0,1): 0 = at block face, 1 = far from block
    P2: { t: 0.74 },
    P3: null,          // {x,y} on board, emergent side of block (null = not placed)
    P4: null,
    placing: null,     // 'P3'|'P4'  — placement mode active
    dragging: null,    // 'P1'|'P2'  — dragging in 2D view
  }
};

/* ============================================================
   DOM REFS
   ============================================================ */
const stage = document.getElementById('stage');
const stageViewport = document.getElementById('stageViewport');
const toastEl = document.getElementById('toast');
const canvas = document.getElementById('rayCanvas');
const ctx = canvas.getContext('2d');
// drawing overlay for freehand trace
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
let pickType = null; // tap-to-place type
let experimenterMode = false; // must be true to allow pins placement
let traceMode = false; // freehand trace enabled
let isDrawing = false; let lastPos = null;

/* ============================================================
   UTILITIES
   ============================================================ */
function showToast(msg, ms=2800){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=>toastEl.classList.remove('show'), ms);
}
function fmt(n,d=2){ return Number(n).toFixed(d); }
function deg2rad(d){ return d*Math.PI/180; }
function rad2deg(r){ return r*180/Math.PI; }
function activeBlock(){ return state.blocks[state.activeBlockType]; }
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }

/* ============================================================
   PIN-TRACING HELPERS
   ============================================================ */
/* Position of incident pin along the incident ray.
   t=0 → at block entry face; t=1 → at ray source end (180 px from face) */
function pinOnRay(t, geo){
  const L=t*180, r=deg2rad(geo.iDeg);
  return { x: geo.P0.x - L*Math.sin(r), y: geo.P0.y - L*Math.cos(r) };
}
/* Convert a raw canvas (x,y) → t value along the incident ray for pin dragging */
function pointToRayT(px, py, geo){
  const r=deg2rad(geo.iDeg);
  const dot=(geo.P0.x-px)*(-Math.sin(r)) + (geo.P0.y-py)*(-Math.cos(r));
  return clamp(dot/180, 0.06, 0.97);
}
/* Update the console pin buttons to reflect current state */
function updatePinButtons(){
  const bp3=document.getElementById('btnPlaceP3');
  const bp4=document.getElementById('btnPlaceP4');
  const bclr=document.getElementById('btnClearPins');
  const bchk=document.getElementById('btnCheckAlign');
  if(!bp3) return;
  const active=state.pins2D.placing;
  const canPlace=state.placed.pins && state.blockPlaced;
  bp3.disabled = !canPlace;
  bp4.disabled = !canPlace;
  bp3.classList.toggle('active', active==='P3');
  bp4.classList.toggle('active', active==='P4');
  const hasP3=!!state.pins2D.P3, hasP4=!!state.pins2D.P4;
  bclr.disabled = !hasP3 && !hasP4;
  bchk.disabled = !hasP3 || !hasP4;
}
/* ============================================================
   PHYSICS — Snell's Law geometry
   ============================================================ */
// Returns the full ray-trace geometry for the current state.
function cross2(a,b){ return a.x*b.y - a.y*b.x; }
function dot(a,b){ return a.x*b.x + a.y*b.y; }
function normalize(v){ const len=Math.hypot(v.x,v.y)||1; return {x:v.x/len,y:v.y/len}; }
function rotateVec(v, angle){ const c=Math.cos(angle), s=Math.sin(angle); return {x:v.x*c - v.y*s, y:v.x*s + v.y*c}; }
function pointOnSegment(a,b,t){ return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t}; }
function getFaceNormal(seg, interiorPoint, inward){
  const dir = normalize({x:seg.b.x-seg.a.x, y:seg.b.y-seg.a.y});
  const n = {x:-dir.y, y:dir.x};
  const mid = {x:(seg.a.x+seg.b.x)/2, y:(seg.a.y+seg.b.y)/2};
  const toInterior = normalize({x:interiorPoint.x-mid.x, y:interiorPoint.y-mid.y});
  if (dot(n, toInterior) < 0){ n.x *= -1; n.y *= -1; }
  return inward ? n : {x:-n.x,y:-n.y};
}
function getIncidentDirection(normal, angleRad){
  return normalize(rotateVec(normal, -angleRad));
}
function refractVector(I, N, eta){
  const cosI = -dot(N, I);
  const k = 1 - eta*eta*(1 - cosI*cosI);
  if (k < 0) return null;
  const cosT = Math.sqrt(k);
  return normalize({
    x: eta*I.x + (eta*cosI - cosT) * N.x,
    y: eta*I.y + (eta*cosI - cosT) * N.y
  });
}
function reflectVector(I, N){
  return normalize({x:I.x - 2*dot(N,I)*N.x, y:I.y - 2*dot(N,I)*N.y});
}
function intersectRaySegment(origin, dir, a, b){
  const r = {x:b.x-a.x, y:b.y-a.y};
  const s = dir;
  const denom = cross2(r, s);
  if (Math.abs(denom) < 1e-8) return null;
  const c = {x:origin.x-a.x, y:origin.y-a.y};
  const t = cross2(c, s) / denom;
  const u = cross2(c, r) / denom;
  if (t < -1e-6 || t > 1 + 1e-6 || u < 0) return null;
  return { point:{x:origin.x + u*s.x, y:origin.y + u*s.y}, t:u, segmentT:t };
}

function computeGeometry(){
  const block = activeBlock();
  const n = block.n;
  const iNormalDeg = state.angleI;
  const iNormalRad = deg2rad(iNormalDeg);
  const sizePx = state.sizeCm * PX_PER_CM;

  const cx = state.board.x + state.board.w/2;
  let result = { mode: block.mode, n, iDeg: iNormalDeg, sizePx, cx, entryOffsetCm: state.entryOffsetCm, protractorAngle: state.protractorAngle };

  if (block.mode === 'rect'){
    const blockTop = state.board.y + 140;
    const blockLeft = state.board.x + 30;
    const blockWidth = state.board.w - 60;
    const offsetPx = Math.min(Math.max(state.entryOffsetCm * PX_PER_CM, 10), blockWidth - 10);
    const P0 = { x: blockLeft + offsetPx, y: blockTop };
    const rRad = Math.asin(Math.sin(iNormalRad)/n);
    const rNormalDeg = rad2deg(rRad);
    const t = sizePx; // thickness in px
    const exitOffsetPx = t * Math.tan(rRad);
    const P1 = { x: P0.x + exitOffsetPx, y: P0.y + t };
    const displacementMm = Math.abs(exitOffsetPx / PX_PER_CM * 10);
    const EFpx = Math.hypot(P1.x - P0.x, P1.y - P0.y);
    const EFmm = EFpx / PX_PER_CM * 10;
    Object.assign(result, {
      blockTop, blockBottom: blockTop+t, blockLeft, blockWidth, P0, P1, rDeg: rNormalDeg, rRad,
      outerDeg: iNormalDeg, innerDeg: rNormalDeg, displacementMm, EFmm, tir:false,
      iNormalDeg, rNormalDeg
    });
  } else if (block.mode === 'prism'){
    const prismHeight = Math.max(90, sizePx * 1.15);
    const prismHalfWidth = Math.min(120, Math.max(70, prismHeight * 0.7));
    const prismTopY = state.board.y + 140;
    const prismBaseY = prismTopY + prismHeight;
    const prismLeft = cx - prismHalfWidth;
    const prismRight = cx + prismHalfWidth;
    const leftFace = { a:{x:prismLeft,y:prismBaseY}, b:{x:cx,y:prismTopY} };
    const rightFace = { a:{x:cx,y:prismTopY}, b:{x:prismRight,y:prismBaseY} };
    const interiorPoint = { x: cx, y: prismTopY + prismHeight*0.25 };
    const entryT = clamp(0.2 + (state.entryOffsetCm / 10) * 0.5, 0.2, 0.8);
    const P0 = pointOnSegment(leftFace.a, leftFace.b, entryT);
    const entryNormalIn = getFaceNormal(leftFace, interiorPoint, true);
    const entryNormalOut = { x: -entryNormalIn.x, y: -entryNormalIn.y };
    const incidentDir = getIncidentDirection(entryNormalOut, iNormalRad);
    const internalDir = refractVector(incidentDir, entryNormalOut, 1 / n) || reflectVector(incidentDir, entryNormalOut);
    const exitHit = intersectRaySegment(P0, internalDir, rightFace.a, rightFace.b);
    const P1 = exitHit ? exitHit.point : { x: P0.x + 160 * internalDir.x, y: P0.y + 160 * internalDir.y };
    const exitNormalIn = getFaceNormal(rightFace, interiorPoint, true);
    const exitNormalOut = { x: -exitNormalIn.x, y: -exitNormalIn.y };
    const exitDir = refractVector(internalDir, exitNormalIn, n) || reflectVector(internalDir, exitNormalIn);
    const exitAngleDeg = exitDir ? rad2deg(Math.acos(clamp(dot(exitNormalOut, exitDir), -1, 1))) : null;
    const innerAngleDeg = internalDir ? rad2deg(Math.acos(clamp(dot(entryNormalIn, internalDir), -1, 1))) : null;
    Object.assign(result, {
      blockTop: prismTopY,
      blockBottom: prismBaseY,
      prismHeight,
      prismHalfWidth,
      P0,
      P1,
      rDeg: exitAngleDeg,
      innerDeg: innerAngleDeg,
      outerDeg: exitAngleDeg,
      displacementMm: null,
      tir: false,
      entryNormal: entryNormalIn,
      exitNormal: exitNormalOut,
      incidentDir,
      internalDir,
      exitDir,
      entryFace: leftFace,
      exitFace: rightFace,
      iNormalDeg,
      rNormalDeg: exitAngleDeg
    });
  } else {
    // semicircular: flat face down at y = flatY, dome above
    const blockTop = state.board.y + 100;
    const radiusPx = sizePx;
    const flatY = blockTop + radiusPx;
    const P0 = { x: cx, y: flatY };
    const critRad = Math.asin(Math.min(1, 1/n));
    const critDeg = rad2deg(critRad);
    const tir = iNormalDeg >= critDeg;
    let outDeg=null, outRad=null, P1=null;
    if (!tir){
      outRad = Math.asin(Math.min(1, n*Math.sin(iNormalRad)));
      outDeg = rad2deg(outRad);
      const reach = 170;
      P1 = { x: P0.x + reach*Math.sin(outRad), y: P0.y + reach*Math.cos(outRad) };
    } else {
      const reach = 170;
      P1 = { x: P0.x + reach*Math.sin(iNormalRad), y: P0.y - reach*Math.cos(iNormalRad) }; // reflected back upward
    }
    Object.assign(result, {
      blockTop, blockBottom: flatY, radiusPx, P0, P1,
      critDeg, tir, outerDeg: tir? null : outDeg, innerDeg: iNormalDeg, displacementMm: null,
      iNormalDeg, rNormalDeg: null
    });
  }
  return result;
}

/* ============================================================
   TRAY DRAG SOURCE
   ============================================================ */
document.querySelectorAll('.apparatus-card[draggable], .apparatus-row[draggable]').forEach(card=>{
  card.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('text/plain', card.dataset.type);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
  // tap (click) to pick up item for placement on touch devices
  card.addEventListener('click', e=>{
    const type = card.dataset.type;
    pickType = type;
    showToast(`Tap the bench to place: ${card.querySelector('strong')?card.querySelector('strong').textContent: type}`);
  });
});

stageViewport.addEventListener('dragover', e=>e.preventDefault());
stageViewport.addEventListener('drop', e=>{
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  if (!type) return;
  const rect = stageViewport.getBoundingClientRect();
  const dropX = (e.clientX - rect.left - state.pan.x) / state.zoom;
  const dropY = (e.clientY - rect.top - state.pan.y) / state.zoom;
  handleDrop(type, dropX, dropY);
});

// tap on the stage: if an apparatus is picked via tap, place it; otherwise allow tapping pieces
stageViewport.addEventListener('click', e=>{
  // compute local coords
  const rect = stageViewport.getBoundingClientRect();
  const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
  const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
  if (pickType){ handleDrop(pickType, x, y); pickType = null; return; }
  // if tap hits a placed glass block, remove it
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && (el.closest('.glass-rect') || el.closest('.glass-semi') || el.closest('.glass-prism'))){
    if (!confirm('Remove the glass block from the bench?')) return;
    removeApparatus('block');
    showToast('Glass block removed.');
  }
});

function markTrayPlaced(type, val){
  const card = document.querySelector(`.apparatus-card[data-type="${type}"]`);
  if (card) card.dataset.placed = val ? "true" : "false";
}

/* ============================================================
   DROP HANDLER / SNAP LOGIC
   ============================================================ */
const BLOCK_TYPES = ['block-a','prism'];

function handleDrop(type, x, y){
  if (type === 'board'){
    state.board.x = Math.max(40, x - state.board.w/2);
    state.board.y = Math.max(20, y - state.board.h/2);
    state.placed.board = true;
    markTrayPlaced('board', true);
    showToast('Drawing board placed. Now add a glass block.');
  } else if (BLOCK_TYPES.includes(type)){
    if (!state.placed.board){ showToast('Place the Drawing Board first.'); return; }
    state.activeBlockType = type;
    state.blockPlaced = true;
    BLOCK_TYPES.forEach(t=>markTrayPlaced(t, t===type));
    document.getElementById('activeBlockName').textContent = state.blocks[type].name;
    syncSlidersFromBlock();
    showToast(`${state.blocks[type].name} placed on the board. Add the Ray Box next.`);
  } else if (type === 'raybox'){
    if (!state.blockPlaced){ showToast('Place a glass block first.'); return; }
    state.placed.raybox = true;
    markTrayPlaced('raybox', true);
    showToast('Ray box positioned. Adjust the angle of incidence on the right.');
  } else if (['protractor','setsquare','ruler','pencil','pins'].includes(type)){
    if (!state.blockPlaced){ showToast('Place a glass block first.'); return; }
    if (type === 'pins' && !experimenterMode){ showToast('Enable Experimenter mode to add pins.'); return; }
    state.placed[type] = true;
    markTrayPlaced(type, true);
    if (type === 'pencil' && drawCanvas) drawCanvas.style.pointerEvents = traceMode ? 'auto' : 'none';
    showToast(`${type[0].toUpperCase()+type.slice(1)} added to the bench.`);
  }
  updatePinButtons();
  render();
}

function removeApparatus(type){
  if (type === 'board'){
    state.placed.board = false; markTrayPlaced('board', false);
    state.blockPlaced = false; BLOCK_TYPES.forEach(t=>markTrayPlaced(t,false));
    ['raybox','protractor','setsquare','ruler','pencil','pins'].forEach(t=>{state.placed[t]=false; markTrayPlaced(t,false);});
  } else if (type === 'block'){
    state.blockPlaced = false; BLOCK_TYPES.forEach(t=>markTrayPlaced(t,false));
    ['raybox','protractor','setsquare','ruler','pencil','pins'].forEach(t=>{state.placed[t]=false; markTrayPlaced(t,false);});
  } else {
    state.placed[type] = false; markTrayPlaced(type, false);
  }
  if (drawCanvas) drawCanvas.style.pointerEvents = (traceMode && state.placed.pencil) ? 'auto' : 'none';
  updatePinButtons();
  render();
}

/* ============================================================
   RENDER — DOM apparatus + canvas ray-trace
   ============================================================ */
function addEl(cls, x, y, removableKey){
  const wrap = document.createElement('div');
  wrap.className='piece'; wrap.style.left='0px'; wrap.style.top='0px';
  const el = document.createElement('div');
  el.className = cls;
  el.style.left = x+'px'; el.style.top = y+'px'; el.style.position='absolute';
  wrap.appendChild(el);
  if (removableKey){
    const del = document.createElement('button');
    del.className='del'; del.textContent='×';
    del.style.position='absolute'; del.style.left=(x+30)+'px'; del.style.top=(y-8)+'px';
    del.onclick=()=>removeApparatus(removableKey);
    wrap.appendChild(del);
  }
  stage.appendChild(wrap);
  return el;
}

function addCornerLabel(x, y, text){
  const label = document.createElement('div');
  label.className = 'corner-label';
  label.style.left = x+'px';
  label.style.top = y+'px';
  label.textContent = text;
  stage.appendChild(label);
}

function render(){
  Array.from(stage.querySelectorAll('.piece, .overlay-chips, .corner-label')).forEach(n=>n.remove());
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const hint = document.getElementById('emptyHint');
  hint.style.display = state.placed.board ? 'none' : 'block';

  if (!state.placed.board) { updateReadout(null); return; }

  addEl('board', state.board.x, state.board.y, 'board');
  document.querySelector('.board').style.width = state.board.w+'px';
  document.querySelector('.board').style.height = state.board.h+'px';

  if (!state.blockPlaced){ updateReadout(null); return; }

  const geo = computeGeometry();
  const block = activeBlock();

  if (block.mode === 'rect' || block.mode === 'prism'){
    const blockLeft = state.board.x+30;
    const blockWidth = state.board.w-60;
    const isPrism = block.mode === 'prism';
    const blockClass = isPrism
      ? 'glass-prism'
      : 'glass-rect'+(state.activeBlockType==='block-b'?' flint':'');
    const blockEl = addEl(blockClass, blockLeft, geo.blockTop, 'block');
    blockEl.style.width = blockWidth+'px';
    blockEl.style.height = geo.sizePx+'px';
      const wrapper = blockEl.parentElement;
      if (wrapper){ wrapper.dataset.piece = 'block'; wrapper.addEventListener('click', (ev)=>{ ev.stopPropagation(); if (pickType) return; if (confirm('Remove this glass block?')){ removeApparatus('block'); showToast('Glass block removed.'); } }); }
    if (isPrism){
      const prismCenterX = state.board.x + state.board.w/2;
      const prismTopY = geo.blockTop;
      const prismBaseY = geo.blockTop + geo.sizePx;
      addCornerLabel(prismCenterX - 42, prismTopY - 14, 'A');
      addCornerLabel(prismCenterX + 34, prismBaseY + 8, 'B');
      addCornerLabel(prismCenterX - 12, prismBaseY + 8, 'C');
    } else {
      addCornerLabel(blockLeft-14, geo.blockTop-18, 'A');
      addCornerLabel(blockLeft+blockWidth+4, geo.blockTop-18, 'B');
      addCornerLabel(blockLeft+blockWidth+4, geo.blockTop+geo.sizePx+4, 'C');
      addCornerLabel(blockLeft-14, geo.blockTop+geo.sizePx+4, 'D');
    }
  } else {
    const r = geo.radiusPx;
    const semiEl = addEl('glass-semi', geo.cx-r, geo.blockTop, 'block');
    semiEl.style.width = (r*2)+'px';
    semiEl.style.height = r+'px';
      const wrapper = semiEl.parentElement;
      if (wrapper){ wrapper.dataset.piece = 'block'; wrapper.addEventListener('click', (ev)=>{ ev.stopPropagation(); if (pickType) return; if (confirm('Remove this glass block?')){ removeApparatus('block'); showToast('Glass block removed.'); } }); }
  }

  const chipTypes = ['protractor','ruler','pencil','pins'].filter(t=>state.placed[t]);
  if (chipTypes.length){
    const chips = document.createElement('div');
    chips.className='overlay-chips';
    chips.style.position='absolute';
    chips.style.left = state.board.x+'px';
    chips.style.top = (state.board.y-34)+'px';
    chips.style.display='flex'; chips.style.gap='6px';
    chipTypes.forEach(t=>{
      const chip = document.createElement('div');
      chip.style.background='var(--bg-panel-3)'; chip.style.border='1px solid #3a414a';
      chip.style.borderRadius='4px'; chip.style.padding='3px 8px'; chip.style.fontSize='10.5px';
      chip.style.fontFamily='var(--mono)'; chip.style.color='var(--text-light)';
      chip.style.display='flex'; chip.style.alignItems='center'; chip.style.gap='6px';
      chip.innerHTML = `<span>${t}</span>`;
      const x = document.createElement('button');
      x.textContent='×'; x.style.background='var(--warn)'; x.style.color='#fff'; x.style.border='none';
      x.style.borderRadius='50%'; x.style.width='14px'; x.style.height='14px'; x.style.fontSize='10px';
      x.style.cursor='pointer'; x.style.lineHeight='14px';
      x.onclick = ()=>removeApparatus(t);
      chip.appendChild(x);
      chips.appendChild(chip);
    });
    stage.appendChild(chips);
  }

  if (state.placed.raybox){
    const R = 150;
    const rayAngleRad = deg2rad(geo.iDeg);
    const tipX = geo.P0.x - R*Math.sin(rayAngleRad);
    const tipY = geo.P0.y - R*Math.cos(rayAngleRad);
    const boxEl = addEl('raybox', tipX-22, tipY-12, 'raybox');
    boxEl.style.transform = `rotate(${90 - geo.iDeg}deg)`;
  }

  drawRays(geo);
  updateReadout(geo);
}

/* ----- canvas ray drawing ----- */
function drawDashedNormal(P, lenUp, lenDown){
  drawDashedNormalAt(P, {x:0,y:-1}, lenUp, lenDown);
}
function drawDashedNormalAt(P, normal, lenUp, lenDown){
  const n = normalize(normal || {x:0,y:-1});
  ctx.save();
  ctx.setLineDash([5,5]);
  ctx.strokeStyle = '#5276A8';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(P.x - n.x*lenUp, P.y - n.y*lenUp);
  ctx.lineTo(P.x + n.x*lenDown, P.y + n.y*lenDown);
  ctx.stroke();
  ctx.restore();
}
function drawPinLabels(x1,y1,x2,y2, labels){
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#2B4570';
  ctx.lineWidth = 2.5;
  labels.forEach((label, idx)=>{
    const s = (idx + 1) / (labels.length + 1);
    const px = x1 + dx * s;
    const py = y1 + dy * s;
    const tx = px + nx * 8 + (dx > 0 ? 4 : -18);
    const ty = py + ny * 8 - 2;
    ctx.strokeText(label, tx, ty);
    ctx.fillText(label, tx, ty);
  });
}
function drawRaySegment(x1,y1,x2,y2,pins, pinLabels=[]){
  ctx.save();
  ctx.strokeStyle = '#FFB200';
  ctx.lineWidth = pins ? 4 : 2.4;
  ctx.shadowColor = 'rgba(255,200,60,.6)';
  ctx.shadowBlur = 4;
  ctx.setLineDash([]);
  ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
  if (pins){
    if (pinLabels.length){
      // put exactly one pin for each label at fractional positions along the ray
      pinLabels.forEach((label, idx)=>{
        const s = (idx + 1) / (pinLabels.length + 1);
        const px = x1 + (x2 - x1) * s;
        const py = y1 + (y2 - y1) * s;
        ctx.save();
        ctx.fillStyle = '#C24914';
        ctx.beginPath(); ctx.arc(px,py,3.2,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });
      drawPinLabels(x1,y1,x2,y2,pinLabels);
    } else {
      const steps = 5;
      for (let s=1; s<steps; s++){
        const px = x1+(x2-x1)*s/steps, py = y1+(y2-y1)*s/steps;
        ctx.save();
        ctx.fillStyle = '#C24914';
        ctx.beginPath(); ctx.arc(px,py,3.2,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
  }
  // arrowhead
  const ang = Math.atan2(y2-y1, x2-x1);
  ctx.save();
  ctx.fillStyle = '#FFB200';
  ctx.translate(x2,y2); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,-4); ctx.lineTo(-9,4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawProtractor(geo){
  const P = geo.P0;
  ctx.save();
  ctx.strokeStyle = 'rgba(82,118,168,.6)';
  ctx.fillStyle = '#3a4a36';
  ctx.lineWidth = 1;
  const radius = 70;
  const rotation = deg2rad(geo.protractorAngle || 0);

  // normal axis at the point of incidence
  ctx.beginPath();
  ctx.moveTo(P.x, P.y-80);
  ctx.lineTo(P.x, P.y+80);
  ctx.stroke();

  ctx.font = '9px IBM Plex Mono, monospace';
  ctx.fillText('i', P.x-22, P.y-radius-18);
  ctx.fillText('r', P.x+14, P.y-radius-18);

  // draw only the semicircle that will be labelled from the normal anticlockwise to the opposite edge
  ctx.beginPath();
  ctx.arc(P.x, P.y, radius, rotation - Math.PI/2, rotation + Math.PI/2, false);
  ctx.stroke();

  for (let a = 0; a <= 180; a += 15){
    const theta = rotation + Math.PI/2 - deg2rad(a);
    const x1 = P.x + Math.cos(theta)*(radius-6);
    const y1 = P.y + Math.sin(theta)*(radius-6);
    const x2 = P.x + Math.cos(theta)*radius;
    const y2 = P.y + Math.sin(theta)*radius;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    if (a % 30 === 0){
      const lx = P.x + Math.cos(theta)*(radius+10);
      const ly = P.y + Math.sin(theta)*(radius+10);
      ctx.fillText(`${a}°`, lx-8, ly+3);
    }
  }

  const normalTheta = rotation + Math.PI/2;
  const normalX = P.x + Math.cos(normalTheta)*(radius+12);
  const normalY = P.y + Math.sin(normalTheta)*(radius+12);
  ctx.fillText('0°', normalX-8, normalY+3);
  ctx.restore();
}
function drawPencilDot(P){
  ctx.save();
  ctx.fillStyle = '#23262B';
  ctx.beginPath(); ctx.arc(P.x,P.y,3.4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
function drawRuler(geo){
  if (geo.mode !== 'rect') return;
  const y = geo.blockBottom + 26;
  const startX = geo.P0.x;
  const endX = geo.P1.x;
  ctx.save();
  ctx.strokeStyle = '#8C661F'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(startX, y-8); ctx.lineTo(startX, y+8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(endX, y-8); ctx.lineTo(endX, y+8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillStyle = '#23262B';
  ctx.fillText('d ≈ '+fmt(geo.displacementMm,1)+' mm', Math.min(startX,endX)+8, y+20);
  ctx.restore();
}

function drawPointLabel(P, text, offsetX=0, offsetY=0){
  ctx.save();
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#2B4570';
  ctx.lineWidth = 2.5;
  ctx.strokeText(text, P.x + offsetX + 6, P.y + offsetY - 6);
  ctx.fillText(text, P.x + offsetX + 6, P.y + offsetY - 6);
  ctx.restore();
}

function drawSegmentLabel(x1,y1,x2,y2,label){
  const mx = (x1+x2)/2;
  const my = (y1+y2)/2;
  ctx.save();
  ctx.font = '11px IBM Plex Mono, monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#2B4570';
  ctx.lineWidth = 2.5;
  ctx.strokeText(label, mx + 8, my - 8);
  ctx.fillText(label, mx + 8, my - 8);
  ctx.restore();
}

/* Draw a real-looking pin (head + stem) on the 2D canvas */
function draw2DPin(x, y, color, label){
  ctx.save();
  /* stem */
  ctx.strokeStyle=color; ctx.lineWidth=1.8; ctx.globalAlpha=0.7;
  ctx.beginPath(); ctx.moveTo(x,y+16); ctx.lineTo(x,y); ctx.stroke();
  ctx.globalAlpha=1;
  /* head */
  ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2);
  ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=10; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.shadowBlur=0; ctx.lineWidth=1.5; ctx.stroke();
  /* label */
  if(label){
    ctx.font='bold 11px IBM Plex Mono,monospace';
    ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
    ctx.fillText(label, x+9, y-4);
  }
  ctx.restore();
}

function drawRays(geo){
  const pins = state.placed.pins;
  const showNormal = state.placed.setsquare;
  const showProtractor = state.placed.protractor;
  const showPencil = state.placed.pencil;

  if (showNormal) {
    if (geo.mode === 'prism') {
      drawDashedNormalAt(geo.P0, geo.entryNormal, 50, 40);
      drawDashedNormalAt(geo.P1, geo.exitNormal, 35, 35);
    } else {
      drawDashedNormal(geo.P0, geo.mode==='rect'?70:geo.radiusPx+40, geo.mode==='rect'?geo.sizePx+30:60);
    }
  }
  if (showProtractor && geo.mode === 'rect') drawProtractor(geo);

  if (state.placed.raybox){
    const R = 150;
    const iRad = deg2rad(geo.iDeg);
    const x1 = geo.P0.x - R*Math.sin(iRad), y1 = geo.P0.y - R*Math.cos(iRad);

    if(pins){
      /* Draw incident ray (no auto-pins; user pins are drawn separately below) */
      drawRaySegment(x1,y1, geo.P0.x, geo.P0.y, false, []);
    } else {
      drawRaySegment(x1,y1, geo.P0.x, geo.P0.y, false, []);
    }

    if (geo.mode === 'rect'){
      drawPointLabel(geo.P0, 'E', 0, -12);
      drawRaySegment(geo.P0.x, geo.P0.y, geo.P1.x, geo.P1.y, false);
      drawSegmentLabel(geo.P0.x, geo.P0.y, geo.P1.x, geo.P1.y, `m ≈ ${fmt(geo.EFmm,1)} mm`);
      const exitLen = 130;
      const x3 = geo.P1.x + exitLen*Math.sin(iRad), y3 = geo.P1.y + exitLen*Math.cos(iRad);
      drawRaySegment(geo.P1.x, geo.P1.y, x3, y3, false, []);
      drawPointLabel(geo.P1, 'F', 0, -12);
      drawDashedNormal(geo.P1, 30, 60);
      if (showPencil){ drawPencilDot(geo.P0); drawPencilDot(geo.P1); }
      if (state.placed.ruler) drawRuler(geo);
    } else if (geo.mode === 'prism'){
      const incidentStart = { x: geo.P0.x - 150*geo.incidentDir.x, y: geo.P0.y - 150*geo.incidentDir.y };
      const exitEnd = { x: geo.P1.x + 150*geo.exitDir.x, y: geo.P1.y + 150*geo.exitDir.y };
      drawRaySegment(incidentStart.x, incidentStart.y, geo.P0.x, geo.P0.y, false);
      drawRaySegment(geo.P0.x, geo.P0.y, geo.P1.x, geo.P1.y, false);
      drawRaySegment(geo.P1.x, geo.P1.y, exitEnd.x, exitEnd.y, false);
      drawPointLabel(geo.P0, 'E', 0, -12);
      drawPointLabel(geo.P1, 'F', 0, -12);
      if (showPencil){ drawPencilDot(geo.P0); drawPencilDot(geo.P1); }
    } else {
      drawRaySegment(geo.P0.x, geo.P0.y, geo.P1.x, geo.P1.y, false);
      if (showPencil) drawPencilDot(geo.P0);
      if (geo.tir){
        ctx.save();
        ctx.font='bold 12px IBM Plex Mono, monospace';
        ctx.fillStyle='#C24914';
        ctx.fillText('TOTAL INTERNAL REFLECTION', geo.P0.x+20, geo.P0.y-10);
        ctx.restore();
      }
    }

    /* ── Interactive user-placed pins ── */
    if(pins){
      /* P1, P2 — draggable along incident ray */
      const p1pos = pinOnRay(state.pins2D.P1.t, geo);
      const p2pos = pinOnRay(state.pins2D.P2.t, geo);
      draw2DPin(p1pos.x, p1pos.y, '#FF3838', 'P1');
      draw2DPin(p2pos.x, p2pos.y, '#3858FF', 'P2');

      /* Hint text */
      ctx.save();
      ctx.font='11px IBM Plex Mono,monospace';
      ctx.fillStyle='rgba(232,176,79,0.8)';
      ctx.fillText('Drag P1 / P2 along the incident ray', geo.P0.x+14, geo.P0.y-32);
      ctx.restore();

      /* P3, P4 — placed on emergent side */
      if(state.pins2D.P3){
        const p3=state.pins2D.P3;
        draw2DPin(p3.x, p3.y, '#FF8C00', 'P3');
      }
      if(state.pins2D.P4){
        const p4=state.pins2D.P4;
        draw2DPin(p4.x, p4.y, '#20C840', 'P4');
      }

      /* P3-P4 guide line */
      if(state.pins2D.P3 && state.pins2D.P4 && !geo.tir){
        const p3=state.pins2D.P3, p4=state.pins2D.P4;
        const dx=p4.x-p3.x, dy=p4.y-p3.y, len=Math.hypot(dx,dy)||1;
        const ext=220;
        ctx.save();
        ctx.setLineDash([7,5]);
        ctx.strokeStyle='rgba(255,140,0,0.7)'; ctx.lineWidth=1.8;
        ctx.beginPath();
        ctx.moveTo(p3.x-dx/len*ext, p3.y-dy/len*ext);
        ctx.lineTo(p4.x+dx/len*ext, p4.y+dy/len*ext);
        ctx.stroke();
        ctx.restore();
        /* alignment score */
        _draw2DAlignmentLabel(p4, geo);
      }

      if(!state.pins2D.P3 && !state.pins2D.P4 && geo.mode==='rect'){
        ctx.save();
        ctx.font='11px IBM Plex Mono,monospace';
        ctx.fillStyle='rgba(255,140,0,0.75)';
        ctx.fillText('Click "Place P3" / "Place P4" to add pins on the emergent side', geo.P1.x+14, geo.P1.y+30);
        ctx.restore();
      }
    }
  }
}

function _draw2DAlignmentLabel(refPt, geo){
  const p3=state.pins2D.P3, p4=state.pins2D.P4;
  const iRad=deg2rad(geo.iDeg);
  const ux=Math.sin(iRad), uy=Math.cos(iRad);
  const udx=p4.x-p3.x, udy=p4.y-p3.y, ulen=Math.hypot(udx,udy)||1;
  const dot=Math.abs(udx/ulen*ux + udy/ulen*uy);
  const err=rad2deg(Math.acos(Math.min(1,dot)));
  const good=err<3.5;
  ctx.save();
  ctx.font='bold 11px IBM Plex Mono,monospace';
  ctx.fillStyle=good?'#40CC60':'#FF8C00';
  ctx.shadowColor=good?'#20AA40':'#CC6000'; ctx.shadowBlur=6;
  const lbl=good?`✓ Emergent ray found! (err < ${err.toFixed(1)}°)`:
                  `Alignment error: ${err.toFixed(1)}° — adjust P3/P4`;
  ctx.fillText(lbl, refPt.x-60, refPt.y+46);
  ctx.restore();
}

/* ============================================================
   LIVE READOUT
   ============================================================ */
function updateReadout(geo){
  const dEl = document.getElementById('readI');
  const rEl = document.getElementById('readR');
  const extra = document.getElementById('readExtra');
  if (!geo){ dEl.textContent='—'; rEl.textContent='—'; extra.textContent=''; return; }
  const unit = state.unit;
  const showAngle = (deg)=> deg===null ? '—' : (unit==='deg' ? fmt(deg,1)+'°' : fmt(deg2rad(deg),3)+' rad');
  dEl.textContent = showAngle(geo.iDeg);
  if (geo.mode==='rect'){
    rEl.textContent = showAngle(geo.rDeg);
    extra.innerHTML = `d: <b>${fmt(geo.displacementMm,1)} mm</b> · m: <b>${fmt(geo.EFmm,1)} mm</b>`;
  } else if (geo.mode==='prism'){
    rEl.textContent = showAngle(geo.rDeg);
    extra.innerHTML = `emergent: <b>${fmt(geo.rDeg,1)}°</b>`;
  } else {
    rEl.textContent = geo.tir ? 'T.I.R.' : showAngle(geo.outerDeg);
    extra.innerHTML = `θc: <b>${fmt(geo.critDeg,1)}°</b>`;
  }
}

/* ============================================================
   RECORDING / DATA TABLE
   ============================================================ */
function recordReading(){
  if (!state.placed.raybox){ showToast('Add the Ray Box before recording a reading.'); return; }
  const geo = computeGeometry();
  if (geo.mode==='semi' && geo.tir){
    state.trials.push({ n: state.trials.length+1, iDeg: geo.iDeg, rDeg: null, nCalc: null, dMm: null, tir:true });
    renderDataTable(); drawGraph(); beep(); showToast('Total internal reflection recorded — no refracted ray to measure.');
    return;
  }
  const noise = (Math.random()-0.5)*0.6; // +/- 0.3 deg reading uncertainty
  const outer = geo.outerDeg + noise, inner = geo.innerDeg;
  const nCalc = Math.sin(deg2rad(outer)) / Math.sin(deg2rad(inner));
  state.trials.push({
    n: state.trials.length+1,
    iDeg: geo.iDeg,
    rDeg: geo.rDeg,
    outerDeg: outer, innerDeg: inner, nCalc,
    dMm: geo.displacementMm, tir:false
  });
  renderDataTable(); drawGraph(); beep();
}
function renderDataTable(){
  const body = document.getElementById('dataBody');
  if (state.trials.length===0){ body.innerHTML = '<tr><td colspan="5" class="empty-row">No readings recorded yet</td></tr>'; return; }
  body.innerHTML = state.trials.map(t=>{
    if (t.tir){
      return `<tr><td>${t.n}</td><td>${fmt(t.iDeg,1)}°</td><td colspan="2" style="color:var(--warn)">T.I.R.</td><td>—</td></tr>`;
    }
    return `<tr><td>${t.n}</td><td>${fmt(t.iDeg,1)}°</td><td>${fmt(t.rDeg,1)}°</td><td>${fmt(t.nCalc,3)}</td><td>${t.dMm===null?'—':fmt(t.dMm,1)}</td></tr>`;
  }).join('');
}

/* ============================================================
   GRAPH (canvas, least-squares best fit, sin(outer) vs sin(inner))
   ============================================================ */
function regression(points){
  const n = points.length;
  if (n<2) return null;
  let sx=0,sy=0,sxy=0,sxx=0,syy=0;
  points.forEach(p=>{ sx+=p.x; sy+=p.y; sxy+=p.x*p.y; sxx+=p.x*p.x; syy+=p.y*p.y; });
  const slope = (n*sxy - sx*sy) / (n*sxx - sx*sx);
  const intercept = (sy - slope*sx)/n;
  const yMean = sy/n;
  let ssTot=0, ssRes=0;
  points.forEach(p=>{ const yPred = slope*p.x+intercept; ssRes += (p.y-yPred)**2; ssTot += (p.y-yMean)**2; });
  const r2 = ssTot===0 ? 1 : 1 - ssRes/ssTot;
  return { slope, intercept, r2 };
}
function drawGraph(){
  const canvasG = document.getElementById('graph');
  const g = canvasG.getContext('2d');
  const W = canvasG.width, H = canvasG.height;
  g.clearRect(0,0,W,H);
  g.fillStyle = getComputedStyle(document.body).getPropertyValue('--paper') || '#EDF2E6';
  g.fillRect(0,0,W,H);

  const pad = {l:50,r:20,t:20,b:45};
  const plotW = W-pad.l-pad.r, plotH = H-pad.t-pad.b;

  const points = state.trials.filter(t=>!t.tir).map(t=>({x: Math.sin(deg2rad(t.innerDeg)), y: Math.sin(deg2rad(t.outerDeg))}));
  const maxX = Math.max(0.3, ...points.map(p=>p.x), 0.01) * 1.15;
  const maxY = Math.max(0.3, ...points.map(p=>p.y), 0.01) * 1.15;

  g.strokeStyle = '#8a9b80'; g.lineWidth=1;
  g.beginPath(); g.moveTo(pad.l,pad.t); g.lineTo(pad.l,pad.t+plotH); g.lineTo(pad.l+plotW,pad.t+plotH); g.stroke();

  g.fillStyle='#3a4a36'; g.font='10px IBM Plex Mono, monospace';
  for (let i=0;i<=4;i++){
    const xv = maxX*i/4, px = pad.l + plotW*i/4;
    g.fillText(xv.toFixed(2), px-10, pad.t+plotH+14);
    const yv = maxY*i/4, py = pad.t+plotH - plotH*i/4;
    g.fillText(yv.toFixed(2), 4, py+3);
  }
  g.fillText('sin(inner angle)', pad.l+plotW/2-35, H-6);
  g.save(); g.translate(10,pad.t+plotH/2+30); g.rotate(-Math.PI/2); g.fillText('sin(outer angle)',0,0); g.restore();

  g.fillStyle = '#2B4570';
  points.forEach(p=>{
    const px = pad.l + (p.x/maxX)*plotW, py = pad.t+plotH - (p.y/maxY)*plotH;
    g.beginPath(); g.arc(px,py,4,0,Math.PI*2); g.fill();
  });

  const reg = regression(points);
  if (reg){
    g.strokeStyle='#C24914'; g.lineWidth=2;
    g.beginPath();
    const x0=0, x1=maxX;
    const y0=reg.slope*x0+reg.intercept, y1=reg.slope*x1+reg.intercept;
    g.moveTo(pad.l+(x0/maxX)*plotW, pad.t+plotH-(Math.max(0,y0)/maxY)*plotH);
    g.lineTo(pad.l+(x1/maxX)*plotW, pad.t+plotH-(Math.max(0,y1)/maxY)*plotH);
    g.stroke();
    document.getElementById('gradK').textContent = fmt(reg.slope,3);
    document.getElementById('gradR2').textContent = fmt(reg.r2,4);
  } else {
    document.getElementById('gradK').textContent='—';
    document.getElementById('gradR2').textContent='—';
  }
}

/* ============================================================
   BUTTONS / CONTROLS
   ============================================================ */
document.getElementById('btnRecord').onclick = recordReading;
document.getElementById('btnTrace').onclick = ()=>{
  if (!state.placed.raybox){ showToast('Add the Ray Box first.'); return; }
  // simple animated emphasis: briefly re-render with a flash
  render();
  showToast('Ray traced: incident → refracted → emergent.');
};
document.getElementById('btnTraceOutline').onclick = ()=>{
  traceMode = !traceMode;
  const btn = document.getElementById('btnTraceOutline');
  btn.classList.toggle('active', traceMode);
  if (drawCanvas) drawCanvas.style.pointerEvents = (traceMode && state.placed.pencil) ? 'auto' : 'none';
  showToast(traceMode ? 'Trace mode enabled. Use the pencil to draw the block outline.' : 'Trace mode disabled.');
};

/* ── Pin tracing button handlers ── */
document.getElementById('btnPlaceP3').onclick = ()=>{
  if(!state.placed.pins){ showToast('Drag the Pins apparatus onto the board first.'); return; }
  if(!state.blockPlaced){ showToast('Place a glass block first.'); return; }
  const wasP3=(state.pins2D.placing==='P3');
  state.pins2D.placing = wasP3 ? null : 'P3';
  updatePinButtons();
  if(!wasP3){ showToast('Click on the emergent side to place pin P3.'); }
};
document.getElementById('btnPlaceP4').onclick = ()=>{
  if(!state.placed.pins){ showToast('Drag the Pins apparatus onto the board first.'); return; }
  if(!state.blockPlaced){ showToast('Place a glass block first.'); return; }
  const wasP4=(state.pins2D.placing==='P4');
  state.pins2D.placing = wasP4 ? null : 'P4';
  updatePinButtons();
  if(!wasP4){ showToast('Click on the emergent side to place pin P4.'); }
};
document.getElementById('btnClearPins').onclick = ()=>{
  state.pins2D.P3=null; state.pins2D.P4=null;
  state.pins2D.placing=null;
  updatePinButtons(); render();
  showToast('P3 and P4 cleared.');
};
document.getElementById('btnCheckAlign').onclick = ()=>{
  const p3=state.pins2D.P3, p4=state.pins2D.P4;
  if(!p3||!p4){ showToast('Place both P3 and P4 first.'); return; }
  const geo=computeGeometry(); if(!geo) return;
  const iR=deg2rad(geo.iDeg);
  const ux=Math.sin(iR),uy=Math.cos(iR);
  const dx=p4.x-p3.x,dy=p4.y-p3.y,len=Math.hypot(dx,dy)||1;
  const dot=Math.abs(dx/len*ux+dy/len*uy);
  const err=rad2deg(Math.acos(Math.min(1,dot)));
  if(err<3.5) showToast(`✓ Perfect! P3-P4 define the emergent ray (error < ${err.toFixed(1)}°).`);
  else showToast(`Alignment error: ${err.toFixed(1)}°. Move P3 or P4 to better align with P1-P2 through the glass.`);
};

document.getElementById('btnExperimenter').onclick = ()=>{
  experimenterMode = !experimenterMode;
  const b = document.getElementById('btnExperimenter');
  b.classList.toggle('experimenter-active', experimenterMode);
  b.textContent = experimenterMode ? '🔓 Experimenter mode: ON' : '🔒 Experimenter mode: OFF';
  showToast(experimenterMode ? 'Experimenter mode enabled — pins may be placed.' : 'Experimenter mode disabled.');
};
document.getElementById('btnNewTrial').onclick = ()=>{
  showToast('Ready for a new angle of incidence — adjust the slider and trace again.');
  render();
};
document.getElementById('btnReset').onclick = ()=>{
  state.angleI = 35;
  document.getElementById('sliderAngle').value = 35;
  document.getElementById('lblAngle').textContent = '35.0°';
  showToast('Experiment reset. Recorded data has been kept — use Clear Data to erase it.');
  render();
};
document.getElementById('btnClearData').onclick = ()=>{
  if (!confirm('Clear all recorded readings? This cannot be undone.')) return;
  state.trials = [];
  renderDataTable(); drawGraph();
};
document.getElementById('btnExport').onclick = ()=>{
  if (state.trials.length===0){ showToast('No data to export yet.'); return; }
  let csv = 'Trial,AngleOfIncidence(deg),AngleOfRefraction(deg),n(calc),LateralDisplacement(mm)\n';
  state.trials.forEach(t=>{
    csv += `${t.n},${fmt(t.iDeg,2)},${t.tir?'TIR':fmt(t.rDeg,2)},${t.tir?'':fmt(t.nCalc,4)},${t.dMm===null?'':fmt(t.dMm,2)}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download='refraction_data.csv'; a.click();
};
document.getElementById('btnCheckK').onclick = ()=>{
  const valid = state.trials.filter(t=>!t.tir);
  if (valid.length<2){ showToast('Record at least two non-TIR readings first.'); return; }
  const guess = prompt('Based on your graph, what do you estimate the refractive index n to be?');
  if (guess===null) return;
  const reg = regression(valid.map(t=>({x:Math.sin(deg2rad(t.innerDeg)), y:Math.sin(deg2rad(t.outerDeg))})));
  if (isNaN(parseFloat(guess))){ showToast('Enter a numeric value.'); return; }
  const diffPct = Math.abs((parseFloat(guess)-reg.slope)/reg.slope*100);
  if (diffPct<8) showToast(`Nice work — your estimate is within ${diffPct.toFixed(1)}% of the regression value (n ≈ ${fmt(reg.slope,3)}).`,4200);
  else showToast(`Off by ${diffPct.toFixed(1)}%. The best-fit gradient gives n ≈ ${fmt(reg.slope,3)} — check your angle readings.`,4500);
};

// sliders
const sliderAngle = document.getElementById('sliderAngle');
sliderAngle.oninput = e=>{
  state.angleI = +e.target.value;
  document.getElementById('lblAngle').textContent = (state.unit==='deg' ? state.angleI.toFixed(1)+'°' : deg2rad(state.angleI).toFixed(3)+' rad');
  render();
};
const sliderN = document.getElementById('sliderN');
sliderN.oninput = e=>{
  activeBlock().n = +e.target.value;
  document.getElementById('lblN').textContent = (+e.target.value).toFixed(2);
  render();
};
const sliderOffset = document.getElementById('sliderOffset');
sliderOffset.oninput = e=>{
  state.entryOffsetCm = +e.target.value;
  document.getElementById('lblOffset').textContent = (+e.target.value).toFixed(1)+' cm';
  render();
};
const sliderProtractor = document.getElementById('sliderProtractor');
sliderProtractor.oninput = e=>{
  state.protractorAngle = +e.target.value;
  document.getElementById('lblProtractor').textContent = (+e.target.value).toFixed(0)+'°';
  render();
};
const sliderSize = document.getElementById('sliderSize');
sliderSize.oninput = e=>{
  state.sizeCm = +e.target.value;
  document.getElementById('lblSize').textContent = (+e.target.value).toFixed(1)+' cm';
  render();
};
function syncSlidersFromBlock(){
  const b = activeBlock();
  sliderN.value = b.n; document.getElementById('lblN').textContent = b.n.toFixed(2);
  document.getElementById('lblSizeName').textContent = b.mode==='rect' ? 'Block thickness, t' : b.mode==='prism' ? 'Prism size, h' : 'Block radius, R';
}

// unit toggle
document.querySelectorAll('.unit-toggle button').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.unit-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.unit = btn.dataset.unit;
    render();
  };
});

// instructions drawer
document.getElementById('btnInstructions').onclick = ()=>document.getElementById('instructions').classList.add('open');
document.getElementById('closeInstructions').onclick = ()=>document.getElementById('instructions').classList.remove('open');

// theme toggle
document.getElementById('btnTheme').onclick = ()=>{
  document.body.classList.toggle('theme-dark');
  drawGraph();
};

// save / load (localStorage)
document.getElementById('btnSave').onclick = ()=>{
  const save = {
    placed:state.placed, blockPlaced:state.blockPlaced, activeBlockType:state.activeBlockType,
    blocks:state.blocks, board:state.board, sizeCm:state.sizeCm, entryOffsetCm: state.entryOffsetCm,
    protractorAngle: state.protractorAngle, angleI:state.angleI, trials:state.trials
  };
  localStorage.setItem('refractionLabSave', JSON.stringify(save));
  showToast('Experiment state saved to this browser.');
};
document.getElementById('btnLoad').onclick = ()=>{
  const raw = localStorage.getItem('refractionLabSave');
  if (!raw){ showToast('No saved state found.'); return; }
  const save = JSON.parse(raw);
  Object.assign(state.placed, save.placed);
  state.blockPlaced = save.blockPlaced; state.activeBlockType = save.activeBlockType;
  state.blocks = save.blocks; state.board = save.board; state.sizeCm = save.sizeCm; state.entryOffsetCm = save.entryOffsetCm || 3;
  state.protractorAngle = save.protractorAngle || 0;
  state.angleI = save.angleI; state.trials = save.trials;
  BLOCK_TYPES.forEach(t=>markTrayPlaced(t, state.blockPlaced && t===state.activeBlockType));
  ['board','raybox','protractor','setsquare','ruler','pencil','pins'].forEach(t=>markTrayPlaced(t, !!state.placed[t]));
  document.getElementById('activeBlockName').textContent = activeBlock().name;
  sliderAngle.value = state.angleI; document.getElementById('lblAngle').textContent = state.angleI.toFixed(1)+'°';
  sliderProtractor.value = state.protractorAngle; document.getElementById('lblProtractor').textContent = state.protractorAngle.toFixed(0)+'°';
  sliderOffset.value = state.entryOffsetCm; document.getElementById('lblOffset').textContent = state.entryOffsetCm.toFixed(1)+' cm';
  sliderSize.value = state.sizeCm; document.getElementById('lblSize').textContent = state.sizeCm.toFixed(1)+' cm';
  syncSlidersFromBlock();
  renderDataTable(); drawGraph(); render();
  if (drawCanvas) drawCanvas.style.pointerEvents = (traceMode && state.placed.pencil) ? 'auto' : 'none';
  showToast('Saved experiment state restored.');
};

/* ============================================================
   PAN & ZOOM (independent of side panels)
   ============================================================ */
function applyTransform(){
  stage.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
  document.getElementById('zoomPct').textContent = Math.round(state.zoom*100)+'%';
}
document.getElementById('zoomIn').onclick = ()=>{ state.zoom=Math.min(2.5,state.zoom+0.15); applyTransform(); };
document.getElementById('zoomOut').onclick = ()=>{ state.zoom=Math.max(0.4,state.zoom-0.15); applyTransform(); };
document.getElementById('zoomReset').onclick = ()=>{ state.zoom=1; state.pan={x:0,y:0}; applyTransform(); };

stageViewport.addEventListener('wheel', e=>{
  e.preventDefault();
  const delta = e.deltaY<0 ? 0.1 : -0.1;
  state.zoom = Math.min(2.5, Math.max(0.4, state.zoom+delta));
  applyTransform();
}, {passive:false});

let isPanning=false, panStart={x:0,y:0}, panOrigin={x:0,y:0};
/* Returns canvas-space point from a mouse event on the stage */
function canvasPtFromEvent(e){
  const rect=canvas.getBoundingClientRect();
  return {
    x:(e.clientX-rect.left)*(canvas.width/rect.width),
    y:(e.clientY-rect.top)*(canvas.height/rect.height)
  };
}

stageViewport.addEventListener('mousedown', e=>{
  if (e.target.closest('.piece') || e.target.closest('.del') || e.target.closest('.overlay-chips')) return;

  /* ── check if clicking on P1 or P2 pin to start dragging ── */
  if(state.placed.pins && state.blockPlaced){
    const geo=computeGeometry();
    if(geo){
      const cp=canvasPtFromEvent(e);
      /* Convert canvas point back to board space */
      const bp={ x:cp.x/state.zoom - state.pan.x/state.zoom, y:cp.y/state.zoom - state.pan.y/state.zoom };
      /* Simpler: canvas is 1:1 with board (pan/zoom applied via CSS transforms) */
      const brd=localPointFromEvent(e);
      const p1=pinOnRay(state.pins2D.P1.t,geo);
      const p2=pinOnRay(state.pins2D.P2.t,geo);
      if(Math.hypot(brd.x-p1.x,brd.y-p1.y)<14){ state.pins2D.dragging='P1'; return; }
      if(Math.hypot(brd.x-p2.x,brd.y-p2.y)<14){ state.pins2D.dragging='P2'; return; }
      /* Place P3/P4 if placing mode active */
      if(state.pins2D.placing){
        state.pins2D[state.pins2D.placing]={x:brd.x, y:brd.y};
        showToast(`Pin ${state.pins2D.placing} placed.`);
        state.pins2D.placing=(state.pins2D.placing==='P3')?'P4':null;
        updatePinButtons(); render(); return;
      }
    }
  }

  isPanning=true; panStart={x:e.clientX,y:e.clientY}; panOrigin={...state.pan};
  stageViewport.classList.add('panning');
});

window.addEventListener('mousemove', e=>{
  if(state.pins2D.dragging){
    const geo=computeGeometry();
    if(geo){
      const brd=localPointFromEvent(e);
      state.pins2D[state.pins2D.dragging].t=pointToRayT(brd.x,brd.y,geo);
      render();
    }
    return;
  }
  if(!isPanning) return;
  state.pan.x=panOrigin.x+(e.clientX-panStart.x);
  state.pan.y=panOrigin.y+(e.clientY-panStart.y);
  applyTransform();
});

window.addEventListener('mouseup', ()=>{
  isPanning=false;
  state.pins2D.dragging=null;
  stageViewport.classList.remove('panning');
});

/* ============================================================
   SOUND CUE
   ============================================================ */
function beep(){
  try{
    const ctxA = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctxA.createOscillator(); const gn = ctxA.createGain();
    o.connect(gn); gn.connect(ctxA.destination);
    o.frequency.value = 880; gn.gain.value = 0.05;
    o.start(); o.stop(ctxA.currentTime+0.08);
  }catch(e){ /* audio not available */ }
}

// ---------- drawing overlay helpers ----------
function localPointFromEvent(e){
  const rect = stageViewport.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - state.pan.x) / state.zoom,
    y: (e.clientY - rect.top - state.pan.y) / state.zoom
  };
}
if (drawCanvas){
  drawCanvas.style.pointerEvents = 'none';
  drawCanvas.addEventListener('pointerdown', e=>{
    if (!traceMode || !state.placed.pencil) return;
    isDrawing = true; drawCanvas.setPointerCapture(e.pointerId);
    lastPos = localPointFromEvent(e);
    drawCtx.beginPath(); drawCtx.moveTo(lastPos.x, lastPos.y);
    drawCtx.lineWidth = 2.8; drawCtx.strokeStyle = '#23262B'; drawCtx.lineCap = 'round';
    e.preventDefault();
  });
  drawCanvas.addEventListener('pointermove', e=>{
    if (!isDrawing) return;
    const p = localPointFromEvent(e);
    drawCtx.lineTo(p.x, p.y); drawCtx.stroke(); lastPos = p;
  });
  ['pointerup','pointercancel'].forEach(evName=>drawCanvas.addEventListener(evName, e=>{
    if (!isDrawing) return; isDrawing = false; try{ drawCanvas.releasePointerCapture(e.pointerId); }catch(_){}
  }));
}

/* ============================================================
   INIT
   ============================================================ */
applyTransform();
render();
drawGraph();
})();