# RAVIX Studio services

The supported browser editor is the Next.js application at the repository root. Start it with `npm run dev -- --port 5173`; it does not depend on the API below. The Vite app in `frontend/` is an unused starter shell, not the editor.

## Optional FastAPI prototype

Requirements: Python 3.10+ and FFmpeg with `ffprobe` available on `PATH`.

```bash
cd ravix-studio/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs> for the API schema. The service currently provides project creation, asset upload, speech analysis, and a basic concatenation export endpoint. It stores uploads and its SQLite database locally; do not use it with private material on an exposed server.

Install FFmpeg and ffprobe separately. On macOS, `brew install ffmpeg` installs both. Set `RAVIX_FFMPEG` and `RAVIX_FFPROBE` to executable paths if they are not on `PATH`. No executable is bundled in Git.

The backend is a prototype: its endpoints are not wired into the browser editor, and the export endpoint concatenates source assets rather than rendering the editor timeline. The browser editor uses FFmpeg.wasm independently.