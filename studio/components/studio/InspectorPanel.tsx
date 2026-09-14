"use client";

import { useStudioStore, Subtitle, SubtitleStyle, FontFamily, CustomFont } from "@/store/studioStore";
import ColorCorrectionPanel from "./ColorCorrectionPanel";
import AutoSubtitleButton from "./AutoSubtitleButton";

const FONT_OPTIONS: FontFamily[] = [
  "Bebas Neue",
  "Inter",
  "Fraunces",
  "Montserrat",
  "Anton",
  "Permanent Marker",
];

export default function InspectorPanel() {
  const inspectorTab = useStudioStore((s) => s.inspectorTab);
  const setInspectorTab = useStudioStore((s) => s.setInspectorTab);
  const selectedId = useStudioStore((s) => s.selectedId);
  const videoClips = useStudioStore((s) => s.videoClips);
  const subtitles = useStudioStore((s) => s.subtitles);
  const addSubtitle = useStudioStore((s) => s.addSubtitle);
  const updateSubtitle = useStudioStore((s) => s.updateSubtitle);
  const updateSubtitleStyle = useStudioStore((s) => s.updateSubtitleStyle);
  const removeSubtitle = useStudioStore((s) => s.removeSubtitle);
  const currentTime = useStudioStore((s) => s.currentTime);

  const selectedClip = videoClips.find((c) => c.id === selectedId);
  const selectedSubtitle = subtitles.find((s) => s.id === selectedId);

  const customFonts = useStudioStore((s) => s.customFonts);
  const addCustomFont = useStudioStore((s) => s.addCustomFont);
  const removeCustomFont = useStudioStore((s) => s.removeCustomFont);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--panel)" }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div
        className="px-4 py-3 text-xs uppercase tracking-widest border-b font-bold shrink-0"
        style={{ color: "var(--moon)", borderColor: "var(--panel-line)" }}
      >
        Inspector
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: "var(--panel-line)" }}
      >
        {(["clip", "subtitle"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setInspectorTab(tab)}
            className="flex-1 py-2 text-xs uppercase tracking-widest transition-all"
            style={{
              color: inspectorTab === tab ? "var(--paper)" : "var(--moon)",
              opacity: inspectorTab === tab ? 1 : 0.5,
              borderBottom: inspectorTab === tab ? "2px solid var(--ember)" : "2px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab === "clip" ? "Clip" : "Texto"}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {inspectorTab === "clip" && (
          <ColorCorrectionPanel clipId={selectedClip?.id ?? selectedId ?? ""} />
        )}

        {inspectorTab === "subtitle" && (
          <SubtitleInspector
            subtitles={subtitles}
            customFonts={customFonts}
            selectedSubtitle={selectedSubtitle}
            currentTime={currentTime}
            onAdd={() => addSubtitle({ start: currentTime, end: currentTime + 2 })}
            onUpdate={(id, patch) => updateSubtitle(id, patch)}
            onUpdateStyle={(id, patch) => updateSubtitleStyle(id, patch)}
            onRemove={(id) => removeSubtitle(id)}
            onAddCustomFont={addCustomFont}
            onRemoveCustomFont={removeCustomFont}
          />
        )}
      </div>
    </div>
  );
}

// ── Subtitle Inspector ───────────────────────────────────────

interface SubtitleInspectorProps {
  subtitles: Subtitle[];
  customFonts: CustomFont[];
  selectedSubtitle: Subtitle | undefined;
  currentTime: number;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Subtitle>) => void;
  onUpdateStyle: (id: string, patch: Partial<SubtitleStyle>) => void;
  onRemove: (id: string) => void;
  onAddCustomFont: (file: File, name: string) => void;
  onRemoveCustomFont: (id: string) => void;
}

function SubtitleInspector({
  subtitles,
  customFonts,
  selectedSubtitle,
  currentTime,
  onAdd,
  onUpdate,
  onUpdateStyle,
  onRemove,
  onAddCustomFont,
  onRemoveCustomFont,
}: SubtitleInspectorProps) {
  const sub = selectedSubtitle;

  return (
    <div className="flex flex-col gap-0">
      {/* Add button & AutoSubtitles */}
      <div className="px-3 py-3 border-b flex flex-col gap-2" style={{ borderColor: "var(--panel-line)" }}>
        <button
          onClick={onAdd}
          className="w-full py-2 text-xs uppercase tracking-widest rounded-sm transition-opacity hover:opacity-80 border"
          style={{ borderColor: "var(--ember)", color: "var(--ember)" }}
        >
          + Agregar Bloque Manual
        </button>
        <AutoSubtitleButton />
      </div>

      {/* Subtitle list */}
      <div className="px-3 py-2 flex flex-col gap-1">
        {subtitles.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--moon)", opacity: 0.4 }}>
            Sin subtítulos. Dale a + Agregar.
          </p>
        )}
        {subtitles.map((s) => (
          <SubtitleRow
            key={s.id}
            sub={s}
            isSelected={sub?.id === s.id}
            onUpdate={(patch) => onUpdate(s.id, patch)}
            onRemove={() => onRemove(s.id)}
          />
        ))}
      </div>

      {/* Selected subtitle style editor */}
      {sub && (
        <div
          className="border-t px-3 py-3 flex flex-col gap-3"
          style={{ borderColor: "var(--panel-line)" }}
        >
          <span
            className="text-xs uppercase tracking-widest font-bold"
            style={{ color: "var(--moon)", opacity: 0.5 }}
          >
            Estilo de Texto
          </span>

          {/* Font */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--moon)", opacity: 0.7 }}>Tipografía</label>
            <select
              value={sub.style.fontFamily}
              onChange={(e) => onUpdateStyle(sub.id, { fontFamily: e.target.value as FontFamily })}
              className="text-xs px-2 py-1.5 border rounded-sm outline-none"
              style={{ background: "var(--black)", borderColor: "var(--panel-line)", color: "var(--paper)" }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
              {customFonts.map((f) => (
                <option key={f.id} value={f.name}>{f.name} (Custom)</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <StyleSlider
            label="Tamaño"
            min={30} max={220} step={1}
            value={sub.style.fontSize}
            onChange={(v) => onUpdateStyle(sub.id, { fontSize: v })}
            displayFn={(v) => `${v}px`}
          />

          {/* Color */}
          <div className="flex items-center gap-3">
            <label className="text-xs flex-1" style={{ color: "var(--moon)", opacity: 0.7 }}>Color</label>
            <input
              type="color"
              value={sub.style.color}
              onChange={(e) => onUpdateStyle(sub.id, { color: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border-0"
              style={{ background: "none" }}
            />
          </div>

          {/* Opacity */}
          <StyleSlider
            label="Opacidad"
            min={0} max={1} step={0.01}
            value={sub.style.opacity}
            onChange={(v) => onUpdateStyle(sub.id, { opacity: v })}
            displayFn={(v) => `${Math.round(v * 100)}%`}
          />

          {/* Stroke */}
          <div className="flex flex-col gap-1">
            <StyleSlider
              label="Borde (Stroke)"
              min={0} max={20} step={0.5}
              value={sub.style.strokeWidth}
              onChange={(v) => onUpdateStyle(sub.id, { strokeWidth: v })}
              displayFn={(v) => `${v}px`}
            />
            {sub.style.strokeWidth > 0 && (
              <div className="flex items-center gap-3 pl-1">
                <label className="text-xs flex-1" style={{ color: "var(--moon)", opacity: 0.5 }}>Color borde</label>
                <input
                  type="color"
                  value={sub.style.strokeColor}
                  onChange={(e) => onUpdateStyle(sub.id, { strokeColor: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer border-0"
                />
              </div>
            )}
          </div>

          {/* Shadow */}
          <div className="flex flex-col gap-1">
            <StyleSlider
              label="Sombra (Blur)"
              min={0} max={30} step={1}
              value={sub.style.shadowBlur}
              onChange={(v) => onUpdateStyle(sub.id, { shadowBlur: v })}
              displayFn={(v) => `${v}px`}
            />
            {sub.style.shadowBlur > 0 && (
              <div className="flex items-center gap-3 pl-1">
                <label className="text-xs flex-1" style={{ color: "var(--moon)", opacity: 0.5 }}>Color sombra</label>
                <input
                  type="color"
                  value={sub.style.shadowColor}
                  onChange={(e) => onUpdateStyle(sub.id, { shadowColor: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer border-0"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Fonts Section */}
      <div className="border-t px-3 py-3 flex flex-col gap-3" style={{ borderColor: "var(--panel-line)" }}>
        <span
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: "var(--moon)", opacity: 0.5 }}
        >
          Fuentes Propias
        </span>
        <label
          className="w-full text-center py-2 text-xs uppercase tracking-widest rounded-sm transition-opacity hover:opacity-80 cursor-pointer border border-dashed"
          style={{ borderColor: "var(--panel-line)", color: "var(--moon)" }}
        >
          + Subir .ttf / .otf
          <input
            type="file"
            accept=".ttf,.otf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fontName = file.name.split(".")[0];
              const url = URL.createObjectURL(file);
              const fontFace = new FontFace(fontName, `url(${url})`);
              try {
                const loadedFace = await fontFace.load();
                document.fonts.add(loadedFace);
                onAddCustomFont(file, fontName);
              } catch (err) {
                console.error("Error loading font", err);
              }
            }}
          />
        </label>
        {customFonts.map(f => (
          <div key={f.id} className="flex justify-between items-center text-xs" style={{ color: "var(--paper)" }}>
            <span>{f.name}</span>
            <button onClick={() => onRemoveCustomFont(f.id)} style={{ color: "var(--ember)" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Subtitle Row (list item) ─────────────────────────────────

function SubtitleRow({
  sub,
  isSelected,
  onUpdate,
  onRemove,
}: {
  sub: Subtitle;
  isSelected: boolean;
  onUpdate: (patch: Partial<Subtitle>) => void;
  onRemove: () => void;
}) {
  const setSelectedId = useStudioStore((s) => s.setSelectedId);

  return (
    <div
      className="flex flex-col gap-1.5 p-2 rounded-sm border cursor-pointer transition-all"
      style={{
        background: isSelected ? "rgba(181,67,43,0.1)" : "var(--black)",
        borderColor: isSelected ? "var(--ember)" : "var(--panel-line)",
      }}
      onClick={() => setSelectedId(sub.id)}
    >
      {/* Text input */}
      <input
        type="text"
        value={sub.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="w-full text-xs px-2 py-1 rounded-sm outline-none border"
        style={{
          background: "var(--panel)",
          borderColor: "var(--panel-line)",
          color: "var(--paper)",
        }}
      />

      {/* Timestamps */}
      <div className="flex gap-2">
        <div className="flex flex-col flex-1">
          <label className="text-xs mb-0.5" style={{ color: "var(--moon)", opacity: 0.5 }}>
            Inicio (s)
          </label>
          <input
            type="number"
            step={0.1}
            value={sub.start}
            onChange={(e) => onUpdate({ start: parseFloat(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 border rounded-sm outline-none"
            style={{ background: "var(--panel)", borderColor: "var(--panel-line)", color: "var(--paper)" }}
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs mb-0.5" style={{ color: "var(--moon)", opacity: 0.5 }}>
            Fin (s)
          </label>
          <input
            type="number"
            step={0.1}
            value={sub.end}
            onChange={(e) => onUpdate({ end: parseFloat(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 border rounded-sm outline-none"
            style={{ background: "var(--panel)", borderColor: "var(--panel-line)", color: "var(--paper)" }}
          />
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="self-end text-xs transition-opacity hover:opacity-70"
        style={{ color: "var(--ember)" }}
      >
        Eliminar
      </button>
    </div>
  );
}

// ── Reusable Style Slider ────────────────────────────────────

function StyleSlider({
  label,
  min, max, step, value,
  onChange,
  displayFn,
}: {
  label: string;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
  displayFn?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-xs" style={{ color: "var(--moon)", opacity: 0.7 }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: "var(--ember)" }}>
          {displayFn ? displayFn(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--ember)", height: "3px" }}
      />
    </div>
  );
}
