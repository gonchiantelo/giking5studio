"use client";

import {
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import { useStudioStore, VideoClip, AudioTrack, Subtitle } from "@/store/studioStore";
import { secToPx, pxToSec, formatTime, clamp } from "@/lib/timelineUtils";
import WaveformTrack from "./WaveformTrack";

const TRACK_H = 56;
const RULER_H = 28;
const TRIM_HANDLE_W = 8;

// ── Context menu state ──────────────────────────────────────
interface ContextMenu {
  x: number;
  y: number;
  clipId: string;
  type: "video" | "audio";
}

export default function Timeline() {
  const videoClips     = useStudioStore((s) => s.videoClips);
  const audioTracks    = useStudioStore((s) => s.audioTracks);
  const subtitles      = useStudioStore((s) => s.subtitles);
  const currentTime    = useStudioStore((s) => s.currentTime);
  const duration       = useStudioStore((s) => s.duration);
  const zoom           = useStudioStore((s) => s.zoom);
  const selectedId     = useStudioStore((s) => s.selectedId);
  const setZoom        = useStudioStore((s) => s.setZoom);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);
  const setSelectedId  = useStudioStore((s) => s.setSelectedId);
  const updateVideoClip = useStudioStore((s) => s.updateVideoClip);
  const updateAudioTrack = useStudioStore((s) => s.updateAudioTrack);
  const removeVideoClip  = useStudioStore((s) => s.removeVideoClip);
  const removeAudioTrack = useStudioStore((s) => s.removeAudioTrack);
  const updateSubtitle   = useStudioStore((s) => s.updateSubtitle);
  const splitClip        = useStudioStore((s) => s.splitClip);

  const scrollRef = useRef<HTMLDivElement>(null);
  const totalWidth = Math.max(secToPx(duration + 5, zoom), 700);

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Split shortcut ('S' or 'C')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      
      if (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "c") {
        if (selectedId) {
          splitClip(selectedId, currentTime);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, currentTime, splitClip]);

  // Ruler click → seek
  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
      setCurrentTime(clamp(pxToSec(x, zoom), 0, duration + 5));
    },
    [zoom, duration, setCurrentTime]
  );

  // Ruler ticks
  const tickSec = zoom >= 60 ? 1 : zoom >= 30 ? 2 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 5; t += tickSec) ticks.push(t);

  return (
    <div
      className="flex flex-col h-full select-none"
      onClick={() => setContextMenu(null)}
    >
      {/* ── Toolbar ──────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{ borderColor: "var(--panel-line)", height: "36px" }}
      >
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--moon)", opacity: 0.5 }}
        >
          Timeline
        </span>
        
        {/* Split Button */}
        <button
          onClick={() => selectedId && splitClip(selectedId, currentTime)}
          disabled={!selectedId}
          className="ml-4 px-3 py-1 rounded-sm text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "var(--ember)",
            color: "var(--paper)",
          }}
          title="Dividir clip seleccionado (S)"
        >
          ✂ Dividir
        </button>

        <span
          className="ml-auto text-xs"
          style={{ color: "var(--moon)", opacity: 0.4 }}
        >
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoom - 20)}
            className="text-base px-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--moon)" }}
          >
            −
          </button>
          <span className="text-xs w-14 text-center" style={{ color: "var(--moon)" }}>
            {zoom}px/s
          </span>
          <button
            onClick={() => setZoom(zoom + 20)}
            className="text-base px-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--moon)" }}
          >
            +
          </button>
        </div>
      </div>

      {/* ── Scrollable tracks area ───────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div style={{ width: `${totalWidth}px`, position: "relative", minHeight: "100%" }}>

          {/* Ruler */}
          <div
            className="sticky top-0 z-10 cursor-crosshair"
            style={{
              height: `${RULER_H}px`,
              background: "var(--black)",
              borderBottom: "1px solid var(--panel-line)",
            }}
            onClick={handleRulerClick}
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute bottom-0 flex flex-col items-start"
                style={{ left: `${secToPx(t, zoom)}px` }}
              >
                <span
                  className="text-xs"
                  style={{
                    color: "var(--moon)",
                    opacity: 0.5,
                    fontSize: "0.55rem",
                    transform: "translateX(2px)",
                    marginBottom: "2px",
                  }}
                >
                  {formatTime(t)}
                </span>
                <div
                  style={{
                    width: "1px",
                    height: "6px",
                    background: "var(--panel-line)",
                  }}
                />
              </div>
            ))}

            {/* Playhead marker on ruler */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${secToPx(currentTime, zoom)}px`,
                width: "2px",
                background: "var(--ember)",
                opacity: 0.6,
              }}
            />
          </div>

          {/* ── Video track ──────────────────────── */}
          <TrackRow label="VIDEO">
            {videoClips.map((clip) => (
              <VideoClipBlock
                key={clip.id}
                clip={clip}
                zoom={zoom}
                isSelected={selectedId === clip.id}
                currentTime={currentTime}
                onSelect={() => setSelectedId(clip.id)}
                onUpdate={(patch) => updateVideoClip(clip.id, patch)}
                onContextMenu={(x, y) =>
                  setContextMenu({ x, y, clipId: clip.id, type: "video" })
                }
              />
            ))}
          </TrackRow>

          {/* ── Audio tracks ─────────────────────── */}
          {audioTracks.map((track) => (
            <TrackRow
              key={track.id}
              label={`AUDIO: ${track.name.slice(0, 14)}`}
            >
              <AudioBlock
                track={track}
                zoom={zoom}
                isSelected={selectedId === track.id}
                onSelect={() => setSelectedId(track.id)}
                onUpdate={(patch) => updateAudioTrack(track.id, patch)}
                onContextMenu={(x, y) =>
                  setContextMenu({ x, y, clipId: track.id, type: "audio" })
                }
              />
              <WaveformTrack
                audioTrack={track}
                zoom={zoom}
                height={TRACK_H - 20}
              />
            </TrackRow>
          ))}

          {/* ── Subtitle track ───────────────────── */}
          {subtitles.length > 0 && (
            <TrackRow label="SUBTÍTULOS">
              {subtitles.map((sub) => (
                <SubtitleBlock
                  key={sub.id}
                  sub={sub}
                  zoom={zoom}
                  isSelected={selectedId === sub.id}
                  onSelect={() => setSelectedId(sub.id)}
                  onUpdate={(patch) => updateSubtitle(sub.id, patch)}
                />
              ))}
            </TrackRow>
          )}

          {/* ── Global Playhead ──────────────────── */}
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${secToPx(currentTime, zoom)}px`,
              top: `${RULER_H}px`,
              bottom: 0,
              width: "2px",
              background: "var(--ember)",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "7px solid var(--ember)",
                marginLeft: "-4px",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Context Menu ─────────────────────────── */}
      {contextMenu && (
        <ClipContextMenu
          menu={contextMenu}
          clips={videoClips}
          audioTracks={audioTracks}
          currentTime={currentTime}
          onClose={() => setContextMenu(null)}
          onUpdateVideo={(patch) => updateVideoClip(contextMenu.clipId, patch)}
          onUpdateAudio={(patch) => updateAudioTrack(contextMenu.clipId, patch)}
          onRemoveVideo={() => {
            removeVideoClip(contextMenu.clipId);
            setContextMenu(null);
          }}
          onRemoveAudio={() => {
            removeAudioTrack(contextMenu.clipId);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

// ── Track Row wrapper ────────────────────────────────────────

function TrackRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="flex items-center px-3 text-xs uppercase tracking-widest"
        style={{
          height: "16px",
          color: "var(--moon)",
          opacity: 0.35,
          fontSize: "0.55rem",
        }}
      >
        {label}
      </div>
      <div className="relative" style={{ height: `${TRACK_H}px` }}>
        {children}
      </div>
    </>
  );
}

// ── Video Clip Block ──────────────────────────────────────────

interface VideoClipBlockProps {
  clip: VideoClip;
  zoom: number;
  isSelected: boolean;
  currentTime: number;
  onSelect: () => void;
  onUpdate: (patch: Partial<VideoClip>) => void;
  onContextMenu: (x: number, y: number) => void;
}

function VideoClipBlock({
  clip,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onContextMenu,
}: VideoClipBlockProps) {
  const segLen = (clip.trimEnd - clip.trimStart) / clip.speed;
  const left   = secToPx(clip.timelineOffset, zoom);
  const width  = secToPx(segLen, zoom);

  // ── Drag body (moves timelineOffset) ─────────────
  const dragStartX = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);

  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.trim) return; // don't conflict with trim
    e.stopPropagation();
    onSelect();
    dragStartX.current = e.clientX;
    dragStartOffset.current = clip.timelineOffset;

    const onMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = pxToSec(ev.clientX - dragStartX.current, zoom);
      const newOffset = clamp(dragStartOffset.current + delta, 0, 9999);
      onUpdate({ timelineOffset: newOffset });
    };
    const onUp = () => {
      dragStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Left trim handle (adjusts trimStart) ─────────
  const leftTrimStartX = useRef<number | null>(null);
  const leftTrimStart = useRef<number>(0);
  const leftOffset = useRef<number>(0);

  const handleLeftTrimDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    leftTrimStartX.current = e.clientX;
    leftTrimStart.current = clip.trimStart;
    leftOffset.current = clip.timelineOffset;

    const onMove = (ev: MouseEvent) => {
      if (leftTrimStartX.current === null) return;
      const delta = pxToSec(ev.clientX - leftTrimStartX.current, zoom);
      const newTrimStart = clamp(
        leftTrimStart.current + delta * clip.speed,
        0,
        clip.trimEnd - 0.1
      );
      const newOffset = clamp(
        leftOffset.current + delta,
        0,
        9999
      );
      onUpdate({ trimStart: newTrimStart, timelineOffset: newOffset });
    };
    const onUp = () => {
      leftTrimStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Right trim handle (adjusts trimEnd) ──────────
  const rightTrimStartX = useRef<number | null>(null);
  const rightTrimEnd = useRef<number>(0);

  const handleRightTrimDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    rightTrimStartX.current = e.clientX;
    rightTrimEnd.current = clip.trimEnd;

    const onMove = (ev: MouseEvent) => {
      if (rightTrimStartX.current === null) return;
      const delta = pxToSec(ev.clientX - rightTrimStartX.current, zoom);
      
      const maxEnd = clip.type === "image" ? 9999 : clip.duration;
      const newTrimEnd = clamp(
        rightTrimEnd.current + delta * clip.speed,
        clip.trimStart + 0.1,
        maxEnd
      );
      onUpdate({ trimEnd: newTrimEnd });
    };
    const onUp = () => {
      rightTrimStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="absolute top-2"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${TRACK_H - 8}px`,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      {/* Left trim handle */}
      <div
        data-trim="left"
        className="absolute top-0 bottom-0 left-0 rounded-l-sm cursor-col-resize z-20 flex items-center justify-center"
        style={{
          width: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "var(--paper)" : "rgba(255,255,255,0.3)",
        }}
        onMouseDown={handleLeftTrimDown}
      >
        <div
          style={{
            width: "2px",
            height: "14px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "1px",
          }}
        />
      </div>

      {/* Clip body */}
      <div
        className="absolute inset-0 rounded-sm overflow-hidden cursor-grab flex flex-col"
        style={{
          left: `${TRIM_HANDLE_W}px`,
          right: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "#c04e33" : "var(--ember)",
          outline: isSelected ? "2px solid var(--paper)" : "none",
          outlineOffset: "-2px",
        }}
        onMouseDown={handleBodyMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e.clientX, e.clientY);
        }}
      >
        <div
          className="px-2 pt-1 text-xs truncate font-bold"
          style={{ color: "var(--paper)", fontSize: "0.6rem" }}
        >
          {clip.name}
        </div>
        {clip.speed !== 1 && (
          <div
            className="absolute bottom-1 right-1 text-xs px-1 rounded"
            style={{
              background: "rgba(0,0,0,0.5)",
              color: "var(--paper)",
              fontSize: "0.55rem",
            }}
          >
            {clip.speed}x
          </div>
        )}
      </div>

      {/* Right trim handle */}
      <div
        data-trim="right"
        className="absolute top-0 bottom-0 right-0 rounded-r-sm cursor-col-resize z-20 flex items-center justify-center"
        style={{
          width: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "var(--paper)" : "rgba(255,255,255,0.3)",
        }}
        onMouseDown={handleRightTrimDown}
      >
        <div
          style={{
            width: "2px",
            height: "14px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "1px",
          }}
        />
      </div>
    </div>
  );
}

// ── Audio Block ──────────────────────────────────────────────

interface AudioBlockProps {
  track: AudioTrack;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<AudioTrack>) => void;
  onContextMenu: (x: number, y: number) => void;
}

function AudioBlock({
  track,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onContextMenu,
}: AudioBlockProps) {
  const segLen = track.trimEnd - track.trimStart;
  const left   = secToPx(track.timelineOffset, zoom);
  const width  = secToPx(segLen, zoom);

  // Drag body
  const dragStartX = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragStartX.current = e.clientX;
    dragStartOffset.current = track.timelineOffset;

    const onMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = pxToSec(ev.clientX - dragStartX.current, zoom);
      onUpdate({ timelineOffset: clamp(dragStartOffset.current + delta, 0, 9999) });
    };
    const onUp = () => {
      dragStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="absolute top-2 rounded-sm cursor-grab flex flex-col overflow-hidden"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${TRACK_H - 14}px`,
        background: isSelected
          ? "rgba(159,180,209,0.35)"
          : "rgba(159,180,209,0.15)",
        border: `1px solid ${isSelected ? "var(--moon)" : "rgba(159,180,209,0.4)"}`,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e.clientX, e.clientY);
      }}
    >
      <div
        className="px-2 pt-1 text-xs truncate font-bold"
        style={{ color: "var(--moon)", fontSize: "0.6rem" }}
      >
        🎵 {track.name}
      </div>
      {/* Volume slider */}
      <div className="px-2 mt-auto pb-1 flex items-center gap-1">
        <span style={{ fontSize: "0.5rem", color: "var(--moon)" }}>🔊</span>
        <input
          type="range"
          min={0} max={1} step={0.05}
          value={track.volume}
          onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1"
          style={{ accentColor: "var(--moon)", height: "3px" }}
        />
      </div>
    </div>
  );
}

// ── Subtitle Block ───────────────────────────────────────────

interface SubtitleBlockProps {
  sub: Subtitle;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<Subtitle>) => void;
}

function SubtitleBlock({
  sub,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
}: SubtitleBlockProps) {
  const segLen = sub.end - sub.start;
  const left   = secToPx(sub.start, zoom);
  const width  = secToPx(segLen, zoom);

  // Drag body
  const dragStartX = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);

  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.trim) return;
    e.stopPropagation();
    onSelect();
    dragStartX.current = e.clientX;
    dragStartOffset.current = sub.start;

    const onMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = pxToSec(ev.clientX - dragStartX.current, zoom);
      const newStart = clamp(dragStartOffset.current + delta, 0, 9999);
      onUpdate({ start: newStart, end: newStart + segLen });
    };
    const onUp = () => {
      dragStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Left trim
  const leftTrimStartX = useRef<number | null>(null);
  const leftTrimStart = useRef<number>(0);

  const handleLeftTrimDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    leftTrimStartX.current = e.clientX;
    leftTrimStart.current = sub.start;

    const onMove = (ev: MouseEvent) => {
      if (leftTrimStartX.current === null) return;
      const delta = pxToSec(ev.clientX - leftTrimStartX.current, zoom);
      const newStart = clamp(leftTrimStart.current + delta, 0, sub.end - 0.1);
      onUpdate({ start: newStart });
    };
    const onUp = () => {
      leftTrimStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Right trim
  const rightTrimStartX = useRef<number | null>(null);
  const rightTrimEnd = useRef<number>(0);

  const handleRightTrimDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    rightTrimStartX.current = e.clientX;
    rightTrimEnd.current = sub.end;

    const onMove = (ev: MouseEvent) => {
      if (rightTrimStartX.current === null) return;
      const delta = pxToSec(ev.clientX - rightTrimStartX.current, zoom);
      const newEnd = clamp(rightTrimEnd.current + delta, sub.start + 0.1, 9999);
      onUpdate({ end: newEnd });
    };
    const onUp = () => {
      rightTrimStartX.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="absolute top-2"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${TRACK_H - 14}px`,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <div
        data-trim="left"
        className="absolute top-0 bottom-0 left-0 rounded-l-sm cursor-col-resize z-20 flex items-center justify-center"
        style={{
          width: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "var(--paper)" : "transparent",
        }}
        onMouseDown={handleLeftTrimDown}
      />
      <div
        className="absolute inset-0 rounded-sm border px-2 flex items-center text-xs overflow-hidden cursor-grab transition-colors"
        style={{
          left: `${TRIM_HANDLE_W}px`,
          right: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "rgba(181,67,43,0.3)" : "rgba(159,180,209,0.1)",
          borderColor: isSelected ? "var(--ember)" : "var(--moon)",
          color: isSelected ? "var(--paper)" : "var(--moon)",
          whiteSpace: "nowrap",
        }}
        onMouseDown={handleBodyMouseDown}
      >
        <span className="truncate">{sub.text}</span>
      </div>
      <div
        data-trim="right"
        className="absolute top-0 bottom-0 right-0 rounded-r-sm cursor-col-resize z-20 flex items-center justify-center"
        style={{
          width: `${TRIM_HANDLE_W}px`,
          background: isSelected ? "var(--paper)" : "transparent",
        }}
        onMouseDown={handleRightTrimDown}
      />
    </div>
  );
}

// ── Context Menu ─────────────────────────────────────────────

interface ClipContextMenuProps {
  menu: ContextMenu;
  clips: VideoClip[];
  audioTracks: AudioTrack[];
  currentTime: number;
  onClose: () => void;
  onUpdateVideo: (patch: Partial<VideoClip>) => void;
  onUpdateAudio: (patch: Partial<AudioTrack>) => void;
  onRemoveVideo: () => void;
  onRemoveAudio: () => void;
}

function ClipContextMenu({
  menu,
  clips,
  audioTracks,
  currentTime,
  onClose,
  onUpdateVideo,
  onUpdateAudio,
  onRemoveVideo,
  onRemoveAudio,
}: ClipContextMenuProps) {
  const clip = clips.find((c) => c.id === menu.clipId);
  const currentSpeed = clip?.speed ?? 1;

  return (
    <div
      className="fixed z-50 rounded-sm shadow-2xl border flex flex-col overflow-hidden"
      style={{
        left: `${menu.x}px`,
        top: `${menu.y}px`,
        background: "var(--panel)",
        borderColor: "var(--panel-line)",
        minWidth: "200px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-xs uppercase tracking-widest border-b font-bold"
        style={{ color: "var(--moon)", borderColor: "var(--panel-line)", opacity: 0.6 }}
      >
        {menu.type === "video" ? "🎬 Clip" : "🎵 Audio"}
      </div>

      {/* Cut at playhead (video only) */}
      {menu.type === "video" && clip && (
        <ContextMenuItem
          label={`Cortar en ${formatTime(currentTime)}`}
          icon="✂️"
          onClick={() => {
            // Trim the end of this clip at the playhead
            const localTime = currentTime - clip.timelineOffset;
            if (localTime > 0 && localTime < (clip.trimEnd - clip.trimStart) / clip.speed) {
              onUpdateVideo({ trimEnd: clip.trimStart + localTime * clip.speed });
            }
            onClose();
          }}
        />
      )}

      {/* Speed (video only) */}
      {menu.type === "video" && clip && (
        <div className="px-3 py-2 flex flex-col gap-1 border-b" style={{ borderColor: "var(--panel-line)" }}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--moon)" }}>
              Velocidad
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--ember)" }}
            >
              {currentSpeed}x
            </span>
          </div>
          <input
            type="range"
            min={0.25} max={4} step={0.25}
            value={currentSpeed}
            onChange={(e) => onUpdateVideo({ speed: parseFloat(e.target.value) })}
            className="w-full"
            style={{ accentColor: "var(--ember)", height: "3px" }}
          />
          <div
            className="flex justify-between text-xs"
            style={{ color: "var(--moon)", opacity: 0.4 }}
          >
            <span>0.25x</span>
            <span>4x</span>
          </div>
        </div>
      )}

      {/* Remove */}
      <ContextMenuItem
        label="Eliminar"
        icon="🗑"
        danger
        onClick={menu.type === "video" ? onRemoveVideo : onRemoveAudio}
      />
    </div>
  );
}

function ContextMenuItem({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-xs text-left transition-all w-full"
      style={{
        color: danger ? "var(--ember)" : "var(--paper)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "rgba(181,67,43,0.15)"
          : "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
