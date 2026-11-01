# RAVIX Studio specification

## Product scope

RAVIX Studio edits short-form vertical video in the browser. The supported application is the Next.js App Router project at the repository root. `/` redirects to `/studio`.

## Editor workflow

1. Import video, JPEG/PNG images, or audio into the Media panel.
2. Scrub and play media in the 9:16 preview; arrange, trim, split, and adjust clips on the timeline.
3. Add timed subtitle blocks, edit their text and style, and optionally run automatic subtitle transcription where the configured API supports it.
4. Render a 1080x1920 MP4 in the browser with FFmpeg.wasm and download it.

## Architecture and data

- `components/studio/` implements the editor panels and interactions.
- `store/studioStore.ts` holds the in-memory project state. The browser editor does not currently persist projects between reloads.
- `hooks/useFFmpeg.ts` loads FFmpeg.wasm and renders clips, audio, color filters, and subtitle overlays.
- `ravix-studio/backend/` is a separate optional FastAPI prototype. It is not the source of the editor UI and is not integrated into the editor workflow.
- `ravix-studio/frontend/` is an unused Vite starter shell; do not use it to start the supported editor.

## Runtime requirements

The root application requires Node.js 20.9+ and npm. Export requires a browser capable of running WebAssembly workers and network access to the configured FFmpeg core and Google Fonts URLs. The API prototype requires Python 3.10+, its `requirements.txt`, and external `ffmpeg`/`ffprobe` executables.

## Current limitations

- Editor state and imported media are held in browser memory and are lost on reload.
- Export is client-side, resource-intensive, and downloads the FFmpeg core and any selected built-in subtitle font on demand.
- Automatic transcription is not currently enabled by the root API route.
- The optional API export concatenates uploaded assets and does not apply the browser timeline edits.
- The public Vercel URL has returned HTTP 404 in the last observed check; a successful deployment has not been verified.