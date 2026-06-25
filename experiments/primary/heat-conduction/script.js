/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Heat Conduction · script.js
   Three.js r128 · full 3D scene · wax bead physics
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── CONSTANTS ── */
const TABLE_Y  = -1.0;
const TOP_Y    = TABLE_Y + 0.16;
const STAND_X  = -4.6;
const CANDLE_X = -2.8;
const ROD_LEFT = -2.3;
const ROD_LEN  =  6.2;
const N_BEADS  =  5;
const BEAD_POS = [0.5, 1.5, 2.5, 3.5, 4.5];
const ROD_Y    = TOP_Y + 2.65;
const SIM_DUR  = 95;

const RODS = [
  { id:'copper',  label:'Copper Rod',
    hex:0xb87333, emHex:0x5a2000, rough:0.28, metal:0.88, yOff: 0.52,
    beadT:[4,9,15,23,32] },
  { id:'wood',    label:'Wooden Rod',
    hex:0x7a5228, emHex:0x1a0800, rough:0.95, metal:0.00, yOff: 0.00,
    beadT:[15,32,54,78,999] },
  { id:'plastic', label:'Plastic Rod',
    hex:0x6666aa, emHex:0x08081a, rough:0.55, metal:0.00, yOff:-0.52,
    beadT:[25,55,90,999,999] },
];

/* ── STATE ── */
const placed = {
  table:false, stand:false, candle:false,
  copper:false, wood:false, plastic:false,
  wax:false, matchbox:false
};
let lit = false, expDone = false, elapsed = 0, timerIv = null;
const fallen = {
  copper: [false,false,false,false,false],
  wood:   [false,false,false,false,false],
  plastic:[false,false,false,false,false]
};
const heatFront = { copper:0, wood:0, plastic:0 };

/* ── THREE.JS GLOBALS ── */
let renderer, scene, camera;
let frameN = 0, orbiting = true, drag3D = false, pm = {x:0,y:0};
let flameLight = null, flameParts = [];
let fallingBeads = [];
const M = {
  candle:null, rods:{}, rodMats:{},
  beads:{ copper:[], wood:[], plastic:[] }
};
let fxCtx = null;

/* ── BOOT ── */
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  initDragDrop();
  initButtons();
});

/* ════════════════════════════════════════════
   THREE.JS INIT
════════════════════════════════════════════ */
function initThree() {
  const mount = document.getElementById('scene-mount');
  const W = mount.clientWidth  || 900;
  const H = mount.clientHeight || 600;

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  mount.appendChild(renderer.domElement);

  const fxC = document.getElementById('fx-canvas');
  fxC.width = W; fxC.height = H;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060810);
  scene.fog = new THREE.FogExp2(0x060810, 0.028);

  camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 80);
  camera.position.set(0, 5.5, 15.5);
  camera.lookAt(0, 1.2, 0);

  buildEnv();

  window.addEventListener('resize', () => {
    const W2 = mount.clientWidth, H2 = mount.clientHeight;
    camera.aspect = W2/H2;
    camera.updateProjectionMatrix();
    renderer.setSize(W2, H2);
    fxC.width = W2; fxC.height = H2;
  });

  mount.addEventListener('mousedown', e => { drag3D=true; pm={x:e.clientX,y:e.clientY}; });
  window.addEventListener('mouseup',  () => { drag3D=false; });
  window.addEventListener('mousemove', e => {
    if (!drag3D || !camera) return;
    const dx = e.clientX-pm.x, dy = e.clientY-pm.y;
    const r = Math.sqrt(camera.position.x**2 + camera.position.z**2);
    const a = Math.atan2(camera.position.x, camera.position.z) + dx*.006;
    camera.position.x = r*Math.sin(a);
    camera.position.z = r*Math.cos(a);
    camera.position.y = Math.max(1.5, Math.min(14, camera.position.y - dy*.04));
    camera.lookAt(0,1.2,0);
    pm = {x:e.clientX, y:e.clientY};
  });
  mount.addEventListener('wheel', e => {
    if (!camera) return;
    camera.position.z = Math.max(5, Math.min(24, camera.position.z + e.deltaY*.013));
    camera.lookAt(0,1.2,0);
  }, {passive:true});

  renderLoop();
}

/* ── ENVIRONMENT ── */
function buildEnv() {
  scene.add(new THREE.AmbientLight(0x1e2844, 1.2));

  const key = new THREE.DirectionalLight(0xffeedd, 1.5);
  key.position.set(6, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left=-15; key.shadow.camera.right=15;
  key.shadow.camera.top=12;  key.shadow.camera.bottom=-12;
  key.shadow.camera.near=0.5; key.shadow.camera.far=55;
  scene.add(key);
  scene.add(dLight(0x6688aa,0.55,-10,6,4));
  scene.add(dLight(0x223344,0.30,0,-4,-12));

  const fl = mk(new THREE.PlaneGeometry(34,34), new THREE.MeshStandardMaterial({color:0x070b16,roughness:.92}));
  fl.rotation.x=-Math.PI/2; fl.position.y=TABLE_Y-3.0; fl.receiveShadow=true; scene.add(fl);

  const grid = new THREE.GridHelper(34,34,0x16203a,0x0d1628);
  grid.position.y=TABLE_Y-2.98; scene.add(grid);

  const bw = mk(new THREE.PlaneGeometry(34,14), new THREE.MeshStandardMaterial({color:0x0b1020,roughness:.96}));
  bw.position.set(0,3,-10); bw.receiveShadow=true; scene.add(bw);
}

function dLight(hex,intensity,x,y,z) {
  const l = new THREE.DirectionalLight(hex,intensity);
  l.position.set(x,y,z); return l;
}

/* ── RENDER LOOP ── */
function renderLoop() {
  requestAnimationFrame(renderLoop);
  frameN++;
  const t = frameN*0.003;

  if (orbiting && !drag3D) {
    camera.position.x = Math.sin(t*0.28)*1.4;
    camera.position.y = 5.5+Math.sin(t*0.18)*0.3;
    camera.lookAt(0,1.2,0);
  }

  if (lit && flameLight) {
    const f = 0.82+Math.sin(frameN*.19)*.11+Math.sin(frameN*.43)*.08;
    flameLight.intensity = 2.9*f;
    flameParts.forEach((p,i) => {
      if (!p) return;
      p.scale.x = 1+Math.sin(frameN*.25+i)*.08;
      p.scale.y = 1+Math.sin(frameN*.33+i*.6)*.10;
      p.material.opacity = 0.82+Math.sin(frameN*.19+i)*.11;
    });
  }

  if (lit) {
    RODS.forEach(rod => {
      const mat = M.rodMats[rod.id]; if (!mat) return;
      mat.emissiveIntensity = heatFront[rod.id]*0.42;
      mat.emissive.setHex(0xff2200);
    });
    updateHeatFronts();
  }

  fallingBeads = fallingBeads.filter(p => {
    p.vy += 0.015;
    p.mesh.position.y -= p.vy;
    p.mesh.rotation.x += 0.09;
    p.mesh.rotation.z += 0.06;
    if (p.mesh.position.y < TABLE_Y-1.8) { scene.remove(p.mesh); return false; }
    return true;
  });

  renderer.render(scene, camera);
}

function updateHeatFronts() {
  RODS.forEach(rod => {
    let prog = 0;
    const nFallen = fallen[rod.id].filter(Boolean).length;
    if (elapsed >= rod.beadT[0]) {
      const prevT = nFallen > 0 ? rod.beadT[nFallen-1] : 0;
      const nextT = rod.beadT[nFallen] || SIM_DUR;
      const frac  = nextT < 999 ? Math.min((elapsed-prevT)/(nextT-prevT),1) : 1;
      prog = (nFallen+frac)/N_BEADS;
    } else {
      prog = Math.min(elapsed/rod.beadT[0],1)*(1/N_BEADS);
    }
    heatFront[rod.id] = Math.min(prog,1);
    const pct = Math.round(heatFront[rod.id]*100);
    const bar = document.getElementById(`hf-${rod.id}`);
    const lbl = document.getElementById(`hfp-${rod.id}`);
    if (bar) bar.style.width = pct+'%';
    if (lbl) lbl.textContent = pct+'%';
  });
}

/* ── MESH HELPER ── */
function mk(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/* ── ANIMATIONS ── */
function popAnim(obj) {
  obj.scale.setScalar(0.01); let s=0.01;
  const iv = setInterval(() => {
    s += (1-s)*0.18+0.01; obj.scale.setScalar(Math.min(s,1));
    if (s>=0.98) { obj.scale.setScalar(1); clearInterval(iv); }
  }, 16);
}
function dropAnim(obj, fromY, toY) {
  obj.position.y=fromY; let y=fromY;
  const iv = setInterval(() => {
    y += (toY-y)*0.14+0.05; obj.position.y=y;
    if (y>=toY-0.02) { obj.position.y=toY; clearInterval(iv); }
  }, 16);
}

/* ════════════════════════════════════════════
   3D BUILDERS
════════════════════════════════════════════ */
function buildTable3D() {
  const g=new THREE.Group(); g.name='table';
  const topM=new THREE.MeshStandardMaterial({color:0x7a4a1e,roughness:.52,metalness:.06});
  const ltM =new THREE.MeshStandardMaterial({color:0x9b6230,roughness:.44,metalness:.06});
  const legM=new THREE.MeshStandardMaterial({color:0x5c3310,roughness:.62,metalness:.05});

  const top=mk(new THREE.BoxGeometry(13,.3,5.8),topM); top.castShadow=true; g.add(top);
  const surf=mk(new THREE.BoxGeometry(12.94,.028,5.74),ltM); surf.position.y=.163; g.add(surf);

  const grainM=new THREE.MeshStandardMaterial({color:0x6a3c14,roughness:.7});
  for (let i=0;i<8;i++) {
    const gr=mk(new THREE.BoxGeometry(.06,.032,5.7),grainM);
    gr.position.set(-5.5+i*1.5,.178,0); g.add(gr);
  }

  [-2.55,2.55].forEach(z => { const a=mk(new THREE.BoxGeometry(12.6,.38,.24),legM); a.position.set(0,-.3,z); a.castShadow=true; g.add(a); });
  [-5.85,5.85].forEach(x => { const a=mk(new THREE.BoxGeometry(.24,.38,5.34),legM); a.position.set(x,-.3,0); g.add(a); });

  [[-5.5,-2.3],[5.5,-2.3],[-5.5,2.3],[5.5,2.3]].forEach(([lx,lz]) => {
    const leg=mk(new THREE.CylinderGeometry(.24,.18,3.1,20),legM); leg.position.set(lx,-1.75,lz); leg.castShadow=true; g.add(leg);
    const col=mk(new THREE.CylinderGeometry(.29,.29,.12,20),ltM);  col.position.set(lx,-.52,lz); g.add(col);
    const mid=mk(new THREE.CylinderGeometry(.22,.22,.08,20),legM); mid.position.set(lx,-1.0,lz); g.add(mid);
    const foot=mk(new THREE.CylinderGeometry(.26,.26,.07,20),topM); foot.position.set(lx,-3.27,lz); g.add(foot);
  });

  [[-5.5],[5.5]].forEach(([lx]) => { const s=mk(new THREE.CylinderGeometry(.075,.075,4.6,10),legM); s.rotation.x=Math.PI/2; s.position.set(lx,-2.4,0); g.add(s); });
  [[-2.0],[2.0]].forEach(([lz]) => { const s=mk(new THREE.CylinderGeometry(.075,.075,11.0,10),legM); s.rotation.z=Math.PI/2; s.position.set(0,-2.4,lz); g.add(s); });

  g.position.y=TABLE_Y; scene.add(g);
  dropAnim(g, TABLE_Y-9, TABLE_Y);
}

function buildStand3D() {
  const g=new THREE.Group(); g.name='stand';
  const metalM=new THREE.MeshStandardMaterial({color:0x888898,roughness:.3,metalness:.82});
  const darkM =new THREE.MeshStandardMaterial({color:0x505060,roughness:.4,metalness:.70});
  const boltM =new THREE.MeshStandardMaterial({color:0x404050,roughness:.5,metalness:.90});

  const base=mk(new THREE.BoxGeometry(1,.35,2.4),darkM); base.castShadow=true; g.add(base);
  const bs=mk(new THREE.BoxGeometry(.32,.35,6.0),darkM); bs.position.set(-2.58,0,1.8); g.add(bs);

  [[-2.4,-1.0],[2.4,-1.0],[-2.4,1.0],[2.4,1.0]].forEach(([bx,bz]) => {
    const pad=mk(new THREE.BoxGeometry(.55,.06,.55),new THREE.MeshStandardMaterial({color:0x222230,roughness:.95}));
    pad.position.set(bx,-.2,bz); g.add(pad);
  });

  const vrod=mk(new THREE.CylinderGeometry(.13,.13,8.5,18),metalM); vrod.position.set(-2.58,4.43,1.8); vrod.castShadow=true; g.add(vrod);
  const boss=mk(new THREE.CylinderGeometry(.24,.24,.5,16),darkM);  boss.position.set(-2.58,.43,1.8); g.add(boss);

  RODS.forEach(rod => {
    const clampH=ROD_Y-TOP_Y+rod.yOff;
    const col=mk(new THREE.CylinderGeometry(.25,.25,.42,16),darkM); col.rotation.z=Math.PI/2; col.position.set(-2.58,clampH,1.8); g.add(col);
    const arm=mk(new THREE.CylinderGeometry(.09,.09,6.2,12),metalM); arm.rotation.z=Math.PI/2; arm.position.set(.52,clampH,1.8); g.add(arm);
    const grip=mk(new THREE.CylinderGeometry(.2,.2,.38,14),darkM); grip.rotation.z=Math.PI/2; grip.position.set(3.6,clampH,1.8); g.add(grip);
    const screw=mk(new THREE.CylinderGeometry(.055,.055,.45,8),boltM); screw.position.set(3.6,clampH+.24,1.8); g.add(screw);
  });

  g.position.set(STAND_X,TOP_Y+.175,-.5); scene.add(g); popAnim(g);
}

function buildCandle3D() {
  const g=new THREE.Group(); g.name='candle';
  const brassM=new THREE.MeshStandardMaterial({color:0xd4af37,roughness:.28,metalness:.72});
  const waxM  =new THREE.MeshStandardMaterial({color:0xf5f0e0,roughness:.82});
  const poolM =new THREE.MeshStandardMaterial({color:0xe8e0cc,roughness:.88});
  const wickM =new THREE.MeshStandardMaterial({color:0x111100,roughness:.95});
  const dripM =new THREE.MeshStandardMaterial({color:0xe8dfc8,roughness:.88});

  const saucer=mk(new THREE.CylinderGeometry(.58,.55,.09,36),brassM); saucer.castShadow=true; g.add(saucer);
  const rim=mk(new THREE.TorusGeometry(.58,.055,10,36),brassM); rim.position.y=.07; g.add(rim);
  const body=mk(new THREE.CylinderGeometry(.32,.34,2.0,36),waxM); body.position.y=1.09; body.castShadow=true; g.add(body);
  const pool=mk(new THREE.CylinderGeometry(.30,.30,.07,36),poolM); pool.position.y=2.12; g.add(pool);

  [[.3,.6,0],[-.28,.9,.18],[.1,1.2,-.3],[.22,.4,-.15]].forEach(([dx,dy,dz]) => {
    const d=mk(new THREE.SphereGeometry(.07,10,10),dripM); d.scale.y=1.5; d.position.set(dx,dy,dz); g.add(d);
  });

  const wick=mk(new THREE.CylinderGeometry(.02,.02,.28,8),wickM); wick.position.y=2.29; g.add(wick);
  const wickTip=mk(new THREE.SphereGeometry(.025,8,8),wickM); wickTip.position.y=2.44; g.add(wickTip);

  g.position.set(CANDLE_X,TOP_Y+.045,-.2); scene.add(g); M.candle=g; popAnim(g);
}

function buildFlame3D() {
  const cG=M.candle; if (!cG) return;

  const oGeo=new THREE.SphereGeometry(.24,16,16); oGeo.scale(1,1.85,1);
  const oMat=new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff3300,emissiveIntensity:1.5,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide});
  const outer=mk(oGeo,oMat); outer.position.set(0,.30,0); cG.add(outer); flameParts[0]=outer;

  const mGeo=new THREE.SphereGeometry(.16,14,14); mGeo.scale(1,2.0,1);
  const mMat=new THREE.MeshStandardMaterial({color:0xff9900,emissive:0xff7700,emissiveIntensity:1.8,transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide});
  const mid=mk(mGeo,mMat); mid.position.set(0,.36,0); cG.add(mid); flameParts[1]=mid;

  const cGeo=new THREE.SphereGeometry(.085,12,12); cGeo.scale(1,2.2,1);
  const cMat=new THREE.MeshStandardMaterial({color:0xffff88,emissive:0xffee44,emissiveIntensity:2.5,transparent:true,opacity:.78,depthWrite:false});
  const core=mk(cGeo,cMat); core.position.set(0,.42,0); cG.add(core); flameParts[2]=core;

  flameLight=new THREE.PointLight(0xff6600,2.9,12.0);
  flameLight.position.set(cG.position.x,cG.position.y+2.6,cG.position.z);
  scene.add(flameLight);

  const wf=new THREE.PointLight(0xff8800,0.65,9.0);
  wf.position.set(0,ROD_Y+.6,-.2); scene.add(wf);
}

function buildRod3D(rod) {
  const g=new THREE.Group(); g.name=`rod-${rod.id}`;
  const mat=new THREE.MeshStandardMaterial({color:rod.hex,emissive:rod.emHex,emissiveIntensity:0,roughness:rod.rough,metalness:rod.metal});
  M.rodMats[rod.id]=mat;

  const rodMesh=mk(new THREE.CylinderGeometry(.13,.13,ROD_LEN,28),mat);
  rodMesh.rotation.z=Math.PI/2; rodMesh.position.x=ROD_LEN/2; rodMesh.castShadow=true; g.add(rodMesh);

  [0,ROD_LEN].forEach(dx => {
    const cap=mk(new THREE.CircleGeometry(.13,20),mat.clone());
    cap.rotation.y=dx===0?Math.PI:0; cap.position.x=dx; g.add(cap);
  });

  if (rod.id==='wood') {
    const gM=new THREE.MeshStandardMaterial({color:0x3e2208,roughness:1.0});
    for (let i=0;i<6;i++) { const l=mk(new THREE.BoxGeometry(.4,.009,.27),gM); l.rotation.z=Math.PI/2; l.position.set(.5+i*.95,.1,0); g.add(l); }
  }
  if (rod.id==='plastic') {
    const hM=new THREE.MeshStandardMaterial({color:0xaaaaee,roughness:.2,metalness:.1,transparent:true,opacity:.28});
    const h=mk(new THREE.CylinderGeometry(.14,.14,ROD_LEN,28),hM); h.rotation.z=Math.PI/2; h.position.x=ROD_LEN/2; g.add(h);
  }

  const bandM=new THREE.MeshStandardMaterial({color:rod.hex,emissive:rod.hex,emissiveIntensity:.5,roughness:.5});
  const band=mk(new THREE.CylinderGeometry(.20,.20,.06,20),bandM); band.rotation.z=Math.PI/2; band.position.x=0; g.add(band);

  g.position.set(ROD_LEFT,ROD_Y+rod.yOff,-.2); scene.add(g); M.rods[rod.id]=g; popAnim(g);
}

function buildAllBeads3D() {
  const waxM=new THREE.MeshStandardMaterial({color:0xfffde7,emissive:0x443300,emissiveIntensity:.05,roughness:.55});
  RODS.forEach(rod => {
    M.beads[rod.id]=[];
    BEAD_POS.forEach((lx,bi) => {
      const b=mk(new THREE.SphereGeometry(.13,14,14),waxM.clone());
      b.castShadow=true; b.position.set(lx,.22,0);
      M.rods[rod.id].add(b); M.beads[rod.id].push(b);
    });
  });
}

function buildMatchbox3D() {
  const g=new THREE.Group(); g.name='matchbox';
  const bxM=new THREE.MeshStandardMaterial({color:0xcc3d00,roughness:.60,metalness:.05});
  const strM=new THREE.MeshStandardMaterial({color:0xb89040,roughness:.90});
  const stM=new THREE.MeshStandardMaterial({color:0x5c3010,roughness:.90});
  const hM=new THREE.MeshStandardMaterial({color:0xff3300,roughness:.65,emissive:0x440000,emissiveIntensity:.30});

  const box=mk(new THREE.BoxGeometry(1.3,.6,.75),bxM); g.add(box);
  const str=mk(new THREE.BoxGeometry(1.32,.065,.77),strM); str.position.y=-.265; g.add(str);
  const lbl=mk(new THREE.BoxGeometry(.04,.5,.73),new THREE.MeshStandardMaterial({color:0xdd4400})); lbl.position.x=.67; g.add(lbl);
  [-.35,0,.35].forEach(dx => {
    const st=mk(new THREE.CylinderGeometry(.028,.028,.65,8),stM); st.position.set(dx,.63,0); g.add(st);
    const h=mk(new THREE.SphereGeometry(.06,8,8),hM); h.position.set(dx,.96,0); g.add(h);
  });

  g.position.set(CANDLE_X-1.4,TOP_Y+.32,1.4); scene.add(g); popAnim(g);
}

/* ════════════════════════════════════════════
   DRAG & DROP
════════════════════════════════════════════ */
function initDragDrop() {
  ['table','stand','candle','copper','wood','plastic','wax','matchbox'].forEach(type => {
    const card=document.getElementById(`card-${type}`);
    if (!card) return;
    card.addEventListener('dragstart', e => {
      if (card.classList.contains('placed')) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed='copy';
    });
  });

  const ws=document.getElementById('workspace');
  ws.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; ws.classList.add('drag-over'); });
  ws.addEventListener('dragleave', () => ws.classList.remove('drag-over'));
  ws.addEventListener('drop', e => {
    e.preventDefault(); ws.classList.remove('drag-over');
    const type=e.dataTransfer.getData('text/plain');
    if (type) handleDrop(type);
  });
}

function handleDrop(type) {
  switch (type) {
    case 'table':
      if (placed.table) return setStatus('Table already placed.');
      buildTable3D(); placed.table=true; markPlaced('table'); stepDone('table');
      orbiting=false;
      el('overlay-status').textContent='📏 Table placed — add the retort stand next';
      setStatus('🪵 Lab table placed — now mount the retort stand.','warn');
      break;

    case 'stand':
      if (!placed.table) return setStatus('⚠ Place the lab table first!','warn');
      if (placed.stand)  return setStatus('Retort stand already placed.');
      buildStand3D(); placed.stand=true; markPlaced('stand'); stepDone('stand');
      setStatus('⚙️ Retort stand mounted — place the candle at the hot end.','warn');
      break;

    case 'candle':
      if (!placed.stand)  return setStatus('⚠ Mount the retort stand first!','warn');
      if (placed.candle)  return setStatus('Candle already placed.');
      buildCandle3D(); placed.candle=true; markPlaced('candle'); stepDone('candle');
      setStatus('🕯️ Candle ready — clamp the three rods to the stand.','warn');
      break;

    case 'copper': case 'wood': case 'plastic': {
      if (!placed.candle) return setStatus('⚠ Place the candle first!','warn');
      if (placed[type])   return setStatus(`${type} rod already clamped.`);
      buildRod3D(RODS.find(r=>r.id===type));
      placed[type]=true; markPlaced(type); stepDone(type);
      const allR=RODS.every(r=>placed[r.id]);
      setStatus(allR?'✅ All 3 rods clamped — attach the wax beads!':'Rod clamped. Add the remaining rods.',allR?'ok':'warn');
      break;
    }

    case 'wax':
      if (!RODS.every(r=>placed[r.id])) return setStatus('⚠ Clamp all 3 rods first!','warn');
      if (placed.wax) return setStatus('Wax beads already placed.');
      buildAllBeads3D(); placed.wax=true; markPlaced('wax'); stepDone('wax');
      show('lbl-tracker'); show('tracker-box'); initTrackerDots();
      setStatus('⚪ Wax beads attached — place the matchbox.','warn');
      break;

    case 'matchbox':
      if (!placed.wax) return setStatus('⚠ Attach wax beads first!','warn');
      if (placed.matchbox) return setStatus('Matchbox already placed.');
      buildMatchbox3D(); placed.matchbox=true; markPlaced('matchbox'); stepDone('matchbox');
      el('btn-light').disabled=false;
      setStatus('✅ Setup complete! Click 🔥 Light Candle in the header.','ok');
      break;

    default:
      setStatus('Drag apparatus from the left panel onto the workspace.');
  }
  updateAsmDots();
}

function markPlaced(type) {
  const c=document.getElementById(`card-${type}`);
  if (c) c.classList.add('placed');
}

function updateAsmDots() {
  Object.keys(placed).forEach(k => {
    const dot=document.getElementById(`asm-${k}`);
    if (dot) dot.classList.toggle('ok',!!placed[k]);
  });
}

function stepDone(id) {
  const s=document.querySelector(`.step-item[data-step="${id}"]`);
  if (s) { s.classList.remove('active'); s.classList.add('done'); }
  const next=document.querySelector('.step-item:not(.done)');
  if (next) next.classList.add('active');
}

/* ════════════════════════════════════════════
   BUTTONS
════════════════════════════════════════════ */
function initButtons() {
  el('btn-light').addEventListener('click', () => {
    if (lit || !placed.matchbox) return;
    el('match-modal').classList.add('show');
    el('strike-bar').style.width='0%';
    el('strike-tip').textContent='Drag your mouse quickly across the strip';
    initStrike();
  });
  el('btn-reset').addEventListener('click', resetLab);
  document.addEventListener('keydown', e => {
    if ((e.key==='r'||e.key==='R') && !e.ctrlKey) resetLab();
  });
}

/* ── MATCH STRIKE ── */
function initStrike() {
  let acc=0, dragging=false, lastX=0;
  const sz=el('strike-zone');

  function down(e) { dragging=true; lastX=e.clientX||(e.touches&&e.touches[0].clientX)||0; }
  function move(e) {
    if (!dragging) return;
    const cx=e.clientX||(e.touches&&e.touches[0].clientX)||0;
    acc+=Math.abs(cx-lastX)*1.3; lastX=cx;
    const pct=Math.min(acc/270*100,100);
    el('strike-bar').style.width=pct+'%';
    if (pct>=40) el('strike-tip').textContent='🔥 Getting hot...';
    if (pct>=75) el('strike-tip').textContent='🔥🔥 Almost there!';
    if (pct>=100) { dragging=false; matchLit(); }
  }
  function up() { dragging=false; }

  sz.addEventListener('mousedown',down);
  sz.addEventListener('mousemove',move);
  sz.addEventListener('mouseup',up);
  sz.addEventListener('touchstart',down,{passive:true});
  sz.addEventListener('touchmove',move,{passive:true});
  sz.addEventListener('touchend',up);
  sz.addEventListener('click',()=>{ acc+=85; const p=Math.min(acc/270*100,100); el('strike-bar').style.width=p+'%'; if(p>=100)matchLit(); });
}

function matchLit() {
  el('strike-tip').textContent='🔥 Match struck! Lighting candle...';
  setTimeout(()=>{ el('match-modal').classList.remove('show'); lightCandle(); },900);
}

function lightCandle() {
  lit=true; buildFlame3D();
  const btn=el('btn-light');
  btn.textContent='🔥 Burning…'; btn.classList.add('on'); btn.disabled=true;
  show('lbl-legend'); show('legend-box'); show('timer-card');
  el('timer-display').style.display='block';
  el('heat-overlay').style.display='block';
  stepDone('light');
  setStatus('🔥 Candle lit! Watch the wax beads — they fall as heat travels along each rod.','ok');
  runExperiment();
}

/* ════════════════════════════════════════════
   EXPERIMENT
════════════════════════════════════════════ */
function runExperiment() {
  elapsed=0;
  timerIv=setInterval(()=>{
    elapsed++;
    el('timer-val').textContent=elapsed;
    el('meter-time').textContent=elapsed+' s';
    el('bar-time').style.width=Math.min(elapsed/SIM_DUR*100,100)+'%';

    RODS.forEach(rod=>{
      rod.beadT.forEach((t,bi)=>{
        if (!fallen[rod.id][bi] && elapsed>=t) {
          fallen[rod.id][bi]=true;
          dropBead(rod.id,bi);
          markDot(rod.id,bi);
          const names=['1st','2nd','3rd','4th','5th'];
          setStatus(`🌡 ${rod.label}: ${names[bi]} wax bead fell at ${elapsed}s`,'ok');
        }
      });
    });

    if (elapsed>=SIM_DUR) { clearInterval(timerIv); stepDone('observe'); finishExperiment(); }
  },1000);
}

function dropBead(rodId, bi) {
  const bead=M.beads[rodId]&&M.beads[rodId][bi]; if (!bead) return;
  const wp=new THREE.Vector3(); bead.getWorldPosition(wp);
  M.rods[rodId].remove(bead); bead.position.copy(wp); scene.add(bead);
  bead.material.color.setHex(0xfbbf24);
  bead.material.emissive.setHex(0xff7700);
  bead.material.emissiveIntensity=0.95;
  fallingBeads.push({mesh:bead,vy:0.008});
  flashAt(rodId,bi);
}

function flashAt(rodId, bi) {
  if (!fxCtx) fxCtx=document.getElementById('fx-canvas').getContext('2d');
  const fxC=document.getElementById('fx-canvas');
  const rod=RODS.find(r=>r.id===rodId);
  const wp=new THREE.Vector3(ROD_LEFT+BEAD_POS[bi],ROD_Y+rod.yOff+.22,-.2).project(camera);
  const sx=(wp.x*.5+.5)*fxC.width;
  const sy=(-wp.y*.5+.5)*fxC.height;
  let alpha=1.0, r=4;
  (function draw(){
    fxCtx.clearRect(sx-32,sy-32,64,64);
    fxCtx.save(); fxCtx.globalAlpha=alpha;
    const g=fxCtx.createRadialGradient(sx,sy,0,sx,sy,r*2.2);
    g.addColorStop(0,'rgba(251,191,36,.95)'); g.addColorStop(1,'rgba(245,120,0,0)');
    fxCtx.beginPath(); fxCtx.arc(sx,sy,r*2.2,0,Math.PI*2); fxCtx.fillStyle=g; fxCtx.fill();
    fxCtx.beginPath(); fxCtx.arc(sx,sy,r,0,Math.PI*2); fxCtx.fillStyle='#fbbf24'; fxCtx.fill();
    fxCtx.restore(); r+=2.2; alpha-=.10;
    if (alpha>0) requestAnimationFrame(draw);
    else fxCtx.clearRect(sx-36,sy-36,72,72);
  })();
}

function markDot(rodId, bi) {
  const d=document.getElementById(`bd-${rodId}-${bi}`);
  if (d) d.classList.add('fallen');
}

function initTrackerDots() {
  ['copper','wood','plastic'].forEach(rid=>{
    const container=document.getElementById(`btd-${rid}`); if (!container) return;
    container.innerHTML='';
    for (let i=0;i<5;i++) {
      const d=document.createElement('div');
      d.className='bdot'; d.id=`bd-${rid}-${i}`; container.appendChild(d);
    }
  });
}

/* ════════════════════════════════════════════
   RESULTS
════════════════════════════════════════════ */
function finishExperiment() {
  expDone=true;
  el('timer-display').style.display='none';
  el('timer-card').style.display='none';
  setStatus('✅ Experiment complete! Copper conducted heat fastest. See the results →','ok');
  show('results-section');

  const rc=el('results-content'); rc.innerHTML='';
  [
    {id:'copper', name:'Copper Rod',  time:RODS[0].beadT[0], score:96, cls:'res-copper',  note:'Excellent conductor — metal (free electrons carry heat)'},
    {id:'wood',   name:'Wooden Rod',  time:RODS[1].beadT[0], score:28, cls:'res-wood',    note:'Poor conductor — non-metal (no free electrons)'},
    {id:'plastic',name:'Plastic Rod', time:RODS[2].beadT[0], score:8,  cls:'res-plastic', note:'Very poor — insulator (heat barely travels)'},
  ].forEach((r,i)=>{
    const div=document.createElement('div');
    div.className=`res-row ${r.cls}`;
    div.innerHTML=`
      <div class="res-name">${r.name}</div>
      <div style="font-size:10px;color:var(--text-dim)">1st bead fell after <b>${r.time}s</b></div>
      <div class="res-note">${r.note}</div>
      <div class="res-bar-wrap"><div class="res-bar" style="width:0%"></div></div>`;
    rc.appendChild(div);
    setTimeout(()=>div.querySelector('.res-bar').style.width=r.score+'%',160+i*200);
  });

  setTimeout(()=>show('conclusion-box'),900);

  let pz=camera.position.z;
  const pull=setInterval(()=>{
    pz+=(20-pz)*.04; camera.position.z=pz; camera.lookAt(0,1.2,0);
    if (Math.abs(pz-20)<.1){camera.position.z=20;clearInterval(pull);}
  },16);
}

/* ════════════════════════════════════════════
   RESET
════════════════════════════════════════════ */
function resetLab() {
  while (scene.children.length>0) scene.remove(scene.children[0]);
  buildEnv();

  M.candle=null;
  Object.assign(M,{rods:{},rodMats:{},beads:{copper:[],wood:[],plastic:[]}});
  flameParts=[]; flameLight=null; fallingBeads=[];

  if (fxCtx) { const fxC=document.getElementById('fx-canvas'); fxCtx.clearRect(0,0,fxC.width,fxC.height); }
  clearInterval(timerIv);
  lit=false; expDone=false; elapsed=0;
  Object.keys(placed).forEach(k=>placed[k]=false);
  RODS.forEach(r=>{ for(let i=0;i<5;i++) fallen[r.id][i]=false; });
  Object.keys(heatFront).forEach(k=>heatFront[k]=0);
  orbiting=true; camera.position.set(0,5.5,15.5); camera.lookAt(0,1.2,0);

  ['table','stand','candle','copper','wood','plastic','wax','matchbox'].forEach(t=>{
    const c=document.getElementById(`card-${t}`); if(c) c.classList.remove('placed');
  });
  document.querySelectorAll('.step-item').forEach((s,i)=>{ s.classList.remove('active','done'); if(i===0) s.classList.add('active'); });
  document.querySelectorAll('.asm-dot').forEach(d=>d.classList.remove('ok'));

  ['lbl-legend','legend-box','lbl-tracker','tracker-box','results-section','conclusion-box'].forEach(id=>hide(id));
  hide('timer-card');
  el('timer-display').style.display='none';
  el('heat-overlay').style.display='none';
  el('results-content').innerHTML='';
  el('match-modal').classList.remove('show');

  const btn=el('btn-light');
  btn.textContent='🔥 Light Candle'; btn.classList.remove('on'); btn.disabled=true;

  el('overlay-status').style.display='block';
  el('overlay-status').textContent='🔧 Drag apparatus onto the bench to begin';

  ['copper','wood','plastic'].forEach(id=>{
    const b=document.getElementById(`hf-${id}`);
    const l=document.getElementById(`hfp-${id}`);
    if(b) b.style.width='0%';
    if(l) l.textContent='0%';
  });

  setStatus('Drag all components onto the lab bench to begin the experiment.');
}

/* ── UTILITIES ── */
function el(id)   { return document.getElementById(id); }
function show(id) { const e=el(id); if(e) e.style.display=''; }
function hide(id) { const e=el(id); if(e) e.style.display='none'; }
function setStatus(msg, cls='') {
  const e=el('exp-status');
  e.textContent=msg;
  e.className='status-msg'+(cls?' '+cls:'');
}

})();