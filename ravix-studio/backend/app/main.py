from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import subprocess
import sqlite3
import uuid
import json
import os

app = FastAPI(title="RAVIX Studio Backend")

# Allow any origin for development (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def resolve_binary(name: str, env_name: str) -> Path:
    configured = os.environ.get(env_name)
    if configured:
        return Path(configured)
    return Path(shutil.which(name) or Path(__file__).parents[2] / "bin" / name)


FFMPEG_BIN = resolve_binary("ffmpeg", "RAVIX_FFMPEG")
FFPROBE_BIN = resolve_binary("ffprobe", "RAVIX_FFPROBE")

# Serve uploaded media files
MEDIA_ROOT = Path(__file__).parent / "media"
MEDIA_ROOT.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

DB_PATH = Path(__file__).parent / "ravix.db"

# ---------- DB utilities ----------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            duration REAL,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            result TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------- Schemas ----------
class ProjectCreate(BaseModel):
    name: str

class ProjectInfo(BaseModel):
    id: str
    name: str
    created_at: str

class AssetInfo(BaseModel):
    id: str
    filename: str
    duration: float | None = None

# ---------- Helper functions ----------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def probe_duration(file_path: Path) -> float:
    """Return video duration in seconds via ffprobe."""
    cmd = [str(FFPROBE_BIN), "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    return float(result.stdout.strip())

def run_vad(audio_path: Path, project_id: str, job_id: str):
    """Run Silero VAD on the provided video/audio file.
    The VAD processing is delegated to a helper service that extracts audio,
    runs the Silero model and returns a list of speech intervals.
    """
    from .services.vad_service import process_vad
    # Obtain intervals (list of dicts with start/end in seconds)
    intervals = process_vad(audio_path)
    # Store result in jobs table
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE jobs SET status = ?, result = ?, updated_at = datetime('now') WHERE id = ?",
        ("completed", json.dumps(intervals), job_id),
    )
    conn.commit()
    conn.close()

# ---------- Endpoints ----------
@app.post("/projects", response_model=ProjectInfo)
def create_project(payload: ProjectCreate):
    proj_id = str(uuid.uuid4())
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO projects (id, name, created_at) VALUES (?, ?, datetime('now'))",
        (proj_id, payload.name),
    )
    conn.commit()
    conn.close()
    return ProjectInfo(id=proj_id, name=payload.name, created_at="now")

@app.get("/projects/{project_id}", response_model=ProjectInfo)
def get_project(project_id: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectInfo(id=row["id"], name=row["name"], created_at=row["created_at"])

@app.post("/projects/{project_id}/assets", response_model=AssetInfo)
async def upload_asset(project_id: str, file: UploadFile = File(...)):
    # Verify project exists
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")
    # Save file
    asset_id = str(uuid.uuid4())
    dest_path = MEDIA_ROOT / f"{asset_id}_{file.filename}"
    with dest_path.open("wb") as out_f:
        while content := await file.read(1024 * 1024):
            out_f.write(content)
    # Probe duration
    try:
        duration = probe_duration(dest_path)
    except Exception:
        duration = None
    # Register asset
    cur.execute(
        "INSERT INTO assets (id, project_id, filename, filepath, duration) VALUES (?,?,?,?,?)",
        (asset_id, project_id, file.filename, str(dest_path), duration),
    )
    conn.commit()
    conn.close()
    return AssetInfo(id=asset_id, filename=file.filename, duration=duration)

@app.post("/projects/{project_id}/analyze")
def start_analysis(project_id: str, background: BackgroundTasks):
    # Create a job entry
    job_id = str(uuid.uuid4())
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO jobs (id, project_id, type, status, created_at, updated_at) VALUES (?,?,?,?,datetime('now'),datetime('now'))",
        (job_id, project_id, "vad", "running"),
    )
    conn.commit()
    conn.close()
    # For demo we pick first asset of project
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT filepath FROM assets WHERE project_id = ? LIMIT 1", (project_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=400, detail="No assets to analyze")
    audio_path = Path(row["filepath"])
    # Launch background VAD (dummy)
    background.add_task(run_vad, audio_path, project_id, job_id)
    return {"job_id": job_id, "status": "running"}

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"id": row["id"], "type": row["type"], "status": row["status"], "result": json.loads(row["result"]) if row["result"] else None}

@app.post("/projects/{project_id}/export")
def export_video(project_id: str, background: BackgroundTasks):
    # Very simplified export: concatenate all assets (no cuts) into one MP4 using ffmpeg concat demuxer
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT filepath FROM assets WHERE project_id = ?", (project_id,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        raise HTTPException(status_code=400, detail="No assets to export")
    input_list_path = MEDIA_ROOT / f"{project_id}_list.txt"
    with input_list_path.open("w") as f:
        for r in rows:
            f.write(f"file '{r['filepath']}'\n")
    output_path = MEDIA_ROOT / f"{project_id}_export.mp4"
    cmd = [str(FFMPEG_BIN), "-f", "concat", "-safe", "0", "-i", str(input_list_path), "-c", "copy", str(output_path)]
    # Run synchronously for demo
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"ffmpeg error: {result.stderr}")
    return {"export_path": str(output_path)}
