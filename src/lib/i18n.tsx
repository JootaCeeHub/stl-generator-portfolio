import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

type Dict = Record<string, { es: string; en: string }>;

const DICT: Dict = {
  // header
  "header.tagline":      { es: "Espacio directo · sin login", en: "Direct workspace · no login" },
  "header.lang":         { es: "Idioma", en: "Language" },
  // hero
  "hero.title":          { es: "Genera realidades imprimibles con IA.", en: "Generate printable realities with AI." },
  "hero.subtitle":       { es: "Crea modelos STL futuristas, máscaras, arte vestible y diseños 3D procedurales desde prompts e imágenes.", en: "Create futuristic STL models, masks, wearable art and procedural 3D designs from prompts and images." },
  "hero.show":           { es: "mostrar intro", en: "show intro" },
  "gallery.eyebrow":     { es: "Modos de creación", en: "Creation modes" },
  "gallery.title":       { es: "Elige un punto de partida", en: "Pick a starting point" },
  "gallery.hint":        { es: "Clic para cargar el prompt y forjar", en: "Click to load the prompt and forge" },
  "gallery.loaded":      { es: "Plantilla cargada", en: "Template loaded" },
  "mode.badge":          { es: "Modo activo", en: "Active mode" },
  "mode.clear":          { es: "Modo libre", en: "Free mode" },
  "refpanel.title":      { es: "Análisis de referencias", en: "Reference analysis" },
  "refpanel.empty":      { es: "Suelta imágenes, vídeos, mallas o enlaces para analizarlos antes de forjar.", en: "Drop images, videos, meshes or links to analyse them before forging." },
  "refpanel.count":      { es: "Refs", en: "Refs" },
  "refpanel.form":       { es: "Forma inferida", en: "Inferred form" },
  "refpanel.bright":     { es: "Brillo medio", en: "Avg brightness" },
  "refpanel.sat":        { es: "Saturación", en: "Saturation" },
  "refpanel.augmented":  { es: "Prompt aumentado antes de forjar", en: "Augmented prompt before forging" },
  // panels
  "panel.styles":        { es: "Estilos", en: "Styles" },
  "panel.generation":    { es: "Generación", en: "Generation" },
  "panel.printability":  { es: "Imprimibilidad", en: "Printability" },
  "panel.history":       { es: "Historial de sesión", en: "Session History" },
  "panel.files":         { es: "Archivos", en: "Files" },
  "panel.pipeline":      { es: "Pipeline", en: "Pipeline" },
  "panel.stats":         { es: "Estadísticas", en: "Statistics" },
  "panel.material":      { es: "Material", en: "Material" },
  "panel.cost":          { es: "Coste", en: "Cost" },
  "panel.diagnostics":   { es: "Diagnóstico", en: "Diagnostics" },
  "panel.analysis":      { es: "Análisis", en: "Analysis" },
  // tabs settings
  "tab.geometry":        { es: "Geometría", en: "Geometry" },
  "tab.print":           { es: "Impresión", en: "Print" },
  "tab.wearable":        { es: "Wearable", en: "Wearable" },
  "tab.advanced":        { es: "Avanzado", en: "Advanced" },
  // settings
  "set.symmetry":        { es: "Simetría", en: "Symmetry" },
  "set.modular":         { es: "División modular", en: "Modular split" },
  "set.hollow":          { es: "Cáscara hueca", en: "Hollow shell" },
  "set.density":         { es: "Densidad de malla", en: "Mesh density" },
  "set.smooth":          { es: "Suavizado", en: "Smoothness" },
  "set.printable":       { es: "Modo imprimible", en: "Printable mode" },
  "set.support":         { es: "Optimizar sin soportes", en: "Support-free optimize" },
  "set.wall":            { es: "Espesor de pared (mm)", en: "Wall thickness (mm)" },
  "set.sizing":          { es: "Tamaño", en: "Sizing" },
  "set.scale":           { es: "Escala wearable", en: "Wearable scale" },
  "set.magnetic":        { es: "Conectores magnéticos", en: "Magnetic connectors" },
  "set.joints":          { es: "Generación de articulaciones", en: "Joint generation" },
  "set.layer":           { es: "Altura de capa (mm)", en: "Layer height (mm)" },
  "set.infill":          { es: "Relleno (%)", en: "Infill (%)" },
  "set.nozzle":          { es: "Boquilla (mm)", en: "Nozzle (mm)" },
  "set.material":        { es: "Material", en: "Material" },
  "set.print_speed":     { es: "Velocidad (mm/s)", en: "Speed (mm/s)" },
  // sizing options
  "sizing.object":       { es: "Objeto", en: "Object" },
  "sizing.head":         { es: "Cabeza", en: "Head" },
  "sizing.body":         { es: "Cuerpo", en: "Body" },
  // viewer
  "viewer.solid":        { es: "Sólido", en: "Solid" },
  "viewer.wire":         { es: "Wire", en: "Wire" },
  "viewer.xray":         { es: "Rayos X", en: "X-ray" },
  "viewer.matte":        { es: "Mate", en: "Matte" },
  "viewer.chrome":       { es: "Cromo", en: "Chrome" },
  "viewer.glass":        { es: "Vidrio", en: "Glass" },
  "viewer.explode":      { es: "Explotar", en: "Explode" },
  "viewer.rotate":       { es: "Auto rotar", en: "Auto-rotate" },
  "viewer.synth":        { es: "Sintetizando…", en: "Synthesizing…" },
  "viewer.concept":      { es: "Concepto", en: "Concept" },
  // stats
  "stats.verts":         { es: "Vértices", en: "Vertices" },
  "stats.faces":         { es: "Caras", en: "Faces" },
  "stats.area":          { es: "Área", en: "Surface area" },
  "stats.volume":        { es: "Volumen", en: "Volume" },
  "stats.size":          { es: "Tamaño", en: "Bounding box" },
  "stats.parts":         { es: "Partes", en: "Parts" },
  "stats.weight":        { es: "Peso est.", en: "Est. weight" },
  // print analysis
  "print.overhangs":     { es: "Voladizos", en: "Overhangs" },
  "print.walls":         { es: "Paredes", en: "Walls" },
  "print.islands":       { es: "Islas", en: "Islands" },
  "print.material":      { es: "Material", en: "Material" },
  "print.estTime":       { es: "Tiempo est.", en: "Est. time" },
  "print.layers":        { es: "Capas", en: "Layers" },
  "print.filament":      { es: "Filamento", en: "Filament" },
  "print.cost":          { es: "Coste estimado", en: "Estimated cost" },
  "print.energy":        { es: "Energía", en: "Energy" },
  "print.quality":       { es: "Calidad", en: "Quality" },
  "print.score":         { es: "Puntuación", en: "Printability score" },
  "print.faces":         { es: "% de caras", en: "% of faces" },
  // severity
  "sev.ok":              { es: "Óptimo", en: "Optimal" },
  "sev.warn":            { es: "Atención", en: "Caution" },
  "sev.error":           { es: "Crítico", en: "Critical" },
  // prompt
  "prompt.enhance":      { es: "Mejorar", en: "Enhance" },
  "prompt.inspire":      { es: "Inspirar", en: "Inspire" },
  "prompt.voice":        { es: "Voz", en: "Voice" },
  "prompt.stop":         { es: "Detener", en: "Stop" },
  "prompt.generate":     { es: "Generar", en: "Generate" },
  "prompt.forging":      { es: "Forjando", en: "Forging" },
  "prompt.refs":         { es: "PNG · JPG · bocetos · referencias", en: "PNG · JPG · sketches · references" },
  "prompt.drop":         { es: "Imagen", en: "Image" },
  // referencias
  "ref.hint":            { es: "Imágenes · vídeo · carpeta · STL/OBJ · enlace · PDF · ZIP", en: "Images · video · folder · STL/OBJ · link · PDF · ZIP" },
  "ref.folder":          { es: "Carpeta de imágenes", en: "Image folder" },
  "ref.video":           { es: "Vídeo (extrae frames)", en: "Video (frame extract)" },
  "ref.mesh":            { es: "Malla 3D (STL/OBJ/GLB)", en: "3D mesh (STL/OBJ/GLB)" },
  "ref.url":             { es: "Pegar enlace", en: "Paste link" },
  "ref.url_placeholder": { es: "https://… enlace o imagen", en: "https://… link or image" },
  "ref.add":             { es: "Añadir", en: "Add" },
  "ref.processing":      { es: "Procesando referencias…", en: "Processing references…" },
  "ref.imported":        { es: "Malla importada", en: "Mesh imported" },
  "ref.import_failed":   { es: "No se pudo importar la malla", en: "Could not import mesh" },
  // files
  "files.regen":         { es: "Regen", en: "Regen" },
  "files.remix":         { es: "Remix", en: "Remix" },
  "files.stl_hint":      { es: "malla binaria · slicer", en: "binary mesh · slicer ready" },
  "files.obj_hint":      { es: "geometría wavefront", en: "wavefront geometry" },
  "files.glb_hint":      { es: "render / web preview", en: "renderer / web preview" },
  "files.zip_hint":      { es: "todos + manifest", en: "all formats + manifest" },
  // history
  "history.empty":       { es: "Sin modelos aún — tus generaciones se acumularán aquí.", en: "No models yet — your generations will collect here." },
  "history.clear":       { es: "Limpiar", en: "Clear" },
  // common
  "common.complete":     { es: "completo", en: "complete" },
  "common.idle":         { es: "inactivo", en: "idle" },
  "common.running":      { es: "en curso", en: "running" },
  "common.empty":        { es: "Genera un modelo para ver el análisis.", en: "Generate a model to see analysis." },
  "common.notes":        { es: "Notas", en: "Notes" },
  "common.bottom_tab.history":   { es: "Historial", en: "History" },
  "common.bottom_tab.files":     { es: "Archivos", en: "Files" },
  "common.bottom_tab.diag":      { es: "Diagnóstico", en: "Diagnostics" },
  "common.bottom_tab.material":  { es: "Material", en: "Material" },
  "common.bottom_tab.cost":      { es: "Coste", en: "Cost" },
  "common.bottom_tab.stats":     { es: "Stats", en: "Stats" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT | string) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("aura.lang") as Lang | null;
    if (saved === "es" || saved === "en") setLangState(saved);
    else if (typeof navigator !== "undefined" && navigator.language?.startsWith("en")) setLangState("en");
  }, []);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("aura.lang", l); } catch { /* ignore */ } };
  const t = (k: string) => DICT[k]?.[lang] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
