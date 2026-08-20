export type MaterialId = "pla" | "petg" | "abs" | "tpu" | "resin" | "nylon";

export type MaterialSpec = {
  id: MaterialId;
  name: string;
  density: number;        // g/cm^3
  pricePerKg: number;     // USD/kg (rough avg)
  pricePerL?: number;     // USD/L (resin)
  process: "FDM" | "SLA";
  recommendedLayer: number; // mm
  recommendedSpeed: number; // mm/s
  flexible?: boolean;
  notes: { es: string; en: string };
};

export const MATERIALS: MaterialSpec[] = [
  { id: "pla",   name: "PLA",   density: 1.24, pricePerKg: 22, process: "FDM", recommendedLayer: 0.2, recommendedSpeed: 60,
    notes: { es: "Fácil de imprimir, no resistente al calor.", en: "Easy to print, low heat resistance." } },
  { id: "petg",  name: "PETG",  density: 1.27, pricePerKg: 26, process: "FDM", recommendedLayer: 0.2, recommendedSpeed: 50,
    notes: { es: "Resistente y semi-flexible. Buen balance.", en: "Tough and semi-flexible. Great balance." } },
  { id: "abs",   name: "ABS",   density: 1.04, pricePerKg: 24, process: "FDM", recommendedLayer: 0.2, recommendedSpeed: 50,
    notes: { es: "Resistente al calor, requiere cámara cerrada.", en: "Heat resistant, needs enclosure." } },
  { id: "tpu",   name: "TPU 95A",density: 1.21, pricePerKg: 38, process: "FDM", recommendedLayer: 0.2, recommendedSpeed: 25, flexible: true,
    notes: { es: "Flexible. Ideal para juntas y wearables.", en: "Flexible. Ideal for joints and wearables." } },
  { id: "nylon", name: "Nylon", density: 1.14, pricePerKg: 55, process: "FDM", recommendedLayer: 0.2, recommendedSpeed: 40,
    notes: { es: "Alta tenacidad. Higroscópico, requiere secado.", en: "High toughness. Hygroscopic, requires drying." } },
  { id: "resin", name: "Resin SLA", density: 1.18, pricePerKg: 45, pricePerL: 55, process: "SLA", recommendedLayer: 0.05, recommendedSpeed: 0,
    notes: { es: "Detalle ultra-alto. Postcurado UV requerido.", en: "Ultra-high detail. UV postcure required." } },
];

export function getMaterial(id: MaterialId): MaterialSpec {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}
