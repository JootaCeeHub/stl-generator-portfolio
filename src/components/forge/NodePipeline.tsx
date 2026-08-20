import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Stage = "idle" | "analyze" | "shape" | "mesh" | "validate" | "export" | "done";

const STEPS_KEYS: { id: Stage; key: string }[] = [
  { id: "analyze",  key: "pipe.analyze" },
  { id: "shape",    key: "pipe.shape" },
  { id: "mesh",     key: "pipe.mesh" },
  { id: "validate", key: "pipe.validate" },
  { id: "export",   key: "pipe.export" },
];

const PIPE_TR: Record<string, { es: string; en: string }> = {
  "pipe.analyze":  { es: "Análisis IA",   en: "AI Analysis" },
  "pipe.shape":    { es: "Forma",         en: "Shape Gen" },
  "pipe.mesh":     { es: "Optim. malla",  en: "Mesh Opt" },
  "pipe.validate": { es: "Validar STL",   en: "STL Validate" },
  "pipe.export":   { es: "Listo export",  en: "Export Ready" },
};

const ORDER: Stage[] = ["idle", "analyze", "shape", "mesh", "validate", "export", "done"];

export function NodePipeline({ stage }: { stage: Stage }) {
  const { t, lang } = useI18n();
  const idx = ORDER.indexOf(stage);
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.pipeline")}</span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-mono text-muted-foreground/70">{stage === "done" ? t("common.complete") : stage === "idle" ? t("common.idle") : t("common.running")}</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {STEPS_KEYS.map((s, i) => {
          const sIdx = ORDER.indexOf(s.id);
          const active = sIdx === idx;
          const done = sIdx < idx || stage === "done";
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <motion.div
                animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 h-8 rounded-lg border hairline",
                  done ? "border-accent/40 bg-accent/5 text-accent" :
                  active ? "border-accent bg-accent/10 text-accent glow-ring" :
                  "bg-background/20 text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="size-3.5" /> :
                 active ? <Loader2 className="size-3.5 animate-spin" /> :
                 <Circle className="size-3.5" />}
                <span className="text-[11px] font-mono uppercase tracking-wider">{PIPE_TR[s.key][lang]}</span>
              </motion.div>
              {i < STEPS_KEYS.length - 1 && (
                <div className={cn("w-4 h-px", done ? "bg-accent/50" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
