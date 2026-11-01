import io
import os
import subprocess
import json
from pathlib import Path
import torch
import soundfile as sf

# Path to static ffmpeg binary (imported from main via relative import)
from ..main import FFMPEG_BIN

# Load Silero VAD model (cached)
_model = None

def _load_model():
    global _model
    if _model is None:
        # Silero VAD model repository
        _model = torch.hub.load('snakers4/silero-vad', 'silero_vad', force_reload=False)
    return _model

def _extract_waveform(video_path: Path) -> torch.Tensor:
    """Extract mono 16kHz waveform from video using ffmpeg.
    Returns a torch tensor of shape (samples,).
    """
    cmd = [
        str(FFMPEG_BIN),
        "-i", str(video_path),
        "-ar", "16000",
        "-ac", "1",
        "-f", "wav",
        "-hide_banner",
        "-loglevel", "error",
        "pipe:1",
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr.decode()}")
    # Load wav from bytes
    data, samplerate = sf.read(io.BytesIO(result.stdout), dtype="float32")
    if samplerate != 16000:
        raise RuntimeError("Unexpected sample rate after extraction")
    return torch.from_numpy(data).float()

def process_vad(video_path: Path):
    """Run Silero VAD on the provided video file.
    Returns a list of dicts: [{"start": float, "end": float}, ...]
    """
    model = _load_model()
    waveform = _extract_waveform(video_path)
    # Model expects batch dimension
    speech_prob = model(waveform)
    # Convert probabilities to speech segments using built‑in utility
    # Silero provides get_speech_timestamps utility
    from silero_vad import get_speech_timestamps
    timestamps = get_speech_timestamps(waveform, model, sampling_rate=16000)
    # timestamps is list of dicts with 'start' and 'end' in samples
    intervals = [
        {"start": ts["start"] / 16000.0, "end": ts["end"] / 16000.0}
        for ts in timestamps
    ]
    return intervals
