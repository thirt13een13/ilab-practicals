/* ================================================================
   PROPERTIES OF MAGNETS — Uganda P6/P7 Virtual Science Lab  v2
   5 Fully interactive 3D experiments with animations & theory
================================================================ */
'use strict';

/* ── GLOBALS ────────────────────────────────────────────── */
let renderer, scene, camera;
let frameN=0, orbiting=true, drag3D=false, pm={x:0,y:0};
const TABLE_Y=-0.5, SURF=TABLE_Y+0.165;

/* ── DOM ────────────────────────────────────────────────── */
const $msg    =id('phaseMsg');
const $theory =id('theoryBlock');
const $proc   =id('procList');
const $obs    =id('obsBlock');
const $obsC   =id('obsContent');
const $res    =id('resBlock');
const $resC   =id('resContent');
const $shelf  =id('shelfRow');
const $hint   =id('wsHint');
const $ctrl   =id('wsControls');
const $fxC    =id('fxCanvas');
const $tip    =id('tooltip');
let fxCtx=null;
let dragState=null;
let suppressCameraDrag=false;
let interactionMode='unlike';
const dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-(SURF+0.1));
const dragRaycaster=new THREE.Raycaster();
const dragPointer=new THREE.Vector2();
function id(x){return document.getElementById(x);} 
function findMagnetRoot(obj){let cur=obj; while(cur&&!cur.userData?.isMagnet) cur=cur.parent; return cur;}
function canDragMagnet(obj){return !!obj && currentExp==='attraction' && placed.table;}
function getPointerWorldPoint(event){
  const rect=renderer.domElement.getBoundingClientRect();
  dragPointer.set(((event.clientX-rect.left)/rect.width)*2-1, -((event.clientY-rect.top)/rect.height)*2+1);
  dragRaycaster.setFromCamera(dragPointer,camera);
  const pt=new THREE.Vector3();
  dragRaycaster.ray.intersectPlane(dragPlane,pt);
  return pt;
}
function normalizeAngle(a){
  a = ((a + Math.PI) % (Math.PI*2)) - Math.PI;
  if(a>Math.PI) a -= Math.PI*2;
  return a;
}
function onPointerDown(event){
  if(event.button!==0) return;
  const rect=renderer.domElement.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) return;
  const pt=getPointerWorldPoint(event);
  if(!pt) return;
  const hit=renderer.domElement; 
  if(!hit) return;
  const ray=new THREE.Raycaster();
  ray.setFromCamera(dragPointer,camera);
  const intersects=[];
  ray.intersectObjects(scene.children,true).forEach(it=>{if(it.object.userData?.isMagnet) intersects.push(it);});
  if(!intersects.length) return;
  const mag=findMagnetRoot(intersects[0].object);
  if(!canDragMagnet(mag)) return;
  dragState={object:mag,pointerId:event.pointerId};
  suppressCameraDrag=true;
  event.preventDefault(); event.stopPropagation();
}
function onPointerMove(event){
  if(!dragState||dragState.pointerId!==event.pointerId) return;
  const pt=getPointerWorldPoint(event);
  if(!pt) return;
  const obj=dragState.object;
  obj.position.x=THREE.MathUtils.clamp(pt.x,-4.8,4.8);
  obj.position.z=THREE.MathUtils.clamp(pt.z,-2.2,2.2);
  obj.position.y=obj.userData.baseY ?? (SURF+.28);
  if(currentExp==='attraction') applyAttractionDrag(obj);
}
function onPointerUp(event){
  if(!dragState||dragState.pointerId!==event.pointerId) return;
  dragState=null;
}
function applyAttractionDrag(dragged){
  const other=dragged===EX.mag1?EX.mag2:EX.mag1;
  if(!other) return;
  const gap=dragged.position.x-other.position.x;
  const centerGap=Math.abs(gap);
  const tipGap=centerGap-4.3;
  const desiredTipGap=interactionMode==='repel'?1.1:0.02;
  const step=THREE.MathUtils.clamp((tipGap-desiredTipGap)*0.04,-0.14,0.14);
  const dir=interactionMode==='repel' ? (gap>0?-1:1) : (gap>0?1:-1);
  dragged.position.x+=dir*step;
  other.position.x-=dir*step;

  // Prevent the magnets from physically overlapping — tips just touch (4.3 = full magnet length incl. caps).
  const minCenterGap=4.3 + (interactionMode==='repel'?0.6:0.0);
  if(centerGap < minCenterGap){
    const excess=(minCenterGap-centerGap)/2;
    if(gap>0){ dragged.position.x += excess; other.position.x -= excess; }
    else { dragged.position.x -= excess; other.position.x += excess; }
  }

  dragged.position.x=THREE.MathUtils.clamp(dragged.position.x,-4.8,4.8);
  other.position.x=THREE.MathUtils.clamp(other.position.x,-4.8,4.8);
}


/* ── EXPERIMENT REGISTRY ────────────────────────────────── */
const EXPERIMENTS={

  attraction:{
    title:'Attraction & Repulsion',
    theory:`<div class="block-title">Theory</div>
<div class="theory-text">
A <b>magnet</b> has two ends called <em>poles</em>: the <em>North (N)</em> pole and the <em>South (S)</em> pole.<br><br>
<b>Unlike poles attract</b> — North and South pull towards each other.<br>
<b>Like poles repel</b> — North and North (or South and South) push away from each other.<br><br>
<div class="theory-rule">🔴N + 🔵S → ATTRACT (move together)<br>🔴N + 🔴N → REPEL (push apart)<br>🔵S + 🔵S → REPEL (push apart)</div>
</div>`,
    steps:[
      {id:'table', text:'Place the <b>Lab Table</b>'},
      {id:'mag1',  text:'Drag <b>Bar Magnet 1</b> onto the table'},
      {id:'mag2',  text:'Drag <b>Bar Magnet 2</b> onto the table'},
      {id:'unlike',text:'Click <b>Unlike Poles Together</b> — N toward S'},
      {id:'like',  text:'Click <b>Like Poles Together</b> — N toward N'},
    ],
    items:[
      {id:'table',   name:'Lab Table',    svg:'table', tip:'Brown Colombo lab table — place first'},
      {id:'magnet1', name:'Bar Magnet 1', svg:'magnet',tip:'Red end = North, Blue end = South'},
      {id:'magnet2', name:'Bar Magnet 2', svg:'magnet',tip:'Red end = North, Blue end = South'},
    ],
    ctrlHtml:`<button class="btn-action" id="bUnlike" disabled>🔴🔵 Unlike Poles Together</button>
              <button class="btn-action red" id="bLike" disabled>🔴🔴 Like Poles Together</button>
              <button class="btn-action green" id="bSep" disabled>↺ Separate Magnets</button>`,
  },

  poles:{
    title:'Magnetic Poles & Field Lines',
    theory:`<div class="block-title">Theory</div>
<div class="theory-text">
The region around a magnet where its force acts is called the <b>magnetic field</b>.<br><br>
<b>Iron filings</b> sprinkled on a card placed over a magnet arrange themselves along <em>field lines</em> — showing the shape of the field.<br><br>
Field lines run from the <em>North pole to the South pole</em> outside the magnet. The <b>poles have the strongest field</b> — most filings cluster there.<br>
<div class="theory-rule">Field lines: North → South (outside magnet)<br>Strongest at the poles • Lines never cross</div>
</div>`,
    steps:[
      {id:'table',   text:'Place the <b>Lab Table</b>'},
      {id:'magnet',  text:'Place <b>Bar Magnet</b> on the table'},
      {id:'paper',   text:'Place <b>Card Sheet</b> on top of magnet'},
      {id:'filings', text:'Sprinkle <b>Iron Filings</b> over the card'},
      {id:'tap',     text:'Click <b>Tap the Card</b> — see the field!'},
    ],
    items:[
      {id:'table',   name:'Lab Table',    svg:'table',   tip:'Lab table'},
      {id:'magnet1', name:'Bar Magnet',   svg:'magnet',  tip:'Place under the card sheet'},
      {id:'paper',   name:'Card Sheet',   svg:'paper',   tip:'White card placed over the magnet'},
      {id:'filings', name:'Iron Filings', svg:'filings', tip:'Sprinkle on the card to reveal the field'},
    ],
    ctrlHtml:`<button class="btn-action" id="bTap" disabled>✋ Tap the Card — Reveal Field Pattern</button>`,
  },

  compass:{
    title:'Directive Property — Freely Suspended Magnet',
    theory:`<div class="block-title">Theory</div>
<div class="theory-text">
A <b>freely suspended magnet</b> always comes to rest pointing in the <em>North–South direction</em>.<br><br>
This is called the <b>directive property</b> of magnets. The Earth has its own magnetic field and acts like a giant magnet.<br><br>
A <b>compass</b> uses this property — its needle is a tiny magnet that always points North, helping travellers navigate.<br>
<div class="theory-rule">Free magnet → always aligns North–South<br>This is how a compass works</div>
</div>`,
    steps:[
      {id:'table',   text:'Place the <b>Lab Table</b>'},
      {id:'stand',   text:'Place <b>Stand &amp; Thread</b> on the table'},
      {id:'magnet',  text:'Attach <b>Bar Magnet</b> to the thread'},
      {id:'spin',    text:'Click <b>Spin the Magnet</b>'},
      {id:'settle',  text:'Click <b>Let It Settle</b> — observe direction'},
      {id:'compass', text:'Add a <b>Compass</b> to compare'},
    ],
    items:[
      {id:'table',   name:'Lab Table',   svg:'table',   tip:'Lab table'},
      {id:'stand',   name:'Stand+Thread',svg:'stand',   tip:'Retort stand with suspended thread'},
      {id:'magnet1', name:'Bar Magnet',  svg:'magnet',  tip:'Tie to the thread — will find North–South'},
      {id:'compass', name:'Compass',     svg:'compass', tip:'Compare its needle to the suspended magnet'},
    ],
    ctrlHtml:`<button class="btn-action" id="bSpin" disabled>🌀 Spin the Magnet</button>
              <button class="btn-action green" id="bSettle" disabled>⏸ Let It Settle</button>`,
  },

};

/* ── THREE.JS INIT ──────────────────────────────────────── */
function initThree(){
  const cont=id('sceneContainer');
  const W=cont.clientWidth||900, H=cont.clientHeight||600;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
  cont.appendChild(renderer.domElement);
  $fxC.width=W; $fxC.height=H;

  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x060a12);
  scene.fog=new THREE.FogExp2(0x060a12,0.026);

  camera=new THREE.PerspectiveCamera(38,W/H,0.1,80);
  camera.position.set(0,5.5,14); camera.lookAt(0,1.0,0);

  window.addEventListener('resize',()=>{
    const cW=cont.clientWidth, cH=cont.clientHeight;
    camera.aspect=cW/cH; camera.updateProjectionMatrix();
    renderer.setSize(cW,cH); $fxC.width=cW; $fxC.height=cH;
  });

  buildEnv(); loop();
}

function buildEnv(){
  scene.add(new THREE.AmbientLight(0x1e2a44,1.1));
  const key=new THREE.DirectionalLight(0xffeedd,1.4);
  key.position.set(6,18,10); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-14; key.shadow.camera.right=14;
  key.shadow.camera.top=10; key.shadow.camera.bottom=-10;
  key.shadow.camera.near=.5; key.shadow.camera.far=55;
  scene.add(key);
  const fill=new THREE.DirectionalLight(0x6688aa,.45); fill.position.set(-10,6,4); scene.add(fill);
  const rim=new THREE.DirectionalLight(0x223344,.28); rim.position.set(0,-4,-12); scene.add(rim);
  const fl=mk(new THREE.PlaneGeometry(32,32),new THREE.MeshStandardMaterial({color:0x06090f,roughness:.93}));
  fl.rotation.x=-Math.PI/2; fl.position.y=TABLE_Y-3.0; fl.receiveShadow=true; scene.add(fl);
  const grid=new THREE.GridHelper(32,32,0x162030,0x0d1525); grid.position.y=TABLE_Y-2.98; scene.add(grid);
  const bw=mk(new THREE.PlaneGeometry(32,14),new THREE.MeshStandardMaterial({color:0x090e1e,roughness:.95}));
  bw.position.set(0,3,-10); bw.receiveShadow=true; scene.add(bw);
}

/* ── ANIMATION LOOP ─────────────────────────────────────── */
const animTasks=[];   // {fn} called every frame
function loop(){
  requestAnimationFrame(loop); frameN++;
  const t=frameN*.003;
  if(orbiting&&!drag3D){
    camera.position.x=Math.sin(t*.28)*.9;
    camera.position.y=5.5+Math.sin(t*.18)*.2;
    camera.lookAt(0,1.0,0);
  }
  animTasks.forEach(t2=>{ if(typeof t2.fn==='function') t2.fn(); });
  renderer.render(scene,camera);
}
function addAnim(task){
  const handler=typeof task==='function' ? task : (task&&typeof task.fn==='function' ? task.fn : ()=>{});
  const o={fn:handler}; animTasks.push(o); return o;
}
function removeAnim(o){const i=animTasks.indexOf(o);if(i>=0)animTasks.splice(i,1);}

/* ── MESH HELPERS ───────────────────────────────────────── */
function mk(geo,mat){const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;m.castShadow=true;return m;}
function popIn(obj){
  obj.scale.setScalar(.01);let s=.01;
  const iv=setInterval(()=>{s+=(1-s)*.22+.01;obj.scale.setScalar(Math.min(s,1));if(s>=.98){obj.scale.setScalar(1);clearInterval(iv);}},16);
}
function slideDown(obj,fromY,toY){
  obj.position.y=fromY;let y=fromY;
  const iv=setInterval(()=>{y+=(toY-y)*.16+.06;obj.position.y=y;if(y>=toY-.02){obj.position.y=toY;clearInterval(iv);}},16);
}
// Smooth lerp animation returning a promise
function lerpPos(obj,toX,toY,toZ,frames){
  return new Promise(res=>{
    const sx=obj.position.x,sy=obj.position.y,sz=obj.position.z;
    let f=0;
    const iv=setInterval(()=>{
      f++; const t=Math.min(f/frames,1); const e=t<.5?2*t*t:-1+(4-2*t)*t;
      obj.position.set(sx+(toX-sx)*e,sy+(toY-sy)*e,sz+(toZ-sz)*e);
      if(t>=1){clearInterval(iv);res();}
    },16);
  });
}
function lerpRotY(obj,toR,frames){
  return new Promise(res=>{
    const sr=obj.rotation.y; let f=0;
    const iv=setInterval(()=>{
      f++;const t=Math.min(f/frames,1);const e=t<.5?2*t*t:-1+(4-2*t)*t;
      obj.rotation.y=sr+(toR-sr)*e;
      if(t>=1){clearInterval(iv);res();}
    },16);
  });
}

/* ── FX FLASH ───────────────────────────────────────────── */
function flashAt(){
  return;
}

/* ────────────────────────────────────────────────────────
   3D BUILDERS
   ──────────────────────────────────────────────────────── */

/* TABLE */
function buildTable(){
  const g=new THREE.Group(); g.name='table';
  const tM=new THREE.MeshStandardMaterial({color:0x7a4a1e,roughness:.52,metalness:.05});
  const lM=new THREE.MeshStandardMaterial({color:0x5c3310,roughness:.65,metalness:.04});
  const hM=new THREE.MeshStandardMaterial({color:0x9b6230,roughness:.44,metalness:.06});
  const top=mk(new THREE.BoxGeometry(12,.3,5.5),tM); g.add(top);
  const tabletop=mk(new THREE.BoxGeometry(11.94,.028,5.44),hM); tabletop.position.set(0,.165,0); g.add(tabletop);
  [-2.4,2.4].forEach(z=>{const a=mk(new THREE.BoxGeometry(11.6,.36,.24),lM);a.position.set(0,-.3,z);g.add(a);});
  [-5.4,5.4].forEach(x=>{const a=mk(new THREE.BoxGeometry(.24,.36,5.06),lM);a.position.set(x,-.3,0);g.add(a);});
  [[-5.2,-2.2],[5.2,-2.2],[-5.2,2.2],[5.2,2.2]].forEach(([lx,lz])=>{
    const leg=mk(new THREE.CylinderGeometry(.24,.18,3.0,18),lM); leg.position.set(lx,-1.65,lz); g.add(leg);
    const footTop=mk(new THREE.CylinderGeometry(.28,.28,.12,18),hM); footTop.position.set(lx,-.5,lz); g.add(footTop);
    const footBottom=mk(new THREE.CylinderGeometry(.26,.26,.07,18),tM); footBottom.position.set(lx,-3.1,lz); g.add(footBottom);
  });
  [[-5.2],[5.2]].forEach(([lx])=>{const s=mk(new THREE.CylinderGeometry(.075,.075,4.4,10),lM);s.rotation.x=Math.PI/2;s.position.set(lx,-2.4,0);g.add(s);});
  [[-1.8],[1.8]].forEach(([lz])=>{const s=mk(new THREE.CylinderGeometry(.075,.075,10.4,10),lM);s.rotation.z=Math.PI/2;s.position.set(0,-2.4,lz);g.add(s);});
  g.position.y=TABLE_Y; scene.add(g);
  slideDown(g,TABLE_Y-8,TABLE_Y);
  return g;
}

/* BAR MAGNET */
function buildBarMagnet(x,z,name,parent=null,baseY=SURF+.28){
  const g=new THREE.Group(); g.name=name||'magnet';
  const nM=new THREE.MeshStandardMaterial({color:0xef5350,roughness:.3,metalness:.35,emissive:0x440000,emissiveIntensity:.25});
  const sM=new THREE.MeshStandardMaterial({color:0x2196f3,roughness:.3,metalness:.35,emissive:0x001140,emissiveIntensity:.25});
  const dM=new THREE.MeshStandardMaterial({color:0x888898,roughness:.5,metalness:.7});

  const nH=mk(new THREE.BoxGeometry(1.9,.5,.5),nM); nH.position.x=-.95; g.add(nH);
  const sH=mk(new THREE.BoxGeometry(1.9,.5,.5),sM); sH.position.x=.95; g.add(sH);
  g.add(mk(new THREE.BoxGeometry(.06,.52,.52),dM));

  // Rounded ends
  [[-1.9,0xef5350],[ 1.9,0x2196f3]].forEach(([ex,ec])=>{
    const cap=mk(new THREE.CylinderGeometry(.25,.25,.5,20),new THREE.MeshStandardMaterial({color:ec,roughness:.3,metalness:.35}));
    cap.rotation.z=Math.PI/2; cap.position.x=ex; g.add(cap);
  });

  // N/S labels
  ['N','S'].forEach((ltr,i)=>{
    const cv=document.createElement('canvas'); cv.width=64; cv.height=64;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='rgba(0,0,0,0)'; ctx.fillRect(0,0,64,64);
    ctx.font='bold 46px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillText(ltr,32,34);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true}));
    sp.scale.set(.55,.55,1); sp.position.set(i===0?-.95:.95,.4,0); g.add(sp);
  });

  // Glow point light — pulsing blue/red
  const gl=new THREE.PointLight(0x8888ff,.5,4); gl.position.set(0,.4,0); g.add(gl);
  addAnim({fn:()=>{ gl.intensity=.3+Math.sin(frameN*.08)*.2; }});

  g.userData={isMagnet:true,baseY,magnetId:name||'magnet',poleDirection:1};
  g.position.set(x,baseY,z);
  (parent||scene).add(g); popIn(g); return g;
}

/* CARD SHEET */
function buildCard(x,z){
  const m=mk(new THREE.BoxGeometry(7,.02,4),new THREE.MeshStandardMaterial({color:0xf5f4ee,roughness:.88,metalness:0}));
  m.position.set(x,SURF+.02,z); scene.add(m); popIn(m); return m;
}

/* IRON FILINGS — arranged in field line pattern */
function buildFilings(mx,mz){
  const g=new THREE.Group(); g.name='filings';
  const mat=new THREE.MeshStandardMaterial({color:0x555560,roughness:.9,metalness:.4,transparent:true,opacity:0});

  // Build elliptical rings around magnet (field lines)
  const rings=[
    {r:0.55,count:32,yOff:.32},
    {r:0.90,count:40,yOff:.32},
    {r:1.35,count:42,yOff:.32},
    {r:1.85,count:38,yOff:.32},
    {r:2.45,count:30,yOff:.32},
    {r:3.10,count:22,yOff:.32},
  ];
  rings.forEach(ring=>{
    for(let i=0;i<ring.count;i++){
      const a=i/ring.count*Math.PI*2;
      const fx=mx+Math.cos(a)*ring.r;
      const fz=mz+Math.sin(a)*ring.r*.38; // flatten to ellipse
      const fil=mk(new THREE.SphereGeometry(.022+Math.random()*.012,4,4),mat.clone());
      fil.position.set(fx,SURF+ring.yOff,fz);
      // Orient along field direction (tangent to ellipse)
      fil.rotation.y=Math.atan2(Math.cos(a)*ring.r*.38,-Math.sin(a)*ring.r)+Math.PI/2;
      fil.scale.set(1,1,2.2+Math.random()*1.4);
      g.add(fil);
    }
  });
  // Extra dense clusters at poles
  [-2.0,2.0].forEach(px=>{
    for(let i=0;i<40;i++){
      const fil=mk(new THREE.SphereGeometry(.02+Math.random()*.015,4,4),mat.clone());
      fil.position.set(mx+px+(Math.random()-.5)*.5,SURF+.32,mz+(Math.random()-.5)*.3);
      fil.scale.set(1,1,1.5+Math.random());
      g.add(fil);
    }
  });

  scene.add(g); return g;
}

/* RETORT STAND + THREAD */
function buildStandThread(x,z){
  const g=new THREE.Group(); g.name='stand';
  const metalM=new THREE.MeshStandardMaterial({color:0x8a8a9a,roughness:.3,metalness:.82});
  const darkM=new THREE.MeshStandardMaterial({color:0x505060,roughness:.45,metalness:.72});

  const base=mk(new THREE.BoxGeometry(2.8,.36,1.5),darkM); g.add(base);
  const side=mk(new THREE.BoxGeometry(.32,.36,3.8),darkM); side.position.set(-1.2,0,1.15); g.add(side);
  const vrod=mk(new THREE.CylinderGeometry(.13,.13,7.5,16),metalM); vrod.position.set(-1.2,3.78,1.15); g.add(vrod);
  const arm=mk(new THREE.CylinderGeometry(.08,.08,3.2,12),metalM); arm.rotation.z=Math.PI/2; arm.position.set(.4,7.2,1.15); g.add(arm);
  const hanger=new THREE.Group(); hanger.name='hanger'; hanger.position.set(2.0,7.2,1.15); g.add(hanger);
  const clamp=mk(new THREE.CylinderGeometry(.14,.14,.28,12),new THREE.MeshStandardMaterial({color:0x7a5a3a,roughness:.65,metalness:.1}));
  clamp.position.set(0,.1,0); hanger.add(clamp);
  const thread=mk(new THREE.CylinderGeometry(.008,.008,4.2,8),new THREE.MeshStandardMaterial({color:0x6b4226,roughness:.98}));
  thread.position.set(0,-2.1,0); hanger.add(thread);
  const knot=mk(new THREE.SphereGeometry(.04,10,10),new THREE.MeshStandardMaterial({color:0x4e2f1a,roughness:.9}));
  knot.position.set(0,-4.2,0); hanger.add(knot);
  const stirrup=new THREE.Group(); stirrup.name='stirrup'; stirrup.position.set(0,-4.2,0); hanger.add(stirrup);
  const paper=mk(new THREE.TorusGeometry(.22,.05,8,24),new THREE.MeshStandardMaterial({color:0xd4d0c5,roughness:.92,metalness:.05}));
  paper.rotation.x=Math.PI/2; stirrup.add(paper);
  const paperBrace=mk(new THREE.BoxGeometry(.44,.04,.08),new THREE.MeshStandardMaterial({color:0xd4d0c5,roughness:.92,metalness:.05}));
  paperBrace.position.set(0,-.04,0); stirrup.add(paperBrace);
  const anchor=mk(new THREE.SphereGeometry(.06,10,10),new THREE.MeshStandardMaterial({color:0x555555,roughness:.3,metalness:.8}));
  anchor.position.set(0,0,0); hanger.add(anchor);

  g.position.set(x,SURF+.18,z); scene.add(g); popIn(g); return {group:g, hanger, stirrup};
}

/* COMPASS */
function buildCompass(x,z){
  const g=new THREE.Group(); g.name='compass';
  const housM=new THREE.MeshStandardMaterial({color:0x7a6040,roughness:.5,metalness:.35});
  const glassM=new THREE.MeshStandardMaterial({color:0x88ccee,roughness:.04,transparent:true,opacity:.35});
  const dialM=new THREE.MeshStandardMaterial({color:0xf0ede8,roughness:.85});

  const hous=mk(new THREE.CylinderGeometry(.72,.72,.2,40),housM); g.add(hous);
  const rim=mk(new THREE.TorusGeometry(.72,.06,10,40),housM); rim.position.y=.1; g.add(rim);
  const glass=mk(new THREE.CylinderGeometry(.68,.68,.06,40),glassM); glass.position.y=.12; g.add(glass);
  const dial=mk(new THREE.CircleGeometry(.66,40),dialM); dial.rotation.x=-Math.PI/2; dial.position.y=.115; g.add(dial);

  // Cardinal direction ticks
  const tkM=new THREE.MeshStandardMaterial({color:0x222222,roughness:.8});
  [0,Math.PI/2,Math.PI,Math.PI*3/2].forEach((a,i)=>{
    const tk=mk(new THREE.BoxGeometry(i%2===0?.06:.04,.008,i%2===0?.18:.12),tkM);
    tk.position.set(Math.sin(a)*.5,.115,Math.cos(a)*.5); tk.rotation.y=a; g.add(tk);
  });

  // Needle
  const needle=new THREE.Group(); needle.name='needle';
  const nCone=mk(new THREE.ConeGeometry(.07,.52,10),new THREE.MeshStandardMaterial({color:0xef5350,roughness:.3,metalness:.4}));
  nCone.position.set(0,.14,-.28); nCone.rotation.x=-Math.PI/2; needle.add(nCone);
  const sCone=mk(new THREE.ConeGeometry(.06,.42,10),new THREE.MeshStandardMaterial({color:0xeeeeee,roughness:.3,metalness:.4}));
  sCone.position.set(0,.14,.24); sCone.rotation.x=Math.PI/2; needle.add(sCone);
  const pivot=mk(new THREE.SphereGeometry(.05,10,10),new THREE.MeshStandardMaterial({color:0x444444,metalness:.8}));
  pivot.position.y=.14; needle.add(pivot);
  g.add(needle);

  g.position.set(x,SURF+.1,z); scene.add(g); popIn(g);
  return {group:g, needle};
}

/* ── SHELF SVG ICONS ────────────────────────────────────── */
const SVGS={
  table:`<svg viewBox="0 0 60 52" fill="none">
    <rect x="2" y="12" width="56" height="9" rx="2" fill="#7a4a1e"/>
    <rect x="2" y="12" width="56" height="3" rx="1.5" fill="#9b6230"/>
    <rect x="4" y="20" width="52" height="3" rx="1" fill="#5c3310"/>
    <rect x="6" y="23" width="5" height="23" rx="1" fill="#5c3310"/>
    <rect x="49" y="23" width="5" height="23" rx="1" fill="#5c3310"/>
    <rect x="16" y="23" width="5" height="23" rx="1" fill="#5c3310"/>
    <rect x="39" y="23" width="5" height="23" rx="1" fill="#5c3310"/>
    <rect x="5" y="37" width="50" height="2.5" rx="1" fill="#4a2808"/>
  </svg>`,
  magnet:`<svg viewBox="0 0 68 40" fill="none">
    <rect x="4" y="12" width="26" height="16" rx="3" fill="#ef5350"/>
    <rect x="30" y="12" width="4" height="16" fill="#888898"/>
    <rect x="34" y="12" width="26" height="16" rx="3" fill="#2196f3"/>
    <text x="17" y="24" text-anchor="middle" font-size="10" fill="#fff" font-weight="800">N</text>
    <text x="47" y="24" text-anchor="middle" font-size="10" fill="#fff" font-weight="800">S</text>
    <circle cx="4" cy="20" r="4" fill="#ef5350"/>
    <circle cx="60" cy="20" r="4" fill="#2196f3"/>
  </svg>`,
  testItems:`<svg viewBox="0 0 60 46" fill="none">
    <rect x="5" y="18" width="7" height="22" rx="1" fill="#666677"/>
    <rect x="15" y="16" width="5" height="24" rx="1" fill="#aaaacc"/>
    <ellipse cx="28" cy="30" rx="7" ry="4" fill="#b87333"/>
    <rect x="36" y="20" width="8" height="14" rx="1" fill="#8b6340"/>
    <rect x="47" y="19" width="6" height="15" rx="2" fill="#6677bb"/>
    <text x="30" y="10" text-anchor="middle" font-size="7" fill="#7a8eaa">Test Objects</text>
  </svg>`,
  paper:`<svg viewBox="0 0 60 46" fill="none">
    <rect x="7" y="6" width="46" height="34" rx="2" fill="#f5f4ee" stroke="#ccc" stroke-width="1"/>
    <line x1="14" y1="14" x2="46" y2="14" stroke="#ddd" stroke-width="1.2"/>
    <line x1="14" y1="20" x2="46" y2="20" stroke="#ddd" stroke-width="1.2"/>
    <line x1="14" y1="26" x2="46" y2="26" stroke="#ddd" stroke-width="1.2"/>
    <line x1="14" y1="32" x2="36" y2="32" stroke="#ddd" stroke-width="1.2"/>
    <text x="30" y="44" text-anchor="middle" font-size="7" fill="#7a8eaa">Card Sheet</text>
  </svg>`,
  filings:`<svg viewBox="0 0 60 46" fill="none">
    <ellipse cx="30" cy="24" rx="21" ry="13" fill="#2a2a30" stroke="#555" stroke-width="1"/>
    <ellipse cx="30" cy="22" rx="19" ry="11" fill="#333340"/>
    <line x1="22" y1="18" x2="18" y2="28" stroke="#666" stroke-width="1.2"/>
    <line x1="26" y1="15" x2="24" y2="29" stroke="#666" stroke-width="1.2"/>
    <line x1="30" y1="14" x2="30" y2="30" stroke="#666" stroke-width="1.2"/>
    <line x1="34" y1="15" x2="36" y2="29" stroke="#666" stroke-width="1.2"/>
    <line x1="38" y1="18" x2="42" y2="28" stroke="#666" stroke-width="1.2"/>
    <text x="30" y="43" text-anchor="middle" font-size="7" fill="#7a8eaa">Iron Filings</text>
  </svg>`,
  stand:`<svg viewBox="0 0 60 60" fill="none">
    <rect x="5" y="44" width="38" height="10" rx="2" fill="#505060"/>
    <rect x="5" y="44" width="38" height="4" rx="1.5" fill="#7a7a8a"/>
    <rect x="8" y="8" width="7" height="38" rx="2" fill="#8a8a9a"/>
    <rect x="8" y="8" width="2.5" height="38" rx="1" fill="#b0b0c0" opacity=".5"/>
    <rect x="13" y="17" width="24" height="6" rx="2" fill="#626272"/>
    <rect x="33" y="18" width="12" height="4" rx="1.2" fill="#505060"/>
    <line x1="45" y1="20" x2="48" y2="8" stroke="#aaa" stroke-width="1.2"/>
  </svg>`,
  compass:`<svg viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="23" fill="#7a6040" stroke="#555" stroke-width="1.5"/>
    <circle cx="30" cy="30" r="20" fill="#f0ede8"/>
    <polygon points="30,12 33,30 30,28 27,30" fill="#ef5350"/>
    <polygon points="30,48 33,30 30,32 27,30" fill="#cccccc"/>
    <circle cx="30" cy="30" r="3" fill="#444"/>
    <text x="30" y="9" text-anchor="middle" font-size="7" fill="#333" font-weight="800">N</text>
    <text x="30" y="58" text-anchor="middle" font-size="7" fill="#333">S</text>
    <text x="8" y="34" text-anchor="middle" font-size="7" fill="#333">W</text>
    <text x="52" y="34" text-anchor="middle" font-size="7" fill="#333">E</text>
  </svg>`,
  pin:`<svg viewBox="0 0 60 46" fill="none">
    <line x1="8" y1="23" x2="52" y2="23" stroke="#aaaacc" stroke-width="5" stroke-linecap="round"/>
    <polygon points="52,23 44,18 44,28" fill="#ccccdd"/>
    <circle cx="8" cy="23" r="5" fill="#bbbbcc"/>
    <text x="30" y="40" text-anchor="middle" font-size="7" fill="#7a8eaa">Steel Pin</text>
  </svg>`,
  barriers:`<svg viewBox="0 0 60 46" fill="none">
    <rect x="4"  y="8" width="8" height="28" rx="1" fill="#f5f5f0" stroke="#ccc" stroke-width=".8"/>
    <rect x="15" y="8" width="8" height="28" rx="1" fill="#d4b878"/>
    <rect x="26" y="8" width="8" height="28" rx="1" fill="#9966bb" opacity=".85"/>
    <rect x="37" y="8" width="8" height="28" rx="1" fill="#88ccee" opacity=".8"/>
    <rect x="48" y="8" width="8" height="28" rx="1" fill="#7a5228"/>
    <text x="30" y="42" text-anchor="middle" font-size="6.5" fill="#7a8eaa">Materials</text>
  </svg>`,
};

/* ── SHELF BUILDER ──────────────────────────────────────── */
function buildShelf(expId){
  $shelf.innerHTML='';
  const items=EXPERIMENTS[expId].items;
  items.forEach(item=>{
    const el=document.createElement('div');
    el.className='sitem'; el.dataset.id=item.id; el.draggable=true;
    el.innerHTML=`${SVGS[item.svg]||SVGS.magnet}<div class="sitem-name">${item.name}</div>`;
    el.addEventListener('mouseenter',e=>showTip(e,item.tip));
    el.addEventListener('mouseleave',hideTip);
    el.addEventListener('dragstart',e=>{
      if(el.classList.contains('used')){e.preventDefault();return;}
      e.dataTransfer.setData('text/plain',item.id);
      e.dataTransfer.effectAllowed='copy';
    });
    $shelf.appendChild(el);
  });
}

function useItem(itemId){
  const el=$shelf.querySelector(`[data-id="${itemId}"]`);
  if(el)el.classList.add('used');
}

/* ── STEP TRACKER ───────────────────────────────────────── */
function stepDone(sid){
  const el=$proc.querySelector(`[data-s="${sid}"]`);
  if(el){el.classList.remove('active');el.classList.add('done');}
  const next=$proc.querySelector('.pstep:not(.done)');
  if(next)next.classList.add('active');
}
function showObs(rows){
  $obs.style.display='block'; $obsC.innerHTML='';
  rows.forEach(r=>{
    const d=document.createElement('div'); d.className='obs-row';
    d.innerHTML=`<div class="obs-dot" style="background:${r.c}"></div><span>${r.t}</span>`;
    $obsC.appendChild(d);
  });
}
function showConc(html){
  $res.style.display='block'; $resC.innerHTML=html;
}

/* ─────────────────────────────────────────────────────────
   EXPERIMENT WIRING
   ───────────────────────────────────────────────────────── */
const placed={};
const EX={};  // experiment mesh handles

/* ═══ 1. ATTRACTION & REPULSION ═══════════════════════════ */
function wireAttraction(){
  document.addEventListener('expDrop',async function h(e){
    if(currentExp!=='attraction'){document.removeEventListener('expDrop',h);return;}
    const id2=e.detail;
    if(id2==='table'&&!placed.table){
      buildTable(); placed.table=true; useItem('table'); stepDone('table');
      orbiting=false; $hint.classList.add('gone');
      msg('Table placed! Drag the magnets onto it and try moving one toward the other.');
    } else if(id2==='magnet1'&&placed.table&&!placed.magnet1){
      EX.mag1=buildBarMagnet(-3.0,0,'mag1'); EX.mag1.userData.poleDirection=1; placed.magnet1=true; useItem('magnet1'); stepDone('mag1');
      msg('Magnet 1 placed. Now drag Magnet 2 onto the table.');
    } else if(id2==='magnet2'&&placed.table&&placed.magnet1&&!placed.magnet2){
      EX.mag2=buildBarMagnet(3.0,0,'mag2'); EX.mag2.userData.poleDirection=1; placed.magnet2=true; useItem('magnet2'); stepDone('mag2');
      msg('Both magnets ready! Drag one magnet toward the other to see attraction or repulsion.');
      id('bUnlike').disabled=false;
      id('bLike').disabled=false;
      id('bSep').disabled=false;
    }
  });

  /* Unlike poles → attraction */
  id('bUnlike').addEventListener('click',async()=>{
    if(!EX.mag1||!EX.mag2)return;
    msg('Bringing unlike poles together (N → S)…');
    await lerpRotY(EX.mag2,0,20);         // ensure mag2 faces normal
    EX.mag2.userData.poleDirection=1;
    interactionMode='unlike';
    await Promise.all([
      lerpPos(EX.mag1,-2.6,EX.mag1.position.y,0,50),
      lerpPos(EX.mag2, 2.6,EX.mag2.position.y,0,50),
    ]);
    // Bring tips to just touching — center distance 4.3 = full magnet length
    await Promise.all([
      lerpPos(EX.mag1,-2.15,EX.mag1.position.y,0,15),
      lerpPos(EX.mag2, 2.15,EX.mag2.position.y,0,15),
    ]);
    flashAt(new THREE.Vector3(0,SURF+.5,0),'#ffcc00');
    stepDone('unlike');
    showObs([
      {c:'#4caf50',t:'N pole of Magnet 1 moved toward S pole of Magnet 2'},
      {c:'#4caf50',t:'The magnets were attracted — they pulled together!'},
      {c:'#2196f3',t:'Unlike poles (N and S) attract each other'},
    ]);
    showConc(`<div class="res-text"><b>Unlike poles attract.</b> The N and S poles pulled toward each other and held together.</div>
    <div class="res-conc">✅ Unlike poles (N–S) always attract. This is a fundamental property of all magnets.</div>`);
    msg('✅ Unlike poles attracted! North and South poles pull together.');
  });

  /* Like poles → repulsion */
  id('bLike').addEventListener('click',async()=>{
    if(!EX.mag1||!EX.mag2)return;
    msg('Flipping Magnet 2 so N faces N…');
    // Reset positions first
    await Promise.all([
      lerpPos(EX.mag1,-3.0,EX.mag1.position.y,0,25),
      lerpPos(EX.mag2, 3.0,EX.mag2.position.y,0,25),
    ]);
    await lerpRotY(EX.mag2,Math.PI,30); // flip mag2
    EX.mag2.userData.poleDirection=-1;
    interactionMode='repel';
    msg('Like poles (N–N) approaching…');
    await Promise.all([
      lerpPos(EX.mag1,-3.2,EX.mag1.position.y,0,50),
      lerpPos(EX.mag2, 3.2,EX.mag2.position.y,0,50),
    ]);
    // Repulsion — push apart without letting the bodies overlap
    await Promise.all([
      lerpPos(EX.mag1,-3.8,EX.mag1.position.y,0,35),
      lerpPos(EX.mag2, 3.8,EX.mag2.position.y,0,35),
    ]);
    flashAt(new THREE.Vector3(0,SURF+.5,0),'#ef5350');
    stepDone('like');
    showObs([
      {c:'#ef5350',t:'N pole of Magnet 1 faced N pole of Magnet 2'},
      {c:'#ef5350',t:'The magnets REPELLED — pushed away from each other!'},
      {c:'#2196f3',t:'Like poles (N–N) always repel each other'},
    ]);
    showConc(`<div class="res-text"><b>Like poles repel.</b> When N faced N the magnets pushed each other away — they could not be forced together.</div>
    <div class="res-conc">✅ Like poles (N–N or S–S) always repel. You cannot push two like poles together.</div>`);
    msg('✅ Like poles repelled! They flew apart from each other.');
  });

  /* Separate */
  id('bSep').addEventListener('click',async()=>{
    if(!EX.mag1||!EX.mag2)return;
    await Promise.all([
      lerpPos(EX.mag1,-3.0,EX.mag1.position.y,0,30),
      lerpPos(EX.mag2, 3.0,EX.mag2.position.y,0,30),
      lerpRotY(EX.mag2,0,30),
    ]);
    EX.mag2.userData.poleDirection=1;
    $obs.style.display='none'; $res.style.display='none';
    msg('Magnets separated. Try Unlike Poles or Like Poles again.');
  });
}

/* ═══ 2. POLES & FIELD LINES ═══════════════════════════════ */
function wirePoles(){
  document.addEventListener('expDrop',function h(e){
    if(currentExp!=='poles'){document.removeEventListener('expDrop',h);return;}
    const id2=e.detail;
    if(id2==='table'&&!placed.table){
      buildTable(); placed.table=true; useItem('table'); stepDone('table');
      orbiting=false; $hint.classList.add('gone'); msg('Table placed. Add the bar magnet on it.');
    } else if(id2==='magnet1'&&placed.table&&!placed.magnet1){
      EX.magForField=buildBarMagnet(0,-.2,'mfield'); placed.magnet1=true; useItem('magnet1'); stepDone('magnet');
      msg('Magnet placed. Now place the card sheet on top of it.');
    } else if(id2==='paper'&&placed.magnet1&&!placed.paper){
      EX.card=buildCard(0,-.2); placed.paper=true; useItem('paper'); stepDone('paper');
      msg('Card sheet placed! Sprinkle iron filings over the card.');
    } else if(id2==='filings'&&placed.paper&&!placed.filings){
      EX.filings=buildFilings(0,-.2);
      placed.filings=true; useItem('filings'); stepDone('filings');
      id('bTap').disabled=false;
      msg('Iron filings on card! Now tap the card to let them settle — the field pattern will appear.');
    }
  });

  id('bTap').addEventListener('click',()=>{
    if(!EX.filings)return;
    stepDone('tap');
    msg('Tapping card… iron filings settling into field pattern…');

    // Animate filings appearing — each child fades in with slight randomised delay
    EX.filings.children.forEach((c,i)=>{
      c.material.transparent=true;
      c.material.opacity=0;
      setTimeout(()=>{
        let op=0;
        const iv=setInterval(()=>{
          op+=.04; c.material.opacity=Math.min(op,.95);
          if(op>=.95)clearInterval(iv);
        },16);
      }, Math.random()*1400);
    });

    // Also add glowing field line arcs on FX canvas over 2 seconds
    setTimeout(()=>{
      drawFieldLinesFX();
      flashAt(new THREE.Vector3(-2,SURF+.5,-.2),'#5c9eff');
      flashAt(new THREE.Vector3( 2,SURF+.5,-.2),'#5c9eff');
      showObs([
        {c:'#5c9eff',t:'Iron filings formed curved lines around the magnet'},
        {c:'#5c9eff',t:'Field lines run from North pole to South pole'},
        {c:'#ef5350',t:'Most filings clustered at the poles — field strongest there'},
        {c:'#4caf50',t:'Field lines never cross each other'},
      ]);
      showConc(`<div class="res-text">The iron filings reveal the <b>magnetic field shape</b>. They line up in curved arcs from N to S pole.<br><br>
        The field is <b>strongest at the poles</b> (most filings gather there).</div>
        <div class="res-conc">✅ Every magnet has a magnetic field around it. Field lines show its direction and shape. The field is strongest at the two poles.</div>`);
      msg('✅ Field pattern revealed! Notice the curved lines from North to South pole.');
    },1600);
  });
}

/* ── FIELD LINE FX — animated particles flowing N→S ─────── */
function bezPt(p0,p1,p2,p3,t){
  const m=1-t;
  return m*m*m*p0 + 3*m*m*t*p1 + 3*m*t*t*p2 + t*t*t*p3;
}
function bezTan(p0,p1,p2,p3,t){
  const m=1-t;
  return 3*m*m*(p1-p0)+6*m*t*(p2-p1)+3*t*t*(p3-p2);
}

function drawFieldLinesFX(){
  if(!fxCtx)fxCtx=$fxC.getContext('2d');

  // Project N and S pole world positions onto the 2D canvas
  const proj=(wx,wy,wz)=>{
    const v=new THREE.Vector3(wx,wy,wz).project(camera);
    return {x:(v.x*.5+.5)*$fxC.width, y:(-v.y*.5+.5)*$fxC.height};
  };
  const N=proj(-2,SURF+.38,-.2);
  const S=proj( 2,SURF+.38,-.2);
  const mid={x:(N.x+S.x)/2, y:(N.y+S.y)/2};
  const hw=(S.x-N.x)/2; // half-width between poles

  // Each arc: {scale, alpha, lineWidth}
  const arcs=[
    {sc:0.20,a:0.72,lw:2.2},
    {sc:0.42,a:0.60,lw:1.8},
    {sc:0.70,a:0.48,lw:1.4},
    {sc:1.05,a:0.35,lw:1.1},
    {sc:1.50,a:0.22,lw:0.8},
    {sc:2.10,a:0.12,lw:0.6},
  ];

  // Control-point helpers for each arc side (above: sign=-1, below: sign=+1)
  const cp=(sign,sc)=>({
    cp1x:N.x+hw*.38, cp1y:N.y+sign*hw*sc*1.05,
    cp2x:S.x-hw*.38, cp2y:S.y+sign*hw*sc*1.05,
  });

  // Particle state: one particle per (arc × side × slot)
  const parts=[];
  arcs.forEach((arc,li)=>{
    const slots=Math.max(1,5-li);
    [-1,1].forEach(sign=>{
      for(let s=0;s<slots;s++){
        parts.push({li,sign,t:s/slots});
      }
    });
  });

  const speed=0.0045;
  let fxActive=true;

  const iv=setInterval(()=>{
    if(!fxActive){clearInterval(iv);return;}
    fxCtx.clearRect(0,0,$fxC.width,$fxC.height);

    // ── Draw static field lines ──────────────────────────────
    arcs.forEach((arc,li)=>{
      [-1,1].forEach(sign=>{
        const {cp1x,cp1y,cp2x,cp2y}=cp(sign,arc.sc);
        fxCtx.beginPath();
        fxCtx.moveTo(N.x,N.y);
        fxCtx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,S.x,S.y);
        fxCtx.strokeStyle=`rgba(110,170,255,${arc.a})`;
        fxCtx.lineWidth=arc.lw;
        fxCtx.shadowBlur=li<3?6:0; fxCtx.shadowColor='rgba(92,158,255,.35)';
        fxCtx.stroke();
        fxCtx.shadowBlur=0;

        // Arrow at t≈0.5 showing N→S direction
        if(li<4){
          const {cp1x:c1x,cp1y:c1y,cp2x:c2x,cp2y:c2y}=cp(sign,arc.sc);
          const ax=bezPt(N.x,c1x,c2x,S.x,0.5);
          const ay=bezPt(N.y,c1y,c2y,S.y,0.5);
          const tx=bezTan(N.x,c1x,c2x,S.x,0.5);
          const ty=bezTan(N.y,c1y,c2y,S.y,0.5);
          const ang=Math.atan2(ty,tx);
          const sz=4+li*0.4;
          fxCtx.save();
          fxCtx.translate(ax,ay); fxCtx.rotate(ang);
          fxCtx.beginPath();
          fxCtx.moveTo(sz,0); fxCtx.lineTo(-sz*.8,sz*.55); fxCtx.lineTo(-sz*.8,-sz*.55);
          fxCtx.closePath();
          fxCtx.fillStyle=`rgba(160,210,255,${arc.a*0.85})`;
          fxCtx.fill();
          fxCtx.restore();
        }
      });
    });

    // ── Flowing particles (N→S in red→blue gradient) ─────────
    parts.forEach(p=>{
      p.t=(p.t+speed)%1;
      const {cp1x,cp1y,cp2x,cp2y}=cp(p.sign,arcs[p.li].sc);
      const px=bezPt(N.x,cp1x,cp2x,S.x,p.t);
      const py=bezPt(N.y,cp1y,cp2y,S.y,p.t);

      // Color: red at t=0 (near N pole), blue at t=1 (near S pole)
      const r=Math.round(230*(1-p.t)+40*p.t);
      const g=Math.round(80 +p.t*60);
      const b=Math.round(40*(1-p.t)+240*p.t);
      const alpha=Math.min(0.95,0.9-p.li*0.1);
      const radius=Math.max(1.5,3.8-p.li*0.45);

      // Glow halo
      const grad=fxCtx.createRadialGradient(px,py,0,px,py,radius*3);
      grad.addColorStop(0,`rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1,'rgba(0,0,0,0)');
      fxCtx.beginPath(); fxCtx.arc(px,py,radius*3,0,Math.PI*2);
      fxCtx.fillStyle=grad; fxCtx.fill();

      // Core dot
      fxCtx.beginPath(); fxCtx.arc(px,py,radius,0,Math.PI*2);
      fxCtx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
      fxCtx.fill();
    });

    // ── Pole glows ───────────────────────────────────────────
    [[N,'#ef5350',28],[S,'#2196f3',28]].forEach(([pole,col,r])=>{
      const rg=fxCtx.createRadialGradient(pole.x,pole.y,0,pole.x,pole.y,r);
      rg.addColorStop(0,col+'cc'); rg.addColorStop(1,'rgba(0,0,0,0)');
      fxCtx.beginPath(); fxCtx.arc(pole.x,pole.y,r,0,Math.PI*2);
      fxCtx.fillStyle=rg; fxCtx.fill();
    });

    // ── Pole labels ──────────────────────────────────────────
    fxCtx.font='bold 15px Arial';
    fxCtx.textAlign='center';
    fxCtx.fillStyle='#ff6e6a'; fxCtx.fillText('N',N.x,N.y-34);
    fxCtx.fillStyle='#64b5ff'; fxCtx.fillText('S',S.x,S.y-34);

    // ── N→S legend ────────────────────────────────────────────
    fxCtx.font='11px Arial'; fxCtx.fillStyle='rgba(180,210,255,0.55)';
    fxCtx.fillText('field lines: N → S outside magnet',mid.x,mid.y-hw*2.5);

  },20);

  // Auto-clear after 14 seconds (keeps running through the observation reading)
  setTimeout(()=>{ fxActive=false; fxCtx.clearRect(0,0,$fxC.width,$fxC.height); },14000);
}

/* ═══ 3. DIRECTIVE / COMPASS ═══════════════════════════════ */
function wireCompass(){
  let suspMag=null, compassObj=null, spinAnim=null;
  let cVel=0; // compass needle velocity — persists across frames

  // SETTLE_TARGET: rotation.y=-PI/2 → magnet N pole points in -Z world direction
  // Compass needle at rotation.y=0  → N (red cone) also points in -Z world direction ✓
  // Alignment formula: needleRotY = magnetRotY + PI/2
  const SETTLE_TARGET=-Math.PI/2;

  // Continuous compass-follow animation — runs as long as compass is in scene
  const compassFollowAnim=addAnim({fn:()=>{
    if(!compassObj||!suspMag) return;
    const targetY=suspMag.rotation.y+Math.PI/2;
    const off=normalizeAngle(compassObj.needle.rotation.y-targetY);
    cVel+=-off*0.042;   // spring: stiff enough to track spin
    cVel*=0.88;          // damping: slight lag for realism
    compassObj.needle.rotation.y+=cVel;
  }});

  document.addEventListener('expDrop',function h(e){
    if(currentExp!=='compass'){document.removeEventListener('expDrop',h);removeAnim(compassFollowAnim);return;}
    const id2=e.detail;
    if(id2==='table'&&!placed.table){
      buildTable(); placed.table=true; useItem('table'); stepDone('table');
      orbiting=false; $hint.classList.add('gone');
      msg('Table placed. Add the retort stand.');
    } else if(id2==='stand'&&placed.table&&!placed.stand){
      const standData=buildStandThread(-1.5,0);
      EX.stand=standData.group; EX.hanger=standData.hanger; EX.stirrup=standData.stirrup;
      placed.stand=true; useItem('stand'); stepDone('stand');
      msg('Stand with thread placed. Now attach the bar magnet to the thread.');
    } else if(id2==='magnet1'&&placed.stand&&!placed.magnet1){
      suspMag=buildBarMagnet(0,0,'susp',EX.stirrup,0);
      suspMag.position.set(0,0,0);
      suspMag.rotation.set(0,SETTLE_TARGET,0); // start already pointing N-S
      placed.magnet1=true; useItem('magnet1'); stepDone('magnet');
      id('bSpin').disabled=false;
      msg('Bar magnet hanging from the stirrup. Click "Spin" to rotate it, then "Let It Settle".');
    } else if(id2==='compass'&&placed.magnet1&&!placed.compass){
      compassObj=buildCompass(3.5,0); placed.compass=true; useItem('compass'); stepDone('compass');
      // Needle starts misaligned, then the compassFollowAnim will pull it into position
      compassObj.needle.rotation.y=Math.PI*(0.7+Math.random()*0.6)*(Math.random()<0.5?1:-1);
      cVel=0;
      msg('Compass placed! Watch its needle swing to align with the suspended magnet.');
    }
  });

  id('bSpin').addEventListener('click',()=>{
    if(!suspMag) return; stepDone('spin');
    id('bSpin').disabled=true; id('bSettle').disabled=false;
    // Stop any previous spin
    if(spinAnim){removeAnim(spinAnim); spinAnim=null;}
    // Spin at a realistic speed (about 1 full rotation every ~3 seconds)
    const dir=Math.random()<0.5?1:-1;
    const speed=(0.025+Math.random()*0.018)*dir;
    spinAnim=addAnim({fn:()=>{ suspMag.rotation.y+=speed; }});
    msg('Magnet spinning! Watch the compass needle track it. Click "Let It Settle" to release.');
  });

  id('bSettle').addEventListener('click',()=>{
    if(!suspMag) return;
    id('bSettle').disabled=true;
    if(spinAnim){removeAnim(spinAnim); spinAnim=null;}

    // Spring-pendulum: realistic oscillation toward SETTLE_TARGET
    let vel=0;
    const settleAnim=addAnim({fn:()=>{
      const off=normalizeAngle(suspMag.rotation.y-SETTLE_TARGET);
      vel+=-off*0.012;  // gentle restoring spring
      vel*=0.982;        // thread + air resistance damping
      suspMag.rotation.y+=vel;
      if(Math.abs(normalizeAngle(suspMag.rotation.y-SETTLE_TARGET))<0.005&&Math.abs(vel)<0.003){
        suspMag.rotation.y=SETTLE_TARGET;
        removeAnim(settleAnim);
        stepDone('settle');

        // Pulse red glow on N pole to show which end is North
        const nGlow=new THREE.PointLight(0xff3322,3.0,4.0);
        nGlow.position.set(-1.9,0.3,0); suspMag.add(nGlow);
        let gt=0;
        const gi=setInterval(()=>{
          gt+=0.1; nGlow.intensity=3.0*(0.5+0.5*Math.cos(gt));
          if(gt>Math.PI*5){clearInterval(gi); suspMag.remove(nGlow);}
        },16);

        showObs([
          {c:'#5c9eff',t:'The spinning magnet gradually slowed down'},
          {c:'#4caf50',t:'It came to rest pointing North–South every time'},
          {c:'#ef5350',t:'Red (N) end glows — it points North'},
          {c:'#5c9eff',t:'Compass needle also points in the same direction!'},
        ]);
        showConc(`<div class="res-text">The freely suspended magnet always settled in the <b>North–South direction</b>, no matter how it was spun.<br><br>
          The <b>directive property</b>: a free magnet aligns with Earth's magnetic field. Notice the compass needle matches.</div>
          <div class="res-conc">✅ A freely suspended magnet always points North–South. This is the principle of the compass — used by sailors and travellers to navigate.</div>`);
        msg('✅ Magnet settled North–South! The compass needle also points the same way — both showing North.');
      }
    }});
  });
}

/* ─────────────────────────────────────────────────────────
   EXPERIMENT LOADER
   ───────────────────────────────────────────────────────── */
let currentExp='attraction';

function loadExperiment(expId){
  currentExp=expId;
  const def=EXPERIMENTS[expId];

  // Clear scene and rebuild environment
  while(scene.children.length>0)scene.remove(scene.children[0]);
  buildEnv();

  // Clear state
  Object.keys(placed).forEach(k=>delete placed[k]);
  Object.keys(EX).forEach(k=>delete EX[k]);
  animTasks.length=0;
  if(fxCtx)fxCtx.clearRect(0,0,$fxC.width,$fxC.height);

  // Reset UI
  $hint.classList.remove('gone');
  $obs.style.display='none'; $res.style.display='none';
  orbiting=true; camera.position.set(0,5.5,14); camera.lookAt(0,1.0,0);

  // Fill theory
  $theory.innerHTML=def.theory;

  // Fill steps
  $proc.innerHTML='';
  def.steps.forEach((s,i)=>{
    const li=document.createElement('li'); li.className='pstep'+(i===0?' active':'');
    li.dataset.s=s.id; li.innerHTML=s.text; $proc.appendChild(li);
  });

  // Build shelf
  buildShelf(expId);

  // Controls
  $ctrl.innerHTML=def.ctrlHtml;

  // Wire
  if(expId==='attraction') wireAttraction();
  else if(expId==='poles') wirePoles();
  else if(expId==='compass') wireCompass();

  msg(`${def.title} — drag apparatus from the shelf onto the workspace`);
}

/* ─────────────────────────────────────────────────────────
   DRAG & DROP
   ───────────────────────────────────────────────────────── */
document.addEventListener('dragstart',e=>{
  const el=e.target.closest('[data-id]');
  if(el&&!el.classList.contains('used')){
    e.dataTransfer.setData('text/plain',el.dataset.id);
    e.dataTransfer.effectAllowed='copy';
  }
});
const ws=id('workspace');
ws.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';ws.style.outline='2px dashed rgba(92,158,255,.3)';});
ws.addEventListener('dragleave',()=>{ws.style.outline='';});
ws.addEventListener('drop',e=>{
  e.preventDefault(); ws.style.outline='';
  const itemId=e.dataTransfer.getData('text/plain');
  if(itemId) document.dispatchEvent(new CustomEvent('expDrop',{detail:itemId}));
});

/* ─────────────────────────────────────────────────────────
   TABS
   ───────────────────────────────────────────────────────── */
document.querySelectorAll('.etab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.etab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); loadExperiment(btn.dataset.exp);
  });
});

/* ─────────────────────────────────────────────────────────
   CAMERA CONTROL
   ───────────────────────────────────────────────────────── */
ws.addEventListener('mousedown',e=>{if(suppressCameraDrag){suppressCameraDrag=false;return;}drag3D=true;pm={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',()=>{drag3D=false;});
window.addEventListener('mousemove',e=>{
  if(!drag3D||!camera)return;
  const dx=e.clientX-pm.x, dy=e.clientY-pm.y;
  const r=Math.sqrt(camera.position.x**2+camera.position.z**2);
  const a=Math.atan2(camera.position.x,camera.position.z)+dx*.006;
  camera.position.x=r*Math.sin(a); camera.position.z=r*Math.cos(a);
  camera.position.y=Math.max(1.5,Math.min(14,camera.position.y-dy*.04));
  camera.lookAt(0,1.0,0); pm={x:e.clientX,y:e.clientY};
});
ws.addEventListener('wheel',e=>{
  if(!camera)return;
  camera.position.z=Math.max(5,Math.min(22,camera.position.z+e.deltaY*.012));
  camera.lookAt(0,1.0,0);
},{passive:true});

/* ─────────────────────────────────────────────────────────
   RESET & KEYBOARD
   ───────────────────────────────────────────────────────── */
id('resetBtn').addEventListener('click',()=>loadExperiment(currentExp));
document.addEventListener('keydown',e=>{ if((e.key==='r'||e.key==='R')&&!e.ctrlKey) loadExperiment(currentExp); });

/* ─────────────────────────────────────────────────────────
   TOOLTIP
   ───────────────────────────────────────────────────────── */
function showTip(e,t){$tip.textContent=t;$tip.style.display='block';mvTip(e);}
function mvTip(e){$tip.style.left=(e.clientX+14)+'px';$tip.style.top=(e.clientY-34)+'px';}
function hideTip(){$tip.style.display='none';}
document.addEventListener('mousemove',e=>{if($tip.style.display!=='none')mvTip(e);});
function msg(t){$msg.textContent=t;}

/* ─────────────────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────────────────── */
initThree();
renderer.domElement.addEventListener('pointerdown',onPointerDown);
window.addEventListener('pointermove',onPointerMove);
window.addEventListener('pointerup',onPointerUp);
window.addEventListener('pointercancel',onPointerUp);
loadExperiment('attraction');
window.__magnetsLab={
  getState(){
    return {
      currentExp,
      interactionMode,
      placed:Object.assign({},placed),
      magnets:Object.fromEntries(Object.entries(EX).filter(([k,v])=>v&&v.position).map(([k,v])=>[k,{x:v.position.x,y:v.position.y,z:v.position.z,ry:v.rotation.y}])),
    };
  }
};