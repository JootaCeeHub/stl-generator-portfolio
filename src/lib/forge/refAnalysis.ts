import type { RefImage } from "@/components/forge/Dropzone";

export type RefInsight = {
  id: string;
  name: string;
  kind: RefImage["kind"];
  width?: number;
  height?: number;
  aspect?: number;
  brightness?: number; // 0..1
  saturation?: number; // 0..1
  dominantHex?: string;
  hue?: number;        // 0..360
  /** Inferred shape hint from aspect ratio */
  shapeHint?: "tall" | "wide" | "square";
  /** Inferred form bias (matches ForgeParams.form) */
  formHint?: "figurine" | "wearable" | "mask" | "prop" | "industrial" | "abstract";
  /** Inferred mood tags */
  tags: string[];
  thumb?: string;
};

export type RefAnalysisSummary = {
  insights: RefInsight[];
  /** Aggregated count by kind */
  counts: Record<string, number>;
  /** Aggregated tag set (deduped) */
  tags: string[];
  /** Dominant form across images, falls back to abstract */
  dominantForm?: RefInsight["formHint"];
  /** Avg brightness across images */
  avgBrightness?: number;
  /** Avg saturation across images */
  avgSaturation?: number;
  /** Prompt fragment generated from the analysis (joined with ' · ') */
  promptFragment: string;
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hueName(h: number): string {
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 165) return "green";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 290) return "violet";
  return "magenta";
}

async function analyzeImageDataUrl(dataUrl: string): Promise<{ w: number; h: number; r: number; g: number; b: number; brightness: number; saturation: number; hue: number; thumb: string } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const SZ = 32;
        const c = document.createElement("canvas");
        c.width = SZ; c.height = SZ;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SZ, SZ);
        const d = ctx.getImageData(0, 0, SZ, SZ).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3]; if (a < 16) continue;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        n = n || 1;
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
        const [hue, sat, lum] = rgbToHsl(r, g, b);
        // thumbnail (slightly bigger)
        const TSZ = 96;
        c.width = TSZ; c.height = TSZ;
        ctx.drawImage(img, 0, 0, TSZ, TSZ);
        const thumb = c.toDataURL("image/jpeg", 0.7);
        resolve({ w: img.naturalWidth, h: img.naturalHeight, r, g, b, brightness: lum, saturation: sat, hue, thumb });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function shapeFromAspect(aspect: number): RefInsight["shapeHint"] {
  if (aspect > 1.25) return "wide";
  if (aspect < 0.8) return "tall";
  return "square";
}

function formFromShapeAndKind(shape: RefInsight["shapeHint"], kind: RefImage["kind"]): RefInsight["formHint"] {
  if (kind === "mesh") return "abstract";
  if (shape === "tall") return "figurine";
  if (shape === "wide") return "wearable";
  return "prop";
}

function tagsFor(insight: Omit<RefInsight, "tags" | "id" | "name" | "kind">): string[] {
  const tags: string[] = [];
  if (insight.brightness !== undefined) {
    if (insight.brightness < 0.28) tags.push("dark");
    else if (insight.brightness > 0.72) tags.push("bright");
    else tags.push("mid-tone");
  }
  if (insight.saturation !== undefined) {
    if (insight.saturation < 0.18) tags.push("desaturated");
    else if (insight.saturation > 0.55) tags.push("vivid");
  }
  if (insight.hue !== undefined && (insight.saturation ?? 0) > 0.1) {
    tags.push(`hue:${hueName(insight.hue)}`);
  }
  if (insight.shapeHint) tags.push(insight.shapeHint);
  if (insight.formHint) tags.push(`form:${insight.formHint}`);
  return tags;
}

export async function analyzeRefs(refs: RefImage[]): Promise<RefAnalysisSummary> {
  const insights: RefInsight[] = [];
  const counts: Record<string, number> = {};
  for (const r of refs) {
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    const sample = r.kind === "image" ? r.dataUrl : r.frames?.[0] ?? r.dataUrl;
    if (sample) {
      const a = await analyzeImageDataUrl(sample);
      if (a) {
        const aspect = a.w / a.h;
        const shape = shapeFromAspect(aspect);
        const form = formFromShapeAndKind(shape, r.kind);
        const hex = `#${[a.r, a.g, a.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        const partial = { width: a.w, height: a.h, aspect: +aspect.toFixed(2), brightness: +a.brightness.toFixed(2), saturation: +a.saturation.toFixed(2), hue: Math.round(a.hue), dominantHex: hex, shapeHint: shape, formHint: form, thumb: a.thumb };
        insights.push({ id: r.id, name: r.name, kind: r.kind, ...partial, tags: tagsFor(partial) });
        continue;
      }
    }
    insights.push({ id: r.id, name: r.name, kind: r.kind, tags: [`kind:${r.kind}`] });
  }
  const imgs = insights.filter((i) => i.brightness !== undefined);
  const avgBrightness = imgs.length ? +(imgs.reduce((a, b) => a + (b.brightness ?? 0), 0) / imgs.length).toFixed(2) : undefined;
  const avgSaturation = imgs.length ? +(imgs.reduce((a, b) => a + (b.saturation ?? 0), 0) / imgs.length).toFixed(2) : undefined;
  // dominant form by majority vote
  const formCounts: Record<string, number> = {};
  for (const i of imgs) if (i.formHint) formCounts[i.formHint] = (formCounts[i.formHint] ?? 0) + 1;
  const dominantForm = (Object.entries(formCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as RefInsight["formHint"]) || undefined;
  const tagSet = new Set<string>();
  insights.forEach((i) => i.tags.forEach((t) => tagSet.add(t)));
  const tags = Array.from(tagSet);

  const frag: string[] = [];
  if (counts.image) frag.push(`${counts.image} image reference${counts.image > 1 ? "s" : ""}`);
  if (counts.video) frag.push(`${counts.video} video reference (multi-frame)`);
  if (counts.mesh) frag.push(`${counts.mesh} 3D mesh reference`);
  if (counts.url) frag.push(`${counts.url} link reference`);
  if (dominantForm) frag.push(`infer form: ${dominantForm}`);
  if (avgBrightness !== undefined) frag.push(avgBrightness < 0.35 ? "dark palette" : avgBrightness > 0.7 ? "bright palette" : "balanced tones");
  if (avgSaturation !== undefined && avgSaturation > 0.45) frag.push("vivid colour");
  const hueTag = tags.find((t) => t.startsWith("hue:"));
  if (hueTag) frag.push(`dominant ${hueTag.replace("hue:", "")} hue`);
  if (counts.image && imgs.length > 1) frag.push("treat as multi-view reference set");

  return { insights, counts, tags, dominantForm, avgBrightness, avgSaturation, promptFragment: frag.join(" · ") };
}
