import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, FileArchive, History as HistoryIcon, Settings2, Sparkles, Stethoscope, X } from "lucide-react";
import * as THREE from "three";

import { PromptBar } from "@/components/forge/PromptBar";
import type { RefImage } from "@/components/forge/Dropzone";
import { StylePanel } from "@/components/forge/StylePanel";
import { SettingsPanel } from "@/components/forge/SettingsPanel";
import { NodePipeline, type Stage } from "@/components/forge/NodePipeline";
import { PrintabilityPanel } from "@/components/forge/PrintabilityPanel";
import { HistoryRail } from "@/components/forge/HistoryRail";
import { FilesPanel, type FileFormat } from "@/components/forge/FilesPanel";
import { TemplateGallery, type Template } from "@/components/forge/TemplateGallery";
import { RefAnalysisPanel } from "@/components/forge/RefAnalysisPanel";

import { applyModePreset, MODE_PRESETS, prefixPrompt, type ModeId } from "@/lib/forge/modes";
import { analyzeRefs, type RefAnalysisSummary } from "@/lib/forge/refAnalysis";

import { combineBias } from "@/lib/forge/styles";
import { DEFAULT_PARAMS, DEFAULT_SETTINGS, type ForgeParams, type ForgeSettings, type GenerationRecord } from "@/lib/forge/types";
import { buildModular } from "@/lib/forge/generator";
import { analyzePrintability, type PrintReport } from "@/lib/forge/printability";
import { computeStats, computePartStats } from "@/lib/forge/stats";
import { downloadBlob, exportGLB, exportOBJ, exportSTL, exportZipBundle } from "@/lib/forge/exporters";
import { loadHistory, pushHistory, clearHistory } from "@/lib/forge/history";
import { generateForge } from "@/lib/forge/generate.functions";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const Viewer = lazy(() => import("@/components/forge/Viewer").then((m) => ({ default: m.Viewer })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA · 3D Forge — AI STL Generator" },
      { name: "description", content: "Generate printable STL models, masks, helmets and procedural 3D designs from prompts and images. Direct-access AI workspace." },
      { property: "og:title", content: "AURA · 3D Forge" },
      { property: "og:description", content: "Generate printable realities with AI." },
    ],
  }),
  component: () => (<I18nProvider><Workspace /></I18nProvider>),
  ssr: false,
});

type BottomTab = "history" | "files" | "diag";

function Workspace() {
  const { t, lang, setLang } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<RefImage[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [settings, setSettings] = useState<ForgeSettings>(DEFAULT_SETTINGS);
  const [params, setParams] = useState<ForgeParams | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [exportingFmt, setExportingFmt] = useState<FileFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [heroOpen, setHeroOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("history");
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [importedGeoms, setImportedGeoms] = useState<THREE.BufferGeometry[] | null>(null);
  const [, setImportedName] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ModeId>("free");
  const [refSummary, setRefSummary] = useState<RefAnalysisSummary | null>(null);
  const [analyzingRefs, setAnalyzingRefs] = useState(false);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // Re-analyse references whenever they change
  useEffect(() => {
    let cancelled = false;
    if (!images.length) { setRefSummary(null); return; }
    setAnalyzingRefs(true);
    analyzeRefs(images).then((s) => { if (!cancelled) { setRefSummary(s); setAnalyzingRefs(false); } });
    return () => { cancelled = true; };
  }, [images]);

  const geometries = useMemo(() => {
    if (importedGeoms && importedGeoms.length) return importedGeoms;
    if (!params) return [];
    return buildModular(params, settings);
  }, [params, settings, importedGeoms]);

  const stats = useMemo(() => geometries.length ? computeStats(geometries) : null, [geometries]);
  const selectedStats = useMemo(() => {
    if (selectedPart === null || !geometries[selectedPart]) return null;
    return computePartStats(geometries[selectedPart]);
  }, [geometries, selectedPart]);

  const printReport: PrintReport | null = useMemo(() => {
    if (!geometries.length) return null;
    return analyzePrintability(geometries, settings, stats ?? undefined);
  }, [geometries, settings, stats]);

  // reset selection if parts shrink
  useEffect(() => {
    if (selectedPart !== null && selectedPart >= geometries.length) setSelectedPart(null);
  }, [geometries.length, selectedPart]);

  const toggleStyle = (id: string) => {
    setStyles((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const runStages = async () => {
    const seq: Stage[] = ["analyze", "shape", "mesh", "validate", "export"];
    for (const s of seq) {
      setStage(s);
      await new Promise((r) => setTimeout(r, 280));
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    setHeroOpen(false);
    setStage("analyze");

    try {
      const visionRefs: string[] = [];
      for (const r of images) {
        if (r.kind === "image" && r.dataUrl) visionRefs.push(r.dataUrl);
        else if (r.kind === "video" && r.frames?.length) visionRefs.push(...r.frames);
        else if (r.kind === "url" && r.dataUrl) visionRefs.push(r.dataUrl);
      }
      // Compose augmented prompt: [mode prefix] · [ref insights] · [user prompt]
      const refFrag = refSummary?.promptFragment ?? "";
      const composed = prefixPrompt(activeMode, refFrag ? `${refFrag}\n${prompt}` : prompt);
      const aiPromise = generateForge({
        data: { prompt: composed, styles, images: visionRefs.slice(0, 6), mode: "generate" },
      });
      const stagesPromise = runStages();
      const [res] = await Promise.all([aiPromise, stagesPromise]);

      if (!res.ok || !("params" in res) || !res.params) {
        setError(!res.ok ? res.error : "AI returned no parameters.");
        setStage("idle");
        return;
      }
      const aiParams = res.params;
      const bias = combineBias(styles);
      const blended: ForgeParams = {
        ...DEFAULT_PARAMS,
        ...aiParams,
        sharpness: clamp01((aiParams.sharpness + bias.sharpness) / 2),
        organic: clamp01((aiParams.organic + bias.organic) / 2),
        spikes: clamp01((aiParams.spikes + bias.spikes) / 2),
        density: clamp01((aiParams.density + bias.density) / 2),
        symmetry: aiParams.symmetry || bias.symmetry > 0.85,
      };
      // Apply mode preset overrides (force modular split, hollow, joints, etc per template)
      const tuned = applyModePreset(activeMode, blended, settings);
      // If ref analysis inferred a clear form, use it when mode didn't lock the form
      if (refSummary?.dominantForm && !MODE_PRESETS[activeMode].params?.form) {
        tuned.params.form = refSummary.dominantForm;
      }
      setImportedGeoms(null); setImportedName(null);
      setSettings(tuned.settings);
      setParams(tuned.params);
      setSummary(res.summary ?? null);
      setStage("done");

      const id = `gen-${Date.now()}`;
      lastIdRef.current = id;
      const record: GenerationRecord = {
        id, createdAt: Date.now(), prompt, styles, settings, params: blended,
        summary: res.summary ?? undefined,
      };
      setTimeout(() => {
        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        if (canvas) {
          try { record.thumbnail = canvas.toDataURL("image/jpeg", 0.6); } catch { /* ignore */ }
        }
        const next = pushHistory(record);
        setHistory(next);
        setActiveId(id);
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStage("idle");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, styles, images, settings, isGenerating, activeMode, refSummary]);

  const handleEnhance = async () => {
    if (!prompt.trim() || isThinking) return;
    setIsThinking(true); setError(null);
    try {
      const res = await generateForge({ data: { prompt, styles: [], images: [], mode: "enhance" } });
      if (res.ok && "text" in res && res.text) setPrompt(res.text);
      else if (!res.ok) setError(res.error);
    } finally { setIsThinking(false); }
  };

  const handleInspire = async () => {
    if (isThinking) return;
    setIsThinking(true); setError(null);
    try {
      const res = await generateForge({ data: { prompt: "inspire", styles: [], images: [], mode: "inspire" } });
      if (res.ok && "text" in res && res.text) setPrompt(res.text);
      else if (!res.ok) setError(res.error);
    } finally { setIsThinking(false); }
  };

  const handleExport = async (fmt: FileFormat) => {
    if (!geometries.length) return;
    setExportingFmt(fmt);
    try {
      const name = `aura-${Date.now()}`;
      if (fmt === "stl") downloadBlob(exportSTL(geometries, true), `${name}.stl`);
      else if (fmt === "obj") downloadBlob(exportOBJ(geometries), `${name}.obj`);
      else if (fmt === "glb") downloadBlob(await exportGLB(geometries), `${name}.glb`);
      else {
        const blob = await exportZipBundle({
          name, geometries,
          manifest: { prompt, styles, settings, params, summary, printReport, stats, generator: "AURA 3D Forge" },
        });
        downloadBlob(blob, `${name}.zip`);
      }
    } finally { setExportingFmt(null); }
  };

  const handleRegenerate = () => { if (params) setParams({ ...params, seed: Math.random() * 9999 }); };
  const handleRemix = () => { if (!summary && !prompt) return; setPrompt((p) => p ? `${p}, ${lang === "es" ? "variante remix" : "remix variant"}` : (summary ?? "")); };

  const restoreFromHistory = (item: GenerationRecord) => {
    setPrompt(item.prompt); setStyles(item.styles); setSettings(item.settings);
    setParams(item.params); setSummary(item.summary ?? null); setActiveId(item.id); setStage("done");
    setImportedGeoms(null); setImportedName(null);
  };

  const handleMeshFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setError(null); setStage("mesh");
    try {
      const [{ STLLoader }, { OBJLoader }, { PLYLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/STLLoader.js"),
        import("three/examples/jsm/loaders/OBJLoader.js"),
        import("three/examples/jsm/loaders/PLYLoader.js"),
      ]);
      const out: THREE.BufferGeometry[] = [];
      for (const f of files) {
        const ext = f.name.toLowerCase().split(".").pop() ?? "";
        const buf = await f.arrayBuffer();
        if (ext === "stl") {
          const g = new STLLoader().parse(buf);
          g.center(); g.computeVertexNormals(); g.computeBoundingBox();
          out.push(g);
        } else if (ext === "ply") {
          const g = new PLYLoader().parse(buf);
          g.center(); g.computeVertexNormals(); g.computeBoundingBox();
          out.push(g);
        } else if (ext === "obj") {
          const text = new TextDecoder().decode(buf);
          const grp = new OBJLoader().parse(text);
          grp.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh && m.geometry) {
              const g = m.geometry as THREE.BufferGeometry;
              g.computeVertexNormals(); g.computeBoundingBox();
              out.push(g);
            }
          });
        }
      }
      if (out.length) {
        // normalize scale to ~2 units
        const box = new THREE.Box3();
        out.forEach((g) => { g.computeBoundingBox(); if (g.boundingBox) box.union(g.boundingBox); });
        const size = new THREE.Vector3(); box.getSize(size);
        const max = Math.max(size.x, size.y, size.z) || 1;
        const k = 2 / max;
        out.forEach((g) => g.scale(k, k, k));
        setImportedGeoms(out);
        setImportedName(files.map((f) => f.name).join(", "));
        setSummary(`${lang === "es" ? "Malla importada" : "Imported mesh"}: ${files.map((f) => f.name).join(", ")}`);
        setStage("done");
        setSelectedPart(null);
      } else {
        setError(lang === "es" ? "No se pudo importar la malla" : "Could not import mesh");
        setStage("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mesh import failed");
      setStage("idle");
    }
  }, [lang]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b hairline">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/40 flex items-center justify-center glow-ring">
            <Sparkles className="size-3.5 text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight leading-none">AURA</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground leading-none mt-0.5">3D · Forge</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("header.tagline")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md border hairline bg-background/30">
            {(["es", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={cn(
                  "px-1.5 h-6 text-[10px] font-mono uppercase tracking-wider rounded transition-colors",
                  lang === l ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
                )}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setSettingsOpen((o) => !o)}
            className="lg:hidden h-8 w-8 rounded-lg border hairline flex items-center justify-center">
            <Settings2 className="size-4" />
          </button>
        </div>
      </header>

      {/* Hero strip */}
      <AnimatePresence>
        {heroOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 lg:px-6 py-5 flex items-end justify-between gap-4 border-b hairline">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl tracking-tight font-medium text-aura">{t("hero.title")}</h1>
                <p className="text-xs md:text-sm text-muted-foreground max-w-xl">{t("hero.subtitle")}</p>
              </div>
              <button onClick={() => setHeroOpen(false)} className="shrink-0 size-7 rounded-md hover:bg-background/40 flex items-center justify-center text-muted-foreground">
                <X className="size-3.5" />
              </button>
            </div>
            <TemplateGallery onPick={(tpl: Template) => {
              setPrompt(tpl.prompt);
              setStyles((prev) => Array.from(new Set([...prev, ...tpl.styles])));
              setActiveMode(tpl.mode);
              setSummary(`${t("gallery.loaded")}: ${tpl.title[lang]}`);
            }} />
          </motion.div>
        )}
        {!heroOpen && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setHeroOpen(true)}
            className="self-center my-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <ChevronUp className="size-3" /> {t("hero.show")}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Workspace grid */}
      <main className="flex-1 grid gap-3 p-3 lg:p-4 min-h-0"
        style={{
          gridTemplateColumns: settingsOpen ? "minmax(220px, 16rem) 1fr minmax(260px, 20rem)" : "minmax(220px, 16rem) 1fr 0px",
          gridTemplateRows: "minmax(0, 1fr) auto auto",
          gridTemplateAreas: `"styles viewer settings" "styles pipeline settings" "bottom bottom bottom"`,
        }}>
        <div style={{ gridArea: "styles" }} className="hidden md:block min-h-0">
          <StylePanel selected={styles} onToggle={toggleStyle} />
        </div>

        <div style={{ gridArea: "viewer" }} className="min-h-[320px] lg:min-h-[420px] flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="h-full glass rounded-2xl flex items-center justify-center text-xs text-muted-foreground">Initializing viewer…</div>}>
              <Viewer geometries={geometries as THREE.BufferGeometry[]} isGenerating={isGenerating} stats={stats} selectedPart={selectedPart} onSelectPart={setSelectedPart} />
            </Suspense>
          </div>
        </div>

        <div style={{ gridArea: "pipeline" }} className="space-y-3">
          <NodePipeline stage={stage} />
          {activeMode !== "free" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass text-[10px] font-mono uppercase tracking-wider">
              <Sparkles className="size-3 text-accent" />
              <span className="text-muted-foreground">{t("mode.badge")}:</span>
              <span className="text-accent">{activeMode}</span>
              <button onClick={() => setActiveMode("free")} className="ml-auto text-muted-foreground hover:text-foreground">{t("mode.clear")}</button>
            </div>
          )}
          <RefAnalysisPanel
            refs={images}
            summary={refSummary}
            loading={analyzingRefs}
            modePrefix={MODE_PRESETS[activeMode].promptPrefix}
            basePrompt={prompt}
          />
          {summary && (
            <div className="glass rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="size-3.5 mt-0.5 text-accent shrink-0" />
              <span>{summary}</span>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-xs flex items-start justify-between gap-2">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="shrink-0"><X className="size-3.5" /></button>
            </div>
          )}
          <PromptBar
            value={prompt} onChange={setPrompt}
            images={images} onImagesChange={setImages} onMeshFiles={handleMeshFiles}
            onGenerate={handleGenerate} onEnhance={handleEnhance} onInspire={handleInspire}
            isGenerating={isGenerating} isThinking={isThinking}
          />
        </div>

        <div style={{ gridArea: "settings" }} className={cn("min-h-0 flex flex-col gap-3", !settingsOpen && "lg:hidden")}>
          <div className="flex-1 min-h-0">
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
          <PrintabilityPanel report={printReport} stats={stats} settings={settings} onSettingsChange={setSettings}
            selectedPart={selectedPart} selectedStats={selectedStats} onClearSelection={() => setSelectedPart(null)} />
        </div>

        {/* Tabbed bottom panel */}
        <div style={{ gridArea: "bottom" }} className="min-h-[160px]">
          <div className="glass rounded-2xl p-3 h-full flex flex-col gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-background/30 border hairline self-start">
              <BottomTabBtn active={bottomTab === "history"} onClick={() => setBottomTab("history")} icon={HistoryIcon} label={t("common.bottom_tab.history")} />
              <BottomTabBtn active={bottomTab === "files"}   onClick={() => setBottomTab("files")}   icon={FileArchive}  label={t("common.bottom_tab.files")} />
              <BottomTabBtn active={bottomTab === "diag"}    onClick={() => setBottomTab("diag")}    icon={Stethoscope}  label={t("common.bottom_tab.diag")} />
            </div>
            <div className="flex-1 min-h-0">
              {bottomTab === "history" && (
                <HistoryRail items={history} activeId={activeId} onPick={restoreFromHistory} onClear={() => { clearHistory(); setHistory([]); }} />
              )}
              {bottomTab === "files" && (
                <FilesPanel hasModel={geometries.length > 0} isExporting={exportingFmt} onExport={handleExport} onRegenerate={handleRegenerate} onRemix={handleRemix} />
              )}
              {bottomTab === "diag" && (
                <DiagnosticsView report={printReport} stats={stats} settings={settings} />
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function BottomTabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 h-7 text-[10px] font-mono uppercase tracking-wider rounded-md transition-colors",
        active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
      )}>
      <Icon className="size-3" /> {label}
    </button>
  );
}

function DiagnosticsView({ report, stats, settings }: { report: PrintReport | null; stats: ReturnType<typeof computeStats> | null; settings: ForgeSettings }) {
  const { t, lang } = useI18n();
  if (!report || !stats) {
    return <div className="text-xs text-muted-foreground p-2">{t("common.empty")}</div>;
  }
  const items = [
    { k: t("print.score"),    v: `${report.printScore}/100` },
    { k: t("print.quality"),  v: `${report.qualityScore}/100` },
    { k: t("print.estTime"),  v: `${Math.floor(report.estPrintMinutes / 60)}h ${report.estPrintMinutes % 60}m` },
    { k: t("print.layers"),   v: `${report.layers}` },
    { k: t("print.filament"), v: report.filamentMeters > 0 ? `${report.filamentMeters} m` : "—" },
    { k: t("print.cost"),     v: `$${report.costUSD.toFixed(2)}` },
    { k: t("print.energy"),   v: `${report.energyKWh} kWh` },
    { k: t("stats.weight"),   v: `${report.weightG} g` },
    { k: t("stats.volume"),   v: `${stats.volumeCm3} cm³` },
    { k: t("stats.area"),     v: `${stats.surfaceAreaCm2} cm²` },
    { k: t("stats.size"),     v: `${stats.bbox.x}×${stats.bbox.y}×${stats.bbox.z} cm` },
    { k: t("stats.faces"),    v: stats.faces.toLocaleString() },
    { k: t("stats.verts"),    v: stats.vertices.toLocaleString() },
    { k: t("stats.parts"),    v: `${stats.parts}` },
    { k: t("print.overhangs"),v: `${report.overhangs.pct}%` },
    { k: t("print.walls"),    v: report.thinWalls.note },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 overflow-y-auto scrollbar-thin h-full pr-1">
      {items.map((it) => (
        <div key={it.k} className="rounded-lg border hairline bg-background/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.k}</div>
          <div className="text-xs font-mono text-foreground mt-0.5">{it.v}</div>
        </div>
      ))}
      <div className="col-span-full text-[10px] text-muted-foreground italic px-1 pt-1">
        {lang === "es"
          ? `Material: ${report.material} · Pared ${settings.wallThickness.toFixed(1)} mm · Capa ${settings.layerHeight.toFixed(2)} mm · Relleno ${settings.infillPct}%`
          : `Material: ${report.material} · Wall ${settings.wallThickness.toFixed(1)} mm · Layer ${settings.layerHeight.toFixed(2)} mm · Infill ${settings.infillPct}%`}
      </div>
    </div>
  );
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
