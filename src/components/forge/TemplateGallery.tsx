import { motion } from "framer-motion";
import { Image as ImageIcon, Type, Brush, Layers3, PersonStanding, Code2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ModeId } from "@/lib/forge/modes";

export type Template = {
  id: string;
  mode: ModeId;
  icon: React.ComponentType<{ className?: string }>;
  title: { es: string; en: string };
  desc: { es: string; en: string };
  prompt: string;
  styles: string[];
  gradient: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "image-to-3d", mode: "image-to-3d",
    icon: ImageIcon,
    title: { es: "Imagen a 3D", en: "Image to 3D" },
    desc: { es: "Convierte arte, bocetos y fotos en modelos 3D imprimibles.", en: "Turn art, sketches and photos into printable 3D models." },
    prompt: "Stylized 3D character bust from reference image, high-fidelity surface detail, optimized for FDM print, hollow shell, support-free orientation.",
    styles: ["organic-cyber"],
    gradient: "from-orange-500/30 via-amber-700/10 to-transparent",
  },
  {
    id: "text-to-3d", mode: "text-to-3d",
    icon: Type,
    title: { es: "Texto a 3D", en: "Text to 3D" },
    desc: { es: "Genera modelos detallados a partir de descripciones de texto.", en: "Generate detailed models from rich text prompts." },
    prompt: "Anime mecha shoulder pauldron, hard-surface plates, articulated knuckles, brushed metal, cinematic silhouette.",
    styles: ["anime-mecha"],
    gradient: "from-lime-500/25 via-emerald-700/10 to-transparent",
  },
  {
    id: "ai-texturing", mode: "ai-texturing",
    icon: Brush,
    title: { es: "Texturizado IA", en: "AI Texturing" },
    desc: { es: "Refina mallas existentes con texturas PBR dirigidas por IA.", en: "Refine existing meshes with AI-driven PBR textures." },
    prompt: "Weathered ceramic battle helmet, painterly fantasy texture, ornate filigree, support-free print.",
    styles: ["giger-bio"],
    gradient: "from-emerald-500/25 via-teal-700/10 to-transparent",
  },
  {
    id: "multi-view", mode: "multi-view",
    icon: Layers3,
    title: { es: "Multi-vista", en: "Multi-view" },
    desc: { es: "Genera vistas frontal, lateral y trasera para máxima coherencia.", en: "Generate front, side, and back views for full coherence." },
    prompt: "Chibi fantasy ice monster character, symmetrical, lattice spikes, dense crystalline detail, three coordinated viewpoints.",
    styles: ["organic-cyber", "giger-bio"],
    gradient: "from-fuchsia-500/30 via-purple-700/10 to-transparent",
  },
  {
    id: "animation", mode: "animation",
    icon: PersonStanding,
    title: { es: "Rigging IA", en: "AI Rigging" },
    desc: { es: "Personajes articulados con junturas para animación.", en: "Articulated characters with joints ready for animation." },
    prompt: "Cybernetic warrior figurine, modular limbs, magnetic joints, weighted base, action-pose articulated rig.",
    styles: ["anime-mecha", "techwear"],
    gradient: "from-red-500/25 via-rose-700/10 to-transparent",
  },
  {
    id: "api", mode: "api",
    icon: Code2,
    title: { es: "Pipeline API", en: "API Pipeline" },
    desc: { es: "Integra la forja en tu propio flujo vía endpoints estables.", en: "Embed the forge into your stack via stable endpoints." },
    prompt: "Parametric techwear bracelet, hex lattice, magnetic clasp, batch-ready API export, ISO-tolerance.",
    styles: ["techwear"],
    gradient: "from-indigo-500/25 via-blue-700/10 to-transparent",
  },
];

export function TemplateGallery({ onPick }: { onPick: (tpl: Template) => void }) {
  const { lang, t } = useI18n();
  return (
    <div className="px-4 lg:px-6 py-5 border-b hairline">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">{t("gallery.eyebrow")}</div>
          <h2 className="text-lg md:text-xl tracking-tight font-medium text-aura">{t("gallery.title")}</h2>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden md:block">
          {t("gallery.hint")}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {TEMPLATES.map((tpl, i) => (
          <motion.button
            key={tpl.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onPick(tpl)}
            className="group relative text-left rounded-xl border hairline bg-background/30 hover:bg-background/60 overflow-hidden transition-colors p-3 min-h-[120px] flex flex-col gap-1.5"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tpl.gradient} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            <div className="relative flex items-center justify-between">
              <div className="size-7 rounded-lg bg-background/60 border hairline flex items-center justify-center">
                <tpl.icon className="size-3.5 text-accent" />
              </div>
              <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="relative mt-auto space-y-0.5">
              <div className="text-xs font-medium tracking-tight">{tpl.title[lang]}</div>
              <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{tpl.desc[lang]}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
