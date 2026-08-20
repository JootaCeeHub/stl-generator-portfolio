import type { MaterialId } from "./materials";

export type ForgeSettings = {
  symmetry: boolean;
  printable: boolean;
  wallThickness: number; // mm
  meshDensity: number;   // 16..96
  smoothness: number;    // 0..1
  modularSplit: boolean;
  supportFreeOptimize: boolean;
  wearableScale: number; // 0.5..2
  sizing: "head" | "body" | "object";
  hollow: boolean;
  magneticConnectors: boolean;
  joints: boolean;
  // print
  materialId: MaterialId;
  layerHeight: number;   // mm
  infillPct: number;     // 0..100
  nozzle: number;        // mm
  printSpeed: number;    // mm/s
};

export const DEFAULT_SETTINGS: ForgeSettings = {
  symmetry: true,
  printable: true,
  wallThickness: 2.4,
  meshDensity: 48,
  smoothness: 0.6,
  modularSplit: false,
  supportFreeOptimize: true,
  wearableScale: 1,
  sizing: "object",
  hollow: false,
  magneticConnectors: false,
  joints: false,
  materialId: "pla",
  layerHeight: 0.2,
  infillPct: 20,
  nozzle: 0.4,
  printSpeed: 60,
};

export type ForgeParams = {
  form: "mask" | "helmet" | "figurine" | "prop" | "industrial" | "wearable" | "abstract";
  baseRadius: number;
  height: number;
  sharpness: number;
  organic: number;
  spikes: number;
  density: number;
  symmetry: boolean;
  modules: number;
  noiseScale: number;
  noiseAmp: number;
  seed: number;
};

export const DEFAULT_PARAMS: ForgeParams = {
  form: "abstract",
  baseRadius: 1,
  height: 1.2,
  sharpness: 0.5,
  organic: 0.5,
  spikes: 0.3,
  density: 0.5,
  symmetry: true,
  modules: 1,
  noiseScale: 2.4,
  noiseAmp: 0.25,
  seed: 1,
};

export type GenerationRecord = {
  id: string;
  createdAt: number;
  prompt: string;
  styles: string[];
  settings: ForgeSettings;
  params: ForgeParams;
  thumbnail?: string;
  conceptImage?: string;
  summary?: string;
};
