import { useState } from "react";
import type { ForgeSettings } from "@/lib/forge/types";
import { MATERIALS } from "@/lib/forge/materials";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TabId = "geometry" | "print" | "wearable" | "advanced";

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: ForgeSettings;
  onChange: (s: ForgeSettings) => void;
}) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<TabId>("geometry");
  const set = <K extends keyof ForgeSettings>(k: K, v: ForgeSettings[K]) => onChange({ ...settings, [k]: v });
  const tabs: { id: TabId; label: string }[] = [
    { id: "geometry", label: t("tab.geometry") },
    { id: "print",    label: t("tab.print") },
    { id: "wearable", label: t("tab.wearable") },
    { id: "advanced", label: t("tab.advanced") },
  ];

  return (
    <aside className="glass rounded-2xl p-3 flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t("panel.generation")}</h3>
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-background/30 border hairline">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "flex-1 text-[10px] font-mono uppercase tracking-wider py-1 rounded-md transition-colors",
              tab === tb.id ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin -mr-1 pr-1 space-y-2">
        {tab === "geometry" && (
          <>
            <Toggle label={t("set.symmetry")} value={settings.symmetry} onChange={(v) => set("symmetry", v)} />
            <Toggle label={t("set.modular")} value={settings.modularSplit} onChange={(v) => set("modularSplit", v)} />
            <Toggle label={t("set.hollow")} value={settings.hollow} onChange={(v) => set("hollow", v)} />
            <Slider label={t("set.density")} value={settings.meshDensity} min={16} max={96} step={4} fmt={(v) => `${v}`} onChange={(v) => set("meshDensity", v)} />
            <Slider label={t("set.smooth")} value={settings.smoothness} min={0} max={1} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => set("smoothness", v)} />
          </>
        )}
        {tab === "print" && (
          <>
            <div className="px-2 py-1 space-y-1">
              <div className="text-xs">{t("set.material")}</div>
              <div className="grid grid-cols-3 gap-1">
                {MATERIALS.map((m) => (
                  <button key={m.id} onClick={() => set("materialId", m.id)}
                    className={cn(
                      "text-[10px] py-1.5 rounded-md border hairline transition-colors",
                      settings.materialId === m.id ? "bg-accent/15 border-accent/50 text-accent" : "bg-background/20 hover:bg-background/40"
                    )}>
                    {m.name}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground italic">
                {MATERIALS.find((m) => m.id === settings.materialId)?.notes[lang]}
              </div>
            </div>
            <Toggle label={t("set.printable")} value={settings.printable} onChange={(v) => set("printable", v)} />
            <Toggle label={t("set.support")} value={settings.supportFreeOptimize} onChange={(v) => set("supportFreeOptimize", v)} />
            <Slider label={t("set.wall")} value={settings.wallThickness} min={0.8} max={5} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => set("wallThickness", v)} />
            <Slider label={t("set.layer")} value={settings.layerHeight} min={0.05} max={0.4} step={0.01} fmt={(v) => v.toFixed(2)} onChange={(v) => set("layerHeight", v)} />
            <Slider label={t("set.infill")} value={settings.infillPct} min={0} max={100} step={5} fmt={(v) => `${v}%`} onChange={(v) => set("infillPct", v)} />
            <Slider label={t("set.nozzle")} value={settings.nozzle} min={0.2} max={1} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => set("nozzle", v)} />
            <Slider label={t("set.print_speed")} value={settings.printSpeed} min={20} max={150} step={5} fmt={(v) => `${v}`} onChange={(v) => set("printSpeed", v)} />
          </>
        )}
        {tab === "wearable" && (
          <>
            <Select
              label={t("set.sizing")}
              value={settings.sizing}
              options={[
                { v: "object", l: t("sizing.object") },
                { v: "head", l: t("sizing.head") },
                { v: "body", l: t("sizing.body") },
              ]}
              onChange={(v) => set("sizing", v as ForgeSettings["sizing"])}
            />
            <Slider label={t("set.scale")} value={settings.wearableScale} min={0.5} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set("wearableScale", v)} />
            <Toggle label={t("set.magnetic")} value={settings.magneticConnectors} onChange={(v) => set("magneticConnectors", v)} />
            <Toggle label={t("set.joints")} value={settings.joints} onChange={(v) => set("joints", v)} />
          </>
        )}
        {tab === "advanced" && (
          <div className="space-y-2 px-1 text-[11px] text-muted-foreground">
            <div className="rounded-lg border hairline bg-background/30 p-2 space-y-1">
              <div className="font-mono uppercase tracking-wider text-[10px] text-foreground">{lang === "es" ? "Resumen activo" : "Active summary"}</div>
              <Row k={t("set.material")} v={settings.materialId.toUpperCase()} />
              <Row k={t("set.layer")} v={`${settings.layerHeight.toFixed(2)} mm`} />
              <Row k={t("set.infill")} v={`${settings.infillPct}%`} />
              <Row k={t("set.wall")} v={`${settings.wallThickness.toFixed(1)} mm`} />
              <Row k={t("set.density")} v={`${settings.meshDensity}`} />
              <Row k={t("set.scale")} v={`${settings.wearableScale.toFixed(2)}×`} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span>{k}</span><span className="font-mono text-foreground">{v}</span></div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-background/40 transition-colors text-xs">
      <span>{label}</span>
      <span className={cn("relative w-7 h-4 rounded-full transition-colors", value ? "bg-accent" : "bg-foreground/15")}>
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-background transition-all", value ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="px-2 py-1 space-y-1">
      <div className="flex justify-between items-baseline text-xs">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-accent">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none bg-foreground/10 rounded-full accent-[var(--color-accent)] cursor-pointer" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="px-2 py-1 space-y-1">
      <div className="text-xs">{label}</div>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={cn("flex-1 text-[11px] py-1 rounded-md border hairline transition-colors",
              value === o.v ? "bg-accent/15 border-accent/50 text-accent" : "bg-background/20 hover:bg-background/40")}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
