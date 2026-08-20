import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Box, Eye, EyeOff, Info, Layers, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { MeshStats } from "@/lib/forge/stats";

export type ViewerMode = "solid" | "wireframe" | "xray";
export type Material = "matte" | "chrome" | "glass";

export function Viewer({
  geometries,
  isGenerating,
  conceptImage,
  stats,
  selectedPart,
  onSelectPart,
}: {
  geometries: THREE.BufferGeometry[];
  isGenerating: boolean;
  conceptImage?: string | null;
  stats?: MeshStats | null;
  selectedPart?: number | null;
  onSelectPart?: (idx: number | null) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ViewerMode>("solid");
  const [material, setMaterial] = useState<Material>("chrome");
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showStats, setShowStats] = useState(true);

  return (
    <div className="relative h-full rounded-2xl overflow-hidden glass">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [3.5, 2.2, 4], fov: 38 }}
        className="!h-full !w-full"
      >
        <color attach="background" args={["#0a0c10"]} />
        <fog attach="fog" args={["#0a0c10", 8, 22]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 6, 4]} intensity={1.4} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#7fb3ff" />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ModelGroup geos={geometries} mode={mode} material={material} exploded={exploded} selectedPart={selectedPart ?? null} onSelectPart={onSelectPart} />
          <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>

      {/* HUD top-left */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <Pill>
          <Sparkles className="size-3 text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-wider">AURA · Viewer</span>
        </Pill>
        <button onClick={() => setShowStats((s) => !s)} className={cn("glass rounded-full px-2 py-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors", showStats ? "text-accent" : "text-muted-foreground")}>
          <Info className="size-3" /> Stats
        </button>
      </div>

      {/* Stats overlay */}
      {showStats && stats && stats.faces > 0 && (
        <div className="absolute top-14 left-3 glass rounded-xl px-2.5 py-2 space-y-0.5 text-[10px] font-mono w-44">
          <StatLine k={t("stats.verts")} v={stats.vertices.toLocaleString()} />
          <StatLine k={t("stats.faces")} v={stats.faces.toLocaleString()} />
          <StatLine k={t("stats.parts")} v={`${stats.parts}`} />
          <StatLine k={t("stats.size")} v={`${stats.bbox.x}×${stats.bbox.y}×${stats.bbox.z}`} />
          <StatLine k={t("stats.area")} v={`${stats.surfaceAreaCm2} cm²`} />
          <StatLine k={t("stats.volume")} v={`${stats.volumeCm3} cm³`} />
        </div>
      )}

      {/* HUD top-right: modes */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <Toolbar>
          <ToolBtn label={t("viewer.solid")} active={mode === "solid"} onClick={() => setMode("solid")}><Box className="size-3.5" /></ToolBtn>
          <ToolBtn label={t("viewer.wire")} active={mode === "wireframe"} onClick={() => setMode("wireframe")}><Layers className="size-3.5" /></ToolBtn>
          <ToolBtn label={t("viewer.xray")} active={mode === "xray"} onClick={() => setMode("xray")}><Eye className="size-3.5" /></ToolBtn>
        </Toolbar>
      </div>

      {/* HUD bottom-right: materials + exploded + rotate */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
        <Toolbar>
          <ToolBtn label={t("viewer.matte")} active={material === "matte"} onClick={() => setMaterial("matte")}>M</ToolBtn>
          <ToolBtn label={t("viewer.chrome")} active={material === "chrome"} onClick={() => setMaterial("chrome")}>C</ToolBtn>
          <ToolBtn label={t("viewer.glass")} active={material === "glass"} onClick={() => setMaterial("glass")}>G</ToolBtn>
        </Toolbar>
        <Toolbar>
          <ToolBtn label={t("viewer.explode")} active={exploded} onClick={() => setExploded(!exploded)}>EX</ToolBtn>
          <ToolBtn label={t("viewer.rotate")} active={autoRotate} onClick={() => setAutoRotate(!autoRotate)}>
            {autoRotate ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </ToolBtn>
        </Toolbar>
      </div>

      {/* Concept image floating preview */}
      {conceptImage && (
        <div className="absolute bottom-3 left-3 glass rounded-xl p-1.5 w-32">
          <img src={conceptImage} alt="AI concept" className="w-full h-24 object-cover rounded-lg" />
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center mt-1">{t("viewer.concept")}</div>
        </div>
      )}

      {/* Generating overlay */}
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-accent" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">{t("viewer.synth")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatLine({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className="text-foreground">{v}</span></div>;
}

function ModelGroup({ geos, mode, material, exploded, selectedPart, onSelectPart }: { geos: THREE.BufferGeometry[]; mode: ViewerMode; material: Material; exploded: boolean; selectedPart: number | null; onSelectPart?: (idx: number | null) => void }) {
  const ref = useRef<THREE.Group>(null);
  const offset = useMemo(() => {
    if (!geos.length) return new THREE.Vector3();
    const box = new THREE.Box3();
    geos.forEach((g) => { g.computeBoundingBox(); if (g.boundingBox) box.union(g.boundingBox); });
    const c = new THREE.Vector3();
    box.getCenter(c);
    return c.negate();
  }, [geos]);
  const scale = useMemo(() => {
    if (!geos.length) return 1;
    const box = new THREE.Box3();
    geos.forEach((g) => { if (g.boundingBox) box.union(g.boundingBox); });
    const size = new THREE.Vector3();
    box.getSize(size);
    const m = Math.max(size.x, size.y, size.z) || 1;
    return 2.4 / m;
  }, [geos]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += 0; void dt; });
  return (
    <group ref={ref} position={offset.toArray()} scale={scale}
      onPointerMissed={(e) => { if (e.type === "click") onSelectPart?.(null); }}>
      {geos.map((g, i) => (
        <ModelPart key={i} index={i} geometry={g} mode={mode} material={material}
          isSelected={selectedPart === i}
          isDimmed={selectedPart !== null && selectedPart !== i}
          onClick={() => onSelectPart?.(selectedPart === i ? null : i)}
          explodeOffset={exploded ? new THREE.Vector3((i - (geos.length - 1) / 2) * 1.6, 0, 0) : new THREE.Vector3()} />
      ))}
    </group>
  );
}

function ModelPart({ geometry, mode, material, explodeOffset, isSelected, isDimmed, onClick }: { index: number; geometry: THREE.BufferGeometry; mode: ViewerMode; material: Material; explodeOffset: THREE.Vector3; isSelected: boolean; isDimmed: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const mat = useMemo(() => {
    let m: THREE.Material;
    if (mode === "wireframe") m = new THREE.MeshBasicMaterial({ color: 0x9ad6ff, wireframe: true, transparent: true, opacity: 0.85 });
    else if (mode === "xray") m = new THREE.MeshPhysicalMaterial({ color: 0x9ad6ff, transparent: true, opacity: 0.18, transmission: 0.9, roughness: 0.05, ior: 1.4, thickness: 0.5, side: THREE.DoubleSide });
    else if (material === "matte") m = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.1, roughness: 0.85 });
    else if (material === "glass") m = new THREE.MeshPhysicalMaterial({ color: 0xdde7f0, transmission: 0.9, roughness: 0.08, ior: 1.45, thickness: 0.6, metalness: 0 });
    else m = new THREE.MeshStandardMaterial({ color: 0xd9dee3, metalness: 0.85, roughness: 0.18 });
    if (isSelected && "emissive" in m) (m as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x4dc6ff).multiplyScalar(0.6);
    if (isDimmed) m.opacity = (m.opacity ?? 1) * 0.35, m.transparent = true;
    return m;
  }, [mode, material, isSelected, isDimmed]);
  return (
    <mesh
      geometry={geometry}
      material={mat}
      castShadow receiveShadow
      position={explodeOffset.toArray()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      scale={hover || isSelected ? 1.015 : 1}
    />
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-full px-2.5 py-1 flex items-center gap-1.5">{children}</div>;
}
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-xl p-1 flex items-center gap-0.5">{children}</div>;
}
function ToolBtn({ children, active, onClick, label }: { children: React.ReactNode; active?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" title={label} onClick={onClick}
      className={cn(
        "h-7 min-w-7 px-2 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center justify-center transition-colors",
        active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-background/40"
      )}>
      {children}
    </button>
  );
}
