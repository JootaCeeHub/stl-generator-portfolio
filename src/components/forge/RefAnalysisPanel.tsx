import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Eye, Film, Box, Link2, FileText, Archive, Image as ImageIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { RefAnalysisSummary } from "@/lib/forge/refAnalysis";
import type { RefImage } from "@/components/forge/Dropzone";

const KIND_ICON: Record<RefImage["kind"], React.ComponentType<{ className?: string }>> = {
  image: ImageIcon, video: Film, mesh: Box, url: Link2, doc: FileText, archive: Archive, audio: FileText,
};

export function RefAnalysisPanel({
  refs,
  summary,
  loading,
  modePrefix,
  basePrompt,
}: {
  refs: RefImage[];
  summary: RefAnalysisSummary | null;
  loading: boolean;
  modePrefix?: string;
  basePrompt: string;
}) {
  const { t, lang } = useI18n();
  if (!refs.length) {
    return (
      <div className="glass rounded-2xl p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Eye className="size-3.5" />
        <span>{t("refpanel.empty")}</span>
      </div>
    );
  }
  const augmented = [modePrefix, summary?.promptFragment, basePrompt].filter(Boolean).join(" · ");
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-3 space-y-3"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-3.5 text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-wider">{t("refpanel.title")}</span>
        </div>
        {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </header>

      {/* Insight cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <AnimatePresence>
          {(summary?.insights ?? refs.map((r) => ({ id: r.id, name: r.name, kind: r.kind, tags: [] }))).map((i) => {
            const Icon = KIND_ICON[i.kind];
            const thumb = "thumb" in i ? i.thumb : undefined;
            return (
              <motion.div key={i.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="rounded-xl border hairline bg-background/30 overflow-hidden flex flex-col">
                <div className="aspect-video bg-background/60 relative overflow-hidden flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt={i.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="size-5 text-muted-foreground" />
                  )}
                  {"dominantHex" in i && i.dominantHex && (
                    <div className="absolute bottom-1 right-1 size-3 rounded-full border border-white/40" style={{ background: i.dominantHex }} />
                  )}
                </div>
                <div className="p-1.5 space-y-1">
                  <div className="text-[10px] truncate font-mono">{i.name}</div>
                  {"width" in i && i.width && i.height && (
                    <div className="text-[9px] text-muted-foreground font-mono">{i.width}×{i.height} · {"aspect" in i ? i.aspect : ""}</div>
                  )}
                  {"brightness" in i && i.brightness !== undefined && (
                    <div className="text-[9px] text-muted-foreground font-mono">
                      L {(i.brightness * 100).toFixed(0)}% · S {((i.saturation ?? 0) * 100).toFixed(0)}%
                    </div>
                  )}
                  {i.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {i.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent/90 font-mono">{tag.replace(/^(hue|form|kind):/, "")}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Aggregate summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <Stat label={t("refpanel.count")} value={String(summary.insights.length)} />
          <Stat label={t("refpanel.form")} value={summary.dominantForm ?? "—"} />
          <Stat label={t("refpanel.bright")} value={summary.avgBrightness !== undefined ? `${Math.round(summary.avgBrightness * 100)}%` : "—"} />
          <Stat label={t("refpanel.sat")} value={summary.avgSaturation !== undefined ? `${Math.round(summary.avgSaturation * 100)}%` : "—"} />
        </div>
      )}

      {/* Prompt augmentation preview */}
      <div className="rounded-xl border hairline bg-background/30 p-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3 text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("refpanel.augmented")}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-foreground/90">
          {modePrefix && <span className="text-accent/90">{modePrefix} </span>}
          {summary?.promptFragment && <span className="text-emerald-400/90">{summary.promptFragment} · </span>}
          <span className="text-muted-foreground">{basePrompt || (lang === "es" ? "(escribe un prompt)" : "(write a prompt)")}</span>
        </p>
        {augmented && (
          <div className="text-[9px] font-mono text-muted-foreground/70 pt-0.5">{augmented.length} {lang === "es" ? "caracteres" : "chars"}</div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border hairline bg-background/30 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-mono mt-0.5 truncate">{value}</div>
    </div>
  );
}
