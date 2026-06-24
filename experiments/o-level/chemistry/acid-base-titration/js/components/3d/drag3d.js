import * as THREE from 'three';

// Pointer-event-based drag for 3D items.
// Uses capture phase so handlers fire before OrbitControls, allowing
// stopPropagation() to prevent orbit when a draggable is hit.
//
// registerDraggable(group, id, onMove, verticalMove)
//   onMove(nx, ny, nz) — called during drag with the new clamped world position.
//   Return false from onMove to veto the move (e.g. when an item is locked).
//   verticalMove = true  → camera-facing vertical plane (up/down + left/right).
//   verticalMove = false → horizontal Y=0 plane (left/right + depth).
//
// unregisterDraggable(id) — call when the item is removed from the scene.

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
const _hit      = new THREE.Vector3();

// Table surface bounds (cm). Items are clamped to stay on the bench.
export const TABLE_BOUNDS = {
  xMin: -47,  xMax: 47,
  zMin: -19,  zMax: 19,
  yMin:   0,  yMax: 110,
};

// id → { group, onMove, verticalMove }
const draggables = new Map();

let _camera   = null;
let _controls = null;
let _canvas   = null;
let _dragging = null; // { id, group, offset, onMove, plane }

// Tap detection — pointer start position; cleared on cancel/move beyond threshold.
let _pointerStart = null;
const _tapListeners = [];

// Register a callback fn(id, worldPos) fired when a draggable is tapped
// (pointer down + up with < 8 px movement).
export function addTapListener(fn) {
  _tapListeners.push(fn);
}

export function initDrag3D(scene, camera, controls, canvas) {
  _camera   = camera;
  _controls = controls;
  _canvas   = canvas;

  // Capture phase so we fire before OrbitControls and can stop propagation.
  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  canvas.addEventListener('pointerup',     onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
}

export function registerDraggable(group, id, onMove = null, verticalMove = false) {
  draggables.set(id, { group, onMove, verticalMove });
}

export function unregisterDraggable(id) {
  draggables.delete(id);
}

function toNDC(clientX, clientY) {
  const rect = _canvas.getBoundingClientRect();
  mouse.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
}

function pickDraggable() {
  raycaster.setFromCamera(mouse, _camera);
  const meshes = [];
  for (const { group } of draggables.values()) {
    group.traverse(child => { if (child.isMesh) meshes.push(child); });
  }
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  const hitMesh = hits[0].object;
  for (const [id, entry] of draggables) {
    if (isDescendant(entry.group, hitMesh))
      return { id, ...entry, point: hits[0].point };
  }
  return null;
}

function isDescendant(parent, child) {
  let node = child;
  while (node) { if (node === parent) return true; node = node.parent; }
  return false;
}

// Camera-facing vertical plane through `pos`.
function makeCameraPlane(pos) {
  const normal = new THREE.Vector3();
  _camera.getWorldDirection(normal);
  normal.y = 0;
  normal.normalize();
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos);
}

// Horizontal plane at Y = 0 (table surface).
const H_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function startDrag(clientX, clientY) {
  toNDC(clientX, clientY);
  const pick = pickDraggable();
  if (!pick) return false;

  const plane = pick.verticalMove
    ? makeCameraPlane(pick.group.position)
    : H_PLANE;

  raycaster.setFromCamera(mouse, _camera);
  if (!raycaster.ray.intersectPlane(plane, _hit)) return false;

  const offset = new THREE.Vector3().subVectors(pick.group.position, _hit);
  _dragging = { id: pick.id, group: pick.group, offset, onMove: pick.onMove, plane };
  if (_controls) _controls.enabled = false;
  return true;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function moveDrag(clientX, clientY) {
  if (!_dragging) return;
  toNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, _camera);
  if (!raycaster.ray.intersectPlane(_dragging.plane, _hit)) return;

  let nx = clamp(_hit.x + _dragging.offset.x, TABLE_BOUNDS.xMin, TABLE_BOUNDS.xMax);
  let ny = clamp(_hit.y + _dragging.offset.y, TABLE_BOUNDS.yMin, TABLE_BOUNDS.yMax);
  let nz = clamp(_hit.z + _dragging.offset.z, TABLE_BOUNDS.zMin, TABLE_BOUNDS.zMax);

  if (_dragging.plane === H_PLANE) ny = 0;

  let allow = true;
  if (_dragging.onMove) allow = _dragging.onMove(nx, ny, nz) !== false;
  if (allow) {
    _dragging.group.position.set(nx, ny, nz);
  }
}

function endDrag() {
  _dragging = null;
  if (_controls) _controls.enabled = true;
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  _pointerStart = { x: e.clientX, y: e.clientY };
  if (startDrag(e.clientX, e.clientY)) {
    e.stopPropagation();
  }
}

function onPointerMove(e) {
  if (!_dragging) return;
  e.preventDefault();
  e.stopPropagation();
  moveDrag(e.clientX, e.clientY);
}

function onPointerUp(e) {
  if (_pointerStart && e && _tapListeners.length > 0) {
    const dx = e.clientX - _pointerStart.x;
    const dy = e.clientY - _pointerStart.y;
    if (Math.hypot(dx, dy) < 8) {
      toNDC(e.clientX, e.clientY);
      const pick = pickDraggable();
      if (pick) {
        for (const fn of _tapListeners) fn(pick.id, pick.point);
      }
    }
  }
  _pointerStart = null;
  endDrag();
}

function onPointerCancel() {
  _pointerStart = null;
  endDrag();
}

export function disposeDrag3D() {
  if (!_canvas) return;
  _canvas.removeEventListener('pointerdown',  onPointerDown, { capture: true });
  _canvas.removeEventListener('pointermove',  onPointerMove, { capture: true });
  _canvas.removeEventListener('pointerup',     onPointerUp);
  _canvas.removeEventListener('pointercancel', onPointerCancel);
}
