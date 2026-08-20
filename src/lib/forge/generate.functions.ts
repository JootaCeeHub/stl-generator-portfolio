import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  styles: z.array(z.string()).max(20).default([]),
  images: z.array(z.string()).max(6).default([]), // data URLs
  mode: z.enum(["generate", "enhance", "inspire"]).default("generate"),
});

const FORMS = ["mask", "helmet", "figurine", "prop", "industrial", "wearable", "abstract"] as const;
type FormKind = typeof FORMS[number];
const clamp = (n: unknown, lo: number, hi: number, fb: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
  if (!Number.isFinite(v)) return fb;
  return Math.min(hi, Math.max(lo, v));
};
const toBool = (v: unknown, fb: boolean) => typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : fb;
const toForm = (v: unknown): FormKind => (FORMS as readonly string[]).includes(String(v)) ? (v as FormKind) : "abstract";

function coerceParams(p: unknown) {
  const o = (p ?? {}) as Record<string, unknown>;
  return {
    form: toForm(o.form),
    baseRadius: clamp(o.baseRadius, 0.4, 2, 1),
    height: clamp(o.height, 0.4, 3, 1),
    sharpness: clamp(o.sharpness, 0, 1, 0.4),
    organic: clamp(o.organic, 0, 1, 0.5),
    spikes: clamp(o.spikes, 0, 1, 0.2),
    density: clamp(o.density, 0, 1, 0.5),
    symmetry: toBool(o.symmetry, true),
    modules: Math.round(clamp(o.modules, 1, 6, 1)),
    noiseScale: clamp(o.noiseScale, 0.5, 8, 2),
    noiseAmp: clamp(o.noiseAmp, 0, 0.6, 0.25),
    seed: typeof o.seed === "number" && Number.isFinite(o.seed) ? o.seed : Math.random() * 1000,
  };
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(body: unknown): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const generateForge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { prompt, styles, images, mode } = data;

    if (mode === "enhance" || mode === "inspire") {
      const sys = mode === "enhance"
        ? "You rewrite short user prompts into vivid, specific 3D-printable design briefs. One paragraph, max 60 words. No preamble. No quotes."
        : "You invent a single bold, specific 3D-printable design brief. One paragraph, max 60 words. No preamble.";
      const userMsg = mode === "enhance" ? prompt : "Surprise me with a wearable cyber-biomechanical concept.";
      const res = await callGateway({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false as const, error: `AI error ${res.status}: ${t.slice(0, 200)}` };
      }
      const j = await res.json() as { choices?: { message?: { content?: string } }[] };
      return { ok: true as const, text: j.choices?.[0]?.message?.content?.trim() ?? "" };
    }

    // generate: ask for params via tool calling + a short summary
    const styleHints = styles.length ? `Style mix: ${styles.join(", ")}.` : "";
    const sys = `You are AURA, an AI 3D design director. Given a user concept and style cues, produce procedural-shape parameters for a real-time mesh synth. Bias values to match the brief. Respond ONLY by calling design_params.`;
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `Concept: ${prompt}\n${styleHints}\nReturn parameters that best match this concept.` },
    ];
    for (const img of images.slice(0, 4)) {
      userContent.push({ type: "image_url", image_url: { url: img } });
    }

    const res = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userContent },
      ],
      tools: [{
        type: "function",
        function: {
          name: "design_params",
          description: "Procedural shape parameters and a one-line summary.",
          parameters: {
            type: "object",
            properties: {
              params: {
                type: "object",
                properties: {
                  form: { type: "string", enum: ["mask", "helmet", "figurine", "prop", "industrial", "wearable", "abstract"] },
                  baseRadius: { type: "number" },
                  height: { type: "number" },
                  sharpness: { type: "number" },
                  organic: { type: "number" },
                  spikes: { type: "number" },
                  density: { type: "number" },
                  symmetry: { type: "boolean" },
                  modules: { type: "integer" },
                  noiseScale: { type: "number" },
                  noiseAmp: { type: "number" },
                  seed: { type: "number" },
                },
                required: ["form", "baseRadius", "height", "sharpness", "organic", "spikes", "density", "symmetry", "modules", "noiseScale", "noiseAmp", "seed"],
                additionalProperties: false,
              },
              summary: { type: "string" },
              material: { type: "string" },
            },
            required: ["params", "summary"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "design_params" } },
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Try again in a moment." };
      if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." };
      return { ok: false as const, error: `AI error ${res.status}: ${t.slice(0, 200)}` };
    }

    const j = await res.json() as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const argsStr = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return { ok: false as const, error: "AI returned no parameters." };
    let parsed: { params: unknown; summary: string; material?: string };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return { ok: false as const, error: "AI returned malformed parameters." };
    }
    const params = coerceParams(parsed.params);
    return {
      ok: true as const,
      params,
      summary: parsed.summary ?? "",
      material: parsed.material,
    };
  });
