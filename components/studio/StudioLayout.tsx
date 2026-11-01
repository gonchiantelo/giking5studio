"use client";

import MediaPanel from "./MediaPanel";
import PreviewPanel from "./PreviewPanel";
import Timeline from "./Timeline";
import ExportModal from "./ExportModal";
import InspectorPanel from "./InspectorPanel";
import { useStudioStore } from "@/store/studioStore";
import { useFFmpeg } from "@/hooks/useFFmpeg";

export default function StudioLayout() {
  const isExporting = useStudioStore((s) => s.isExporting);
  const { renderProject, isLoaded, isLoading } = useFFmpeg();

  return (
    <div
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ background: "var(--black)" }}
    >
      {/* ── TOP BAR ────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-2 shrink-0 border-b"
        style={{
          background: "var(--panel)",
          borderColor: "var(--panel-line)",
          height: "48px",
        }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl tracking-widest"
            style={{ fontFamily: "var(--font-bebas)", color: "var(--ember)" }}
          >
            RAVIX Studio
          </h1>
          <span
            className="text-xs uppercase tracking-widest px-2 py-0.5 rounded-sm"
            style={{
              color: "var(--moon)",
              background: "rgba(159,180,209,0.1)",
              border: "1px solid var(--panel-line)",
            }}
          >
            v2.0
          </span>
        </div>

        <button
          onClick={renderProject}
          disabled={isLoading || isExporting}
          className="px-5 py-1.5 text-sm uppercase tracking-widest rounded-sm transition-opacity disabled:opacity-40 hover:opacity-85"
          style={{
            background: "var(--ember)",
            color: "var(--paper)",
            fontFamily: "var(--font-bebas)",
            fontSize: "1rem",
            letterSpacing: "2px",
          }}
        >
          {isLoading
            ? "⏳ Cargando FFmpeg..."
            : isExporting
              ? "⚙ Exportando..."
              : "⬇ Renderizar Reel"}
        </button>
      </header>

      {/* ── MAIN AREA: Media | Preview | Inspector ──────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Media panel — fixed 200px */}
        <aside
          className="shrink-0 flex flex-col border-r overflow-y-auto"
          style={{
            width: "200px",
            background: "var(--panel)",
            borderColor: "var(--panel-line)",
          }}
        >
          <MediaPanel />
        </aside>

        {/* Center: Preview canvas */}
        <main
          className="flex-1 flex items-start justify-center overflow-auto p-5"
          style={{ background: "var(--black)" }}
        >
          <PreviewPanel />
        </main>

        {/* Right: Inspector panel — fixed 240px */}
        <aside
          className="shrink-0 flex flex-col border-l overflow-hidden"
          style={{
            width: "240px",
            background: "var(--panel)",
            borderColor: "var(--panel-line)",
          }}
        >
          <InspectorPanel />
        </aside>
      </div>

      {/* ── TIMELINE ────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t"
        style={{
          height: "240px",
          background: "var(--panel)",
          borderColor: "var(--panel-line)",
        }}
      >
        <Timeline />
      </div>

      {/* ── EXPORT MODAL ────────────────────────────────────── */}
      {isExporting && <ExportModal />}
    </div>
  );
}
