import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mic, Dice5, Loader2, Send, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Dropzone, type RefImage } from "./Dropzone";

const PLACEHOLDERS = [
  "Biomechanical cyber sigilism mask, symmetrical horns, modular jaw, optimized for FDM print…",
  "Parametric techwear shoulder pad, hex lattice, magnetic connectors…",
  "H.R. Giger ribbed helmet with split visor, support-free…",
  "Anime mecha gauntlet, hard surface plates, articulated knuckles…",
  "Organic exoskeleton spine plate, mirrored, hollow shell…",
];

export function PromptBar({
  value,
  onChange,
  images,
  onImagesChange,
  onMeshFiles,
  onGenerate,
  onEnhance,
  onInspire,
  isGenerating,
  isThinking,
}: {
  value: string;
  onChange: (v: string) => void;
  images: RefImage[];
  onImagesChange: (i: RefImage[]) => void;
  onMeshFiles?: (files: File[]) => void;
  onGenerate: () => void;
  onEnhance: () => void;
  onInspire: () => void;
  isGenerating: boolean;
  isThinking: boolean;
}) {
  const { t, lang } = useI18n();
  const [phIndex, setPhIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  useEffect(() => {
    const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const toggleVoice = () => {
    type SR = { start: () => void; stop: () => void; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; lang: string; continuous: boolean; interimResults: boolean };
    type W = Window & { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const w = window as unknown as W;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice input not supported in this browser.");
      return;
    }
    if (listening && recRef.current) {
      (recRef.current as SR).stop();
      setListening(false);
      return;
    }
    const r: SR = new Ctor();
    r.lang = lang === "es" ? "es-ES" : "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onChange(value ? `${value} ${text}` : text);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong rounded-2xl p-3 space-y-2"
    >
      <div className="flex items-start gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDERS[phIndex]}
          rows={3}
          className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/70 px-2 py-1.5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
          }}
        />
      </div>
      <Dropzone images={images} onChange={onImagesChange} onMeshFiles={onMeshFiles} />
      <div className="flex items-center gap-1.5 flex-wrap">
        <ActionChip icon={Sparkles} label={t("prompt.enhance")} onClick={onEnhance} loading={isThinking} />
        <ActionChip icon={Dice5} label={t("prompt.inspire")} onClick={onInspire} loading={isThinking} />
        <ActionChip icon={listening ? MicOff : Mic} label={listening ? t("prompt.stop") : t("prompt.voice")} onClick={toggleVoice} active={listening} />
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground/70 mr-2 hidden md:inline">⌘ + ⏎</span>
        <button onClick={onGenerate} disabled={isGenerating || !value.trim()}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 h-9 text-sm font-medium",
            "bg-gradient-to-b from-foreground to-foreground/80 text-background",
            "hover:opacity-90 transition-opacity glow-ring",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}>
          {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span>{isGenerating ? t("prompt.forging") : t("prompt.generate")}</span>
        </button>
      </div>
    </motion.div>
  );
}

function ActionChip({
  icon: Icon, label, onClick, loading, active,
}: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; loading?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs",
        "border hairline bg-background/30 hover:bg-background/60 transition-colors",
        active && "border-accent text-accent",
      )}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      <span>{label}</span>
    </button>
  );
}
