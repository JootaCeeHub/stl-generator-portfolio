import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import JSZip from "jszip";

export function exportSTL(geometries: THREE.BufferGeometry[], binary = true): Blob {
  const group = new THREE.Group();
  geometries.forEach((g) => group.add(new THREE.Mesh(g)));
  const exporter = new STLExporter();
  const result = exporter.parse(group, { binary }) as DataView | string;
  if (binary) {
    return new Blob([(result as DataView).buffer as ArrayBuffer], { type: "model/stl" });
  }
  return new Blob([result as string], { type: "model/stl" });
}

export function exportOBJ(geometries: THREE.BufferGeometry[]): Blob {
  const group = new THREE.Group();
  geometries.forEach((g) => group.add(new THREE.Mesh(g)));
  const exporter = new OBJExporter();
  const text = exporter.parse(group);
  return new Blob([text], { type: "model/obj" });
}

export function exportGLB(geometries: THREE.BufferGeometry[]): Promise<Blob> {
  const group = new THREE.Group();
  geometries.forEach((g) => {
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc8d4dc, metalness: 0.6, roughness: 0.4 }));
    group.add(m);
  });
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(new Blob([result], { type: "model/gltf-binary" }));
        else resolve(new Blob([JSON.stringify(result)], { type: "model/gltf+json" }));
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

export async function exportZipBundle(opts: {
  name: string;
  geometries: THREE.BufferGeometry[];
  manifest: Record<string, unknown>;
}): Promise<Blob> {
  const zip = new JSZip();
  const stl = exportSTL(opts.geometries, true);
  const obj = exportOBJ(opts.geometries);
  const glb = await exportGLB(opts.geometries);
  zip.file(`${opts.name}.stl`, await stl.arrayBuffer());
  zip.file(`${opts.name}.obj`, await obj.text());
  zip.file(`${opts.name}.glb`, await glb.arrayBuffer());
  zip.file("manifest.json", JSON.stringify(opts.manifest, null, 2));
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
