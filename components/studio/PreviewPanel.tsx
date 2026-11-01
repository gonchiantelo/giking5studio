"use client";

import { useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { useStudioStore, Subtitle } from "@/store/studioStore";
import { buildCSSFilter } from "./ColorCorrectionPanel";
import { DEFAULT_COLOR_CORRECTION } from "@/store/studioStore";
import SafeZoneOverlay from "./SafeZoneOverlay";
import { formatTime } from "@/lib/timelineUtils";

// 9:16 preview dimensions
const PREVIEW_W = 270;
const PREVIEW_H = PREVIEW_W * (16 / 9);
// Full render canvas reference (1080p)
const CANVAS_W = 1080;
const CANVAS_H = 1920;

/** Map a font family name to the correct CSS var or fallback */
function fontFamilyToCss(font: string): string {
  switch (font) {
    case "Bebas Neue":       return "var(--font-bebas), sans-serif";
    case "Fraunces":         return "'Fraunces', serif";
    case "Montserrat":       return "'Montserrat', sans-serif";
    case "Anton":            return "'Anton', sans-serif";
    case "Permanent Marker": return "'Permanent Marker', cursive";
    default:                 return `"${font}", var(--font-inter), sans-serif`;
  }
}

export default function PreviewPanel() {
  const videoClips    = useStudioStore((s) => s.videoClips);
  const subtitles     = useStudioStore((s) => s.subtitles);
  const currentTime   = useStudioStore((s) => s.currentTime);
  const isPlaying     = useStudioStore((s) => s.isPlaying);
  const duration      = useStudioStore((s) => s.duration);
  const showSafeZones = useStudioStore((s) => s.showSafeZones);
  const selectedId    = useStudioStore((s) => s.selectedId);
  const setCurrentTime   = useStudioStore((s) => s.setCurrentTime);
  const setIsPlaying     = useStudioStore((s) => s.setIsPlaying);
  const toggleSafeZones  = useStudioStore((s) => s.toggleSafeZones);
  const updateSubtitle   = useStudioStore((s) => s.updateSubtitle);
  const setSelectedId    = useStudioStore((s) => s.setSelectedId);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Active clip based on currentTime (multi-clip playback support)
  const activeClip = videoClips.find(
    (c) =>
      currentTime >= c.timelineOffset &&
      currentTime <= c.timelineOffset + (c.trimEnd - c.trimStart) / c.speed
  ) || videoClips[0];

  // Sync store currentTime → video element when scrubbing/seeking
  useEffect(() => {
    if (!videoRef.current || !activeClip || activeClip.type !== "video") return;
    
    // Convert global timeline time to local video time
    const localTime = activeClip.trimStart + (currentTime - activeClip.timelineOffset) * activeClip.speed;
    
    // Only update if we're sufficiently out of sync (e.g. from user scrubbing)
    if (Math.abs(videoRef.current.currentTime - localTime) > 0.3) {
      videoRef.current.currentTime = localTime;
    }
  }, [currentTime, activeClip]);

  // Sync isPlaying → video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);



  // rAF loop to drive currentTime when active clip is an image (or no clip)
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      const store = useStudioStore.getState();
      const cTime = store.currentTime;
      
      // Find what's currently playing
      const aClip = store.videoClips.find(
        (c) =>
          cTime >= c.timelineOffset &&
          cTime <= c.timelineOffset + (c.trimEnd - c.trimStart) / c.speed
      ) || store.videoClips[0];

      // If it's an image, or there's no clip, we must advance time manually
      if (!aClip || aClip.type === "image") {
        let nextTime = cTime + deltaSec;
        if (nextTime >= store.duration && store.duration > 0) {
          nextTime = store.duration;
          store.setIsPlaying(false);
        }
        store.setCurrentTime(nextTime);
      } else if (store.isPlaying && videoRef.current) {
        // Poll the native video element's time at 60fps for smooth timeline updates
        let nextTime = aClip.timelineOffset + (videoRef.current.currentTime - aClip.trimStart) / aClip.speed;
        
        // Ensure we don't play past the clip's trim boundary
        if (videoRef.current.currentTime >= aClip.trimEnd) {
          nextTime = aClip.timelineOffset + (aClip.trimEnd - aClip.trimStart) / aClip.speed;
        }

        if (nextTime >= store.duration && store.duration > 0) {
          nextTime = store.duration;
          store.setIsPlaying(false);
        }
        store.setCurrentTime(nextTime);
      }

      animFrame = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animFrame = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying]);



  // Build CSS filter for the active clip
  const cssFilter = activeClip
    ? buildCSSFilter(activeClip.colorCorrection)
    : buildCSSFilter(DEFAULT_COLOR_CORRECTION);

  // Vignette overlay opacity
  const vignetteOpacity = activeClip?.colorCorrection.vignette ?? 0;

  // Active subtitles at currentTime
  const activeSubtitles = subtitles.filter(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  const scaleFactor = PREVIEW_W / CANVAS_W;

  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* ── 9:16 Preview Container ─────────────────── */}
      <div style={{ position: "relative", width: `${PREVIEW_W}px`, height: `${PREVIEW_H}px` }}>

        {/* Safe zones toggle button */}
        <button
          onClick={toggleSafeZones}
          className="absolute top-2 left-2 z-20 flex items-center justify-center w-7 h-7 rounded-sm transition-all"
          style={{
            background: showSafeZones ? "var(--ember)" : "rgba(0,0,0,0.5)",
            color: "var(--paper)",
            fontSize: "0.8rem",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          title="Mostrar/ocultar zonas seguras TikTok/Reels"
        >
          👁
        </button>

        {/* Main canvas */}
        <div
          className="relative overflow-hidden"
          style={{
            width: `${PREVIEW_W}px`,
            height: `${PREVIEW_H}px`,
            background: "var(--black)",
            border: "1px solid var(--panel-line)",
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* Media Player */}
          {activeClip ? (
            activeClip.type === "image" ? (
              <img
                src={activeClip.objectUrl}
                alt={activeClip.name}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150"
                style={{
                  filter: cssFilter,
                  opacity:
                    currentTime >= activeClip.timelineOffset &&
                    currentTime <=
                      activeClip.timelineOffset +
                        (activeClip.trimEnd - activeClip.trimStart) / activeClip.speed
                      ? 1
                      : 0,
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={activeClip.objectUrl}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150"
                style={{
                  filter: cssFilter,
                  opacity:
                    currentTime >= activeClip.timelineOffset &&
                    currentTime <=
                      activeClip.timelineOffset +
                        (activeClip.trimEnd - activeClip.trimStart) / activeClip.speed
                      ? 1
                      : 0,
                }}
                onEnded={() => setIsPlaying(false)}
                muted={false}
                playsInline
              />
            )
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-xs text-center px-4"
              style={{ color: "var(--moon)", opacity: 0.4 }}
            >
              Subí un video desde el panel izquierdo.
            </div>
          )}

          {/* Vignette overlay */}
          {vignetteOpacity > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
                zIndex: 1,
              }}
            />
          )}

          {/* Safe zones */}
          {showSafeZones && <SafeZoneOverlay />}

          {/* Subtitle overlays — draggable/resizable via react-rnd */}
          {subtitles.map((sub) => {
            const isActive = currentTime >= sub.start && currentTime <= sub.end;
            const isSelected = sub.id === selectedId;

            // Convert % positions to preview px
            const xPx = (sub.xPercent / 100) * PREVIEW_W - (sub.width * scaleFactor) / 2;
            const yPx = (sub.yPercent / 100) * PREVIEW_H - (sub.style.fontSize * scaleFactor) / 2;
            const widthPx = sub.width * scaleFactor;

            return (
              isActive ? (
              <Rnd
                key={sub.id}
                position={{ x: xPx, y: yPx }}
                size={{ width: widthPx, height: "auto" }}
                bounds="parent"
                enableResizing={{
                  right: true, left: true,
                  top: false, bottom: false,
                  topLeft: false, topRight: false,
                  bottomLeft: false, bottomRight: false,
                }}
                onDragStop={(_e, d) => {
                  // Convert back to % of canvas
                  const newXPercent = ((d.x + widthPx / 2) / PREVIEW_W) * 100;
                  const newYPercent = ((d.y + (sub.style.fontSize * scaleFactor) / 2) / PREVIEW_H) * 100;
                  updateSubtitle(sub.id, {
                    xPercent: Math.max(0, Math.min(100, newXPercent)),
                    yPercent: Math.max(0, Math.min(100, newYPercent)),
                  });
                }}
                onResizeStop={(_e, _dir, ref) => {
                  // Convert new width back to 1080p-relative
                  const newWidth = parseFloat(ref.style.width) / scaleFactor;
                  updateSubtitle(sub.id, { width: newWidth });
                }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setSelectedId(sub.id);
                }}
                style={{
                  zIndex: isSelected ? 10 : 5,
                  opacity: sub.style.opacity,
                  outline: isSelected ? "1px dashed var(--ember)" : "1px dashed transparent",
                  cursor: "move",
                }}
              >
                <SubtitleText sub={sub} scaleFactor={scaleFactor} />
              </Rnd>
              ) : null
            );
          })}

          {/* Watermark */}
          <div
            className="absolute bottom-2 right-2 text-xs tracking-widest pointer-events-none"
            style={{
              fontFamily: "var(--font-bebas)",
              color: "var(--ember)",
              opacity: 0.5,
              zIndex: 20,
            }}
          >
            GOKING5
          </div>
        </div>
      </div>

      {/* ── Transport Controls ───────────────────────── */}
      <div
        className="flex flex-col items-center gap-2 w-full"
        style={{ maxWidth: `${PREVIEW_W}px` }}
      >
        {/* Timecode */}
        <div
          className="text-sm tracking-wider"
          style={{ fontFamily: "var(--font-bebas)", color: "var(--moon)" }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            setCurrentTime(t);
            if (videoRef.current) videoRef.current.currentTime = t;
          }}
          className="w-full h-1 rounded-full cursor-pointer"
          style={{ accentColor: "var(--ember)" }}
        />

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-opacity hover:opacity-80"
          style={{ background: "var(--ember)", color: "var(--paper)" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>
    </div>
  );
}

// ── Subtitle text renderer ───────────────────────────────────

function SubtitleText({ sub, scaleFactor }: { sub: Subtitle; scaleFactor: number }) {
  const { style } = sub;

  const textShadow = style.shadowBlur > 0
    ? `${style.shadowBlur * scaleFactor * 0.5}px ${style.shadowBlur * scaleFactor * 0.5}px ${style.shadowBlur * scaleFactor}px ${style.shadowColor}`
    : "none";

  const webkitStroke = style.strokeWidth > 0
    ? `${style.strokeWidth * scaleFactor}px ${style.strokeColor}`
    : undefined;

  return (
    <div
      style={{
        fontFamily: fontFamilyToCss(style.fontFamily),
        fontSize: `${style.fontSize * scaleFactor}px`,
        color: style.color,
        textShadow,
        WebkitTextStroke: webkitStroke,
        textAlign: "center",
        lineHeight: 1,
        width: "100%",
        userSelect: "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {sub.text}
    </div>
  );
}
