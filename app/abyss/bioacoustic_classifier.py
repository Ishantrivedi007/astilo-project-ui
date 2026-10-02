"""Bioacoustic Classifier (blueprint section 29) — a real local ML model,
Google's YAMNet (521-class AudioSet event classifier), run entirely
offline against Astilo's own NOAA sound catalog. No paid API, no cloud
inference.

Terminology matters here per the blueprint: this is a general-purpose sound
event classifier, not a marine-species identifier, so its output is always
"POSSIBLE CLASSIFICATION" (confidence=AI_INFERRED) and never "species
identified" — a real whale recording typically ranks "Whale vocalization"
among its top classes alongside unrelated ones like "Music", which is
exactly the kind of honest uncertainty this label exists to convey.

The model is downloaded once (~14MB) directly from Google's Kaggle-hosted
SavedModel bundle and cached to ABYSS_YAMNET_DIR, bypassing the
`tensorflow_hub` package entirely — at the time this was written, `tensorflow_hub`
unconditionally imports `tf_keras`, and no `tf_keras` release is yet
compatible with the only `tensorflow` wheel available for this Python
version (a 2.22 release candidate). Loading the SavedModel directly via
`tf.saved_model.load` avoids that dependency entirely and is exactly what
`tensorflow_hub` does internally anyway."""

import csv
import io
import os
import tarfile

import numpy as np

from app.config import config

_YAMNET_DOWNLOAD_URL = "https://www.kaggle.com/api/v1/models/google/yamnet/tensorFlow2/yamnet/1/download"

_model = None
_class_names: list[str] | None = None


def _ensure_model_downloaded() -> None:
    if os.path.exists(os.path.join(config.ABYSS_YAMNET_DIR, "saved_model.pb")):
        return
    import requests

    os.makedirs(config.ABYSS_YAMNET_DIR, exist_ok=True)
    resp = requests.get(_YAMNET_DOWNLOAD_URL, timeout=120)
    resp.raise_for_status()
    tarfile.open(fileobj=io.BytesIO(resp.content)).extractall(config.ABYSS_YAMNET_DIR)


def _load_model():
    global _model, _class_names
    if _model is not None:
        return _model, _class_names

    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    import tensorflow as tf

    _ensure_model_downloaded()
    _model = tf.saved_model.load(config.ABYSS_YAMNET_DIR)
    class_map_path = _model.class_map_path().numpy().decode("utf-8")
    with tf.io.gfile.GFile(class_map_path) as f:
        _class_names = [row["display_name"] for row in csv.DictReader(f)]
    return _model, _class_names


def classify_audio_bytes(audio_bytes: bytes, suffix: str, top_k: int = 5) -> dict:
    """Classifies raw audio bytes (any format librosa/libsndfile can read —
    mp3, wav, etc.) and returns the top_k AudioSet classes by mean score
    across the whole clip. Writes to a short-lived temp file since
    soundfile/librosa need a real file path or seekable file-like object for
    compressed formats."""
    import librosa
    import tempfile

    model, class_names = _load_model()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        waveform, _ = librosa.load(tmp_path, sr=16000, mono=True)
    finally:
        os.remove(tmp_path)

    scores, _embeddings, _spectrogram = model(waveform)
    mean_scores = np.mean(scores.numpy(), axis=0)
    top_indices = np.argsort(mean_scores)[::-1][:top_k]

    return {
        "classes": [{"label": class_names[i], "scorePercent": round(float(mean_scores[i]) * 100, 1)} for i in top_indices],
        "durationSeconds": round(len(waveform) / 16000, 1),
    }
