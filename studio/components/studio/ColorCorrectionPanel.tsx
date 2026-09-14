"use client";

import { useStudioStore, ColorCorrection, DEFAULT_COLOR_CORRECTION } from "@/store/studioStore";

// ── CSS filter string builder ────────────────────────────────
// Maps ColorCorrection values to CSS filter string for live preview.
export function buildCSSFilter(cc: ColorCorrection): string {
  const brightness = 1 + cc.brightness;        // CSS: 0-2, default 1
  const contrast = cc.contrast;                 // CSS: 0-2, default 1
  const saturate = cc.saturation;               // CSS: 0-3, default 1

  // Temperature: warm = more red/less blue, cool = more blue/less red
  // We simulate with hue-rotate and saturate (approximation for CSS)
  const hueShift = cc.temperature * 30;        // -30 to +30 degrees

  return [
    `brightness(${brightness.toFixed(2)})`,
    `contrast(${contrast.toFixed(2)})`,
    `saturate(${saturate.toFixed(2)})`,
    `hue-rotate(${hueShift.toFixed(0)}deg)`,
  ].join(" ");
}

interface Props {
  clipId: string;
}

export default function ColorCorrectionPanel({ clipId }: Props) {
  const clip = useStudioStore((s) => s.videoClips.find((c) => c.id === clipId));
  const updateColorCorrection = useStudioStore((s) => s.updateColorCorrection);

  if (!clip) {
    return (
      <p className="text-xs text-center py-8" style={{ color: "var(--moon)", opacity: 0.4 }}>
        Seleccioná un clip en el timeline para editar su color.
      </p>
    );
  }

  const cc = clip.colorCorrection;

  const update = (patch: Partial<ColorCorrection>) => {
    updateColorCorrection(clipId, patch);
  };

  const reset = () => {
    updateColorCorrection(clipId, { ...DEFAULT_COLOR_CORRECTION });
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-2">
      <div className="flex items-center justify-between">
        <span
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: "var(--moon)", opacity: 0.5 }}
        >
          Corrección de Color
        </span>
        <button
          onClick={reset}
          className="text-xs px-2 py-0.5 rounded-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--ember)", border: "1px solid var(--ember)" }}
        >
          Reset
        </button>
      </div>

      <CCSlider
        label="Brillo"
        min={-1} max={1} step={0.01} default={0}
        value={cc.brightness}
        onChange={(v) => update({ brightness: v })}
        displayFn={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
      />
      <CCSlider
        label="Contraste"
        min={0} max={2} step={0.01} default={1}
        value={cc.contrast}
        onChange={(v) => update({ contrast: v })}
        displayFn={(v) => v.toFixed(2)}
      />
      <CCSlider
        label="Saturación"
        min={0} max={3} step={0.01} default={1}
        value={cc.saturation}
        onChange={(v) => update({ saturation: v })}
        displayFn={(v) => v.toFixed(2)}
      />
      <CCSlider
        label="Temperatura"
        min={-1} max={1} step={0.01} default={0}
        value={cc.temperature}
        onChange={(v) => update({ temperature: v })}
        displayFn={(v) => {
          if (v > 0.1) return `Cálido +${v.toFixed(2)}`;
          if (v < -0.1) return `Frío ${v.toFixed(2)}`;
          return "Neutro";
        }}
        leftLabel="❄ Frío"
        rightLabel="🌅 Cálido"
      />
      <CCSlider
        label="Highlights"
        min={0} max={1} step={0.01} default={0}
        value={cc.highlights}
        onChange={(v) => update({ highlights: v })}
        displayFn={(v) => `+${v.toFixed(2)}`}
      />
      <CCSlider
        label="Sombras"
        min={0} max={1} step={0.01} default={0}
        value={cc.shadows}
        onChange={(v) => update({ shadows: v })}
        displayFn={(v) => `+${v.toFixed(2)}`}
      />
      <CCSlider
        label="Viñeta"
        min={0} max={1} step={0.01} default={0}
        value={cc.vignette}
        onChange={(v) => update({ vignette: v })}
        displayFn={(v) => `${Math.round(v * 100)}%`}
      />
    </div>
  );
}

// ── Reusable CC Slider ───────────────────────────────────────

interface CCSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  value: number;
  onChange: (v: number) => void;
  displayFn?: (v: number) => string;
  leftLabel?: string;
  rightLabel?: string;
}

function CCSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  displayFn,
  leftLabel,
  rightLabel,
}: CCSliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--moon)", opacity: 0.7 }}>
          {label}
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--ember)", minWidth: "56px", textAlign: "right" }}
        >
          {displayFn ? displayFn(value) : value.toFixed(2)}
        </span>
      </div>

      {leftLabel && (
        <div className="flex justify-between text-xs" style={{ color: "var(--moon)", opacity: 0.35 }}>
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--ember)", height: "3px" }}
      />
    </div>
  );
}
