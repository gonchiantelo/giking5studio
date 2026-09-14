"use client";

import { useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { getVideoDuration, getAudioDuration } from "@/lib/timelineUtils";

export default function MediaPanel() {
  const { videoClips, audioTracks, addVideoClip, addAudioTrack, removeVideoClip, removeAudioTrack } =
    useStudioStore();

  const handleVideoDrop = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video/")) {
          const duration = await getVideoDuration(file);
          addVideoClip(file, duration, "video");
        } else if (file.type === "image/jpeg" || file.type === "image/png") {
          addVideoClip(file, 5, "image"); // Default 5s for images
        }
      }
    },
    [addVideoClip]
  );

  const handleAudioDrop = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("audio/")) continue;
        const duration = await getAudioDuration(file);
        addAudioTrack(file, duration);
      }
    },
    [addAudioTrack]
  );

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Section label ─────────────────────── */}
      <div
        className="px-4 py-3 text-xs uppercase tracking-widest border-b font-bold"
        style={{ color: "var(--moon)", borderColor: "var(--panel-line)" }}
      >
        Media
      </div>

      {/* ── Video uploader ───────────────────── */}
      <Section label="Video & Imagen">
        <DropZone
          accept="video/*,image/jpeg,image/png"
          label="+ Subir Video/Imagen (.mp4, .jpg, .png)"
          onFiles={(f) => handleVideoDrop(f)}
        />
        {videoClips.map((clip) => (
          <AssetRow
            key={clip.id}
            name={clip.name}
            sub={`${clip.duration.toFixed(1)}s`}
            onRemove={() => removeVideoClip(clip.id)}
            icon="🎬"
          />
        ))}
      </Section>

      {/* ── Audio uploader ───────────────────── */}
      <Section label="Pistas de Audio">
        <DropZone
          accept="audio/*"
          label="+ Subir Audio (.mp3/.wav)"
          onFiles={(f) => handleAudioDrop(f)}
        />
        {audioTracks.map((track) => (
          <AssetRow
            key={track.id}
            name={track.name}
            sub={`${(track.trimEnd - track.trimStart).toFixed(1)}s`}
            onRemove={() => removeAudioTrack(track.id)}
            icon="🎵"
          />
        ))}
      </Section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div
        className="px-4 py-2 text-xs tracking-widest uppercase"
        style={{ color: "var(--moon)", opacity: 0.5 }}
      >
        {label}
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3">{children}</div>
    </div>
  );
}

function DropZone({
  accept,
  label,
  onFiles,
}: {
  accept: string;
  label: string;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className="flex items-center justify-center text-xs py-3 border rounded-sm cursor-pointer transition-colors"
      style={{
        borderColor: "var(--panel-line)",
        borderStyle: "dashed",
        color: "var(--moon)",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </label>
  );
}

function AssetRow({
  name,
  sub,
  onRemove,
  icon,
}: {
  name: string;
  sub: string;
  onRemove: () => void;
  icon: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-2 rounded-sm text-xs group"
      style={{ background: "var(--black)" }}
    >
      <span>{icon}</span>
      <div className="flex flex-col flex-1 overflow-hidden">
        <span
          className="truncate"
          style={{ color: "var(--paper)" }}
          title={name}
        >
          {name}
        </span>
        <span style={{ color: "var(--moon)", opacity: 0.6 }}>{sub}</span>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1"
        style={{ color: "var(--ember)" }}
        title="Eliminar"
      >
        ✕
      </button>
    </div>
  );
}
