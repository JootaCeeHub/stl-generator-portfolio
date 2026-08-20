import * as THREE from "three";
import type { ForgeParams, ForgeSettings } from "./types";

// Simple seeded RNG (mulberry32)
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap 3D value noise
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function smoothstep(t: number) { return t * t * (3 - 2 * t); }
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smoothstep(xf), v = smoothstep(yf), w = smoothstep(zf);
  const c000 = hash(xi, yi, zi);
  const c100 = hash(xi + 1, yi, zi);
  const c010 = hash(xi, yi + 1, zi);
  const c110 = hash(xi + 1, yi + 1, zi);
  const c001 = hash(xi, yi, zi + 1);
  const c101 = hash(xi + 1, yi, zi + 1);
  const c011 = hash(xi, yi + 1, zi + 1);
  const c111 = hash(xi + 1, yi + 1, zi + 1);
  const x00 = c000 * (1 - u) + c100 * u;
  const x10 = c010 * (1 - u) + c110 * u;
  const x01 = c001 * (1 - u) + c101 * u;
  const x11 = c011 * (1 - u) + c111 * u;
  const y0 = x00 * (1 - v) + x10 * v;
  const y1 = x01 * (1 - v) + x11 * v;
  return y0 * (1 - w) + y1 * w;
}

function fbm(x: number, y: number, z: number, oct = 4) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * noise3(x * f, y * f, z * f);
    norm += a;
    a *= 0.5; f *= 2;
  }
  return sum / norm;
}

export function buildGeometry(params: ForgeParams, settings: ForgeSettings): THREE.BufferGeometry {
  const seg = Math.max(24, Math.min(160, Math.round(settings.meshDensity * 1.6)));
  const r = params.baseRadius;
  const rand = rng(Math.floor(params.seed * 9999) + 1);

  // Choose base shape per form
  let geo: THREE.BufferGeometry;
  switch (params.form) {
    case "mask":
    case "helmet":
      geo = new THREE.SphereGeometry(r, seg, Math.max(16, seg / 2), 0, Math.PI * 2, 0, Math.PI * 0.78);
      break;
    case "wearable":
      geo = new THREE.TorusGeometry(r, r * 0.35, Math.max(24, seg / 2), seg);
      break;
    case "figurine":
      geo = new THREE.CapsuleGeometry(r * 0.8, params.height * r, Math.max(8, seg / 4), seg);
      break;
    case "industrial":
      geo = new THREE.CylinderGeometry(r, r * 1.05, params.height * r * 1.4, seg, Math.max(4, seg / 8));
      break;
    case "prop":
      geo = new THREE.IcosahedronGeometry(r, Math.max(2, Math.round(settings.meshDensity / 18)));
      break;
    case "abstract":
    default:
      geo = new THREE.IcosahedronGeometry(r, Math.max(3, Math.round(settings.meshDensity / 14)));
      break;
  }

  geo = geo.toNonIndexed();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const nScale = params.noiseScale;
  const amp = params.noiseAmp * (0.4 + params.organic * 0.9);
  const sharp = params.sharpness;
  const spikeProb = params.spikes * 0.18;
  const spikeStrength = 0.35 + params.spikes * 0.7;
  const dens = 0.4 + params.density * 1.6;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length() || 1;
    const dir = v.clone().multiplyScalar(1 / len);

    // Symmetry: mirror across X by sampling absolute X
    const sx = settings.symmetry ? Math.abs(dir.x) : dir.x;
    let n = fbm(sx * nScale * dens + 11, dir.y * nScale * dens, dir.z * nScale * dens, 4);
    // ridges for sharpness
    const ridge = 1 - Math.abs(2 * n - 1);
    n = THREE.MathUtils.lerp(n, ridge, sharp);

    let displacement = (n - 0.5) * amp;

    // Random spikes
    if (rand() < spikeProb) {
      displacement += spikeStrength * (0.5 + rand() * 0.5);
    }

    // Wearable scale + smoothness damping
    displacement *= 1 - settings.smoothness * 0.4;

    const newLen = len + displacement * r;
    v.copy(dir).multiplyScalar(newLen);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  // Apply wearable scale + sizing
  const sizingScale = settings.sizing === "head" ? 1.2 : settings.sizing === "body" ? 2.2 : 1;
  geo.scale(settings.wearableScale * sizingScale, settings.wearableScale * sizingScale, settings.wearableScale * sizingScale);

  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function buildModular(params: ForgeParams, settings: ForgeSettings): THREE.BufferGeometry[] {
  if (!settings.modularSplit || params.modules <= 1) return [buildGeometry(params, settings)];
  const parts: THREE.BufferGeometry[] = [];
  const count = Math.min(6, Math.max(2, params.modules));
  for (let i = 0; i < count; i++) {
    const p: ForgeParams = { ...params, seed: params.seed + i * 13.37, baseRadius: params.baseRadius * (0.6 + (i % 2) * 0.3) };
    const g = buildGeometry(p, settings);
    g.translate((i - (count - 1) / 2) * params.baseRadius * 1.4, 0, 0);
    parts.push(g);
  }
  return parts;
}
