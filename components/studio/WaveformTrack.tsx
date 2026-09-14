"use client";

import { useEffect, useRef, useState } from "react";
import { AudioTrack } from "@/store/studioStore";
import { secToPx } from "@/lib/timelineUtils";

interface WaveformTrackProps {
  audioTrack: AudioTrack;
  zoom: number;
  height: number;
}

export default function WaveformTrack({
  audioTrack,
  zoom,
  height,
}: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState(false);

  const segWidth = secToPx(audioTrack.trimEnd - audioTrack.trimStart, zoom);
  const leftPx   = secToPx(audioTrack.timelineOffset, zoom);

  useEffect(() => {
    let cancelled = false;

    async function decodeAndDraw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsDecoding(true);
      setError(false);

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await audioTrack.file.arrayBuffer();
        if (cancelled) return;

        // Decode audio
        const audioCtx = new AudioContext();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        // Get first channel data
        const channelData = decoded.getChannelData(0);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw waveform
        ctx.strokeStyle = "rgba(159,180,209,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();

        const step = Math.ceil(channelData.length / w);
        const mid = h / 2;

        for (let i = 0; i < w; i++) {
          // RMS of samples in this pixel bucket
          let sum = 0;
          for (let j = 0; j < step; j++) {
            const sample = channelData[i * step + j] ?? 0;
            sum += sample * sample;
          }
          const rms = Math.sqrt(sum / step);
          const amplitude = rms * mid * 2.5; // scale for visibility

          ctx.moveTo(i, mid - amplitude);
          ctx.lineTo(i, mid + amplitude);
        }
        ctx.stroke();

        // Center line
        ctx.strokeStyle = "rgba(159,180,209,0.2)";
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();

        audioCtx.close();
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsDecoding(false);
      }
    }

    decodeAndDraw();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTrack.id, audioTrack.file, zoom]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${leftPx}px`,
        top: "8px",
        width: `${segWidth}px`,
        height: `${height}px`,
        overflow: "hidden",
      }}
    >
      {isDecoding && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: "var(--moon)", opacity: 0.4 }}
        >
          <span className="animate-pulse">⣿ decodificando...</span>
        </div>
      )}
      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: "var(--ember)", opacity: 0.5 }}
        >
          sin waveform
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(segWidth))}
        height={height}
        style={{
          width: `${segWidth}px`,
          height: `${height}px`,
          opacity: isDecoding ? 0 : 1,
          transition: "opacity 0.3s",
        }}
      />
    </div>
  );
}
