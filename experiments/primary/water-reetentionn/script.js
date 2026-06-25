/* ============================================================
   SOIL WATER RETENTION — VIRTUAL LAB  v3
   Colombo maroon table | realistic apparatus | drag-to-pour
   ============================================================ */
'use strict';

/* ── CONSTANTS ──────────────────────────────────────────────*/
const SLOTS = [
  { id:0, x:-3.1, label:'Sandy Soil (50g)',  soilType:null },
  { id:1, x: 0.0, label:'Loamy Soil (50g)',  soilType:null },
  { id:2, x: 3.1, label:'Clay Soil (50g)',   soilType:null },
];
const RESULTS = {
  sandy: { drainedPct:0.84, label:'Sandy Soil', cls:'sandy', desc:'Large quartz grains (0.05–2 mm) with wide macropores — gravity drainage begins within seconds' },
  loamy: { drainedPct:0.55, label:'Loamy Soil', cls:'loamy', desc:'Balanced sand/silt/clay mixture — moderate pore size gives steady percolation and good moisture retention' },
  clay:  { drainedPct:0.18, label:'Clay Soil',  cls:'clay',  desc:'Microscopic platelets (<0.002 mm) with high surface area — capillary forces and adhesion hold water strongly against gravity' },
};
const TABLE_Y = -0.9;   // centre of tabletop in world space
const TOP_Y   = TABLE_Y + 0.12;  // table surface Y

/* ── STATE ──────────────────────────────────────────────────*/
const S = {
  table:false, beakers:[false,false,false], funnels:[false,false,false],
  filters:[false,false,false], soils:[null,null,null], cylinder:false,
  pouringSlot:-1,
  pourVol:0,
  pourActive:false,
  poured:[false,false,false],
  draining:false,
  done:false,
  dripIvs:[], dripIvSlot:{}, dripTimeouts:[], timerIv:null, animPour:null,
};

/* ── DOM ────────────────────────────────────────────────────*/
const $phase   = document.getElementById('phase-text');
const $resBox  = document.getElementById('results-box');
const $resCont = document.getElementById('results-content');
const $reset   = document.getElementById('reset-btn');
const $hint    = document.getElementById('workspace-hint');
const $tip     = document.getElementById('tooltip');
const $tray    = document.getElementById('tray-items');
const $timer   = document.getElementById('timer-display');
const $timerV  = document.getElementById('timer-val');
const $pourCvs = document.getElementById('pour-canvas');
const $volDisp = document.getElementById('volume-display');
const $volBar  = document.getElementById('vol-bar');
const $volCur  = document.getElementById('vol-current');
const $volName = document.getElementById('vol-slot-name');
const $stopBtn = document.getElementById('stop-pour-btn');

/* ── THREE.JS ───────────────────────────────────────────────*/
let renderer, scene, camera;
let frameCount = 0, autoOrbit = true, isDrag3D = false, orbitDragged = false;
let prevMouse = {x:0,y:0};
let dripParticles = [];

const M = {
  table:null,
  beakers:[null,null,null], beakerWater:[null,null,null],
  funnels:[null,null,null], funnelWater:[null,null,null],
  filters:[null,null,null],
  soils:[null,null,null],
  cyl:null, cylWater:null,
};

/* ──────────────────────────────────────────────────────────
   SVG ICONS for tray — detailed lab glassware illustrations
   ──────────────────────────────────────────────────────────*/
const SVG = {
  beaker: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Body interior (narrow column) -->
    <rect x="24" y="4" width="12" height="46" fill="rgba(180,225,255,0.06)"/>
    <!-- Left wall -->
    <rect x="24" y="4" width="2" height="46" fill="rgba(180,225,255,0.22)"/>
    <!-- Right wall -->
    <rect x="34" y="4" width="2" height="46" fill="rgba(180,225,255,0.22)"/>
    <!-- Water fill (partial — about 30 ml) -->
    <rect x="25.5" y="34" width="9" height="16" fill="rgba(26,136,204,0.38)"/>
    <!-- Meniscus -->
    <path d="M25.5 34 Q30 32.5 34.5 34" fill="rgba(26,136,204,0.22)" stroke="rgba(79,195,247,0.85)" stroke-width="1.1"/>
    <!-- Body left outline -->
    <line x1="24" y1="4" x2="24" y2="50" stroke="#7ec8e3" stroke-width="1.8"/>
    <!-- Body right outline -->
    <line x1="36" y1="4" x2="36" y2="50" stroke="#7ec8e3" stroke-width="1.8"/>
    <!-- Body bottom -->
    <line x1="24" y1="50" x2="36" y2="50" stroke="#7ec8e3" stroke-width="1.5"/>
    <!-- Top rim (open) -->
    <path d="M24 4 L36 4" stroke="#9ecfe0" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Taper from body to base -->
    <path d="M24 50 L12 54 M36 50 L48 54" stroke="#7ec8e3" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Wide flared base slab -->
    <path d="M12 54 L12 58 L48 58 L48 54 Z" fill="rgba(160,210,240,0.28)" stroke="#7ec8e3" stroke-width="1.5"/>
    <!-- Base bottom highlight -->
    <line x1="13" y1="58" x2="47" y2="58" stroke="#9ecfe0" stroke-width="1.2"/>
    <!-- Graduation marks — major (every 20 ml) -->
    <line x1="30" y1="14" x2="35" y2="14" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="30" y1="22" x2="35" y2="22" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="30" y1="30" x2="35" y2="30" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="30" y1="38" x2="35" y2="38" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="30" y1="46" x2="35" y2="46" stroke="#4fc3f7" stroke-width="1.3"/>
    <!-- Graduation marks — minor -->
    <line x1="32" y1="10" x2="35" y2="10" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="32" y1="18" x2="35" y2="18" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="32" y1="26" x2="35" y2="26" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="32" y1="34" x2="35" y2="34" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="32" y1="42" x2="35" y2="42" stroke="#5ba8c8" stroke-width="0.9"/>
    <!-- Glass highlight -->
    <line x1="26" y1="6" x2="26" y2="48" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
  </svg>`,

  funnel: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Cone interior fill -->
    <path d="M7 7 L25 38 L35 38 L53 7 Z" fill="rgba(180,225,255,0.06)"/>
    <!-- Left wall thickness -->
    <path d="M7 7 L25 38 L27 38 L9.5 7 Z" fill="rgba(180,225,255,0.2)"/>
    <!-- Right wall thickness -->
    <path d="M53 7 L35 38 L33 38 L50.5 7 Z" fill="rgba(180,225,255,0.2)"/>
    <!-- Left outer edge -->
    <path d="M7 7 L25 38" stroke="#7ec8e3" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Right outer edge -->
    <path d="M53 7 L35 38" stroke="#7ec8e3" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Top rim -->
    <path d="M7 7 L53 7" stroke="#9ecfe0" stroke-width="2.6" stroke-linecap="round"/>
    <!-- Junction collar -->
    <rect x="25" y="38" width="10" height="2.5" rx="1" fill="rgba(160,210,240,0.35)" stroke="#7ec8e3" stroke-width="1.2"/>
    <!-- Stem left wall -->
    <line x1="27" y1="40.5" x2="27" y2="59" stroke="#7ec8e3" stroke-width="1.7"/>
    <!-- Stem right wall -->
    <line x1="33" y1="40.5" x2="33" y2="59" stroke="#7ec8e3" stroke-width="1.7"/>
    <!-- Stem interior fill -->
    <rect x="27.8" y="40.5" width="4.4" height="18.5" fill="rgba(180,225,255,0.08)"/>
    <!-- Stem tip -->
    <path d="M27 59 L33 59" stroke="#7ec8e3" stroke-width="1.7" stroke-linecap="round"/>
    <!-- Glass highlight on cone -->
    <path d="M9.5 9 L26 36" stroke="rgba(255,255,255,0.16)" stroke-width="2" stroke-linecap="round"/>
    <!-- Stem highlight -->
    <line x1="28.5" y1="42" x2="28.5" y2="57" stroke="rgba(255,255,255,0.14)" stroke-width="1.1"/>
  </svg>`,

  filter: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Top disc (full paper circle) -->
    <ellipse cx="30" cy="10" rx="19" ry="5.5" fill="rgba(245,240,210,0.25)" stroke="#c8be9a" stroke-width="1.4"/>
    <!-- Back half of cone (shadow side) -->
    <path d="M30 58 L49 10 Q30 26 11 10 Z" fill="rgba(215,205,175,0.18)"/>
    <!-- Front face of cone -->
    <path d="M30 58 L11 10 Q30 23 30 58" fill="rgba(245,240,210,0.42)"/>
    <!-- Outer cone edges -->
    <path d="M11 10 L30 58 L49 10" stroke="#c8be9a" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
    <!-- Fold crease line -->
    <line x1="30" y1="10" x2="30" y2="58" stroke="#b8ae8a" stroke-width="1" stroke-dasharray="3,2.5"/>
    <!-- Fibre texture lines -->
    <line x1="16" y1="22" x2="29" y2="44" stroke="rgba(180,170,140,0.28)" stroke-width="0.8"/>
    <line x1="19" y1="17" x2="29.5" y2="37" stroke="rgba(180,170,140,0.22)" stroke-width="0.7"/>
    <line x1="23" y1="13" x2="30" y2="29" stroke="rgba(180,170,140,0.18)" stroke-width="0.6"/>
  </svg>`,

  sandy: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Container bag -->
    <rect x="9" y="23" width="42" height="29" rx="4" fill="#c09040" stroke="#9a7030" stroke-width="1.5"/>
    <!-- Bag top fold -->
    <rect x="9" y="23" width="42" height="7" rx="4" fill="#d4a855"/>
    <rect x="9" y="27" width="42" height="3" fill="#d4a855"/>
    <!-- Seam line -->
    <line x1="9" y1="30" x2="51" y2="30" stroke="#b88838" stroke-width="0.8" opacity="0.6"/>
    <!-- Sand grain clusters -->
    <circle cx="19" cy="37" r="2.4" fill="#a87828" opacity="0.75"/>
    <circle cx="27" cy="34" r="1.8" fill="#c09848" opacity="0.7"/>
    <circle cx="36" cy="38" r="2.2" fill="#a87828" opacity="0.7"/>
    <circle cx="23" cy="43" r="1.7" fill="#c8a860" opacity="0.65"/>
    <circle cx="43" cy="35" r="2" fill="#a87828" opacity="0.65"/>
    <circle cx="33" cy="45" r="1.6" fill="#c09040" opacity="0.6"/>
    <circle cx="15" cy="46" r="2" fill="#a87828" opacity="0.65"/>
    <circle cx="46" cy="44" r="1.6" fill="#c8a055" opacity="0.6"/>
    <circle cx="41" cy="48" r="1.4" fill="#a87828" opacity="0.55"/>
    <!-- Label -->
    <text x="30" y="19" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#c8a055" font-family="sans-serif">Sandy</text>
    <text x="30" y="58" text-anchor="middle" font-size="6" fill="#9a7830" font-family="sans-serif">50 g</text>
  </svg>`,

  loamy: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Container bag -->
    <rect x="9" y="23" width="42" height="29" rx="4" fill="#4e3618" stroke="#352410" stroke-width="1.5"/>
    <!-- Bag top fold -->
    <rect x="9" y="23" width="42" height="7" rx="4" fill="#5e4622"/>
    <rect x="9" y="27" width="42" height="3" fill="#5e4622"/>
    <!-- Seam line -->
    <line x1="9" y1="30" x2="51" y2="30" stroke="#3a2810" stroke-width="0.8" opacity="0.6"/>
    <!-- Soil clumps -->
    <circle cx="19" cy="38" r="2.2" fill="#352410" opacity="0.75"/>
    <circle cx="29" cy="35" r="1.6" fill="#3e2e14" opacity="0.7"/>
    <circle cx="38" cy="40" r="2" fill="#352410" opacity="0.65"/>
    <circle cx="25" cy="44" r="1.6" fill="#3e2e14" opacity="0.65"/>
    <circle cx="43" cy="36" r="1.8" fill="#352410" opacity="0.65"/>
    <!-- Organic plant matter -->
    <path d="M22 31 Q24 25 26 31" stroke="#55993a" stroke-width="1.5" fill="none"/>
    <path d="M33 29 Q35 23 37 29" stroke="#66aa44" stroke-width="1.5" fill="none"/>
    <path d="M28 26 Q26 20 29 22" stroke="#55993a" stroke-width="1.2" fill="none"/>
    <path d="M41 27 Q43 22 44 26" stroke="#66aa44" stroke-width="1.2" fill="none"/>
    <!-- Label -->
    <text x="30" y="19" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#7aaa50" font-family="sans-serif">Loamy</text>
    <text x="30" y="58" text-anchor="middle" font-size="6" fill="#527230" font-family="sans-serif">50 g</text>
  </svg>`,

  clay: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Container bag -->
    <rect x="9" y="23" width="42" height="29" rx="4" fill="#a83838" stroke="#7a2020" stroke-width="1.5"/>
    <!-- Bag top fold -->
    <rect x="9" y="23" width="42" height="7" rx="4" fill="#bc4444"/>
    <rect x="9" y="27" width="42" height="3" fill="#bc4444"/>
    <!-- Seam line -->
    <line x1="9" y1="30" x2="51" y2="30" stroke="#7a2020" stroke-width="0.8" opacity="0.6"/>
    <!-- Clay surface texture — smooth wavy cracks -->
    <path d="M12 34 Q19 32 25 35 Q32 38 39 34 Q44 32 50 35" stroke="#7a2020" stroke-width="1.1" fill="none" opacity="0.6"/>
    <path d="M11 41 Q18 39 24 42 Q31 45 38 41 Q43 39 51 42" stroke="#7a2020" stroke-width="1.1" fill="none" opacity="0.5"/>
    <path d="M13 48 Q21 46 28 49 Q35 52 44 48" stroke="#7a2020" stroke-width="1" fill="none" opacity="0.4"/>
    <!-- Shrinkage crack lines -->
    <line x1="22" y1="30" x2="24" y2="50" stroke="#7a2020" stroke-width="0.9" opacity="0.5"/>
    <line x1="37" y1="31" x2="35" y2="51" stroke="#7a2020" stroke-width="0.9" opacity="0.5"/>
    <!-- Label -->
    <text x="30" y="19" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#c04040" font-family="sans-serif">Clay</text>
    <text x="30" y="58" text-anchor="middle" font-size="6" fill="#8a2a2a" font-family="sans-serif">50 g</text>
  </svg>`,

  cylinder: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Body interior volume fill -->
    <rect x="23" y="6" width="14" height="47" fill="rgba(180,225,255,0.06)"/>
    <!-- Left wall thickness -->
    <rect x="23" y="6" width="2.5" height="47" fill="rgba(180,225,255,0.24)"/>
    <!-- Right wall thickness -->
    <rect x="34.5" y="6" width="2.5" height="47" fill="rgba(180,225,255,0.24)"/>
    <!-- Water fill (100 ml — full) -->
    <rect x="25.5" y="16" width="9" height="36" fill="rgba(26,136,204,0.52)"/>
    <!-- Meniscus (curved water surface) -->
    <path d="M25.5 16 Q30 14.5 34.5 16" fill="rgba(26,136,204,0.35)" stroke="rgba(79,195,247,0.9)" stroke-width="1.2"/>
    <!-- Left outer wall -->
    <line x1="23" y1="6" x2="23" y2="53" stroke="#7ec8e3" stroke-width="1.8"/>
    <!-- Right outer wall -->
    <line x1="37" y1="6" x2="37" y2="53" stroke="#7ec8e3" stroke-width="1.8"/>
    <!-- Bottom closed edge -->
    <path d="M23 53 L37 53" stroke="#7ec8e3" stroke-width="1.8"/>
    <!-- Top rim (open ring) -->
    <path d="M23 6 L37 6" stroke="#9ecfe0" stroke-width="2.6" stroke-linecap="round"/>
    <!-- Pouring spout at top right -->
    <path d="M37 6 Q41 5 42.5 9" stroke="#9ecfe0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <!-- Hexagonal base platform -->
    <path d="M21 53 L19 57 L41 57 L39 53 Z" fill="rgba(140,195,215,0.32)" stroke="#7ec8e3" stroke-width="1.3"/>
    <!-- Graduation marks — major -->
    <line x1="31" y1="16" x2="36" y2="16" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="31" y1="25" x2="36" y2="25" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="31" y1="34" x2="36" y2="34" stroke="#4fc3f7" stroke-width="1.3"/>
    <line x1="31" y1="43" x2="36" y2="43" stroke="#4fc3f7" stroke-width="1.3"/>
    <!-- Graduation marks — minor -->
    <line x1="33" y1="21" x2="36" y2="21" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="33" y1="30" x2="36" y2="30" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="33" y1="39" x2="36" y2="39" stroke="#5ba8c8" stroke-width="0.9"/>
    <line x1="33" y1="48" x2="36" y2="48" stroke="#5ba8c8" stroke-width="0.9"/>
    <!-- Glass highlight / light reflection -->
    <line x1="25.5" y1="8" x2="25.5" y2="51" stroke="rgba(255,255,255,0.18)" stroke-width="1.6"/>
  </svg>`,
};

/* ── APPARATUS TRAY DEFINITIONS ─────────────────────────────*/
const APPARATUS = [
  { id:'beaker',   cat:'beaker', name:'Meas. Cyl.',    tip:'100 ml measuring cylinder — drag to place (×3 total)',    max:3 },
  { id:'funnel',   cat:'funnel', name:'Funnel',        tip:'Glass funnel — drag onto a beaker (×3 total)',             max:3 },
  { id:'filter',   cat:'filter', name:'Filter Paper',  tip:'Fold & line inside each funnel (×3 total)',               max:3 },
  { id:'sandy',    cat:'sandy',  name:'Sandy Soil',    tip:'Coarse sandy soil — 50 g, goes in Funnel 1' },
  { id:'loamy',    cat:'loamy',  name:'Loamy Soil',    tip:'Dark loamy soil — 50 g, goes in Funnel 2' },
  { id:'clay',     cat:'clay',   name:'Clay Soil',     tip:'Red clay soil — 50 g, goes in Funnel 3' },
  { id:'cylinder', cat:'cyl',    name:'Cylinder',      tip:'100 ml measuring cylinder — drag onto a funnel setup to pour (×3)', max:3 },
];

function svgKey(cat) {
  const m = {beaker:'beaker',funnel:'funnel',filter:'filter',
              sandy:'sandy',loamy:'loamy',clay:'clay',cyl:'cylinder'};
  return m[cat] || 'beaker';
}

function buildTray() {
  $tray.innerHTML = '';
  APPARATUS.forEach(def => {
    const el = document.createElement('div');
    el.className = `tray-item cat-${def.cat}`;
    el.dataset.id = def.id;
    el.draggable = true;
    const badge = def.max ? `<div class="tray-badge" id="badge-${def.id}">0/${def.max}</div>` : '';
    el.innerHTML = `<svg class="tray-svg" viewBox="0 0 60 60">${SVG[svgKey(def.cat)].replace(/<svg[^>]*>/,'').replace('</svg>','')}</svg>
      <div class="tray-name">${def.name}</div>${badge}`;
    el.addEventListener('mouseenter', e => showTip(e, def.tip));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('dragstart', e => {
      if (el.classList.contains('used')) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', def.id);
      el.classList.add('dragging');
      setTimeout(() => el.classList.remove('dragging'), 0);
    });
    $tray.appendChild(el);
  });
}

function updateBadge(id, count, max) {
  const b = document.getElementById(`badge-${id}`);
  if (b) b.textContent = `${count}/${max}`;
}

/* ── THREE.JS INIT ──────────────────────────────────────────*/
function initThree() {
  const cont = document.getElementById('scene-container');
  const W = cont.clientWidth || 800, H = cont.clientHeight || 600;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  cont.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060a12, 0.04);

  camera = new THREE.PerspectiveCamera(38, W/H, 0.1, 80);
  camera.position.set(0, 5.5, 13);
  camera.lookAt(0, 0.5, 0);

  $pourCvs.width = W; $pourCvs.height = H;

  buildEnv();

  window.addEventListener('resize', () => {
    const cW = cont.clientWidth, cH = cont.clientHeight;
    camera.aspect = cW/cH; camera.updateProjectionMatrix();
    renderer.setSize(cW, cH);
    $pourCvs.width = cW; $pourCvs.height = cH;
  });

  animate();
}

function buildEnv() {
  // Ambient
  scene.add(new THREE.AmbientLight(0x22334e, 1.2));

  // Key light — warm overhead
  const key = new THREE.DirectionalLight(0xfff0dd, 1.6);
  key.position.set(4, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left:-14, right:14, top:10, bottom:-10, near:0.5, far:45 });
  scene.add(key);

  // Fill — cool blue from left
  const fill = new THREE.DirectionalLight(0x88aadd, 0.6);
  fill.position.set(-8, 6, 3);
  scene.add(fill);

  // Back rim light
  const back = new THREE.DirectionalLight(0x334466, 0.40);
  back.position.set(0, -2, -10);
  scene.add(back);

  // Overhead point light — glass specular highlights (kept gentle)
  const glassSpec = new THREE.PointLight(0xffffff, 1.2, 22);
  glassSpec.position.set(0, 10, 2);
  scene.add(glassSpec);

  // Side accent — catches cylinder edges
  const sideAcc = new THREE.PointLight(0xddeeff, 0.7, 16);
  sideAcc.position.set(-5, 6, 7);
  scene.add(sideAcc);

  // Floor grid
  const grid = new THREE.GridHelper(26, 26, 0x182030, 0x0e1520);
  grid.position.y = TABLE_Y - 2.8;
  scene.add(grid);

  // Floor plane
  const fl = new THREE.Mesh(
    new THREE.PlaneGeometry(26,26),
    new THREE.MeshStandardMaterial({color:0x07090f, roughness:0.97})
  );
  fl.rotation.x = -Math.PI/2;
  fl.position.y = TABLE_Y - 2.82;
  fl.receiveShadow = true;
  scene.add(fl);
}

function animate() {
  requestAnimationFrame(animate);
  frameCount++;

  if (autoOrbit && !isDrag3D) {
    const t = frameCount * 0.0025;
    camera.position.x = Math.sin(t*0.4) * 0.9;
    camera.position.y = 5.5 + Math.sin(t*0.28)*0.2;
    camera.lookAt(0, 0.6, 0);
  }

  // Drip particles
  dripParticles = dripParticles.filter(p => {
    p.mesh.position.y -= p.vy;
    p.vy += 0.002;                // gravity
    p.mesh.material.opacity -= p.fade;
    if (p.mesh.material.opacity <= 0) { scene.remove(p.mesh); return false; }
    return true;
  });

  renderer.render(scene, camera);
}

/* ── 3D APPARATUS BUILDERS ──────────────────────────────────*/

/* COLOURS */
const C = {
  maroon:    0x6B3212,  // rich dark walnut
  maroon2:   0x4A2008,  // very dark espresso
  maroonLt:  0x8B4A1A,  // warm medium brown (tabletop surface)
  glass:     0xf0f4f8,
  glassEdge: 0xddeeff,
  water:     0x1a88cc,
  white:     0xf5f0e8,
};

/* ─── TABLE — Real Colombo 4-legged maroon wood ─── */
function makeTable() {
  const g = new THREE.Group(); g.name='table';

  const woodM  = new THREE.MeshStandardMaterial({color:C.maroon,  roughness:0.72, metalness:0.0});
  const wood2M = new THREE.MeshStandardMaterial({color:C.maroon2, roughness:0.78, metalness:0.0});
  const ltM    = new THREE.MeshStandardMaterial({color:C.maroonLt,roughness:0.68, metalness:0.0});

  // Tabletop — thick slab
  const top = new THREE.Mesh(new THREE.BoxGeometry(11, 0.28, 5.2), woodM);
  top.castShadow = true; top.receiveShadow = true;
  g.add(top);

  // Top surface slightly lighter
  const surf = new THREE.Mesh(new THREE.BoxGeometry(10.95, 0.025, 5.15), ltM);
  surf.position.y = 0.145;
  g.add(surf);

  // Front & back apron rails
  [-2.3,2.3].forEach(z => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.35, 0.22), wood2M);
    apron.position.set(0, -0.28, z);
    apron.castShadow = true;
    g.add(apron);
  });
  // Side apron rails
  [-4.8,4.8].forEach(x => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 4.76), wood2M);
    apron.position.set(x, -0.28, 0);
    apron.castShadow = true;
    g.add(apron);
  });

  // 4 legs — tapered, turned-wood style using CylinderGeometry
  [[-4.6,-2.1],[4.6,-2.1],[-4.6,2.1],[4.6,2.1]].forEach(([lx,lz]) => {
    // Main leg shaft
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.16,2.8,16), wood2M);
    leg.position.set(lx, -1.62, lz);
    leg.castShadow = true;
    g.add(leg);

    // Foot pad
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.06,16), woodM);
    foot.position.set(lx, -2.99, lz);
    g.add(foot);

    // Decorative ring at top of leg
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.1,16), ltM);
    ring.position.set(lx, -0.48, lz);
    g.add(ring);
  });

  // Horizontal stretchers between legs (connecting cross brace)
  // Front-back pairs
  [[-4.6],[4.6]].forEach(([lx]) => {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,4.2,10), wood2M);
    str.rotation.x = Math.PI/2;
    str.position.set(lx, -2.2, 0);
    g.add(str);
  });
  // Side stretchers
  [[-1.8],[1.8]].forEach(([lz]) => {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,9.2,10), wood2M);
    str.rotation.z = Math.PI/2;
    str.position.set(0, -2.2, lz);
    g.add(str);
  });

  g.position.y = TABLE_Y;
  scene.add(g);
  M.table = g;

  // Drop animation
  g.position.y = TABLE_Y - 7;
  let y = TABLE_Y - 7;
  const iv = setInterval(() => {
    y += (TABLE_Y - y) * 0.14 + 0.05;
    g.position.y = y;
    if (y >= TABLE_Y - 0.02) { g.position.y = TABLE_Y; clearInterval(iv); }
  }, 16);
}

/* ─── MEASURING CYLINDER (collection) — tall glass cylinder with flared base ─── */
// Shared dimensions used also by makeFunnel/makeFilter for alignment.
const BC_H    = 2.5;   // body height
const BC_R    = 0.34;  // body outer radius
const BC_TH   = 0.22;  // taper height (body → base)
const BC_BASH = 0.20;  // base slab height
const BC_BASR = 0.82;  // base radius
// group.y so that the very bottom of the base sits on TOP_Y:
const BC_GY   = TOP_Y + (BC_H/2 + BC_TH + BC_BASH) + 0.01; // ≈ TOP_Y + 1.68
// world-Y of the open top rim:
const BC_RIMY = BC_GY + BC_H/2;   // ≈ TOP_Y + 2.93

/* ── Graduation texture ──────────────────────────────────────────────────────
   Three.js CylinderGeometry UV: U=0 → front face (+Z, faces camera)
   Canvas: x=0 (U=0) = front of cylinder, x=W (U=1) wraps back to front.
   V: 0=bottom of cylinder → canvas y=H; 1=top → canvas y=0.
   Strategy: full-width tick lines (visible all around) + numbers on front face.
─────────────────────────────────────────────────────────────────────────── */
let _gradTex = null;
function makeGradTexture() {
  if (_gradTex) return _gradTex;
  const W = 1024, H = 2048;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // canvas y for a given ml value
  const mlToY = ml => H * (1.0 - (ml / 100) * 0.87);

  // ── 2 ml fine ticks — full circumference, very short ──
  for (let ml = 2; ml <= 100; ml += 2) {
    if (ml % 5 === 0) continue;
    const py = mlToY(ml);
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    ctx.restore();
  }

  // ── 5 ml medium ticks ──
  for (let ml = 5; ml <= 100; ml += 5) {
    if (ml % 10 === 0) continue;
    const py = mlToY(ml);
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.82;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    ctx.restore();
  }

  // ── 10 ml major ticks + labels ──
  for (let ml = 10; ml <= 100; ml += 10) {
    const py  = mlToY(ml);
    const big = ml % 50 === 0;
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = big ? 5 : 3.5;
    ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    ctx.restore();

    // Numbers at front face (U≈0 = right of canvas seam) and U≈0.5 (back)
    // Placed slightly to the right of the left edge and centre
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.font = `${big ? 'bold ' : ''}${big ? 72 : 58}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillStyle = '#111';
    ctx.textAlign = 'left';
    // front face label — just right of seam
    ctx.fillText(ml, 14, py - 8);
    // back face label — halfway around
    ctx.fillText(ml, W * 0.5 + 14, py - 8);
    ctx.restore();
  }

  _gradTex = new THREE.CanvasTexture(cv);
  return _gradTex;
}

/* shared grad material so both cylinder types get identical marks */
function makeGradMesh(radius) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, BC_H, 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: makeGradTexture(),
      transparent: true,
      alphaTest: 0.04,
      depthWrite: true,
      side: THREE.FrontSide,
    })
  );
}

function makeBeaker(si) {
  const g = new THREE.Group(); g.name = `beaker-${si}`;
  const x = SLOTS[si].x;

  // Borosilicate glass — near-colorless, clear like real Pyrex
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f8ff, roughness: 0.0, metalness: 0.0,
    transparent: true, opacity: 0.28,
    reflectivity: 0.9, ior: 1.47, side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef5ff, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.42,
    reflectivity: 0.9, ior: 1.47, side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });

  // ── Cylindrical body (open tube) ──
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R, BC_R, BC_H, 64, 1, true), glassMat
  );
  g.add(body);

  // Bottom disc
  const bot = new THREE.Mesh(new THREE.CircleGeometry(BC_R, 64), glassMat);
  bot.rotation.x = -Math.PI / 2; bot.position.y = -BC_H / 2;
  g.add(bot);

  // ── Taper from narrow body to wide base ──
  const taper = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R + 0.02, BC_BASR, BC_TH, 64), baseMat
  );
  taper.position.y = -BC_H / 2 - BC_TH / 2;
  g.add(taper);

  // ── Wide flat base slab ──
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_BASR, BC_BASR, BC_BASH, 64), baseMat
  );
  base.position.y = -BC_H / 2 - BC_TH - BC_BASH / 2;
  g.add(base);

  const baseBot = new THREE.Mesh(new THREE.CircleGeometry(BC_BASR, 64), baseMat);
  baseBot.rotation.x = -Math.PI / 2;
  baseBot.position.y = -BC_H / 2 - BC_TH - BC_BASH;
  g.add(baseBot);

  // ── Graduation marks — shell placed OUTSIDE the glass so no z-fighting ──
  g.add(makeGradMesh(BC_R + 0.012));

  // ── Water fill (hidden initially, scaled up by setBeakerWaterLevel) ──
  const fillMat = new THREE.MeshPhysicalMaterial({
    color: C.water, transparent: true, opacity: 0.62, roughness: 0.0,
    transmission: 0.25, thickness: 0.2,
  });
  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R - 0.05, BC_R - 0.05, 0.01, 48), fillMat
  );
  fill.position.y = -BC_H / 2 + 0.005; fill.visible = false;
  g.add(fill);
  M.beakerWater[si] = fill;

  // Meniscus disc (curved water surface)
  const meniscus = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R - 0.04, BC_R - 0.04, 0.012, 48),
    new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.0 })
  );
  meniscus.position.y = -BC_H / 2 + 0.005;
  meniscus.name = `meniscus-${si}`;
  g.add(meniscus);

  // ── Position: base sits on table ──
  g.position.set(x, BC_GY, -0.2);
  scene.add(g); M.beakers[si] = g; popIn(g);
}

/* ─── FUNNEL — real glass separation funnel ─── */
function makeFunnel(si) {
  const g = new THREE.Group(); g.name = `funnel-${si}`;
  const x = SLOTS[si].x;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f8ff, roughness: 0.0, metalness: 0.0,
    transparent: true, opacity: 0.28,
    reflectivity: 0.9, ior: 1.47, side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });

  // CONE — wide top (y=+0.7) narrow bottom (y=-0.7)
  // ConeGeometry points UP by default; rotate X by PI to flip wide-end up
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.44, 40, 1, true),
    glassMat
  );
  cone.rotation.x = Math.PI;  // flip: wide opening now faces UP
  cone.position.y = 0;
  g.add(cone);

  // Inner cone wall (slightly smaller, DoubleSide for realism)
  const coneIn = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 1.38, 40, 1, true),
    glassMat
  );
  coneIn.rotation.x = Math.PI;
  coneIn.position.y = 0;
  g.add(coneIn);

  // Narrow stem — short tube going DOWN from the cone tip
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 1.0, 18, 1, true),
    glassMat
  );
  stem.position.y = -1.22;
  g.add(stem);

  // Stem tip cap (small disc at bottom of stem)
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x9ecfe0, roughness: 0.1, metalness: 0.05 });
  const tip = new THREE.Mesh(
    new THREE.CircleGeometry(0.072, 18),
    tipMat
  );
  tip.rotation.x = Math.PI/2;
  tip.position.y = -1.72;
  g.add(tip);

  // Water accumulation mesh — sits inside funnel above soil layer
  const fwMat = new THREE.MeshPhysicalMaterial({
    color:0x1a88cc, transparent:true, opacity:0.52,
    roughness:0.05, metalness:0.0, transmission:0.3
  });
  const fw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.44, 0.40, 32),
    fwMat
  );
  fw.position.y = 0.22 + 0.20;  // bottom at y=0.22 (soil surface), center at 0.42
  fw.scale.y = 0.001;
  fw.visible = false;
  fw.name = `funnel-water-${si}`;
  g.add(fw);
  M.funnelWater[si] = fw;

  // Funnel rests on the beaker rim
  const beakerTopY = BC_RIMY; // top rim of the measuring cylinder in world Y
  g.position.set(x, beakerTopY + 0.72 + 0.02, -0.2);  // rim top at beaker opening
  scene.add(g);
  M.funnels[si] = g;
  popIn(g);
}

/* ─── FILTER PAPER — realistic folded cone inside funnel ─── */
function makeFilter(si) {
  const g = new THREE.Group(); g.name = `filter-${si}`;
  const x = SLOTS[si].x;

  // Cream paper — very matte, slightly translucent
  const paperMat = new THREE.MeshStandardMaterial({
    color:0xede8d5, roughness:0.97, metalness:0.0,
    side:THREE.DoubleSide, transparent:true, opacity:0.93
  });
  const creaseMat = new THREE.MeshStandardMaterial({
    color:0xbfb894, roughness:0.96, metalness:0.0
  });

  // Back-face shadow cone (gives the folded paper its thickness illusion)
  const backCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.625, 1.30, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color:0xd0c8a5, roughness:0.97, metalness:0.0,
      side:THREE.BackSide, transparent:true, opacity:0.65
    })
  );
  backCone.rotation.x = Math.PI;
  g.add(backCone);

  // Main inner cone (front face — cream)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.60, 1.26, 48, 1, true),
    paperMat
  );
  cone.rotation.x = Math.PI;
  g.add(cone);

  // The quarter-folded double-layer on one side (slightly protruding)
  const doubleCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.61, 1.27, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color:0xdcd5b5, roughness:0.97, metalness:0.0,
      side:THREE.DoubleSide, transparent:true, opacity:0.82
    })
  );
  doubleCone.rotation.x = Math.PI;
  doubleCone.rotation.y = Math.PI * 0.18;
  g.add(doubleCone);

  // Two perpendicular fold creases (paper folded from a circle into quarters then cone)
  [0, Math.PI/2].forEach(ry => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.003, 1.27, 6),
      creaseMat
    );
    c.rotation.y = ry;
    g.add(c);
  });

  const beakerTopY = BC_RIMY; // top rim of the measuring cylinder in world Y
  g.position.set(x, beakerTopY + 0.72 + 0.02, -0.2);
  scene.add(g);
  M.filters[si] = g;
  popIn(g);
}

/* ─── SOIL inside funnel ─── */
const SOIL_COLS = { sandy:0xc8a96e, loamy:0x5a3e24, clay:0xaa3232 };
const SOIL_ROUGH = { sandy:0.95, loamy:0.98, clay:0.88 };
function makeSoil(si, type) {
  // Soil surface — cone truncated, fills top portion of funnel
  const mat = new THREE.MeshStandardMaterial({
    color:SOIL_COLS[type], roughness:SOIL_ROUGH[type],
    metalness:0.0
  });
  // Wide truncated cone sitting in funnel
  const geo = new THREE.CylinderGeometry(0.54, 0.3, 0.55, 32);
  const mesh = new THREE.Mesh(geo, mat);

  const funnelY = M.funnels[si].position.y;
  mesh.position.set(SLOTS[si].x, funnelY + 0.22, -0.2);
  scene.add(mesh);
  M.soils[si] = mesh;
  popIn(mesh);
}

/* ─── POURING MEASURING CYLINDER — same realistic shape, full of water ─── */
// Uses the same BC_* dimensions as the collection cylinders for consistency.
function makeCylinder() {
  const g = new THREE.Group(); g.name = 'cylinder';

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f8ff, roughness: 0.0, metalness: 0.0,
    transparent: true, opacity: 0.28,
    reflectivity: 0.9, ior: 1.47, side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
  const spoutMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef5ff, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.38,
    reflectivity: 0.9, ior: 1.47,
  });
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef5ff, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.42,
    reflectivity: 0.9, ior: 1.47, side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });

  // ── Body (open tube) ──
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R, BC_R, BC_H, 64, 1, true), glassMat
  );
  g.add(body);

  // Bottom disc
  const bot = new THREE.Mesh(new THREE.CircleGeometry(BC_R, 64), glassMat);
  bot.rotation.x = -Math.PI / 2; bot.position.y = -BC_H / 2;
  g.add(bot);

  // ── Pouring spout ──
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.04, 0.28, 16), spoutMat
  );
  spout.rotation.z = Math.PI / 5;
  spout.position.set(BC_R - 0.02, BC_H / 2 + 0.08, 0);
  g.add(spout);

  // ── Taper + base ──
  const taper = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R + 0.02, BC_BASR, BC_TH, 64), baseMat
  );
  taper.position.y = -BC_H / 2 - BC_TH / 2;
  g.add(taper);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_BASR, BC_BASR, BC_BASH, 64), baseMat
  );
  base.position.y = -BC_H / 2 - BC_TH - BC_BASH / 2;
  g.add(base);

  const baseBot = new THREE.Mesh(new THREE.CircleGeometry(BC_BASR, 64), baseMat);
  baseBot.rotation.x = -Math.PI / 2;
  baseBot.position.y = -BC_H / 2 - BC_TH - BC_BASH;
  g.add(baseBot);

  // ── Graduation marks — outside the glass, no z-fighting ──
  g.add(makeGradMesh(BC_R + 0.012));

  // ── Water (full — 100 ml) ──
  const waterH  = BC_H * 0.87;
  const waterMat = new THREE.MeshStandardMaterial({
    color: C.water, transparent: true, opacity: 0.58, roughness: 0.0
  });
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(BC_R - 0.05, BC_R - 0.05, waterH, 40), waterMat
  );
  water.position.y = -BC_H / 2 + waterH / 2 + 0.005;
  water.name = 'cyl-water'; g.add(water); M.cylWater = water;

  // Meniscus
  const men = new THREE.Mesh(
    new THREE.CircleGeometry(BC_R - 0.05, 40),
    new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.52 })
  );
  men.rotation.x = -Math.PI / 2;
  men.position.y = -BC_H / 2 + waterH + 0.006;
  men.name = 'cyl-meniscus'; g.add(men);

  // ── Spawn right of table, base on table surface ──
  g.position.set(4.6, BC_GY, -0.2);
  scene.add(g); M.cyl = g; popIn(g);
}

/* ── ANIMATION HELPERS ──────────────────────────────────────*/
function popIn(obj) {
  obj.scale.setScalar(0.01);
  let s = 0.01;
  const iv = setInterval(() => {
    s += (1-s)*0.16 + 0.01;
    obj.scale.setScalar(Math.min(s,1));
    if (s >= 0.98) { obj.scale.setScalar(1); clearInterval(iv); }
  },16);
}

function spawnDrip(slotIdx, rate) {
  const x = SLOTS[slotIdx].x;
  const stemY = M.funnels[slotIdx] ? M.funnels[slotIdx].position.y - 1.72 : TOP_Y + 1.3;
  const geo = new THREE.SphereGeometry(0.045 + Math.random()*0.025, 8, 8);
  const mat = new THREE.MeshStandardMaterial({color:C.water, transparent:true, opacity:0.88, roughness:0});
  const m   = new THREE.Mesh(geo, mat);
  m.position.set(x + (Math.random()-0.5)*0.05, stemY, -0.2 + (Math.random()-0.5)*0.04);
  scene.add(m);
  dripParticles.push({mesh:m, vy:0.015+Math.random()*0.01, fade:0.012+Math.random()*0.006});
}

/* ── WATER LEVEL IN BEAKER ──────────────────────────────────*/
function setBeakerWaterLevel(si, fraction) {
  const fill = M.beakerWater[si];
  if (!fill) return;
  const maxH  = BC_H * 0.86;          // usable fill height inside cylinder
  const floorY = -BC_H / 2 + 0.005;  // local Y of the cylinder floor
  const h = Math.max(0.01, fraction * maxH);
  fill.visible   = fraction > 0.001;
  fill.scale.y   = h / 0.01;
  fill.position.y = floorY + h / 2;

  const men = M.beakers[si] && M.beakers[si].getObjectByName(`meniscus-${si}`);
  if (men) {
    men.material.opacity = fraction > 0.01 ? 0.55 : 0.0;
    men.position.y = floorY + h;
  }
}

/* ── WATER LEVEL IN FUNNEL ──────────────────────────────────*/
// level: 0 (empty) → 1 (full, water at soil surface up to near rim)
const FW_BOTTOM_Y = 0.22;   // local Y at soil surface
const FW_MAX_H    = 0.40;   // max water column height inside funnel

function setFunnelWaterLevel(si, level) {
  const fw = M.funnelWater[si];
  if (!fw) return;
  const f = Math.max(0, Math.min(1, level));
  fw.visible = f > 0.02;
  fw.scale.y = Math.max(0.001, f);
  fw.position.y = FW_BOTTOM_Y + (FW_MAX_H * f) / 2;
}

/* ── POUR CANVAS (2D stream overlay) ───────────────────────*/
let pourCtx = null;
let pourAnimId = null;

/* ── REALISTIC WATER STREAM DRAWING ─────────────────────────
   Draws a tapered ribbon with dark glass edges + center
   highlight, matching the look of a real poured stream.
   ──────────────────────────────────────────────────────────*/
function drawPourStream(ctx, sp, fp, frameIdx) {
  ctx.clearRect(0, 0, $pourCvs.width, $pourCvs.height);

  const wobble = Math.sin(frameIdx * 0.18) * 1.6;
  const dx = fp.x - sp.x, dy = fp.y - sp.y;

  // Control point: 40 % across horizontally, gravity-arc depth
  // proportional to horizontal span so it never overshoots the endpoint.
  const cpX = sp.x + dx * 0.40 + wobble;
  const cpY = sp.y + dy * 0.50 + Math.abs(dx) * 0.18;

  function bezierPt(t) {
    const u = 1 - t;
    return { x: u*u*sp.x + 2*u*t*cpX + t*t*fp.x,
             y: u*u*sp.y + 2*u*t*cpY + t*t*fp.y };
  }
  function bezierNorm(t) {
    const tx = 2*(1-t)*(cpX-sp.x) + 2*t*(fp.x-cpX);
    const ty = 2*(1-t)*(cpY-sp.y) + 2*t*(fp.y-cpY);
    const len = Math.sqrt(tx*tx+ty*ty) || 1;
    return { nx: -ty/len, ny: tx/len };
  }
  // Width profile: wide at spout, narrows in free-fall, widens at impact
  function streamW(t) {
    return t < 0.5 ? 15 + (5 - 15) * (t / 0.5)
                   : 5  + (10 - 5)  * ((t - 0.5) / 0.5);
  }

  const N = 32;
  const left = [], right = [], ctr = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = bezierPt(t);
    const nm = bezierNorm(t);
    const hw = streamW(t) / 2;
    left.push({ x: pt.x - nm.nx*hw, y: pt.y - nm.ny*hw });
    right.push({ x: pt.x + nm.nx*hw, y: pt.y + nm.ny*hw });
    ctr.push(pt);
  }

  ctx.save();

  // 1 — soft glow halo
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  left.forEach(p  => ctx.lineTo(p.x, p.y));
  for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.shadowBlur  = 22;
  ctx.shadowColor = 'rgba(79,195,247,0.40)';
  ctx.fillStyle   = 'rgba(79,195,247,0.06)';
  ctx.fill();
  ctx.shadowBlur  = 0;

  // 2 — main water fill (gradient along the stream)
  const grad = ctx.createLinearGradient(sp.x, sp.y, fp.x, fp.y);
  grad.addColorStop(0,    'rgba(18, 100, 185, 0.93)');
  grad.addColorStop(0.35, 'rgba(38, 145, 215, 0.80)');
  grad.addColorStop(0.70, 'rgba(58, 170, 238, 0.74)');
  grad.addColorStop(1,    'rgba(78, 195, 255, 0.87)');

  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  left.forEach(p  => ctx.lineTo(p.x, p.y));
  for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 3 — left dark glass edge
  ctx.beginPath();
  left.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = 'rgba(6, 38, 105, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 4 — right dark glass edge
  ctx.beginPath();
  right.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = 'rgba(6, 38, 105, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 5 — bright center highlight (light reflected in the stream)
  ctx.beginPath();
  ctr.forEach((pt, i) => {
    const nm = bezierNorm(i / N);
    const hw = streamW(i / N) * 0.15;
    const p  = { x: pt.x - nm.nx*hw, y: pt.y - nm.ny*hw };
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = 'rgba(215, 242, 255, 0.68)';
  ctx.lineWidth   = 1.9;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // 6 — splash droplets at funnel opening
  const ns = 5 + (Math.random() * 4 | 0);
  for (let d = 0; d < ns; d++) {
    const da = Math.random() * Math.PI * 2;
    const dr = 2 + Math.random() * 10;
    const r  = 1.2 + Math.random() * 2.8;
    ctx.beginPath();
    ctx.arc(fp.x + Math.cos(da)*dr, fp.y + Math.sin(da)*dr*0.45, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${100+Math.random()*80|0},${205+Math.random()*50|0},255,${0.38+Math.random()*0.32})`;
    ctx.fill();
  }

  // 7 — occasional mid-stream turbulence droplet
  if (Math.random() < 0.35) {
    const ti  = Math.floor(N * (0.25 + Math.random() * 0.50));
    const tp  = ctr[ti];
    ctx.beginPath();
    ctx.arc(tp.x + (Math.random()-0.5)*9, tp.y + (Math.random()-0.5)*9, 1.4, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(165,228,255,0.52)';
    ctx.fill();
  }

  ctx.restore();
}

function screenXY(worldPos) {
  const cont  = document.getElementById('scene-container');
  const rect  = cont.getBoundingClientRect();
  const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
  v.project(camera);
  return {
    x: (v.x*0.5+0.5)*rect.width,
    y: (-v.y*0.5+0.5)*rect.height
  };
}

/* ── INTERACTIVE POUR MECHANIC ──────────────────────────────
   Pupil drags the cylinder SVG/tray-item toward a funnel.
   When dropped on workspace with cylinder placed, we start
   interactive pouring on the nearest funnel.
   Holding the pour continues it; "Stop Pouring" or reaching
   100ml ends it.
   ──────────────────────────────────────────────────────────*/

// Which slot is being targeted for pour
let pourTargetSlot = -1;
let pourFrameId = null;
let pourVolCurrent = 0;
const POUR_RATE = 12.0;  // ml per second at 60fps → 100 ml fills in ~8 seconds
const POUR_FPS_RATE = POUR_RATE / 60;

function startPour(slotIdx) {
  if (S.pouringSlot === slotIdx && S.pourActive) return;
  if (S.poured[slotIdx]) { msg(`⚠ Already poured 100ml into Setup ${slotIdx+1}`); return; }
  if (!M.cyl) { msg('⚠ Place the measuring cylinder first'); return; }

  S.pouringSlot = slotIdx;
  S.pourActive  = true;
  pourVolCurrent = 0;
  autoOrbit = false;

  const slotNames = ['Funnel 1 (Sandy)', 'Funnel 2 (Loamy)', 'Funnel 3 (Clay)'];
  $volName.textContent = slotNames[slotIdx];
  $volDisp.classList.remove('hidden');
  $volBar.style.width = '0%';
  $volCur.textContent = '0';

  msg(`Pouring water into ${slotNames[slotIdx]}... click "■ Stop Pouring" when you've poured enough`);

  // Tilt the 3D cylinder toward the funnel
  const cyl = M.cyl;
  const origX = cyl.position.x, origY = cyl.position.y, origRZ = cyl.rotation.z;
  // tx: pivot placed so the tilted mouth lands on the funnel centre.
  // With θ = -PI/2.2, mouth x-offset = BC_H/2 * sin(PI/2.2) ≈ 1.24, so tx = slot.x - 1.24
  const tx = SLOTS[slotIdx].x - 1.24;
  const ty = M.funnels[slotIdx].position.y + 2.0;

  // Animate cylinder moving into position over 40 frames
  let moveF = 0;
  function moveIn() {
    moveF++;
    const t = Math.min(moveF/40, 1);
    const e = t<0.5?2*t*t:-1+(4-2*t)*t;
    cyl.position.x = origX + (tx-origX)*e;
    cyl.position.y = origY + (ty-origY)*e;
    cyl.rotation.z = origRZ + (-Math.PI/2.2)*e;  // steep tilt — nearly horizontal
    if (moveF < 40) requestAnimationFrame(moveIn);
    else startPourStream(slotIdx, origX, origY, origRZ);
  }
  moveIn();
}

function startPourStream(slotIdx, origX, origY, origRZ) {
  if (!pourCtx) pourCtx = $pourCvs.getContext('2d');
  const ctx = pourCtx;

  let frameIdx = 0;
  let waterInCyl = 1.0;   // fraction 1→0

  function pourFrame() {
    if (!S.pourActive) {
      // Stop: retract cylinder
      endPourAnim(slotIdx, origX, origY, origRZ);
      return;
    }

    pourVolCurrent += POUR_FPS_RATE;
    if (pourVolCurrent > 100) pourVolCurrent = 100;

    // Update UI volume display
    $volBar.style.width   = pourVolCurrent + '%';
    $volCur.textContent   = pourVolCurrent.toFixed(1);

    // Shrink water in cylinder as it's poured out
    waterInCyl = Math.max(0, 1 - pourVolCurrent/100);
    if (M.cylWater) {
      M.cylWater.scale.y = Math.max(0.01, waterInCyl);
      M.cylWater.position.y = (-BC_H / 2) + 0.005 + (BC_H * 0.87 / 2) * waterInCyl;
    }

    // Compute true spout world position by transforming the cylinder's
    // local mouth point (top rim at y=1.52) through its current world matrix
    // — this correctly accounts for both translation and tilt rotation.
    M.cyl.updateMatrixWorld(true);
    const _mouth = new THREE.Vector3(0, BC_H / 2, 0).applyMatrix4(M.cyl.matrixWorld);
    const sp = screenXY({ x: _mouth.x, y: _mouth.y, z: _mouth.z });
    const fp = screenXY({
      x: SLOTS[slotIdx].x,
      y: M.funnels[slotIdx].position.y + 0.72,
      z: -0.2
    });

    drawPourStream(ctx, sp, fp, frameIdx);

    // Water accumulates in funnel (beaker stays empty until soil absorbs)
    setFunnelWaterLevel(slotIdx, pourVolCurrent / 100);

    frameIdx++;

    if (pourVolCurrent >= 100) {
      // Auto-stop at 100ml
      S.pourActive = false;
      endPourAnim(slotIdx, origX, origY, origRZ);
      onPourComplete(slotIdx);
      return;
    }

    pourAnimId = requestAnimationFrame(pourFrame);
  }

  pourAnimId = requestAnimationFrame(pourFrame);
}

function endPourAnim(slotIdx, origX, origY, origRZ) {
  const ctx = pourCtx || $pourCvs.getContext('2d');
  ctx.clearRect(0,0,$pourCvs.width,$pourCvs.height);

  // Retract cylinder back to stand position
  const cyl = M.cyl;
  let retF = 0;
  const startX = cyl.position.x, startY = cyl.position.y, startRZ = cyl.rotation.z;
  function retract() {
    retF++;
    const t = Math.min(retF/35,1);
    const e = t<0.5?2*t*t:-1+(4-2*t)*t;
    cyl.position.x = startX + (origX-startX)*e;
    cyl.position.y = startY + (origY-startY)*e;
    cyl.rotation.z = startRZ + (origRZ-startRZ)*e;
    if (retF < 35) requestAnimationFrame(retract);
  }
  retract();

  $volDisp.classList.add('hidden');
}

function onPourComplete(slotIdx) {
  S.poured[slotIdx] = true;
  S.pourActive = false;
  S.pouringSlot = -1;

  const poured = S.poured.filter(Boolean).length;
  updateBadge('cylinder', poured, 3);
  if (poured >= 3) markUsed($tray.querySelector('[data-id="cylinder"]'));

  // Remove the 3D cylinder once the retract animation (~600 ms) finishes
  setTimeout(() => {
    if (M.cyl) { scene.remove(M.cyl); M.cyl = null; M.cylWater = null; }
  }, 700);

  if (poured < 3) {
    msg(`✓ ${pourVolCurrent.toFixed(0)} ml poured into Setup ${slotIdx+1}. Drag another cylinder onto the next funnel.`);
  } else {
    msg('All setups poured! Waiting 20 seconds for drainage...');
    beginDraining();
  }
}

/* Stop button */
$stopBtn.addEventListener('click', () => {
  if (!S.pourActive) return;
  S.pourActive = false;
  cancelAnimationFrame(pourAnimId);
  const slotIdx = S.pouringSlot;
  const cyl = M.cyl;
  endPourAnim(slotIdx, cyl._origX||cyl.position.x, cyl._origY||cyl.position.y, 0);
  onPourComplete(slotIdx);
});

/* ── DRAINING PHASE ─────────────────────────────────────────*/
function beginDraining() {
  S.draining = true;
  $timer.classList.remove('hidden');
  msg('Water percolating through soil — sandy soil will drain first...');

  // Real experiment: water must first saturate the soil before emerging below.
  // Sandy: large macropores, wetting front reaches bottom in ~2s (sim time)
  // Loamy: medium pores, ~5s delay
  // Clay:  microscopic platelets hold water via capillary forces, ~12s delay
  const wetDelay  = { sandy: 2000, loamy: 5000,  clay: 12000 };
  const dripRate  = { sandy: 110,  loamy: 330,    clay: 1800  };
  const drainStart= { sandy: 2,    loamy: 5,      clay: 12    };
  const drainEnd  = { sandy: 8,    loamy: 14,     clay: 20    };

  // All funnels start full (water just poured in)
  SLOTS.forEach((sl, i) => {
    if (sl.soilType && S.poured[i]) setFunnelWaterLevel(i, 0.92);
  });

  // Schedule first drips per slot after soil-specific wetting delay
  SLOTS.forEach((sl, i) => {
    if (!sl.soilType || !S.poured[i]) return;
    const t = setTimeout(() => {
      if (!S.draining) return;
      const iv = setInterval(() => spawnDrip(i, 1), dripRate[sl.soilType]);
      S.dripIvs.push(iv);
      S.dripIvSlot[i] = iv;
      const soilName = sl.soilType.charAt(0).toUpperCase() + sl.soilType.slice(1);
      msg(`${soilName} soil wetting front reached — water draining through...`);
    }, wetDelay[sl.soilType]);
    S.dripTimeouts.push(t);
  });

  let elapsed = 0;
  S.timerIv = setInterval(() => {
    elapsed++;
    $timerV.textContent = elapsed;

    SLOTS.forEach((sl, i) => {
      if (!sl.soilType || !S.poured[i]) return;
      const r  = RESULTS[sl.soilType];
      const ds = drainStart[sl.soilType];
      const de = drainEnd[sl.soilType];

      if (elapsed <= ds) {
        // Pre-drainage: funnel stays near-full, beaker stays empty
        setFunnelWaterLevel(i, 0.92);
        setBeakerWaterLevel(i, 0);
        return;
      }

      // Active drainage: funnel empties, beaker fills
      const frac  = Math.min((elapsed - ds) / (de - ds), 1);
      const eased = frac < 0.5 ? 2*frac*frac : -1 + (4 - 2*frac)*frac;
      setFunnelWaterLevel(i, 0.92 * (1 - eased));
      setBeakerWaterLevel(i, eased * r.drainedPct * 0.88);
    });

    // Stop drip intervals when each soil's drainage window closes
    if (elapsed === drainEnd.sandy && S.dripIvSlot[0]) { clearInterval(S.dripIvSlot[0]); }
    if (elapsed === drainEnd.loamy && S.dripIvSlot[1]) { clearInterval(S.dripIvSlot[1]); }
    if (elapsed === drainEnd.clay  && S.dripIvSlot[2]) { clearInterval(S.dripIvSlot[2]); }

    if (elapsed >= 20) {
      clearInterval(S.timerIv);
      S.dripIvs.forEach(iv => clearInterval(iv));
      $timer.classList.add('hidden');
      finishExperiment();
    }
  }, 1000);
}

function finishExperiment() {
  S.done = true;
  msg('✅ Experiment complete! View results in the panel →');

  // Final water levels — beakers at drained amount, funnels now empty
  SLOTS.forEach((sl,i) => {
    if (!sl.soilType) return;
    setBeakerWaterLevel(i, RESULTS[sl.soilType].drainedPct * 0.88);
    setFunnelWaterLevel(i, 0);
  });

  // Camera pull back for overview
  const iv = setInterval(() => {
    camera.position.z += (10 - camera.position.z)*0.05;
    camera.position.y += (6 - camera.position.y)*0.05;
    camera.lookAt(0,0.5,0);
  },16);
  setTimeout(()=>clearInterval(iv),2000);

  showResults();
  markStepDone('pour');
}

/* ── RESULTS ────────────────────────────────────────────────*/
function showResults() {
  $resBox.classList.remove('hidden');
  $resCont.innerHTML = '';

  SLOTS.forEach((sl,i) => {
    const type = sl.soilType || ['sandy','loamy','clay'][i];
    const r = RESULTS[type];
    const drained  = Math.round(100 * r.drainedPct);
    const retained = 100 - drained;
    const retPct   = retained;

    const row = document.createElement('div');
    row.className = `result-row ${r.cls}`;
    row.innerHTML = `
      <div class="soil-name">${r.label}</div>
      <span>Drained: <b>${drained}ml</b> | Retained: <b>${retained}ml (${retPct}%)</b></span>
      <span style="font-size:10.5px;opacity:.7">${r.desc}</span>
      <div class="result-bar-wrap"><div class="result-bar" style="width:0%"></div></div>
      <span style="font-size:10px;opacity:.5">100ml − ${drained}ml = ${retained}ml retained</span>
    `;
    $resCont.appendChild(row);
    setTimeout(() => row.querySelector('.result-bar').style.width = retPct+'%', 120+i*180);
  });

  const conc = document.createElement('div');
  conc.style.cssText='margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.06);font-size:10.5px;color:#90a4ae;line-height:1.58';
  conc.innerHTML=`
    <strong style="color:#4fc3f7">Conclusion</strong><br>
    <b style="color:#c8a96e">Sandy soil</b> drained almost immediately due to its large macropores — gravity pulls water straight through, leaving little retained.<br><br>
    <b style="color:#b04040">Clay soil</b> held the most water. Its microscopic plate-like particles (&lt;0.002 mm) have enormous surface area, and capillary forces between those surfaces are strong enough to resist gravity — water clings to the clay matrix rather than draining.<br><br>
    <b style="color:#6b8c42">Loamy soil</b> strikes the ideal balance: enough macropores for oxygen and drainage, but sufficient micropores and organic matter to hold moisture available for plant roots. This is why loam is prized for agriculture.
  `;
  $resCont.appendChild(conc);
}

/* ── DROP / PLACEMENT LOGIC ─────────────────────────────────*/
const workspace = document.getElementById('workspace');
workspace.addEventListener('dragover', e => { e.preventDefault(); workspace.style.outline='2px dashed rgba(79,195,247,.3)'; });
workspace.addEventListener('dragleave', () => { workspace.style.outline=''; });
workspace.addEventListener('drop', e => {
  e.preventDefault(); workspace.style.outline='';
  const id = e.dataTransfer.getData('text/plain');
  if (id === 'cylinder') handleCylinderDrop(e);
  else if (id) handleDrop(id);
});

function handleCylinderDrop(e) {
  if (S.pourActive) return msg('⚠ A pour is already in progress!');
  if (!S.soils.every(Boolean)) return msg('⚠ Add all 3 soil samples before pouring!');

  const rect = document.getElementById('scene-container').getBoundingClientRect();
  const mx   = e.clientX - rect.left;

  let bestSlot = -1, bestDist = Infinity;
  SLOTS.forEach((sl, i) => {
    if (!M.funnels[i]) return;
    const sp = screenXY({ x: sl.x, y: M.funnels[i].position.y + 0.7, z: -0.2 });
    const d  = Math.abs(sp.x - mx);
    if (d < bestDist) { bestDist = d; bestSlot = i; }
  });

  if (bestSlot === -1) return msg('⚠ Drop the cylinder directly over a funnel setup!');
  if (S.poured[bestSlot]) return msg(`⚠ Already poured into Setup ${bestSlot+1}!`);

  // Spawn a fresh 3D cylinder for this pour; remove any leftover from a prior one
  if (M.cyl) { scene.remove(M.cyl); M.cyl = null; M.cylWater = null; }
  makeCylinder();
  M.cyl._origX = M.cyl.position.x;
  M.cyl._origY = M.cyl.position.y;
  startPour(bestSlot);
}

function handleDrop(id) {
  // ── BEAKER (reusable — up to 3) ─────────────────────────
  if (id === 'beaker') {
    const si = S.beakers.indexOf(false);
    if (si === -1) return msg('All 3 beakers are already on the table!');
    makeBeaker(si); S.beakers[si] = true;
    markStepDone(`beaker${si+1}`);
    const placed = S.beakers.filter(Boolean).length;
    updateBadge('beaker', placed, 3);
    const tEl = $tray.querySelector('[data-id="beaker"]');
    if (placed === 3) markUsed(tEl);
    msg(`Cylinder ${si+1} placed. ${placed < 3 ? `${3-placed} more to go.` : 'Now place the 3 funnels on the cylinders.'}`);
    return;
  }

  // ── FUNNEL (reusable — up to 3) ──────────────────────────
  if (id === 'funnel') {
    const si = S.beakers.findIndex((b, i) => b && !S.funnels[i]);
    if (si === -1) {
      if (!S.beakers.some(Boolean)) return msg('⚠ Place a beaker first!');
      return msg('⚠ Place more beakers before adding more funnels!');
    }
    makeFunnel(si); S.funnels[si] = true;
    markStepDone(`funnel${si+1}`);
    const placed = S.funnels.filter(Boolean).length;
    updateBadge('funnel', placed, 3);
    const tEl = $tray.querySelector('[data-id="funnel"]');
    if (placed === 3) markUsed(tEl);
    msg(`Funnel ${si+1} placed on Beaker ${si+1}. ${placed < 3 ? 'Add more funnels.' : 'Now line each funnel with filter paper.'}`);
    return;
  }

  // ── FILTER PAPER (reusable — up to 3) ───────────────────
  if (id === 'filter') {
    const si = S.funnels.findIndex((f, i) => f && !S.filters[i]);
    if (si === -1) {
      if (!S.funnels.some(Boolean)) return msg('⚠ Place a funnel first!');
      return msg('⚠ Place more funnels before adding more filter papers!');
    }
    makeFilter(si); S.filters[si] = true;
    markStepDone(`filter${si+1}`);
    const placed = S.filters.filter(Boolean).length;
    updateBadge('filter', placed, 3);
    const tEl = $tray.querySelector('[data-id="filter"]');
    if (placed === 3) markUsed(tEl);
    msg(`Filter paper ${si+1} lined in Funnel ${si+1}. ${placed < 3 ? 'Add more filter papers.' : 'Now add the soil samples.'}`);
    return;
  }

  // ── SOILS (single-use each) ──────────────────────────────
  const soilMap = {sandy:0, loamy:1, clay:2};
  if (id in soilMap) {
    const si = soilMap[id];
    if (!S.filters[si]) return msg(`⚠ Place filter paper in Funnel ${si+1} first!`);
    if (S.soils[si]) return msg(`Soil already added to Funnel ${si+1}!`);
    makeSoil(si, id); S.soils[si] = id; SLOTS[si].soilType = id;
    const tEl = $tray.querySelector(`[data-id="${id}"]`);
    markUsed(tEl);
    markStepDone(id);
    const allSoil = S.soils.every(Boolean);
    msg(allSoil ? 'All soils added! Drag a Cylinder from the shelf onto a funnel setup to pour water.'
                : `${id.charAt(0).toUpperCase()+id.slice(1)} soil added to Funnel ${si+1}.`);
    return;
  }
}

/* ── STEP + USED ────────────────────────────────────────────*/
function markStepDone(id) {
  const el = document.querySelector(`.step[data-step="${id}"]`);
  if (!el) return;
  el.classList.remove('active'); el.classList.add('done');
  const next = document.querySelector('.step:not(.done)');
  if (next) next.classList.add('active');
}
function markUsed(el) { if(el) el.classList.add('used'); }

/* ── STATUS ─────────────────────────────────────────────────*/
function msg(t) { $phase.textContent = t; }

/* ── TOOLTIP ────────────────────────────────────────────────*/
function showTip(e,t) { $tip.textContent=t; $tip.classList.remove('hidden'); moveTip(e); }
function moveTip(e)   { $tip.style.left=(e.clientX+14)+'px'; $tip.style.top=(e.clientY-32)+'px'; }
function hideTip()    { $tip.classList.add('hidden'); }
document.addEventListener('mousemove', e => { if (!$tip.classList.contains('hidden')) moveTip(e); });

/* ── ORBIT / ZOOM ───────────────────────────────────────────*/
const scEl = document.getElementById('scene-container');
scEl.addEventListener('mousedown', e => { isDrag3D=true; orbitDragged=false; prevMouse={x:e.clientX,y:e.clientY}; });
window.addEventListener('mouseup', () => { isDrag3D=false; });
window.addEventListener('mousemove', e => {
  if (!isDrag3D||!camera) return;
  const dx=e.clientX-prevMouse.x, dy=e.clientY-prevMouse.y;
  if (Math.abs(dx)+Math.abs(dy) > 3) orbitDragged=true;
  const r=Math.sqrt(camera.position.x**2+camera.position.z**2);
  const a=Math.atan2(camera.position.x,camera.position.z)+dx*0.006;
  camera.position.x=r*Math.sin(a); camera.position.z=r*Math.cos(a);
  camera.position.y=Math.max(1.5,Math.min(13,camera.position.y-dy*0.04));
  camera.lookAt(0,0.6,0);
  prevMouse={x:e.clientX,y:e.clientY};
});
scEl.addEventListener('wheel', e => {
  if (!camera) return;
  camera.position.z=Math.max(5,Math.min(20,camera.position.z+e.deltaY*0.012));
  camera.lookAt(0,0.6,0);
},{passive:true});

/* ── RESET ──────────────────────────────────────────────────*/
$reset.addEventListener('click', resetLab);
function resetLab() {
  while(scene.children.length>0) scene.remove(scene.children[0]);
  Object.keys(M).forEach(k => { if(Array.isArray(M[k])) M[k].fill(null); else M[k]=null; });
  dripParticles=[];
  cancelAnimationFrame(pourAnimId);
  (pourCtx||$pourCvs.getContext('2d')).clearRect(0,0,$pourCvs.width,$pourCvs.height);
  S.dripTimeouts.forEach(t => clearTimeout(t)); S.dripTimeouts = [];
  S.dripIvs.forEach(iv => clearInterval(iv)); S.dripIvs = [];
  S.dripIvSlot = {};
  clearInterval(S.timerIv);
  Object.assign(S, {table:false, beakers:[false,false,false], funnels:[false,false,false],
    filters:[false,false,false], soils:[null,null,null], cylinder:false,
    pouringSlot:-1, pourVol:0, pourActive:false,
    poured:[false,false,false], draining:false, done:false,
    dripIvSlot:{}, dripTimeouts:[]});
  SLOTS.forEach(sl=>sl.soilType=null);

  buildEnv();
  makeTable(); S.table = true;

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active','done'));
  document.querySelector('.step[data-step="beaker1"]').classList.add('active');
  $resBox.classList.add('hidden'); $volDisp.classList.add('hidden');
  $hint.classList.add('hidden'); $timer.classList.add('hidden');
  autoOrbit=true;
  camera.position.set(0,5.5,13); camera.lookAt(0,0.5,0);
  msg('Drag beakers, funnels and filter papers from the left shelf onto the lab table');
  buildTray();
}

document.addEventListener('keydown', e => {
  if ((e.key==='r'||e.key==='R')&&!e.ctrlKey) resetLab();
});

/* ── BOOT ───────────────────────────────────────────────────*/
initThree();
buildTray();
makeTable(); S.table = true;
$hint.classList.add('hidden');
document.querySelector('.step[data-step="beaker1"]').classList.add('active');
msg('Drag beakers, funnels and filter papers from the left shelf onto the lab table');