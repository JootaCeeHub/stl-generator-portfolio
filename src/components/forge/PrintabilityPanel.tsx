import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Coins, Crosshair, Gauge, Layers3, Ruler, Triangle, Weight, XCircle, Zap } from "lucide-react";
import type { PrintReport } from "@/lib/forge/printability";
import type { MeshStats } from "@/lib/forge/stats";
import type { ForgeSettings } from "@/lib/forge/types";
import { getMaterial, MATERIALS } from "@/lib/forge/materials";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TabId = "analysis" | "material" | "cost" | "stats" | "selection";

export function PrintabilityPanel({
  report,
  stats,
  settings,
  onSettingsChange,
  selectedPart,
  selectedStats,
  onClearSelection,
}: {
  report: PrintReport | null;
  stats: MeshStats | null;
  settings: ForgeSettings;
  onSettingsChange?: (s: ForgeSettings) => void;
  selectedPart?: number | null;
  selectedStats?: MeshStats | null;
  onClearSelection?: () => void;
}) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<TabId>("analysis");

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "analysis",  label: t("panel.analysis"), icon: Gauge },
    { id: "material",  label: t("panel.material"), icon: Layers3 },
    { id: "cost",      label: t("panel.cost"),     icon: Coins },
    { id: "stats",     label: t("panel.stats"),    icon: Triangle },
    { id: "selection", label: lang === "es" ? "Sel." : "Sel.", icon: Crosshair },
  ];

  const update = (patch: Partial<ForgeSettings>) => onSettingsChange?.({ ...settings, ...patch });

  return (
    <div className="glass rounded-2xl p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.printability")}</h3>
        {report && (
          <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
            report.printScore >= 80 ? "text-emerald-400 bg-emerald-500/10" :
            report.printScore >= 55 ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"
          )}>
            {report.printScore}/100
          </span>
        )}
      </div>

      <div className="flex gap-0.5 p-1 rounded-lg bg-background/30 border hairline">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider py-1 rounded-md transition-colors relative",
              tab === tb.id ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
            )}>
            <tb.icon className="size-3" />
            <span className="hidden 2xl:inline">{tb.label}</span>
            {tb.id === "selection" && selectedPart !== null && selectedPart !== undefined && (
              <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      {!report ? (
        <p className="text-xs text-muted-foreground px-1 py-2">{t("common.empty")}</p>
      ) : (
        <div className="space-y-1.5">
          {tab === "analysis" && (
            <>
              <ScoreBar score={report.printScore} />
              <Row severity={report.overhangs.severity} label={t("print.overhangs")} detail={`${report.overhangs.pct}% ${t("print.faces")}`} />
              <Row severity={report.thinWalls.severity} label={t("print.walls")} detail={report.thinWalls.note} />
              <Row severity={report.islands.severity} label={t("print.islands")} detail={`${report.islands.count}`} />
              <Stat icon={Clock} label={t("print.estTime")} value={`${Math.floor(report.estPrintMinutes / 60)}h ${report.estPrintMinutes % 60}m`} />
              <Stat icon={Layers3} label={t("print.layers")} value={`${report.layers}`} />
              <Stat icon={Gauge} label={t("print.quality")} value={`${report.qualityScore}/100`} />

              {onSettingsChange && (
                <div className="mt-2 pt-2 border-t hairline space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1">
                    {lang === "es" ? "Ajuste en vivo" : "Live tuning"}
                  </div>
                  <LiveSlider label={t("set.layer")} value={settings.layerHeight} min={0.05} max={0.4} step={0.01} suffix=" mm"
                    onChange={(v) => update({ layerHeight: +v.toFixed(2) })} />
                  <LiveSlider label={t("set.infill")} value={settings.infillPct} min={0} max={100} step={5} suffix="%"
                    onChange={(v) => update({ infillPct: Math.round(v) })} />
                  <LiveSlider label={t("set.wall")} value={settings.wallThickness} min={0.4} max={5} step={0.1} suffix=" mm"
                    onChange={(v) => update({ wallThickness: +v.toFixed(1) })} />
                  <LiveSlider label={t("set.print_speed")} value={settings.printSpeed} min={20} max={150} step={5} suffix=" mm/s"
                    onChange={(v) => update({ printSpeed: Math.round(v) })} />
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono pt-1">
                    <Mini label={lang === "es" ? "Capas" : "Layers"} v={`${report.layers}`} />
                    <Mini label={t("print.cost")} v={`$${report.costUSD.toFixed(2)}`} accent />
                    <Mini label={lang === "es" ? "Tiempo" : "Time"} v={`${Math.floor(report.estPrintMinutes/60)}h${report.estPrintMinutes%60}m`} />
                  </div>
                </div>
              )}

              <div className="pt-1 space-y-0.5">
                {report.notes.map((n, i) => <NoteLine key={i} k={n} lang={lang} />)}
              </div>
            </>
          )}

          {tab === "material" && (
            <MaterialTab settings={settings} report={report} lang={lang} onSettingsChange={onSettingsChange} />
          )}

          {tab === "cost" && (
            <>
              <Stat icon={Weight} label={lang === "es" ? "Peso impreso" : "Printed weight"} value={`${report.weightG} g`} accent />
              <Stat icon={Coins} label={t("print.cost")} value={`$${report.costUSD.toFixed(2)}`} accent />
              <Stat icon={Layers3} label={lang === "es" ? "Vol. impreso" : "Printed vol."} value={`${report.printedVolumeCm3} cm³`} />
              <Stat icon={Ruler} label={t("print.filament")} value={report.filamentMeters > 0 ? `${report.filamentMeters} m` : "—"} />
              <Stat icon={Zap} label={t("print.energy")} value={`${report.energyKWh} kWh`} />
              {onSettingsChange && (
                <div className="mt-2 pt-2 border-t hairline space-y-2">
                  <LiveSlider label={t("set.infill")} value={settings.infillPct} min={0} max={100} step={5} suffix="%"
                    onChange={(v) => update({ infillPct: Math.round(v) })} />
                  <LiveSlider label={t("set.wall")} value={settings.wallThickness} min={0.4} max={5} step={0.1} suffix=" mm"
                    onChange={(v) => update({ wallThickness: +v.toFixed(1) })} />
                </div>
              )}
              <div className="text-[10px] text-muted-foreground/80 px-2 pt-1">
                {lang === "es"
                  ? `Estimación basada en ${settings.infillPct}% de relleno y pared ${settings.wallThickness.toFixed(1)} mm.`
                  : `Estimate based on ${settings.infillPct}% infill and ${settings.wallThickness.toFixed(1)} mm wall.`}
              </div>
            </>
          )}

          {tab === "stats" && stats && (
            <>
              <Stat icon={Triangle} label={t("stats.verts")} value={stats.vertices.toLocaleString()} />
              <Stat icon={Triangle} label={t("stats.faces")} value={stats.faces.toLocaleString()} />
              <Stat icon={Layers3} label={t("stats.parts")} value={`${stats.parts}`} />
              <Stat icon={Ruler} label={t("stats.size")} value={`${stats.bbox.x}×${stats.bbox.y}×${stats.bbox.z} cm`} />
              <Stat icon={Layers3} label={t("stats.area")} value={`${stats.surfaceAreaCm2} cm²`} />
              <Stat icon={Layers3} label={t("stats.volume")} value={`${stats.volumeCm3} cm³`} />
              <Stat icon={Weight} label={t("stats.weight")} value={`${report.weightG} g`} />
            </>
          )}

          {tab === "selection" && (
            <SelectionTab selectedPart={selectedPart ?? null} selectedStats={selectedStats ?? null} totalStats={stats} onClearSelection={onClearSelection} lang={lang} />
          )}
        </div>
      )}
    </div>
  );
}

function SelectionTab({ selectedPart, selectedStats, totalStats, onClearSelection, lang }: { selectedPart: number | null; selectedStats: MeshStats | null; totalStats: MeshStats | null; onClearSelection?: () => void; lang: "es" | "en" }) {
  if (selectedPart === null || !selectedStats) {
    return (
      <div className="text-[11px] text-muted-foreground p-2 leading-relaxed">
        {lang === "es"
          ? "Haz clic en una parte del modelo en el visor 3D para inspeccionar sus métricas individuales."
          : "Click a part of the model in the 3D viewer to inspect its individual metrics."}
      </div>
    );
  }
  const pctVol = totalStats?.volumeCm3 ? (selectedStats.volumeCm3 / totalStats.volumeCm3) * 100 : 0;
  const pctArea = totalStats?.surfaceAreaCm2 ? (selectedStats.surfaceAreaCm2 / totalStats.surfaceAreaCm2) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-2">
        <div className="text-xs">
          <span className="text-accent font-mono">PART #{selectedPart + 1}</span>
          <span className="text-muted-foreground"> / {totalStats?.parts ?? "—"}</span>
        </div>
        <button onClick={onClearSelection} className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
          {lang === "es" ? "Limpiar" : "Clear"}
        </button>
      </div>
      <Stat icon={Triangle} label="Verts" value={selectedStats.vertices.toLocaleString()} />
      <Stat icon={Triangle} label="Faces" value={selectedStats.faces.toLocaleString()} />
      <Stat icon={Layers3} label={lang === "es" ? "Volumen" : "Volume"} value={`${selectedStats.volumeCm3} cm³ · ${pctVol.toFixed(1)}%`} accent />
      <Stat icon={Layers3} label={lang === "es" ? "Área" : "Area"} value={`${selectedStats.surfaceAreaCm2} cm² · ${pctArea.toFixed(1)}%`} />
      <Stat icon={Ruler} label={lang === "es" ? "Tamaño" : "Bounds"} value={`${selectedStats.bbox.x}×${selectedStats.bbox.y}×${selectedStats.bbox.z}`} />
      <Stat icon={Crosshair} label={lang === "es" ? "Centro" : "Center"} value={`${selectedStats.centroid.x}, ${selectedStats.centroid.y}, ${selectedStats.centroid.z}`} />
    </div>
  );
}

function MaterialTab({ settings, report, lang, onSettingsChange }: { settings: ForgeSettings; report: PrintReport; lang: "es" | "en"; onSettingsChange?: (s: ForgeSettings) => void }) {
  const m = getMaterial(settings.materialId);
  return (
    <div className="space-y-1.5">
      {onSettingsChange && (
        <div className="grid grid-cols-3 gap-1">
          {MATERIALS.map((mat) => (
            <button key={mat.id} onClick={() => onSettingsChange({ ...settings, materialId: mat.id })}
              className={cn(
                "rounded-md border px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
                settings.materialId === mat.id ? "border-accent/50 bg-accent/15 text-accent" : "hairline text-muted-foreground hover:text-foreground"
              )}>
              {mat.name}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-accent">{m.name}</div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{m.process}</span>
        </div>
        <div className="text-[10px] text-muted-foreground italic">{m.notes[lang]}</div>
      </div>
      <Stat label={lang === "es" ? "Densidad" : "Density"} value={`${m.density.toFixed(2)} g/cm³`} />
      <Stat label={lang === "es" ? "Precio" : "Price"} value={m.process === "SLA" ? `$${m.pricePerL}/L` : `$${m.pricePerKg}/kg`} />
      <Stat label={lang === "es" ? "Capa rec." : "Rec. layer"} value={`${m.recommendedLayer.toFixed(2)} mm`} />
      {m.process === "FDM" && (
        <Stat label={lang === "es" ? "Velocidad rec." : "Rec. speed"} value={`${m.recommendedSpeed} mm/s`} />
      )}
      <Stat label={lang === "es" ? "Flexible" : "Flexible"} value={m.flexible ? (lang === "es" ? "Sí" : "Yes") : "—"} />
      <div className="text-[10px] text-muted-foreground/80 px-2 pt-1">
        {report.weightG} g · ${report.costUSD.toFixed(2)}
      </div>
    </div>
  );
}

function LiveSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
        <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-foreground tabular-nums">{value}{suffix ?? ""}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Mini({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-md bg-background/40 border hairline px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className={cn("tabular-nums truncate", accent ? "text-accent" : "text-foreground")}>{v}</div>
    </div>
  );
}

function NoteLine({ k, lang }: { k: string; lang: "es" | "en" }) {
  const map: Record<string, { es: string; en: string }> = {
    "optimized.support_free": { es: "Optimizado para impresión sin soportes.", en: "Optimized for support-free printing." },
    "supports.recommended":   { es: "Se recomiendan soportes para los voladizos.", en: "Supports recommended for overhangs." },
    "hollow.drainage":        { es: "Hueco — añade orificios de drenaje.", en: "Hollow — add drainage holes." },
    "infill.low":             { es: "Relleno bajo — frágil ante impacto.", en: "Low infill — fragile under impact." },
    "layer.high_quality":     { es: "Capa fina — calidad cinematográfica.", en: "Fine layer — cinematic quality." },
  };
  const text = map[k]?.[lang] ?? k;
  return <div className="text-[10px] text-muted-foreground px-2">· {text}</div>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="px-2 py-1.5">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
        <span className="text-muted-foreground">Print score</span>
        <span className="text-foreground">{score}/100</span>
      </div>
      <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-background/30 text-xs">
      <span className="flex items-center gap-1.5">{Icon && <Icon className="size-3.5 text-accent" />}{label}</span>
      <span className={cn("font-mono text-[11px] truncate ml-2", accent ? "text-accent" : "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function Row({ severity, label, detail }: { severity: "ok" | "warn" | "error"; label: string; detail: string }) {
  const color = severity === "ok" ? "text-emerald-400" : severity === "warn" ? "text-amber-400" : "text-red-400";
  const Icon = severity === "ok" ? CheckCircle2 : severity === "warn" ? AlertTriangle : XCircle;
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-background/30 text-xs">
      <span className="flex items-center gap-1.5"><Icon className={cn("size-3.5", color)} />{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{detail}</span>
    </div>
  );
}
