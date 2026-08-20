import * as THREE from "three";
import type { ForgeSettings } from "./types";
import { getMaterial } from "./materials";
import type { MeshStats } from "./stats";

export type Severity = "ok" | "warn" | "error";

export type PrintReport = {
  overhangs: { severity: Severity; pct: number };
  thinWalls: { severity: Severity; note: string };
  islands: { severity: Severity; count: number };
  volumeCm3: number;
  printedVolumeCm3: number;     // accounts for hollow + infill
  weightG: number;              // grams
  estPrintMinutes: number;
  layers: number;
  filamentMeters: number;       // FDM only
  costUSD: number;
  energyKWh: number;
  qualityScore: number;         // 0..100
  printScore: number;           // 0..100 (printability)
  material: string;
  materialNotesKey: "es" | "en";
  notes: string[];
};

export function analyzePrintability(geos: THREE.BufferGeometry[], settings: ForgeSettings, statsHint?: MeshStats): PrintReport {
  let overhangCount = 0;
  let totalFaces = 0;
  let volume = 0;
  let area = 0;
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const normal = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cr = new THREE.Vector3();
  const box = new THREE.Box3();

  for (const g of geos) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    if (g.boundingBox) box.union(g.boundingBox); else { g.computeBoundingBox(); if (g.boundingBox) box.union(g.boundingBox); }
    for (let i = 0; i < pos.count; i += 3) {
      v0.fromBufferAttribute(pos, i);
      v1.fromBufferAttribute(pos, i + 1);
      v2.fromBufferAttribute(pos, i + 2);
      tri.set(v0, v1, v2);
      tri.getNormal(normal);
      if (normal.y < -0.4) overhangCount++;
      totalFaces++;
      ab.subVectors(v1, v0); ac.subVectors(v2, v0); cr.crossVectors(ab, ac);
      area += cr.length() * 0.5;
      volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
    }
  }
  const size = new THREE.Vector3(); box.getSize(size);
  const overhangPct = totalFaces ? (overhangCount / totalFaces) * 100 : 0;
  const volCm3 = statsHint?.volumeCm3 ?? +Math.abs(volume).toFixed(2);
  const surfaceCm2 = statsHint?.surfaceAreaCm2 ?? area;

  const mat = getMaterial(settings.materialId);

  // Effective material volume: (shell from surface*wall) + (interior * infill)
  const wallCm = settings.wallThickness / 10;
  const shellVol = Math.min(volCm3, surfaceCm2 * wallCm * 0.6);
  const interior = Math.max(0, volCm3 - shellVol);
  const infill = Math.max(0, Math.min(1, settings.infillPct / 100));
  const printedVolume = settings.hollow
    ? shellVol + interior * infill * 0.5
    : shellVol + interior * (0.15 + infill * 0.85);
  const weightG = printedVolume * mat.density;

  // Time model: layers = height/layer; per layer ~ perimeter+infill, scaled by speed
  const heightCm = Math.max(size.y, 0.5);
  const layers = Math.max(1, Math.round((heightCm * 10) / Math.max(0.05, settings.layerHeight)));
  const perimeterTime = (surfaceCm2 / Math.max(20, settings.printSpeed)) * 1.1; // minutes
  const infillTime = (printedVolume * 4) / Math.max(20, settings.printSpeed) * (0.4 + infill);
  const baseTime = mat.process === "SLA" ? Math.max(15, layers * 0.06) : perimeterTime + infillTime + layers * 0.02;
  const estMinutes = Math.max(8, Math.round(baseTime + (settings.supportFreeOptimize ? 0 : 12)));

  // Filament length (1.75mm filament, area ~ 2.405 mm^2)
  const filamentMm3 = printedVolume * 1000;
  const filamentMeters = mat.process === "FDM" ? +(filamentMm3 / 2.405 / 1000).toFixed(2) : 0;

  // Cost
  const costUSD = mat.process === "SLA"
    ? +((weightG / mat.density / 1000) * (mat.pricePerL ?? 50)).toFixed(2) // L * $/L
    : +((weightG / 1000) * mat.pricePerKg).toFixed(2);

  // Energy: ~0.12 kWh/h FDM, 0.06 kWh/h SLA
  const energyKWh = +((estMinutes / 60) * (mat.process === "SLA" ? 0.06 : 0.12)).toFixed(2);

  // Quality from layer height vs nozzle
  const qualityScore = Math.round(Math.min(100, 30 + (1 - settings.layerHeight / 0.4) * 50 + (mat.process === "SLA" ? 20 : 0)));

  // Printability score
  let score = 100;
  score -= Math.min(40, overhangPct * 1.6);
  if (settings.wallThickness < 1.2) score -= 25; else if (settings.wallThickness < 2) score -= 10;
  if (geos.length > 4) score -= 10;
  if (!settings.supportFreeOptimize) score -= 5;
  score = Math.max(5, Math.round(score));

  const notes: string[] = [];
  if (settings.supportFreeOptimize) notes.push("optimized.support_free");
  else notes.push("supports.recommended");
  if (settings.hollow) notes.push("hollow.drainage");
  if (settings.infillPct < 15) notes.push("infill.low");
  if (settings.layerHeight <= 0.1) notes.push("layer.high_quality");

  return {
    overhangs: {
      severity: overhangPct > 25 ? "error" : overhangPct > 12 ? "warn" : "ok",
      pct: +overhangPct.toFixed(1),
    },
    thinWalls: {
      severity: settings.wallThickness < 1.2 ? "error" : settings.wallThickness < 2 ? "warn" : "ok",
      note: `${settings.wallThickness.toFixed(1)} mm`,
    },
    islands: {
      severity: geos.length > 4 ? "warn" : "ok",
      count: geos.length,
    },
    volumeCm3: volCm3,
    printedVolumeCm3: +printedVolume.toFixed(2),
    weightG: +weightG.toFixed(1),
    estPrintMinutes: estMinutes,
    layers,
    filamentMeters,
    costUSD,
    energyKWh,
    qualityScore,
    printScore: score,
    material: mat.name,
    materialNotesKey: "en",
    notes,
  };
}
