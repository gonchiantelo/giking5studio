/** Convert seconds to pixels given zoom (px/s) */
export function secToPx(seconds: number, zoom: number): number {
  return seconds * zoom;
}

/** Convert pixels to seconds given zoom (px/s) */
export function pxToSec(px: number, zoom: number): number {
  return px / zoom;
}

/** Format seconds as MM:SS:ms for display */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Get a video file's duration via HTMLVideoElement */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      reject(new Error("No se pudo leer la duración del video."));
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

/** Get an audio file's duration via HTMLAudioElement */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      reject(new Error("No se pudo leer la duración del audio."));
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}
