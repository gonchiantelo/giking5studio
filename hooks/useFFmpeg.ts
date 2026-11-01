"use client";

import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useStudioStore } from "@/store/studioStore";

const CDN_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
const FONT_URLS: Record<string, string> = {
  "Bebas Neue": "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/bebasneue/BebasNeue-Regular.ttf",
  Inter: "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
  Fraunces: "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf",
  Montserrat: "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
  Anton: "https://raw.githubusercontent.com/google/fonts/refs/heads/main/ofl/anton/Anton-Regular.ttf",
  "Permanent Marker": "https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004Hao.ttf",
};

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setIsExporting, setExportProgress } = useStudioStore();

  /** Lazy-load ffmpeg.wasm core. Safe to call multiple times. */
  const load = useCallback(async () => {
    if (isLoaded || isLoading) return;
    setIsLoading(true);
    const ffmpeg = new FFmpeg();

    // Wire up progress callback
    ffmpeg.on("progress", ({ progress }) => {
      setExportProgress(Math.round(progress * 100));
    });

    // Load ffmpeg core via CDN with toBlobURL for COEP compatibility
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${CDN_BASE}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    ffmpegRef.current = ffmpeg;
    setIsLoaded(true);
    setIsLoading(false);
  }, [isLoaded, isLoading, setExportProgress]);

  /**
   * Render the project to a 1080x1920 MP4.
   * Reads VideoClips, AudioTracks and Subtitles from the store.
   */
  const renderProject = useCallback(async () => {
    const store = useStudioStore.getState();
    const { videoClips, audioTracks, subtitles, customFonts } = store;

    if (!ffmpegRef.current) {
      await load();
    }
    const ffmpeg = ffmpegRef.current!;

    setIsExporting(true);
    setExportProgress(0);

    let exportPhase = "writing inputs";
    try {
      // ── 1. Write input files to ffmpeg's virtual FS ───────
      for (let i = 0; i < videoClips.length; i++) {
        const data = await fetchFile(videoClips[i].file);
        await ffmpeg.writeFile(`input_v${i}.mp4`, data);
      }

      for (let i = 0; i < audioTracks.length; i++) {
        const data = await fetchFile(audioTracks[i].file);
        await ffmpeg.writeFile(`input_a${i}.mp3`, data);
      }

      // FFmpeg's virtual filesystem needs actual font files for drawtext.
      const requiredFonts = new Map<string, string>();
      for (const subtitle of subtitles) {
        const customFont = customFonts.find((font) => font.name === subtitle.style.fontFamily);
        if (customFont) continue;

        const fontFile = `${subtitle.style.fontFamily.replace(/\s+/g, "")}.ttf`;
        const fontUrl = FONT_URLS[subtitle.style.fontFamily];
        if (fontUrl) requiredFonts.set(fontFile, fontUrl);
      }
      for (const [fontFile, fontUrl] of requiredFonts) {
        await ffmpeg.writeFile(fontFile, await fetchFile(fontUrl));
      }

      // Write custom fonts to virtual FS.
      for (const font of customFonts) {
        const data = await fetchFile(font.file);
        await ffmpeg.writeFile(font.file.name, data);
      }

      // ── 2. Build filter_complex string ───────────────────
      const filterParts: string[] = [];
      const inputArgs: string[] = [];
      let filterIndex = 0;

      // Map each video clip into a labelled stream
      for (let i = 0; i < videoClips.length; i++) {
        const c = videoClips[i];
        
        // Input arguments
        if (c.type === "image") {
          // Loop image for its duration
          inputArgs.push("-loop", "1", "-t", (c.trimEnd - c.trimStart).toFixed(3), "-i", `input_v${i}.mp4`);
        } else {
          inputArgs.push("-i", `input_v${i}.mp4`);
        }

        // trim → setpts (speed)
        let pts = c.speed !== 1 ? `,setpts=${(1 / c.speed).toFixed(4)}*PTS` : "";
        let trim = c.type === "video" ? `trim=start=${c.trimStart.toFixed(3)}:end=${c.trimEnd.toFixed(3)},setpts=PTS-STARTPTS` : "";
        if (trim && pts) pts = pts; // Combine if both present
        const timeFilter = trim ? `${trim}${pts}` : (pts ? pts.slice(1) : ""); // Remove leading comma if no trim

        // color correction
        const cc = c.colorCorrection;
        let ccFilter = "";
        if (cc) {
          const eq = `eq=brightness=${cc.brightness.toFixed(2)}:contrast=${cc.contrast.toFixed(2)}:saturation=${cc.saturation.toFixed(2)}`;
          const t = cc.temperature;
          const mixer = `colorchannelmixer=rr=${(1 + t).toFixed(2)}:bb=${(1 - t).toFixed(2)}`;
          const vig = cc.vignette > 0 ? `,vignette=PI/4*${cc.vignette.toFixed(2)}` : "";
          // Note: highlights and shadows via FFmpeg curves filter can be complex. 
          // For MVP we map what's reliably supported.
          ccFilter = `,${eq},${mixer}${vig}`;
        }

        // Apply scale/pad for 1080x1920
        // Ensure images get proper framerate conversion before joining
        const fpsFilter = c.type === "image" ? ",fps=30" : "";
        const baseFilter = timeFilter ? `${timeFilter}${ccFilter},` : (ccFilter ? `${ccFilter.slice(1)},` : "");

        filterParts.push(
          `[${filterIndex}:v]${baseFilter}` +
            `scale=1080:1920:force_original_aspect_ratio=decrease,` +
            `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black${fpsFilter}[v${i}]`
        );
        filterIndex++;
      }

      // Audio inputs
      for (let i = 0; i < audioTracks.length; i++) {
        const a = audioTracks[i];
        inputArgs.push("-i", `input_a${i}.mp3`);
        filterParts.push(
          `[${filterIndex}:a]atrim=start=${a.trimStart.toFixed(3)}:end=${a.trimEnd.toFixed(3)},` +
            `asetpts=PTS-STARTPTS,volume=${a.volume.toFixed(2)}[a${i}]`
        );
        filterIndex++;
      }

      // Concat all video clips
      const videoLabels = videoClips.map((_, i) => `[v${i}]`).join("");
      const concatOut = videoClips.length > 1 ? "[vconcat]" : "[v0]";
      if (videoClips.length > 1) {
        filterParts.push(
          `${videoLabels}concat=n=${videoClips.length}:v=1:a=0[vconcat]`
        );
      }

      // Overlay subtitles via drawtext filters chained
      let lastVideoLabel = videoClips.length > 1 ? "vconcat" : "v0";
      for (let i = 0; i < subtitles.length; i++) {
        const sub = subtitles[i];
        const escapedText = sub.text
          .replace(/'/g, "\\'")
          .replace(/:/g, "\\:")
          .replace(/,/g, "\\,");

        const style = sub.style;
        const fontSize = Math.round(style.fontSize);

        // Map font file
        let fontFile = "Inter-Bold.ttf";
        const customFont = customFonts.find(f => f.name === style.fontFamily);
        if (customFont) {
          fontFile = customFont.file.name;
        } else {
          switch (style.fontFamily) {
            case "Bebas Neue": fontFile = "BebasNeue.ttf"; break;
            case "Fraunces": fontFile = "Fraunces.ttf"; break;
            case "Montserrat": fontFile = "Montserrat.ttf"; break;
            case "Anton": fontFile = "Anton.ttf"; break;
            case "Permanent Marker": fontFile = "PermanentMarker.ttf"; break;
            case "Inter": fontFile = "Inter.ttf"; break;
          }
        }

        // Map position (% to coords)
        const xExpr = `(w*${(sub.xPercent / 100).toFixed(4)})-(tw/2)`;
        const yExpr = `(h*${(sub.yPercent / 100).toFixed(4)})-(th/2)`;

        // Map color and opacity
        const hexColor = style.color.replace("#", "");
        const hexAlpha = Math.round(style.opacity * 255).toString(16).padStart(2, '0');
        const fontColorStr = `0x${hexColor}${hexAlpha}`;

        // Map stroke
        let borderStr = "";
        if (style.strokeWidth > 0) {
          const strokeColor = style.strokeColor.replace("#", "");
          borderStr = `:borderw=${style.strokeWidth}:bordercolor=0x${strokeColor}${hexAlpha}`;
        }

        // Map shadow
        let shadowStr = "";
        if (style.shadowBlur > 0) {
          const shadowColor = style.shadowColor.replace("#", "");
          const offset = Math.round(style.shadowBlur / 2);
          shadowStr = `:shadowx=${offset}:shadowy=${offset}:shadowcolor=0x${shadowColor}${hexAlpha}`;
        }

        const nextLabel = i < subtitles.length - 1 ? `vtxt${i}` : "vfinal";
        filterParts.push(
          `[${lastVideoLabel}]drawtext=` +
            `fontfile=${fontFile}:` +
            `text='${escapedText}':` +
            `fontsize=${fontSize}:` +
            `fontcolor=${fontColorStr}` +
            borderStr +
            shadowStr +
            `:x=${xExpr}:y=${yExpr}:` +
            `enable='between(t,${sub.start.toFixed(3)},${sub.end.toFixed(3)})'` +
            `[${nextLabel}]`
        );
        lastVideoLabel = nextLabel;
      }

      // If no subtitles, rename final label
      if (subtitles.length === 0) {
        filterParts.push(`[${lastVideoLabel}]null[vfinal]`);
      }

      // Mix audio tracks (or silence if none)
      let audioMapArg: string[] = [];
      if (audioTracks.length > 1) {
        const audioLabels = audioTracks.map((_, i) => `[a${i}]`).join("");
        filterParts.push(
          `${audioLabels}amix=inputs=${audioTracks.length}:duration=longest[amixed]`
        );
        audioMapArg = ["-map", "[amixed]"];
      } else if (audioTracks.length === 1) {
        audioMapArg = ["-map", "[a0]"];
      }

      // ── 3. Execute FFmpeg ────────────────────────────────
      exportPhase = "encoding video";
      const filterComplex = filterParts.join(";");

      const args = [
        ...inputArgs,
        "-filter_complex",
        filterComplex,
        "-map",
        "[vfinal]",
        ...audioMapArg,
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-preset",
        "ultrafast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "output.mp4",
      ];

      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with code ${exitCode}`);
      }

      // ── 4. Read output and trigger download ─────────────
      exportPhase = "reading output";
      const rawData = await ffmpeg.readFile("output.mp4");
      const uint8 = rawData as Uint8Array;
      const plainBuffer = uint8.buffer.slice(
        uint8.byteOffset,
        uint8.byteOffset + uint8.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([plainBuffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "goking5-reel.mp4";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      throw new Error(`FFmpeg failed while ${exportPhase}: ${String(error)}`);
    } finally {
      setIsExporting(false);
    }
  }, [load, setIsExporting, setExportProgress]);

  return { load, isLoaded, isLoading, renderProject };
}

