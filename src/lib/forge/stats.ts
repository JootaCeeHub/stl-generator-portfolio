import * as THREE from "three";

export type MeshStats = {
  vertices: number;
  faces: number;
  parts: number;
  surfaceAreaCm2: number;
  volumeCm3: number;
  bbox: { x: number; y: number; z: number }; // cm
  centroid: { x: number; y: number; z: number };
};

export function computePartStats(g: THREE.BufferGeometry): MeshStats {
  return computeStats([g]);
}

export function computeStats(geos: THREE.BufferGeometry[]): MeshStats {
  let verts = 0, faces = 0, area = 0, volume = 0;
  const box = new THREE.Box3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cross = new THREE.Vector3();
  for (const g of geos) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    verts += pos.count;
    faces += pos.count / 3;
    if (g.boundingBox) box.union(g.boundingBox);
    else { g.computeBoundingBox(); if (g.boundingBox) box.union(g.boundingBox); }
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      ab.subVectors(b, a); ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      area += cross.length() * 0.5;
      // signed tetra volume
      volume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
    }
  }
  const size = new THREE.Vector3(); box.getSize(size);
  const ctr = new THREE.Vector3(); box.getCenter(ctr);
  return {
    vertices: verts,
    faces: Math.round(faces),
    parts: geos.length,
    surfaceAreaCm2: +area.toFixed(2),
    volumeCm3: +Math.abs(volume).toFixed(2),
    bbox: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
    centroid: { x: +ctr.x.toFixed(2), y: +ctr.y.toFixed(2), z: +ctr.z.toFixed(2) },
  };
}
