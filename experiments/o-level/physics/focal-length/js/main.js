/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · main.js
   ─────────────────────────────────────────────────────────────
   Sliders · view/ray toggles · reset · resize · boot
   Depends on: state.js · workspace.js · components.js · readings.js
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════
   RESET
   ══════════════════════════════════════════════════════════ */
Lab.resetAll = function () {
  Lab.placed = {
    metrerule: false, object: false, holder: false,
    lens: false, screen: false, battery: false, bulb: false,
  };
  Lab.circBattery      = false;
  Lab.circBulb         = false;
  Lab.circWires        = [];
  Lab.circuitConnected = false;
  Lab.wiringMode       = false;
  Lab.wireStart        = null;
  Lab.assembled        = false;
  Lab.trialData        = [];
  Lab.currentTrial     = 0;
  Lab.u_cm = 20; Lab.v_cm = 40;
  Lab.slU.value = 20; Lab.slV.value = 40; Lab.slU.disabled = true;
  Lab.valU.textContent  = '20 cm';
  Lab.scVal.textContent = '40.0 cm';

  Lab.ORDER.forEach(t => {
    const c = document.getElementById(`card-${t}`); if (c) c.classList.remove('placed');
    const d = document.getElementById(`asm-${t}`);  if (d) d.classList.remove('ok');
  });
  document.getElementById('asm-circuit').classList.remove('ok');

  Lab.btnRecord.disabled = true;
  Lab.updateTrialTable();
  ['mean-f', 'std-f', 'err-f'].forEach(id => document.getElementById(id).textContent = '—');
  ['res-u', 'res-v', 'res-f'].forEach(id => document.getElementById(id).textContent = '— cm');
  ['bar-u', 'bar-v', 'bar-f'].forEach(id => document.getElementById(id).style.width = '0%');
  document.getElementById('circuit-hint').textContent =
    'Drop battery & bulb above, then click terminals to draw wires.';

  Lab.screenCtrl.style.display = 'none';
  Lab.setStatus('↺ Lab reset — drag the apparatus back onto the bench.');
  Lab.circDraw();
};

/* ══════════════════════════════════════════════════════════
   RESIZE
   ══════════════════════════════════════════════════════════ */
Lab.resizeCanvas = function () {
  const rect = Lab.wWrap.getBoundingClientRect();
  Lab.canvas.width  = rect.width;
  Lab.canvas.height = rect.height;
  Lab.W = Lab.canvas.width;
  Lab.H = Lab.canvas.height;
  Lab.recalcGeometry();
  /* Re-pin table to ground after geometry recalculation */
  const floorY = Lab.TABLE_TOP + Lab.TABLE_H + Lab.TABLE_LEG_H;
  Lab.panY = floorY * (1 - Lab.zoom);
  if (Lab.scene3d) Lab.scene3d.resize();
};

/* ══════════════════════════════════════════════════════════
   BOOT — assign DOM refs, wire events, start loop
   ══════════════════════════════════════════════════════════ */
Lab.boot = function () {
  /* Canvas refs */
  Lab.canvas = document.getElementById('lab-canvas');
  Lab.ctx    = Lab.canvas.getContext('2d');
  Lab.wWrap  = document.getElementById('workspace');
  Lab.cc     = document.getElementById('circuit-canvas');
  Lab.cctx   = Lab.cc.getContext('2d');

  /* DOM shortcuts */
  Lab.slU        = document.getElementById('sl-u');
  Lab.valU       = document.getElementById('val-u');
  Lab.slV        = document.getElementById('sl-screen-v');
  Lab.scVal      = document.getElementById('sc-val');
  Lab.btnRecord  = document.getElementById('btn-record');
  Lab.btnReset   = document.getElementById('btn-reset');
  Lab.btnFront   = document.getElementById('btn-view-front');
  Lab.btnSide    = document.getElementById('btn-view-side');
  Lab.btnView3d  = document.getElementById('btn-view-3d');
  Lab.btnRays    = document.getElementById('btn-toggle-rays');
  Lab.overlayEl  = document.getElementById('overlay-status');
  Lab.expStatus  = document.getElementById('exp-status');
  Lab.trialTbody = document.getElementById('trial-tbody');
  Lab.screenCtrl = document.getElementById('screen-ctrl');

  /* Sliders */
  Lab.slU.addEventListener('input', () => {
    Lab.u_cm = parseInt(Lab.slU.value);
    Lab.valU.textContent = Lab.u_cm + ' cm';
    const maxV = Math.floor(98 - Lab.u_cm);
    Lab.slV.max = maxV;
    if (parseFloat(Lab.slV.value) > maxV) Lab.slV.value = maxV;
    Lab.v_cm = parseFloat(Lab.slV.value);
    Lab.scVal.textContent = Lab.v_cm.toFixed(1) + ' cm';
    Lab.setStatus(`Lens at u = ${Lab.u_cm} cm. Move the screen to find a sharp image.`, 'warn');
    Lab.btnRecord.disabled = true;
  });

  Lab.slV.addEventListener('input', () => {
    Lab.v_cm = parseFloat(Lab.slV.value);
    Lab.scVal.textContent = Lab.v_cm.toFixed(1) + ' cm';
  });

  /* Buttons */
  Lab.btnRecord.addEventListener('click', Lab.recordTrial);
  Lab.btnReset.addEventListener('click',  Lab.resetAll);

  function switchTo2D() {
    Lab.canvas.style.display = 'block';
    if (Lab.scene3d) Lab.scene3d.hide();
    [Lab.btnFront, Lab.btnSide, Lab.btnView3d].forEach(b => b.classList.remove('active'));
  }

  Lab.btnFront.addEventListener('click', () => {
    switchTo2D();
    Lab.viewMode = 'front';
    Lab.btnFront.classList.add('active');
  });
  Lab.btnSide.addEventListener('click', () => {
    switchTo2D();
    Lab.viewMode = 'side';
    Lab.btnSide.classList.add('active');
  });
  Lab.btnView3d.addEventListener('click', () => {
    Lab.viewMode = '3d';
    [Lab.btnFront, Lab.btnSide].forEach(b => b.classList.remove('active'));
    Lab.btnView3d.classList.add('active');
    Lab.canvas.style.display = 'none';
    if (Lab.scene3d) Lab.scene3d.show();
  });

  Lab.btnRays.addEventListener('click', () => {
    Lab.showRays = !Lab.showRays;
    Lab.btnRays.classList.toggle('active', Lab.showRays);
  });

  window.addEventListener('resize', Lab.resizeCanvas);

  /* Init subsystems */
  Lab.resizeCanvas();
  Lab.initDnD();
  Lab.initCircuit();
  Lab.initCanvasZoom();
  Lab.recalcGeometry();
  Lab.circDraw();
  requestAnimationFrame(Lab.loop);
};

document.addEventListener('DOMContentLoaded', Lab.boot);
