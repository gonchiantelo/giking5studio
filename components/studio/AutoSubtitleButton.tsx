"use client";

import { useState } from "react";
import { useStudioStore, FontFamily } from "@/store/studioStore";

export default function AutoSubtitleButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { videoClips, addSubtitle } = useStudioStore();

  const handleGenerate = async () => {
    // Just use the first video clip for the MVP
    const clip = videoClips.find(c => c.type === "video");
    if (!clip) {
      setError("No hay video para procesar.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", clip.file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error("Error: Saldo insuficiente en OpenAI. Recarga créditos para usar Auto-Subtítulos.");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al transcribir");
      }

      const data = await res.json();
      
      if (!data.words || data.words.length === 0) {
        throw new Error("No se detectaron palabras.");
      }

      // Generate subtitles from word-level timestamps
      data.words.forEach((w: { word: string; start: number; end: number }) => {
        addSubtitle({
          text: w.word,
          start: w.start,
          end: w.end,
          style: {
            fontFamily: "Bebas Neue",
            fontSize: 140, // Giant text for TikTok/Reels style
            color: "#ece7e0",
            opacity: 1,
            strokeWidth: 4,
            strokeColor: "#000000",
            shadowBlur: 10,
            shadowColor: "#000000",
          }
        });
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        onClick={handleGenerate}
        disabled={isGenerating || videoClips.length === 0}
        className="w-full py-2 text-xs uppercase tracking-widest rounded-sm transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "var(--moon)", color: "var(--black)", fontWeight: "bold" }}
      >
        {isGenerating ? "Generando..." : "⚡ Auto-Subtítulos"}
      </button>
      {error && (
        <span className="text-xs text-center mt-1" style={{ color: "var(--ember)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
