import { Box, Download, FileArchive, Package, RefreshCcw, Shuffle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type FileFormat = "stl" | "obj" | "glb" | "zip";

export function FilesPanel({
  hasModel,
  isExporting,
  onExport,
  onRegenerate,
  onRemix,
}: {
  hasModel: boolean;
  isExporting: FileFormat | null;
  onExport: (fmt: FileFormat) => void;
  onRegenerate: () => void;
  onRemix: () => void;
}) {
  const { t } = useI18n();
  const formats: { fmt: FileFormat; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
    { fmt: "stl", label: "STL", icon: Box, hint: t("files.stl_hint") },
    { fmt: "obj", label: "OBJ", icon: Package, hint: t("files.obj_hint") },
    { fmt: "glb", label: "GLB", icon: Box, hint: t("files.glb_hint") },
    { fmt: "zip", label: "Bundle", icon: FileArchive, hint: t("files.zip_hint") },
  ];

  return (
    <div className="glass rounded-2xl p-3 h-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.files")}</h3>
        <div className="flex items-center gap-1">
          <button onClick={onRegenerate} disabled={!hasModel}
            className="text-[10px] flex items-center gap-1 px-2 h-6 rounded-md border hairline hover:bg-background/40 disabled:opacity-40">
            <RefreshCcw className="size-3" /> {t("files.regen")}
          </button>
          <button onClick={onRemix} disabled={!hasModel}
            className="text-[10px] flex items-center gap-1 px-2 h-6 rounded-md border hairline hover:bg-background/40 disabled:opacity-40">
            <Shuffle className="size-3" /> {t("files.remix")}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        {formats.map(({ fmt, label, icon: Icon, hint }) => (
          <button
            key={fmt}
            onClick={() => onExport(fmt)}
            disabled={!hasModel || isExporting !== null}
            className={cn(
              "rounded-xl border hairline p-2.5 text-left transition-colors group",
              "bg-background/20 hover:bg-background/40 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className="size-4 text-foreground/70 group-hover:text-accent transition-colors" />
              <Download className={cn("size-3.5 text-muted-foreground", isExporting === fmt && "animate-pulse text-accent")} />
            </div>
            <div className="text-xs font-medium">{label}</div>
            <div className="text-[10px] text-muted-foreground">{hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
