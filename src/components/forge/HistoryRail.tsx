import { Trash2 } from "lucide-react";
import type { GenerationRecord } from "@/lib/forge/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function HistoryRail({
  items,
  activeId,
  onPick,
  onClear,
}: {
  items: GenerationRecord[];
  activeId: string | null;
  onPick: (item: GenerationRecord) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.history")}</h3>
        {items.length > 0 && (
          <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
            <Trash2 className="size-3" /> {t("history.clear")}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex items-stretch gap-2 h-full">
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 self-center">{t("history.empty")}</div>
          )}
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onPick(it)}
              className={cn(
                "shrink-0 w-32 rounded-xl border hairline overflow-hidden text-left flex flex-col group transition-all",
                activeId === it.id ? "border-accent/60 ring-1 ring-accent/40" : "hover:border-foreground/30"
              )}
            >
              <div className="aspect-square bg-background/40 relative">
                {it.thumbnail ? (
                  <img src={it.thumbnail} alt={it.prompt} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">model</div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent h-8" />
              </div>
              <div className="p-2 text-[10px] line-clamp-2 leading-tight">{it.prompt}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
