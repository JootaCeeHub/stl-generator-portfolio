import { type LucideIcon, Atom, Bone, Cog, Cpu, Crown, Diamond, Dna, Drama, Flame, Hexagon, Layers, Orbit, Shield, Sparkles, Swords, Triangle, Wind } from "lucide-react";

export type StylePreset = {
  id: string;
  name: string;
  icon: LucideIcon;
  hint: string;
  bias: {
    sharpness?: number; // 0..1
    organic?: number;   // 0..1
    symmetry?: number;  // 0..1
    density?: number;   // 0..1
    spikes?: number;    // 0..1
  };
};

export const STYLE_PRESETS: StylePreset[] = [
  { id: "cyber-sigilism", name: "Cyber Sigilism", icon: Sparkles, hint: "tribal cyber lines, sharp glyphs", bias: { sharpness: 0.9, symmetry: 0.9, density: 0.7, spikes: 0.6 } },
  { id: "biomechanical", name: "Biomechanical", icon: Bone, hint: "fused flesh-and-machine", bias: { organic: 0.8, density: 0.8, spikes: 0.4 } },
  { id: "giger", name: "H.R. Giger", icon: Dna, hint: "ribbed, skeletal, dark", bias: { organic: 0.9, density: 0.9, spikes: 0.5 } },
  { id: "alien-organic", name: "Alien Organic", icon: Orbit, hint: "smooth alien forms", bias: { organic: 1, symmetry: 0.7 } },
  { id: "hard-surface", name: "Hard Surface Sci-Fi", icon: Shield, hint: "panelled, mechanical", bias: { sharpness: 1, density: 0.6 } },
  { id: "gothic-tech", name: "Gothic Tech", icon: Crown, hint: "ornate dark cathedral tech", bias: { sharpness: 0.8, density: 0.9, spikes: 0.8 } },
  { id: "parametric", name: "Parametric", icon: Hexagon, hint: "mathematical lattice", bias: { density: 0.9, symmetry: 0.9 } },
  { id: "industrial", name: "Industrial", icon: Cog, hint: "raw machined", bias: { sharpness: 0.7 } },
  { id: "tactical", name: "Tactical", icon: Swords, hint: "modular utility gear", bias: { sharpness: 0.8, density: 0.5 } },
  { id: "anime-mecha", name: "Anime Mecha", icon: Cpu, hint: "stylised armour plates", bias: { sharpness: 0.9, density: 0.7, spikes: 0.4 } },
  { id: "dark-fantasy", name: "Dark Fantasy", icon: Flame, hint: "occult horns and bone", bias: { organic: 0.6, spikes: 0.9 } },
  { id: "futuristic-fashion", name: "Futuristic Fashion", icon: Diamond, hint: "couture wearable", bias: { organic: 0.5, sharpness: 0.5, density: 0.4 } },
  { id: "techwear", name: "Techwear", icon: Wind, hint: "minimal urban tech", bias: { sharpness: 0.4, density: 0.3 } },
  { id: "post-human", name: "Post-Human", icon: Atom, hint: "augmented anatomical", bias: { organic: 0.7, density: 0.6 } },
  { id: "minimal-geometry", name: "Minimal Geometry", icon: Triangle, hint: "pure primitive forms", bias: { sharpness: 0.6, density: 0.2 } },
  { id: "symmetrical-armor", name: "Symmetrical Armor", icon: Layers, hint: "mirrored plating", bias: { sharpness: 0.7, symmetry: 1, density: 0.6 } },
  { id: "organic-exoskeleton", name: "Organic Exoskeleton", icon: Drama, hint: "ribbed carapace", bias: { organic: 0.9, density: 0.8, spikes: 0.5 } },
];

export function combineBias(ids: string[]) {
  const acc = { sharpness: 0.4, organic: 0.4, symmetry: 0.7, density: 0.5, spikes: 0.3 };
  let n = 0;
  for (const id of ids) {
    const p = STYLE_PRESETS.find((s) => s.id === id);
    if (!p) continue;
    n++;
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) {
      if (p.bias[k] != null) acc[k] = (acc[k] + (p.bias[k] as number)) / 2;
    }
  }
  return acc;
}
