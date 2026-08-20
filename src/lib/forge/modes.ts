import type { ForgeParams, ForgeSettings } from "./types";

export type ModeId = "image-to-3d" | "text-to-3d" | "ai-texturing" | "multi-view" | "animation" | "api" | "free";

/** Each mode steers params + settings post-AI to make the output specifically match the template. */
export type ModePreset = {
  id: ModeId;
  promptPrefix: string;
  /** Forced biases applied AFTER the AI returns its params. Numbers are absolute overrides. */
  params?: Partial<ForgeParams>;
  /** Settings overrides forced when this mode runs. */
  settings?: Partial<ForgeSettings>;
  /** Minimum reference images required (UX hint only). */
  requiresImages?: boolean;
};

export const MODE_PRESETS: Record<ModeId, ModePreset> = {
  "image-to-3d": {
    id: "image-to-3d",
    promptPrefix: "Convert the visual reference into a clean, watertight 3D model with crisp silhouette and balanced volumes.",
    params: { organic: 0.75, sharpness: 0.6, spikes: 0.15, modules: 1 },
    settings: { modularSplit: false, meshDensity: 64, smoothness: 0.7, hollow: false },
    requiresImages: true,
  },
  "text-to-3d": {
    id: "text-to-3d",
    promptPrefix: "Pure text-to-3D synthesis: prioritise the described silhouette, proportions and structural detail.",
    params: { sharpness: 0.55, organic: 0.5, density: 0.6, modules: 1 },
    settings: { modularSplit: false, meshDensity: 56, smoothness: 0.55 },
  },
  "ai-texturing": {
    id: "ai-texturing",
    promptPrefix: "Treat the base mesh as a texture canvas: emphasise surface relief, micro-patterns and ornate fine detail.",
    params: { sharpness: 0.85, noiseScale: 4, noiseAmp: 0.35, density: 0.8, organic: 0.4 },
    settings: { meshDensity: 88, smoothness: 0.25, modularSplit: false },
  },
  "multi-view": {
    id: "multi-view",
    promptPrefix: "Produce a coherent 3D form readable from front / side / back simultaneously; symmetry preserved across axes.",
    params: { symmetry: true, modules: 3, sharpness: 0.5 },
    settings: { symmetry: true, modularSplit: true, meshDensity: 60 },
  },
  "animation": {
    id: "animation",
    promptPrefix: "Articulated character split into rig-ready modular limbs with magnetic joints and weighted base.",
    params: { form: "figurine", modules: 5, organic: 0.7, sharpness: 0.5 },
    settings: { modularSplit: true, magneticConnectors: true, joints: true, sizing: "body", meshDensity: 64 },
  },
  "api": {
    id: "api",
    promptPrefix: "Generate parametric wearable / industrial component with tight tolerances, hex lattice and modular split for batch API export.",
    params: { form: "wearable", sharpness: 0.7, organic: 0.3, modules: 2 },
    settings: { modularSplit: true, hollow: true, magneticConnectors: true, wallThickness: 2.0, meshDensity: 72 },
  },
  "free": {
    id: "free",
    promptPrefix: "",
  },
};

export function applyModePreset(
  mode: ModeId,
  baseParams: ForgeParams,
  baseSettings: ForgeSettings,
): { params: ForgeParams; settings: ForgeSettings } {
  const preset = MODE_PRESETS[mode];
  return {
    params: { ...baseParams, ...(preset.params ?? {}) },
    settings: { ...baseSettings, ...(preset.settings ?? {}) },
  };
}

export function prefixPrompt(mode: ModeId, prompt: string): string {
  const p = MODE_PRESETS[mode];
  if (!p.promptPrefix) return prompt;
  return `[mode:${p.id}] ${p.promptPrefix}\n\n${prompt}`;
}
