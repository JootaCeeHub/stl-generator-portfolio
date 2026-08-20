import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, X, Link2, Folder, Film, Box, FileText, Plus, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type RefKind = "image" | "video" | "url" | "mesh" | "doc" | "archive" | "audio";

export type RefImage = {
  id: string;
  name: string;
  kind: RefKind;
  /** Backwards-compat: thumbnail/poster data URL when available (used by AI vision). */
  dataUrl?: string;
  /** External URL (kind=url) */
  url?: string;
  /** Extracted video frames (data URLs) for AI vision */
  frames?: string[];
  /** File size bytes */
  size?: number;
  mime?: string;
  /** Raw file (for mesh import) */
  file?: File;
};

const MESH_EXT = /\.(stl|obj|glb|gltf|ply|3mf|fbx|dae|step|stp|iges|igs)$/i;
const DOC_EXT  = /\.(pdf|txt|md|json|csv|svg|dxf)$/i;
const ARC_EXT  = /\.(zip|rar|7z|tar|gz)$/i;

function detectKind(file: File): RefKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (MESH_EXT.test(file.name)) return "mesh";
  if (ARC_EXT.test(file.name)) return "archive";
  if (DOC_EXT.test(file.name)) return "doc";
  return "doc";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function extractVideoFrames(file: File, count = 4): Promise<{ poster: string; frames: string[] }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const frames: string[] = [];
    video.addEventListener("loadedmetadata", async () => {
      const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      const w = Math.min(640, video.videoWidth || 640);
      const h = Math.round((video.videoHeight || 360) * (w / (video.videoWidth || w)));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no canvas")); return; }
      try {
        for (let i = 0; i < count; i++) {
          const t = duration * ((i + 1) / (count + 1));
          await new Promise<void>((res, rej) => {
            const onSeek = () => { video.removeEventListener("seeked", onSeek); res(); };
            video.addEventListener("seeked", onSeek);
            video.addEventListener("error", () => rej(new Error("video error")), { once: true });
            video.currentTime = t;
          });
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(canvas.toDataURL("image/jpeg", 0.7));
        }
        URL.revokeObjectURL(url);
        resolve({ poster: frames[Math.floor(frames.length / 2)] ?? frames[0], frames });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    }, { once: true });
    video.addEventListener("error", () => { URL.revokeObjectURL(url); reject(new Error("video load failed")); }, { once: true });
  });
}

const MAX_REFS = 12;

export function Dropzone({
  images,
  onChange,
  onMeshFiles,
}: {
  images: RefImage[];
  onChange: (next: RefImage[]) => void;
  onMeshFiles?: (files: File[]) => void;
}) {
  const { t } = useI18n();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const append = (added: RefImage[]) => {
    onChange([...images, ...added].slice(0, MAX_REFS));
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, MAX_REFS - images.length);
    if (!arr.length) return;
    setBusy(true);
    const meshFiles: File[] = [];
    const added: RefImage[] = [];
    for (const f of arr) {
      const kind = detectKind(f);
      const base: RefImage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name, kind, size: f.size, mime: f.type, file: f,
      };
      try {
        if (kind === "image") {
          base.dataUrl = await fileToDataUrl(f);
        } else if (kind === "video") {
          const { poster, frames } = await extractVideoFrames(f, 4);
          base.dataUrl = poster;
          base.frames = frames;
        } else if (kind === "mesh") {
          meshFiles.push(f);
        }
      } catch {
        /* ignore preview errors */
      }
      added.push(base);
    }
    append(added);
    if (meshFiles.length && onMeshFiles) onMeshFiles(meshFiles);
    setBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, onChange, onMeshFiles]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void handleFiles(e.target.files);
    e.target.value = "";
  };

  const addUrl = () => {
    const v = urlValue.trim();
    if (!v) return;
    const isImage = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(v);
    append([{
      id: `${Date.now()}-url`,
      name: v.replace(/^https?:\/\//, "").slice(0, 60),
      kind: "url",
      url: v,
      dataUrl: isImage ? v : undefined,
    }]);
    setUrlValue(""); setUrlOpen(false);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        "relative rounded-xl border border-dashed transition-colors px-3 py-2 flex flex-col gap-2 min-h-[3.25rem]",
        drag ? "border-accent bg-accent/5" : "hairline bg-background/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolBtn icon={ImagePlus} title={t("prompt.drop")} onClick={() => inputRef.current?.click()} />
          <ToolBtn icon={Folder}    title={t("ref.folder")}  onClick={() => folderRef.current?.click()} />
          <ToolBtn icon={Film}      title={t("ref.video")}   onClick={() => inputRef.current?.click()} />
          <ToolBtn icon={Box}       title={t("ref.mesh")}    onClick={() => inputRef.current?.click()} />
          <ToolBtn icon={Link2}     title={t("ref.url")}     onClick={() => setUrlOpen((o) => !o)} active={urlOpen} />
        </div>
        <input ref={inputRef} type="file" multiple
          accept="image/*,video/*,audio/*,.stl,.obj,.glb,.gltf,.ply,.3mf,.fbx,.dxf,.svg,.pdf,.zip,.json"
          className="hidden" onChange={onPick} />
        <input ref={folderRef} type="file" multiple
          // @ts-expect-error non-standard but supported in chromium/safari/firefox
          webkitdirectory="" directory=""
          className="hidden" onChange={onPick} />
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          {images.length === 0 && !busy && (
            <span className="text-[11px] text-muted-foreground truncate">{t("ref.hint")}</span>
          )}
          {busy && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" /> {t("ref.processing")}
            </span>
          )}
          {images.map((img) => <RefChip key={img.id} item={img} onRemove={() => onChange(images.filter((i) => i.id !== img.id))} />)}
        </div>
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/70 tabular-nums">{images.length}/{MAX_REFS}</span>
      </div>
      {urlOpen && (
        <div className="flex items-center gap-1.5 pl-1">
          <Link2 className="size-3.5 text-muted-foreground" />
          <input
            autoFocus value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addUrl(); if (e.key === "Escape") setUrlOpen(false); }}
            placeholder={t("ref.url_placeholder")}
            className="flex-1 bg-background/40 border hairline rounded-md px-2 h-7 text-xs outline-none focus:border-accent/50"
          />
          <button onClick={addUrl} className="h-7 px-2 rounded-md border hairline text-[11px] hover:bg-background/60 inline-flex items-center gap-1">
            <Plus className="size-3" /> {t("ref.add")}
          </button>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon: Icon, title, onClick, active }: { icon: React.ComponentType<{ className?: string }>; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={cn(
        "size-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors",
        active && "bg-accent/15 text-accent",
      )}>
      <Icon className="size-3.5" />
    </button>
  );
}

function fmtSize(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

const KIND_ICON: Record<RefKind, React.ComponentType<{ className?: string }>> = {
  image: ImagePlus, video: Film, url: Link2, mesh: Box, doc: FileText, archive: FileText, audio: Film,
};

const KIND_LABEL: Record<RefKind, string> = {
  image: "IMG", video: "VID", url: "URL", mesh: "3D", doc: "DOC", archive: "ZIP", audio: "AUD",
};

function RefChip({ item, onRemove }: { item: RefImage; onRemove: () => void }) {
  const Icon = KIND_ICON[item.kind];
  const hasThumb = !!item.dataUrl;
  return (
    <div className="group relative shrink-0 flex items-center gap-1.5 pr-1.5 pl-1 py-1 rounded-md border hairline bg-background/40 hover:border-accent/40 transition-colors max-w-[180px]" title={item.name}>
      {hasThumb ? (
        <img src={item.dataUrl} alt={item.name} className="size-7 rounded object-cover ring-1 ring-border" />
      ) : (
        <div className="size-7 rounded bg-background/60 ring-1 ring-border flex items-center justify-center">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] font-mono uppercase tracking-wider text-accent/80">{KIND_LABEL[item.kind]}{item.frames ? ` ·${item.frames.length}f` : ""}</div>
        <div className="text-[10px] text-foreground/80 truncate max-w-[120px]">{item.name}</div>
      </div>
      {item.size ? <span className="text-[9px] font-mono text-muted-foreground/70 tabular-nums">{fmtSize(item.size)}</span> : null}
      <button type="button" onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <X className="size-2.5" />
      </button>
    </div>
  );
}
