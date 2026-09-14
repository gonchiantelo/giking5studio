"use client";

import { useStudioStore } from "@/store/studioStore";

export default function ExportModal() {
  const exportProgress = useStudioStore((s) => s.exportProgress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,10,12,0.92)" }}
    >
      <div
        className="flex flex-col items-center gap-6 p-10 rounded-sm border w-80"
        style={{
          background: "var(--panel)",
          borderColor: "var(--panel-line)",
        }}
      >
        {/* Spinner */}
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{
            borderColor: "var(--panel-line)",
            borderTopColor: "var(--ember)",
          }}
        />

        <div className="flex flex-col items-center gap-2 w-full">
          <h2
            className="text-2xl tracking-widest"
            style={{ fontFamily: "var(--font-bebas)", color: "var(--paper)" }}
          >
            Exportando Reel
          </h2>
          <p className="text-xs text-center" style={{ color: "var(--moon)", opacity: 0.7 }}>
            FFmpeg está procesando el video en tu navegador. No cerrés la pestaña.
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full flex flex-col gap-2">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "var(--black)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${exportProgress}%`,
                background: "var(--ember)",
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: "var(--moon)", opacity: 0.5 }}>
              Progreso
            </span>
            <span
              className="text-sm"
              style={{ fontFamily: "var(--font-bebas)", color: "var(--ember)" }}
            >
              {exportProgress}%
            </span>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--moon)", opacity: 0.4 }}>
          La descarga comenzará automáticamente cuando termine.
        </p>
      </div>
    </div>
  );
}
