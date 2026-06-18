"""
SADA Deepfake Detection Model
──────────────────────────────
Wav2Vec2-Base backbone with a custom classification head.
  • projector : Linear(768 → 256)
  • classifier: Linear(256 → 2)   index 0 = AI/fake, index 1 = human/real

Weights are loaded from a state-dict file (best_deepfake_model_tensor.pt).
"""

from __future__ import annotations

import io
import logging
import os
import glob
from pathlib import Path

# --- Auto-inject FFmpeg to PATH for Windows (winget support) ---
if os.name == 'nt':
    local_app_data = os.environ.get('LOCALAPPDATA', '')
    if local_app_data:
        ffmpeg_pattern = os.path.join(local_app_data, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg*", "**", "bin")
        for p in glob.glob(ffmpeg_pattern, recursive=True):
            if os.path.isdir(p) and "ffmpeg.exe" in os.listdir(p):
                if p not in os.environ.get("PATH", ""):
                    os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
                break


# pyrefly: ignore [missing-import]
import librosa
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import Wav2Vec2Model, Wav2Vec2FeatureExtractor

logger = logging.getLogger(__name__)

# ── Label mapping ──────────────────────────────────────────────────────────
LABELS = {0: "human", 1: "ai"}
SAMPLE_RATE = 16_000          # Wav2Vec2 expects 16 kHz
MAX_DURATION_SEC = 30         # Truncate very long clips to save memory


# ── Model architecture ────────────────────────────────────────────────────
class DeepfakeDetector(nn.Module):
    """Wav2Vec2-Base + projection head + 2-class classifier."""

    def __init__(self, pretrained_backbone: str = "facebook/wav2vec2-base"):
        super().__init__()
        self.wav2vec2 = Wav2Vec2Model.from_pretrained(pretrained_backbone)
        self.projector = nn.Linear(768, 256)
        self.classifier = nn.Linear(256, 2)

    def forward(
        self,
        input_values: torch.Tensor,
        attention_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        outputs = self.wav2vec2(
            input_values=input_values,
            attention_mask=attention_mask,
        )
        # Mean-pool over time axis
        hidden = outputs.last_hidden_state            # (B, T, 768)
        if attention_mask is not None:
            mask = attention_mask.unsqueeze(-1).float()  # (B, T, 1)
            pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        else:
            pooled = hidden.mean(dim=1)                # (B, 768)

        projected = self.projector(pooled)             # (B, 256)
        logits = self.classifier(projected)            # (B, 2)
        return logits


# ── Loading ────────────────────────────────────────────────────────────────
def load_model(
    weights_path: str | Path,
    device: str = "cpu",
) -> tuple[DeepfakeDetector, Wav2Vec2FeatureExtractor]:
    """Instantiate model, load weights, and return (model, feature_extractor)."""
    logger.info("Loading Wav2Vec2 backbone from HuggingFace …")
    model = DeepfakeDetector(pretrained_backbone="facebook/wav2vec2-base")

    logger.info("Loading fine-tuned weights from %s …", weights_path)
    state_dict = torch.load(weights_path, map_location=device, weights_only=False)
    model.load_state_dict(state_dict, strict=True)
    model.to(device)
    model.eval()
    logger.info("Model loaded successfully on device=%s", device)

    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
        "facebook/wav2vec2-base"
    )
    return model, feature_extractor


import tempfile

# ── Inference ──────────────────────────────────────────────────────────────

def _guess_suffix(raw_bytes: bytes) -> str:
    """Guess file extension from magic bytes so librosa/ffmpeg decodes correctly."""
    header = raw_bytes[:16]
    if header[:4] == b'RIFF' and header[8:12] == b'WAVE':
        return ".wav"
    if header[:3] == b'ID3' or header[:2] == b'\xff\xfb':
        return ".mp3"
    if header[:4] == b'fLaC':
        return ".flac"
    if header[:4] == b'OggS':
        return ".ogg"
    if header[4:8] == b'ftyp':          # MP4/M4A container
        return ".m4a"
    if header[:4] == b'\x1aE\xdf\xa3':  # Matroska/WebM
        return ".webm"
    return ".wav"  # fallback — most decoders handle raw PCM


def _load_audio(raw_bytes: bytes) -> np.ndarray:
    """Decode arbitrary audio bytes to a 16 kHz mono float32 numpy array."""
    suffix = _guess_suffix(raw_bytes)
    logger.info("Detected audio format suffix: %s (%d bytes)", suffix, len(raw_bytes))

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw_bytes)
        tmp_path = tmp.name

    try:
        audio, _ = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
    finally:
        os.remove(tmp_path)

    # Truncate to MAX_DURATION_SEC to avoid OOM
    max_samples = SAMPLE_RATE * MAX_DURATION_SEC
    if len(audio) > max_samples:
        audio = audio[:max_samples]

    # Peak-normalise so quiet mic recordings match the amplitude of
    # clean uploaded files the model was trained on.
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        audio = audio / peak

    return audio


@torch.no_grad()
def predict(
    audio_bytes: bytes,
    model: DeepfakeDetector,
    feature_extractor: Wav2Vec2FeatureExtractor,
    device: str = "cpu",
) -> dict:
    """
    Run inference on raw audio bytes.

    Returns
    -------
    dict  {"label": "ai"|"human", "confidence": float, "breakdown": {...}}
    """
    # 1. Decode audio
    waveform = _load_audio(audio_bytes)
    duration_seconds = len(waveform) / SAMPLE_RATE

    if len(waveform) < SAMPLE_RATE * 0.5:
        raise ValueError(
            f"Audio too short ({duration_seconds:.1f}s). "
            "Please provide at least 0.5 seconds of audio."
        )

    # 2. Feature extraction
    inputs = feature_extractor(
        waveform,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )
    input_values = inputs.input_values.to(device)

    # 3. Forward pass
    logits = model(input_values)                      # (1, 2)
    probs = F.softmax(logits, dim=-1).squeeze(0)      # (2,)

    human_prob = round(probs[0].item() * 100, 2)
    ai_prob = round(probs[1].item() * 100, 2)

    label = LABELS[probs.argmax().item()]
    confidence = ai_prob if label == "ai" else human_prob

    return {
        "label": label,
        "confidence": confidence,
        "breakdown": {
            "ai": ai_prob,
            "human": human_prob,
            "noise": 0.0,
        },
        "duration_seconds": round(duration_seconds, 2),
    }
