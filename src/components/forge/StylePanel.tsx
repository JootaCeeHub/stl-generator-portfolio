import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/forge/styles";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StylePanel({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <aside className="glass rounded-2xl p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.styles")}</h3>
        <span className="text-[10px] font-mono text-muted-foreground/70">{selected.length}/{STYLE_PRESETS.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin -mr-1 pr-1 space-y-1">
        {STYLE_PRESETS.map((s, i) => {
          const Icon = s.icon;
          const active = selected.includes(s.id);
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.015, duration: 0.25 }}
              onClick={() => onToggle(s.id)}
              className={cn(
                "w-full text-left rounded-xl p-2 flex items-center gap-2 group",
                "border hairline transition-colors",
                active ? "border-accent/60 bg-accent/5" : "bg-background/20 hover:bg-background/40"
              )}
            >
              <div className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0",
                "bg-gradient-to-br from-foreground/10 to-foreground/[0.02] border hairline",
                active && "from-accent/20 to-accent/5 border-accent/40"
              )}>
                <Icon className={cn("size-4", active ? "text-accent" : "text-foreground/70")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-tight truncate">{s.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{s.hint}</div>
              </div>
              {active && <Check className="size-3.5 text-accent shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
