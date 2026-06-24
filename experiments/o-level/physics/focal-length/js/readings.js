/* ═══════════════════════════════════════════════════════════════
   iLab Physics · Converging Lens · readings.js
   ─────────────────────────────────────────────────────────────
   Right panel — live meter cards · trial recording · statistics · status
   Depends on: state.js  (workspace.js at runtime for computeClarity/calcF)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════
   LIVE METER CARDS  (u, v, f)
   ══════════════════════════════════════════════════════════ */
Lab.updateMeterCards = function () {
  const clarity = Lab.computeClarity();
  if (Lab.assembled && Lab.circuitConnected) {
    Lab.screenCtrl.style.display = 'block';

    const fCalc = Lab.calcF(Lab.u_cm, Lab.v_cm);
    document.getElementById('res-u').textContent = Lab.u_cm.toFixed(1) + ' cm';
    document.getElementById('bar-u').style.width = (Lab.u_cm / 50) * 100 + '%';
    document.getElementById('res-v').textContent = Lab.v_cm.toFixed(1) + ' cm';
    document.getElementById('bar-v').style.width = (Lab.v_cm / 100) * 100 + '%';
    document.getElementById('res-f').textContent = fCalc.toFixed(2) + ' cm';
    document.getElementById('bar-f').style.width = Math.min(100, (fCalc / 20) * 100) + '%';

    Lab.btnRecord.disabled = clarity < 80;
  } else {
    Lab.screenCtrl.style.display = 'none';
    Lab.btnRecord.disabled = true;
  }
};

/* ══════════════════════════════════════════════════════════
   TRIAL RECORDING
   ══════════════════════════════════════════════════════════ */
Lab.recordTrial = function () {
  const clarity = Lab.computeClarity();
  if (clarity < 80) {
    Lab.setStatus('⚠️ Image not sharp enough — continue adjusting the screen.', 'warn');
    return;
  }
  const fCalc = Lab.calcF(Lab.u_cm, Lab.v_cm);
  Lab.currentTrial++;
  Lab.trialData.push({
    trial: Lab.currentTrial,
    u: Lab.u_cm.toFixed(1),
    v: Lab.v_cm.toFixed(1),
    f: fCalc.toFixed(2),
  });
  Lab.updateTrialTable();
  Lab.computeAggregates();
  Lab.setStatus(
    `✅ Trial ${Lab.currentTrial}: u = ${Lab.u_cm} cm, v = ${Lab.v_cm.toFixed(1)} cm → f = ${fCalc.toFixed(2)} cm`,
    'ok'
  );
  const nextUs  = [20, 25, 30, 35, 40, 45];
  const doneUs  = Lab.trialData.map(r => parseFloat(r.u));
  const nextVal = nextUs.find(x => !doneUs.some(d => Math.abs(d - x) < 0.5));
  if (nextVal) {
    setTimeout(() =>
      Lab.setStatus(`💡 Try u = ${nextVal} cm for the next trial. Adjust slider, then find focus.`, 'warn'),
      1800
    );
  }
};

Lab.updateTrialTable = function () {
  if (!Lab.trialData.length) {
    Lab.trialTbody.innerHTML = '<tr><td colspan="4" class="empty-row">No trials yet</td></tr>';
    return;
  }
  Lab.trialTbody.innerHTML = Lab.trialData.map(r =>
    `<tr><td>${r.trial}</td><td>${r.u}</td><td>${r.v}</td><td>${r.f}</td></tr>`
  ).join('');
};

Lab.computeAggregates = function () {
  if (!Lab.trialData.length) return;
  const fs   = Lab.trialData.map(r => parseFloat(r.f));
  const mean = fs.reduce((a, b) => a + b, 0) / fs.length;
  const varF = fs.reduce((s, f) => s + (f - mean) ** 2, 0) / fs.length;
  document.getElementById('mean-f').textContent = mean.toFixed(2) + ' cm';
  document.getElementById('std-f').textContent  = Math.sqrt(varF).toFixed(3);
  document.getElementById('err-f').textContent  =
    (Math.abs(mean - Lab.F_TRUE) / Lab.F_TRUE * 100).toFixed(2) + ' %';
};

/* ══════════════════════════════════════════════════════════
   STATUS HELPER
   ══════════════════════════════════════════════════════════ */
Lab.setStatus = function (msg, cls) {
  cls = cls || '';
  Lab.expStatus.textContent = msg;
  Lab.expStatus.className   = 'status-msg' + (cls ? ' ' + cls : '');
  Lab.overlayEl.textContent = msg;
};
