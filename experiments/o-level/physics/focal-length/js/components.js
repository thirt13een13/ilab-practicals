/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · components.js
   ─────────────────────────────────────────────────────────────
   Left panel — circuit board · drag-and-drop · assembly logic
   Depends on: state.js  (workspace.js and readings.js at runtime)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════
   CIRCUIT BOARD
   ══════════════════════════════════════════════════════════ */
const TERMINALS = {
  bat_pos:  { x: 52,  y: 55 },
  bat_neg:  { x: 52,  y: 85 },
  bulb_in:  { x: 196, y: 55 },
  bulb_out: { x: 196, y: 85 },
};

Lab.circDraw = function () {
  const { cc, cctx, circWires, circuitConnected, circBattery, circBulb } = Lab;
  const cw = cc.width, ch = cc.height;
  cctx.clearRect(0, 0, cw, ch);

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

  /* Battery */
  if (circBattery) {
    const bx = 16, by = 30, bw = 52, bh = 80;
    const caseG = cctx.createLinearGradient(bx, by, bx + bw, by);
    caseG.addColorStop(0, '#1e2a3a');
    caseG.addColorStop(0.5, '#243347');
    caseG.addColorStop(1, '#1e2a3a');
    cctx.fillStyle = caseG;
    cctx.strokeStyle = '#f59e0b';
    cctx.lineWidth = 1.5;
    cctx.beginPath(); cctx.roundRect(bx, by, bw, bh, 5); cctx.fill(); cctx.stroke();
    for (let i = 0; i < 4; i++) {
      cctx.fillStyle = i % 2 === 0 ? '#2e3f52' : '#1a2636';
      cctx.fillRect(bx + 5, by + 8 + i * 17, bw - 10, 14);
      cctx.strokeStyle = 'rgba(255,255,255,0.06)';
      cctx.lineWidth = 0.5;
      cctx.strokeRect(bx + 5, by + 8 + i * 17, bw - 10, 14);
    }
    cctx.fillStyle = '#374151';
    cctx.fillRect(bx + 14, by - 6, bw - 28, 8);
    cctx.fillStyle = 'rgba(245,158,11,0.7)';
    cctx.font = 'bold 9px IBM Plex Mono,monospace';
    cctx.textAlign = 'center';
    cctx.fillText('3 V', bx + bw / 2, by + bh + 11);
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

  /* Bulb */
  if (circBulb) {
    const lit = circuitConnected;
    const lx = 168, ly = 28;
    if (lit) {
      const gG = cctx.createRadialGradient(lx + 22, ly + 20, 2, lx + 22, ly + 20, 40);
      gG.addColorStop(0, 'rgba(253,224,71,0.55)');
      gG.addColorStop(1, 'transparent');
      cctx.fillStyle = gG; cctx.beginPath(); cctx.arc(lx + 22, ly + 20, 40, 0, Math.PI * 2); cctx.fill();
    }
    cctx.fillStyle = lit ? 'rgba(253,224,71,0.82)' : 'rgba(55,65,81,0.9)';
    cctx.strokeStyle = lit ? '#f59e0b' : '#4b5563';
    cctx.lineWidth = 1.5;
    cctx.beginPath();
    cctx.arc(lx + 22, ly + 18, 18, Math.PI, 0, false);
    cctx.lineTo(lx + 40, ly + 38);
    cctx.lineTo(lx + 4,  ly + 38);
    cctx.closePath();
    cctx.fill(); cctx.stroke();
    if (lit) {
      cctx.strokeStyle = '#fff7ed'; cctx.lineWidth = 1.2;
      cctx.beginPath();
      cctx.moveTo(lx + 16, ly + 18);
      for (let i = 0; i < 5; i++) {
        cctx.quadraticCurveTo(lx + 19 + i * 3, ly + 13 - (i % 2) * 5, lx + 22 + i * 3, ly + 18);
      }
      cctx.stroke();
    }
    cctx.fillStyle = '#9ca3af';
    cctx.beginPath(); cctx.roundRect(lx + 10, ly + 38, 24, 10, 2); cctx.fill();
    cctx.fillStyle = '#6b7280';
    cctx.beginPath(); cctx.roundRect(lx + 13, ly + 48, 18, 6, 1); cctx.fill();
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

  if (!circuitConnected && circBattery && circBulb && circWires.length === 0) {
    cctx.fillStyle = 'rgba(245,158,11,0.6)';
    cctx.font = '8px IBM Plex Mono,monospace'; cctx.textAlign = 'center';
    cctx.fillText('Click + terminal → click bulb terminal', cw / 2, 130);
  }
};

Lab.checkCircuit = function () {
  const hasTop = Lab.circWires.some(w =>
    (w.t1 === 'bat_pos' && w.t2 === 'bulb_in') ||
    (w.t1 === 'bulb_in' && w.t2 === 'bat_pos'));
  const hasBot = Lab.circWires.some(w =>
    (w.t1 === 'bat_neg' && w.t2 === 'bulb_out') ||
    (w.t1 === 'bulb_out' && w.t2 === 'bat_neg'));
  Lab.circuitConnected  = hasTop && hasBot;
  Lab.placed.battery    = Lab.circBattery;
  Lab.placed.bulb       = Lab.circBulb;
  Lab.updateAssemblyDots();
  Lab.circDraw();
};

function terminalAt(x, y) {
  for (const [name, pos] of Object.entries(TERMINALS)) {
    if (Math.hypot(x - pos.x, y - pos.y) < 10) return { name, ...pos };
  }
  return null;
}

Lab.initCircuit = function () {
  Lab.cc.addEventListener('click', e => {
    if (!Lab.circBattery || !Lab.circBulb) return;
    const rect = Lab.cc.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (Lab.cc.width  / rect.width);
    const y = (e.clientY - rect.top)  * (Lab.cc.height / rect.height);
    const t = terminalAt(x, y);
    if (!t) return;
    if (!Lab.wireStart) {
      Lab.wireStart  = { x: t.x, y: t.y, terminal: t.name };
      Lab.wiringMode = true;
      document.getElementById('circuit-hint').textContent = 'Now click the other terminal to complete the wire.';
    } else {
      if (t.name !== Lab.wireStart.terminal) {
        Lab.circWires.push({ x1: Lab.wireStart.x, y1: Lab.wireStart.y, x2: t.x, y2: t.y, t1: Lab.wireStart.terminal, t2: t.name });
        Lab.checkCircuit();
        if (Lab.circuitConnected) {
          document.getElementById('circuit-hint').textContent = '✅ Circuit complete — bulb is powered!';
          Lab.setStatus('💡 Light source connected! Continue assembling the optical bench.', 'ok');
        }
      }
      Lab.wireStart = null; Lab.wiringMode = false;
    }
  });
};

/* ══════════════════════════════════════════════════════════
   ASSEMBLY & DRAG-AND-DROP
   ══════════════════════════════════════════════════════════ */
Lab.updateAssemblyDots = function () {
  ['metrerule', 'object', 'holder', 'lens', 'screen'].forEach(k => {
    const el = document.getElementById(`asm-${k}`);
    if (el) el.classList.toggle('ok', Lab.placed[k]);
  });
  const circEl = document.getElementById('asm-circuit');
  if (circEl) circEl.classList.toggle('ok', Lab.circuitConnected);

  const opticalReady = ['metrerule', 'object', 'holder', 'lens', 'screen'].every(k => Lab.placed[k]);
  Lab.assembled = opticalReady && Lab.circuitConnected;

  Lab.slU.disabled = !Lab.placed.holder;

  if (Lab.assembled) {
    Lab.setStatus('✅ All set! Adjust the screen to get a sharp image, then Record Trial.', 'ok');
  }
};

Lab.markPlaced = function (type) {
  Lab.placed[type] = true;
  const card = document.getElementById(`card-${type}`);
  if (card) card.classList.add('placed');
  Lab.updateAssemblyDots();
  const msgs = {
    metrerule: '📏 Metre rule placed — this is your optical bench. Drop the object next.',
    object:    '✛ Illuminated object placed at 0 cm. Now place the lens holder.',
    holder:    '🔩 Lens holder placed. Drop the converging lens into the ring.',
    lens:      '🔭 Lens mounted! Now place the white screen on the bench.',
    screen:    '🖵 Screen placed. Set up the light source circuit in the left panel.',
    battery:   '🔋 Battery on circuit board. Drop the bulb, then wire them up.',
    bulb:      '💡 Bulb placed. Click the + terminal then a bulb terminal to wire.',
  };
  Lab.setStatus(msgs[type]);
};

Lab.initDnD = function () {
  Lab.ORDER.forEach(type => {
    const card = document.getElementById(`card-${type}`);
    if (!card) return;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const cWrap = document.getElementById('circuit-wrap');
  cWrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  cWrap.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (type === 'battery') { Lab.circBattery = true; Lab.markPlaced('battery'); Lab.checkCircuit(); }
    if (type === 'bulb')    { Lab.circBulb    = true; Lab.markPlaced('bulb');    Lab.checkCircuit(); }
  });

  Lab.wWrap.addEventListener('dragover', e => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    Lab.wWrap.classList.add('drag-over');
  });
  Lab.wWrap.addEventListener('dragleave', () => Lab.wWrap.classList.remove('drag-over'));
  Lab.wWrap.addEventListener('drop', e => {
    e.preventDefault();
    Lab.wWrap.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/plain');
    const phys = ['metrerule', 'object', 'holder', 'lens', 'screen'];
    if (!phys.includes(type)) return;
    if (Lab.placed[type]) { Lab.setStatus(`${type} is already on the bench.`); return; }
    const idx = phys.indexOf(type);
    for (let i = 0; i < idx; i++) {
      if (!Lab.placed[phys[i]]) {
        Lab.setStatus(`⚠️ Place the ${phys[i]} first.`, 'warn');
        return;
      }
    }
    Lab.markPlaced(type);
  });
};
