/* ═══════════════════════════════════════════════════════
   assembly.js — drag-and-drop apparatus placement
   ═══════════════════════════════════════════════════════ */
import { state, DOM, CONSTANTS } from './state.js';
import { recalcGeometry } from './geometry.js';
import { setStatus } from './controls.js';

export function updateAssemblyDots() {
  CONSTANTS.ORDER.forEach(k => {
    const el = document.getElementById(`asm-${k}`);
    if (!el) return;
    if (state.placed[k]) el.classList.add('ok'); else el.classList.remove('ok');
  });

  state.assembled = ['stand','clamp','string','bob'].every(k => state.placed[k]);
  DOM.btnRelease.disabled = !state.assembled;

  if (state.placed.stopwatch) {
    DOM.swBox.style.opacity       = '1';
    DOM.swBox.style.pointerEvents = 'auto';
    DOM.btnSwStartStop.disabled   = false;
    DOM.btnSwReset.disabled       = false;
    if (DOM.swStateEl.textContent.startsWith('Drag')) {
      DOM.swStateEl.textContent = 'Ready';
    }
  }
  if (state.assembled && !state.bobReleased) {
    setStatus('✅ Apparatus assembled — drag the stopwatch, then Release Bob to start swinging.', 'ok');
  }
}

export function markPlaced(type) {
  state.placed[type] = true;
  const card = document.getElementById(`card-${type}`);
  if (card) card.classList.add('placed');
  updateAssemblyDots();
  recalcGeometry();
  const msgs = {
    stand:     '🧪 Retort stand placed. Drop the clamp next.',
    clamp:     '🗜️ Clamp attached. Drop the string.',
    string:    '🧵 String connected. Drop the bob.',
    bob:       '🔵 Bob attached! Also drag the stopwatch onto the bench.',
    stopwatch: '⏱️ Stopwatch placed — it\'s ready to use from the right panel.',
  };
  setStatus(msgs[type]);
}

export function initDragAndDrop() {
  CONSTANTS.ORDER.forEach(type => {
    const card = document.getElementById(`card-${type}`);
    if (!card) return;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  DOM.wWrap.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    DOM.wWrap.classList.add('drag-over');
  });
  DOM.wWrap.addEventListener('dragleave', () => DOM.wWrap.classList.remove('drag-over'));

  DOM.wWrap.addEventListener('drop', e => {
    e.preventDefault();
    DOM.wWrap.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/plain');
    if (!CONSTANTS.ORDER.includes(type)) return;
    if (state.placed[type]) { setStatus(`${type} already on the bench.`); return; }

    if (type !== 'stopwatch') {
      const physOrder = ['stand','clamp','string','bob'];
      const idx = physOrder.indexOf(type);
      for (let i = 0; i < idx; i++) {
        if (!state.placed[physOrder[i]]) {
          setStatus(`⚠️ Place the ${physOrder[i]} first.`, 'warn');
          return;
        }
      }
    }

    markPlaced(type);
    if (type === 'stand')  { DOM.slHeight.disabled = false; DOM.slClampPos.disabled = false; }
    if (type === 'string') { DOM.slLength.disabled = false; }
    if (type === 'bob')    { DOM.slMass.disabled = false; DOM.slAngle.disabled = false; }
  });
}
