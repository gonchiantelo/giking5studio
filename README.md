# RAVIX Studio

RAVIX Studio is a browser-based vertical-video editor built with Next.js, React, Zustand, and FFmpeg.wasm. The main editor lives at `/studio`; the root route redirects there. The separate `ravix-studio/frontend` Vite directory is an unused starter shell and is not the application entry point.

## Run the editor

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev -- --port 5173
```

Open <http://localhost:5173/studio>. Import a video or image from the Media panel, edit it on the timeline, add subtitles in the Text inspector, then choose **Renderizar Reel**. The first export downloads FFmpeg.wasm and the selected subtitle font from their public CDNs.

## Backend

The optional FastAPI service and its current API scope are documented in [ravix-studio/README.md](ravix-studio/README.md). It is a separate prototype and is not required by the browser editor.

## Specification

See [ravix-studio/SPEC.md](ravix-studio/SPEC.md) for the editor workflow, architecture, and known limitations.

## Media and binaries

Do not commit private footage, uploads, local databases, virtual environments, or FFmpeg executables. On macOS, install both `ffmpeg` and `ffprobe` with `brew install ffmpeg`; other operating systems can use the official FFmpeg downloads at <https://ffmpeg.org/download.html>. See the backend guide for executable path overrides.