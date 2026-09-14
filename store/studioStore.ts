import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// TYPES — v2.0
// ============================================================

export type FontFamily =
  | "Bebas Neue"
  | "Inter"
  | "Fraunces"
  | "Montserrat"
  | "Anton"
  | "Permanent Marker"
  | string; // Allow custom fonts by name

// ── Color Correction ─────────────────────────────────────────
// CSS filter preview ↔ FFmpeg eq/colorchannelmixer mapping:
// brightness: CSS brightness(1+v) ↔ FFmpeg eq=brightness=v  [-1, 1]
// contrast:   CSS contrast(v)     ↔ FFmpeg eq=contrast=v    [0, 2]
// saturation: CSS saturate(v)     ↔ FFmpeg eq=saturation=v  [0, 3]
// temperature: custom colorchannelmixer, t in [-1, 1]
// highlights/shadows: curves filter
// vignette: vignette=PI/4*v
export interface ColorCorrection {
  brightness: number;  // -1 to 1 (default 0)
  contrast: number;    // 0 to 2  (default 1)
  saturation: number;  // 0 to 3  (default 1)
  temperature: number; // -1 to 1 (default 0, negative=cool, positive=warm)
  highlights: number;  // 0 to 1  (default 0)
  shadows: number;     // 0 to 1  (default 0)
  vignette: number;    // 0 to 1  (default 0)
}

export const DEFAULT_COLOR_CORRECTION: ColorCorrection = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
};

// ── Subtitle Style — v2.0 (expanded) ────────────────────────
export interface SubtitleStyle {
  fontFamily: FontFamily;
  /** Font size in px relative to 1080p canvas */
  fontSize: number;
  color: string;
  opacity: number;      // 0–1
  strokeWidth: number;  // 0–20px
  strokeColor: string;
  shadowBlur: number;   // 0–30px
  shadowColor: string;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: "Bebas Neue",
  fontSize: 100,
  color: "#ece7e0",
  opacity: 1,
  strokeWidth: 0,
  strokeColor: "#000000",
  shadowBlur: 0,
  shadowColor: "#000000",
};

// ── Core data types ──────────────────────────────────────────

export interface CustomFont {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
}

export interface VideoClip {
  id: string;
  type: "video" | "image";
  file: File;
  objectUrl: string;
  name: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  /** Playback speed 0.25–4x */
  speed: number;
  /** Second offset on the project timeline */
  timelineOffset: number;
  /** Per-clip color correction */
  colorCorrection: ColorCorrection;
}

export interface AudioTrack {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
  timelineOffset: number;
}

export interface Subtitle {
  id: string;
  text: string;
  start: number;
  end: number;
  /** X position: % of canvas width (0–100), maps to center of block */
  xPercent: number;
  /** Y position: % of canvas height (0–100), maps to center of block */
  yPercent: number;
  /** Block width in 1080p-relative px */
  width: number;
  style: SubtitleStyle;
}

// ── Store interface ──────────────────────────────────────────

export interface StudioStore {
  // Media
  videoClips: VideoClip[];
  audioTracks: AudioTrack[];
  subtitles: Subtitle[];
  customFonts: CustomFont[];

  // Playback / UI
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number;
  selectedId: string | null;
  isExporting: boolean;
  exportProgress: number;
  /** Show TikTok/IG Reels safe zone guides overlay */
  showSafeZones: boolean;
  /** Right inspector panel active tab */
  inspectorTab: "clip" | "subtitle";

  // VideoClip actions
  addVideoClip: (file: File, duration: number, type?: "video" | "image") => VideoClip;
  updateVideoClip: (id: string, patch: Partial<VideoClip>) => void;
  updateColorCorrection: (id: string, patch: Partial<ColorCorrection>) => void;
  removeVideoClip: (id: string) => void;
  reorderVideoClips: (orderedIds: string[]) => void;
  splitClip: (id: string, splitTimeSec: number) => void;

  // AudioTrack actions
  addAudioTrack: (file: File, duration: number) => AudioTrack;
  updateAudioTrack: (id: string, patch: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;

  // Subtitle actions
  addSubtitle: (partial?: Partial<Subtitle>) => Subtitle;
  updateSubtitle: (id: string, patch: Partial<Subtitle>) => void;
  updateSubtitleStyle: (id: string, patch: Partial<SubtitleStyle>) => void;
  removeSubtitle: (id: string) => void;

  // Custom Font actions
  addCustomFont: (file: File, name: string) => CustomFont;
  removeCustomFont: (id: string) => void;

  // UI actions
  setCurrentTime: (t: number) => void;
  setIsPlaying: (v: boolean) => void;
  setZoom: (z: number) => void;
  setSelectedId: (id: string | null) => void;
  setIsExporting: (v: boolean) => void;
  setExportProgress: (p: number) => void;
  toggleSafeZones: () => void;
  setInspectorTab: (tab: "clip" | "subtitle") => void;
}

// ============================================================
// HELPERS
// ============================================================

function calcDuration(clips: VideoClip[], audio: AudioTrack[]): number {
  let max = 0;
  for (const c of clips) {
    const end = c.timelineOffset + (c.trimEnd - c.trimStart) / c.speed;
    if (end > max) max = end;
  }
  for (const a of audio) {
    const end = a.timelineOffset + (a.trimEnd - a.trimStart);
    if (end > max) max = end;
  }
  return max;
}

// ============================================================
// STORE
// ============================================================

export const useStudioStore = create<StudioStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────
  videoClips: [],
  audioTracks: [],
  subtitles: [],
  customFonts: [],
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  zoom: 80,
  selectedId: null,
  isExporting: false,
  exportProgress: 0,
  showSafeZones: false,
  inspectorTab: "clip",

  // ── VideoClip actions ───────────────────────────────────────
  addVideoClip: (file, duration, type = "video") => {
    const clip: VideoClip = {
      id: uuidv4(),
      type,
      file,
      objectUrl: URL.createObjectURL(file),
      name: file.name,
      duration,
      trimStart: 0,
      trimEnd: duration,
      speed: 1,
      timelineOffset: calcDuration(get().videoClips, get().audioTracks),
      colorCorrection: { ...DEFAULT_COLOR_CORRECTION },
    };
    set((s) => {
      const clips = [...s.videoClips, clip];
      return { videoClips: clips, duration: calcDuration(clips, s.audioTracks) };
    });
    return clip;
  },

  updateVideoClip: (id, patch) =>
    set((s) => {
      const clips = s.videoClips.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return { videoClips: clips, duration: calcDuration(clips, s.audioTracks) };
    }),

  updateColorCorrection: (id, patch) =>
    set((s) => ({
      videoClips: s.videoClips.map((c) =>
        c.id === id
          ? { ...c, colorCorrection: { ...c.colorCorrection, ...patch } }
          : c
      ),
    })),

  removeVideoClip: (id) =>
    set((s) => {
      const clipToRemove = s.videoClips.find((c) => c.id === id);
      if (clipToRemove?.objectUrl) {
        const isUrlUsedByOthers = s.videoClips.some((c) => c.id !== id && c.objectUrl === clipToRemove.objectUrl);
        if (!isUrlUsedByOthers) {
          URL.revokeObjectURL(clipToRemove.objectUrl);
        }
      }
      const clips = s.videoClips.filter((c) => c.id !== id);
      return { videoClips: clips, duration: calcDuration(clips, s.audioTracks) };
    }),

  reorderVideoClips: (orderedIds) =>
    set((s) => {
      const map = new Map(s.videoClips.map((c) => [c.id, c]));
      const clips = orderedIds.map((id) => map.get(id)!).filter(Boolean);
      let offset = 0;
      const repositioned = clips.map((c) => {
        const segLen = (c.trimEnd - c.trimStart) / c.speed;
        const updated = { ...c, timelineOffset: offset };
        offset += segLen;
        return updated;
      });
      return {
        videoClips: repositioned,
        duration: calcDuration(repositioned, s.audioTracks),
      };
    }),

  splitClip: (id, splitTimeSec) =>
    set((s) => {
      // Check videoClips
      const videoIndex = s.videoClips.findIndex((c) => c.id === id);
      if (videoIndex !== -1) {
        const clip = s.videoClips[videoIndex];
        const localTime = splitTimeSec - clip.timelineOffset;
        const actualSplitTime = clip.trimStart + localTime * clip.speed;

        if (actualSplitTime <= clip.trimStart || actualSplitTime >= clip.trimEnd) return {};

        const clip1 = { ...clip, trimEnd: actualSplitTime };
        const clip2 = {
          ...clip,
          id: uuidv4(),
          timelineOffset: splitTimeSec,
          trimStart: actualSplitTime,
        };

        const newClips = [...s.videoClips];
        newClips.splice(videoIndex, 1, clip1, clip2);
        return { videoClips: newClips, duration: calcDuration(newClips, s.audioTracks) };
      }

      // Check audioTracks
      const audioIndex = s.audioTracks.findIndex((a) => a.id === id);
      if (audioIndex !== -1) {
        const clip = s.audioTracks[audioIndex];
        const localTime = splitTimeSec - clip.timelineOffset;
        const actualSplitTime = clip.trimStart + localTime;

        if (actualSplitTime <= clip.trimStart || actualSplitTime >= clip.trimEnd) return {};

        const clip1 = { ...clip, trimEnd: actualSplitTime };
        const clip2 = {
          ...clip,
          id: uuidv4(),
          timelineOffset: splitTimeSec,
          trimStart: actualSplitTime,
        };

        const newAudio = [...s.audioTracks];
        newAudio.splice(audioIndex, 1, clip1, clip2);
        return { audioTracks: newAudio, duration: calcDuration(s.videoClips, newAudio) };
      }

      // Check subtitles
      const subIndex = s.subtitles.findIndex((sub) => sub.id === id);
      if (subIndex !== -1) {
        const sub = s.subtitles[subIndex];
        if (splitTimeSec <= sub.start || splitTimeSec >= sub.end) return {};

        const sub1 = { ...sub, end: splitTimeSec };
        const sub2 = { ...sub, id: uuidv4(), start: splitTimeSec };

        const newSubs = [...s.subtitles];
        newSubs.splice(subIndex, 1, sub1, sub2);
        return { subtitles: newSubs };
      }

      return {};
    }),

  // ── AudioTrack actions ──────────────────────────────────────
  addAudioTrack: (file, duration) => {
    const track: AudioTrack = {
      id: uuidv4(),
      file,
      objectUrl: URL.createObjectURL(file),
      name: file.name,
      volume: 1,
      trimStart: 0,
      trimEnd: duration,
      timelineOffset: 0,
    };
    set((s) => {
      const audio = [...s.audioTracks, track];
      return { audioTracks: audio, duration: calcDuration(s.videoClips, audio) };
    });
    return track;
  },

  updateAudioTrack: (id, patch) =>
    set((s) => {
      const audio = s.audioTracks.map((a) => (a.id === id ? { ...a, ...patch } : a));
      return { audioTracks: audio, duration: calcDuration(s.videoClips, audio) };
    }),

  removeAudioTrack: (id) =>
    set((s) => {
      const trackToRemove = s.audioTracks.find((a) => a.id === id);
      if (trackToRemove?.objectUrl) {
        const isUrlUsedByOthers = s.audioTracks.some((a) => a.id !== id && a.objectUrl === trackToRemove.objectUrl);
        if (!isUrlUsedByOthers) {
          URL.revokeObjectURL(trackToRemove.objectUrl);
        }
      }
      const audio = s.audioTracks.filter((a) => a.id !== id);
      return { audioTracks: audio, duration: calcDuration(s.videoClips, audio) };
    }),

  // ── Subtitle actions ────────────────────────────────────────
  addSubtitle: (partial = {}) => {
    const sub: Subtitle = {
      id: uuidv4(),
      text: "Texto aquí",
      start: get().currentTime,
      end: get().currentTime + 2,
      xPercent: 50,
      yPercent: 50,
      width: 900,
      style: { ...DEFAULT_SUBTITLE_STYLE },
      ...partial,
    };
    set((s) => ({ subtitles: [...s.subtitles, sub] }));
    return sub;
  },

  updateSubtitle: (id, patch) =>
    set((s) => ({
      subtitles: s.subtitles.map((sub) =>
        sub.id === id ? { ...sub, ...patch } : sub
      ),
    })),

  updateSubtitleStyle: (id, patch) =>
    set((s) => ({
      subtitles: s.subtitles.map((sub) =>
        sub.id === id
          ? { ...sub, style: { ...sub.style, ...patch } }
          : sub
      ),
    })),

  removeSubtitle: (id) =>
    set((s) => ({ subtitles: s.subtitles.filter((sub) => sub.id !== id) })),

  // ── Custom Font actions ─────────────────────────────────────
  addCustomFont: (file, name) => {
    const font: CustomFont = {
      id: uuidv4(),
      name,
      file,
      objectUrl: URL.createObjectURL(file),
    };
    set((s) => ({ customFonts: [...s.customFonts, font] }));
    return font;
  },

  removeCustomFont: (id) =>
    set((s) => {
      const fontToRemove = s.customFonts.find((f) => f.id === id);
      if (fontToRemove?.objectUrl) {
        const isUrlUsedByOthers = s.customFonts.some((f) => f.id !== id && f.objectUrl === fontToRemove.objectUrl);
        if (!isUrlUsedByOthers) {
          URL.revokeObjectURL(fontToRemove.objectUrl);
        }
      }
      return { customFonts: s.customFonts.filter((f) => f.id !== id) };
    }),

  // ── UI actions ──────────────────────────────────────────────
  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setZoom: (z) => set({ zoom: Math.max(20, Math.min(300, z)) }),
  setSelectedId: (id) => set({ selectedId: id }),
  setIsExporting: (v) => set({ isExporting: v }),
  setExportProgress: (p) => set({ exportProgress: p }),
  toggleSafeZones: () => set((s) => ({ showSafeZones: !s.showSafeZones })),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
}));
