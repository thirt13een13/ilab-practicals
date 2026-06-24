import { state, placed, loose, currentIndicator,
         currentTitrant, currentAnalyte,
         titrantBeakerType, analyteBeakerType } from '../../state.js';
import { geo, getFlaskPos } from '../../workspace/geometry.js';
import { hitBoxes } from '../../workspace/renderer.js';
import { setStatus, updateFlaskStatusList, updatePanelEnablement } from '../../readings/instruments.js';
import { startPourAnimation } from './pour.js';
import { dispensePipetteIntoFlask, addIndicatorDrop } from '../../results/trials.js';

let dragLoose = null; // { kind: 'flask'|'loose', id?, ox, oy }

export function initCanvasDrag(canvas) {
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - geo.workspacePanX) / geo.workspaceZoom;
    const y = (e.clientY - rect.top  - geo.workspacePanY) / geo.workspaceZoom;

    if (placed.flask && hitBoxes.flask &&
        x >= hitBoxes.flask.x && x <= hitBoxes.flask.x + hitBoxes.flask.w &&
        y >= hitBoxes.flask.y && y <= hitBoxes.flask.y + hitBoxes.flask.h) {
      dragLoose = { kind: 'flask', ox: x - getFlaskPos().x, oy: y - getFlaskPos().y };
      state.flaskMounted = false;
      return;
    }
    const item = findLooseAt(x, y);
    if (item) dragLoose = { kind: 'loose', id: item.id, ox: x - item.x, oy: y - item.y };
  });

  canvas.addEventListener('mousemove', e => {
    if (!dragLoose) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - geo.workspacePanX) / geo.workspaceZoom;
    const y = (e.clientY - rect.top  - geo.workspacePanY) / geo.workspaceZoom;
    if (dragLoose.kind === 'flask') {
      geo.flaskPlacedFree = { x: x - dragLoose.ox, y: y - dragLoose.oy };
    } else {
      const item = loose[dragLoose.id];
      if (item) { item.x = x - dragLoose.ox; item.y = y - dragLoose.oy; }
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (!dragLoose) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - geo.workspacePanX) / geo.workspaceZoom;
    const y = (e.clientY - rect.top  - geo.workspacePanY) / geo.workspaceZoom;
    if (dragLoose.kind === 'flask') {
      checkFlaskSnap();
    } else {
      const item = loose[dragLoose.id];
      if (item) handleLooseRelease(item, x, y);
    }
    dragLoose = null;
  });

  // Click (not drag) on dropper → add indicator drop to flask.
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - geo.workspacePanX) / geo.workspaceZoom;
    const y = (e.clientY - rect.top  - geo.workspacePanY) / geo.workspaceZoom;
    const item = findLooseAt(x, y);
    if (item && item.type === 'dropper' && item.source === 'indicator' && item.fillCc > 0) {
      if (nearFlask(item.x, item.y) || nearFlask(x, y)) addIndicatorDrop();
    }
  });
}

export function checkFlaskSnap() {
  if (!placed.burette) { state.flaskMounted = false; updatePanelEnablement(); return; }
  const dist = Math.abs(geo.flaskPlacedFree.x - geo.pivotX);
  if (dist < 45) {
    state.flaskMounted    = true;
    geo.flaskPlacedFree.x = geo.pivotX;
    setStatus('📍 Flask aligned under the burette tip, base resting on the bench.', 'ok');
  } else {
    state.flaskMounted = false;
  }
  updateFlaskStatusList();
  updatePanelEnablement();
}

function findLooseAt(px, py) {
  for (const id in loose) {
    const item = loose[id];
    const hb   = item._hit;
    if (hb && px >= hb.x && px <= hb.x + hb.w && py >= hb.y && py <= hb.y + hb.h) return item;
  }
  return null;
}

function handleLooseRelease(item, x, y) {
  if (item.type === titrantBeakerType() && placed.burette) {
    const distToTop = Math.hypot(x - geo.pivotX, y - geo.buretteTopY);
    if (distToTop < 70) { startPourAnimation(item.id); return; }
  }

  if (item.type === 'pipette') {
    const analyteBeaker = Object.values(loose).find(o => o.type === analyteBeakerType() && nearItem(o, x, y));
    if (analyteBeaker && item.fillCc < state.pipetteVolume - 0.01) {
      item.fillCc = state.pipetteVolume;
      item.source = state.buretteRole === 'acid' ? 'base' : 'acid';
      setStatus(`Pipette drew ${state.pipetteVolume} cc of ${currentAnalyte().formula} solution.`, 'ok');
      return;
    }
    if (placed.flask && item.fillCc > 0 && (item.source === 'base' || item.source === 'acid') && nearFlask(x, y)) {
      dispensePipetteIntoFlask(item);
      return;
    }
  }

  if (item.type === 'dropper') {
    const indBeaker = Object.values(loose).find(o => o.type === 'beaker-ind' && nearItem(o, x, y));
    if (indBeaker) {
      item.fillCc = 2;
      item.source = 'indicator';
      setStatus(`Dropper filled with ${currentIndicator().name} indicator.`, 'ok');
    }
  }
}

function nearItem(item, x, y) {
  const hb = item._hit;
  if (!hb) return Math.hypot(item.x - x, item.y - y) < 40;
  return x >= hb.x - 20 && x <= hb.x + hb.w + 20 && y >= hb.y - 20 && y <= hb.y + hb.h + 20;
}

function nearFlask(x, y) {
  const hb = hitBoxes.flask;
  if (!hb) return false;
  return x >= hb.x - 20 && x <= hb.x + hb.w + 20 &&
         y >= hb.y - 20 && y <= hb.y + hb.h + 20;
}
