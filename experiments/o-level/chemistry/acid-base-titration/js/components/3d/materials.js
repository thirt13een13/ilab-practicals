import * as THREE from 'three';
import { parseRgba } from '../../chemistry/model.js';

// ── Shared materials ────────────────────────────────────────────────────────

export const MAT_GLASS = new THREE.MeshPhysicalMaterial({
  color: 0xc8eaf8,
  transparent: true,
  opacity: 0.22,
  roughness: 0.04,
  metalness: 0,
  transmission: 0.85,
  thickness: 0.4,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const MAT_GLASS_THICK = new THREE.MeshPhysicalMaterial({
  color: 0xd0eef8,
  transparent: true,
  opacity: 0.35,
  roughness: 0.06,
  metalness: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const MAT_METAL = new THREE.MeshStandardMaterial({
  color: 0x8898aa,
  roughness: 0.35,
  metalness: 0.85,
});

export const MAT_METAL_DARK = new THREE.MeshStandardMaterial({
  color: 0x445566,
  roughness: 0.5,
  metalness: 0.7,
});

export const MAT_WOOD = new THREE.MeshStandardMaterial({
  color: 0x3e2010,
  roughness: 0.82,
  metalness: 0,
});

export const MAT_WOOD_LIGHT = new THREE.MeshStandardMaterial({
  color: 0x4a2810,
  roughness: 0.72,
  metalness: 0,
});

export const MAT_FLOOR = new THREE.MeshStandardMaterial({
  color: 0x13161f,
  roughness: 0.95,
  metalness: 0,
});

export const MAT_RUBBER = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.9,
  metalness: 0,
});

// Clear borosilicate glass — slightly more opaque so walls are legible in 3D.
export const MAT_GLASS_CLEAR = new THREE.MeshPhysicalMaterial({
  color: 0xd8eeff,
  transparent: true,
  opacity: 0.22,
  roughness: 0.03,
  metalness: 0,
  transmission: 0.85,
  thickness: 0.4,
  ior: 1.52,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// Polished chrome/stainless steel (retort stand rod)
export const MAT_CHROME = new THREE.MeshStandardMaterial({
  color: 0xd4d8dc,
  roughness: 0.12,
  metalness: 0.95,
});

// Matte cast-iron black (stand base)
export const MAT_IRON = new THREE.MeshStandardMaterial({
  color: 0x1c1c1e,
  roughness: 0.85,
  metalness: 0.1,
});

// PTFE stopcock — orange-red
export const MAT_STOPCOCK = new THREE.MeshStandardMaterial({
  color: 0xcc3300,
  roughness: 0.55,
  metalness: 0,
});

// Create a liquid material from an rgba string (reused / cloned per container).
export function makeLiquidMat(rgbaStr) {
  const { r, g, b, a } = parseRgba(rgbaStr);
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(r / 255, g / 255, b / 255),
    transparent: a < 0.99,
    opacity: Math.max(0.08, a),
    roughness: 0.08,
    metalness: 0,
    depthWrite: false,
  });
}

export const MAT_LIQUID_NEUTRAL = makeLiquidMat('rgba(214,234,246,0.55)');
