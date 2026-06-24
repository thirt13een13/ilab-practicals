/* ═══════════════════════════════════════════════════════
   renderer.js — 2D canvas orchestrator
   Imports each draw function from components/2d/ and
   applies the view transform (zoom/pan) before calling them.
   ═══════════════════════════════════════════════════════ */
import { state, DOM } from './state.js';
import { drawBackground }       from './components/2d/background.js';
import { drawTable }            from './components/2d/table.js';
import { drawStand }            from './components/2d/stand.js';
import { drawClamp }            from './components/2d/clamp.js';
import { drawString }           from './components/2d/string.js';
import { drawBob }              from './components/2d/bob.js';
import { drawPivot }            from './components/2d/pivot.js';
import { drawWindParticles }    from './components/2d/wind.js';
import { drawAngleIndicator, drawTrajectoryArc, drawDampingIndicator } from './components/2d/overlays.js';
import { drawStopwatchOnBench } from './components/2d/stopwatch-bench.js';

export function draw() {
  const c = DOM.ctx;
  c.clearRect(0, 0, state.W, state.H);
  c.save();
  c.translate(state.viewOffsetX, state.viewOffsetY);
  c.scale(state.viewScale, state.viewScale);
  drawBackground();
  drawTable();
  drawWindParticles();
  drawTrajectoryArc();
  drawDampingIndicator();
  drawStand();
  drawClamp();
  drawString();
  drawBob();
  drawPivot();
  drawAngleIndicator();
  drawStopwatchOnBench();
  c.restore();
}
