/* ═══════════════════════════════════════════════════════
   renderer3d.js — Three.js 3D view orchestrator
   init3D() called once on boot; draw3D() called each frame
   when state.viewMode === '3d'.
   ═══════════════════════════════════════════════════════ */
import { DOM } from './state.js';
import { initScene, renderScene, scene } from './components/3d/scene.js';
import { createEnvironment }             from './components/3d/environment.js';
import { createTable,   updateTable }    from './components/3d/table.js';
import { createStand,   updateStand }    from './components/3d/stand.js';
import { createClamp,   updateClamp }    from './components/3d/clamp.js';
import { createString3d, updateString3d } from './components/3d/string3d.js';
import { createBob3d,        updateBob3d }        from './components/3d/bob.js';
import { createStopwatch3d,  updateStopwatch3d }  from './components/3d/stopwatch3d.js';

export function init3D() {
  initScene(DOM.canvas3d);
  createEnvironment(scene);
  createTable(scene);
  createStand(scene);
  createClamp(scene);
  createString3d(scene);
  createBob3d(scene);
  createStopwatch3d(scene);
}

export function draw3D() {
  updateTable();
  updateStand();
  updateClamp();
  updateString3d();
  updateBob3d();
  updateStopwatch3d();
  renderScene();
}
