import { placed, loose, state, rigState, nextLooseId, currentTitrant } from '../../state.js';
import { geo, recalcGeometry } from '../../workspace/geometry.js';
import { setStatus, updatePanelEnablement } from '../../readings/instruments.js';
import { checkFlaskSnap } from './drag.js';

export const RIG_ORDER = ['stand', 'clamp', 'burette'];

const slHeight        = document.getElementById('sl-height');
const slReach         = document.getElementById('sl-reach');
const slClampHeight   = document.getElementById('sl-clamp-height');
const slBuretteHeight = document.getElementById('sl-burette-height');

export function updateAssemblyDots() {
  ['stand', 'clamp', 'burette', 'flask'].forEach(k => {
    const el = document.getElementById(`asm-${k}`);
    if (el) el.classList.toggle('ok', !!placed[k]);
  });
  rigState.assembled = RIG_ORDER.every(k => placed[k]);

  if (placed.stand)   slHeight.disabled = false;
  if (placed.clamp)  { slReach.disabled = false; slClampHeight.disabled = false; }
  if (placed.burette)  slBuretteHeight.disabled = false;

  if (rigState.assembled) {
    setStatus(`✅ Stand, clamp & burette assembled. Pour in ${currentTitrant().formula}, then build the flask side.`, 'ok');
  }
}

export function markRigPlaced(type) {
  placed[type] = true;
  const card = document.getElementById(`card-${type}`);
  if (card) card.classList.add('placed-single');
  updateAssemblyDots();
  recalcGeometry();
}

export function addLooseItem(type, x, y) {
  const id   = 'L' + (nextLooseId.value++);
  const item = { id, type, x, y };
  if (type === 'pipette')    item.fillCc   = 0;
  if (type === 'dropper')    item.fillCc   = 0;
  if (type === 'beaker-hcl')  item.fillFrac = 0.75;
  if (type === 'beaker-naoh') item.fillFrac = 0.75;
  if (type === 'beaker-ind')  item.fillFrac = 0.6;
  loose[id] = item;
}

export function handleDropType(type, x, y) {
  if (RIG_ORDER.includes(type)) {
    if (placed[type]) { setStatus(`${type} already on the bench.`, 'warn'); return; }
    const idx = RIG_ORDER.indexOf(type);
    for (let i = 0; i < idx; i++) {
      if (!placed[RIG_ORDER[i]]) { setStatus(`⚠️ Place the ${RIG_ORDER[i]} first.`, 'warn'); return; }
    }
    markRigPlaced(type);
    const msgs = {
      stand:   '🧪 Retort stand placed. Drop the clamp next.',
      clamp:   '🗜️ Clamp attached. Drop the burette into its jaws.',
      burette: `🧫 Burette mounted! Pour in ${currentTitrant().formula}, or add a funnel first.`,
    };
    setStatus(msgs[type]);
    return;
  }

  if (type === 'flask') {
    if (placed.flask) { setStatus('Flask already on the bench.', 'warn'); return; }
    placed.flask = true;
    geo.flaskPlacedFree = { x, y };
    const card = document.getElementById('card-flask');
    if (card) card.classList.add('placed-single');
    updateAssemblyDots();
    checkFlaskSnap();
    setStatus('🧪 Conical flask placed. Drag it under the burette to mount it.');
    return;
  }

  if (type === 'funnel') {
    if (placed.funnel) { setStatus('Funnel already on the bench.', 'warn'); return; }
    if (placed.burette && Math.hypot(x - geo.pivotX, y - geo.buretteTopY) < 60) {
      placed.funnel = true;
      const card = document.getElementById('card-funnel');
      if (card) card.classList.add('placed-single');
      setStatus('🔺 Funnel mounted at the burette opening.');
    } else {
      addLooseItem('funnel', x, y);
    }
    return;
  }

  addLooseItem(type, x, y);
}

export function initDragAndDrop(wWrap) {
  RIG_ORDER.concat(['flask']).forEach(type => {
    const card = document.getElementById(`card-${type}`);
    if (!card) return;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  ['pipette', 'dropper', 'beaker-hcl', 'beaker-naoh', 'beaker-ind', 'funnel'].forEach(type => {
    const card = document.getElementById(`card-${type}`);
    if (!card) return;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  wWrap.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    wWrap.classList.add('drag-over');
  });
  wWrap.addEventListener('dragleave', () => wWrap.classList.remove('drag-over'));
  wWrap.addEventListener('drop', e => {
    e.preventDefault();
    wWrap.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;
    const rect = wWrap.getBoundingClientRect();
    const x = (e.clientX - rect.left - geo.workspacePanX) / geo.workspaceZoom;
    const y = (e.clientY - rect.top  - geo.workspacePanY) / geo.workspaceZoom;
    handleDropType(type, x, y);
  });
}
