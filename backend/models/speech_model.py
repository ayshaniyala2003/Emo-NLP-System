"""
Speech Emotion Recognition
- STT: openai/whisper-tiny (74MB) — CPU-friendly
- Emotion from audio: speechbrain/emotion-recognition-wav2vec2-IEMOCAP (360MB)
  Labels: neu (neutral), hap (happy), ang (angry), sad (sad)
"""
import io
import os
import tempfile
import threading
import numpy as np

# ── Compatibility patch for torchaudio 2.x + speechbrain ─────────────────
# speechbrain calls torchaudio.list_audio_backends() which was removed in 2.0
try:
    import torchaudio as _ta
    if not hasattr(_ta, "list_audio_backends"):
        _ta.list_audio_backends = lambda: []
except ImportError:
    pass

# Lazy-loaded model references
_whisper_model = None
_emotion_classifier = None
_lock = threading.Lock()

IEMOCAP_LABEL_MAP = {
    "neu": "neutral",
    "hap": "happy",
    "ang": "angry",
    "sad": "sad",
    "exc": "happy",   # excited → happy
    "fru": "angry",   # frustrated → angry
}

EMOTION_STRESS_MAP = {
    "neutral": 0.18,
    "happy": 0.05,
    "angry": 0.92,
    "sad": 0.72,
    "fear": 0.88,
    "surprise": 0.40,
    "disgust": 0.78,
}


def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        with _lock:
            if _whisper_model is None:
                import whisper
                _whisper_model = whisper.load_model("tiny")
    return _whisper_model


def _get_emotion_clf():
    global _emotion_classifier
    if _emotion_classifier is None:
        with _lock:
            if _emotion_classifier is None:
                try:
                    # speechbrain 1.x moved to speechbrain.inference
                    try:
                        from speechbrain.inference.classifiers import EncoderClassifier
                    except ImportError:
                        from speechbrain.pretrained import EncoderClassifier

                    _emotion_classifier = EncoderClassifier.from_hparams(
                        source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
                        savedir="pretrained_models/emotion-wav2vec2",
                        run_opts={"device": "cpu"},
                    )
                except Exception:
                    _emotion_classifier = None
    return _emotion_classifier


def analyze_speech(audio_bytes: bytes, sample_rate: int = 16000) -> dict:
    """
    Analyze speech from raw audio bytes.
    Returns transcript, emotion scores, dominant emotion, and stress score.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Step 1: Speech-to-Text with Whisper tiny
        transcript = ""
        try:
            whisper_model = _get_whisper()
            result = whisper_model.transcribe(tmp_path, fp16=False, language="en")
            transcript = result.get("text", "").strip()
        except Exception as e:
            transcript = f"[STT error: {str(e)[:50]}]"

        # Step 2: Audio Emotion with wav2vec2-IEMOCAP
        emotions_audio = {}
        dominant = "neutral"
        audio_confidence = 0.3

        clf = _get_emotion_clf()
        if clf is not None:
            try:
                import torch
                import torchaudio
                waveform, sr = torchaudio.load(tmp_path)
                if sr != 16000:
                    resampler = torchaudio.transforms.Resample(sr, 16000)
                    waveform = resampler(waveform)
                waveform = waveform.mean(dim=0, keepdim=True)  # mono

                out_prob, score, index, label = clf.classify_batch(waveform)
                probs = out_prob[0].tolist()
                labels = clf.hparams.label_encoder.decode_ndim(
                    list(range(len(probs)))
                )
                raw_emotions = {IEMOCAP_LABEL_MAP.get(l, l): p
                                for l, p in zip(labels, probs)}

                # Normalize
                total = sum(raw_emotions.values()) or 1.0
                emotions_audio = {k: round(v / total, 4) for k, v in raw_emotions.items()}
                dominant = max(emotions_audio, key=emotions_audio.get)
                audio_confidence = max(emotions_audio.values())
            except Exception:
                emotions_audio = {"neutral": 0.6, "sad": 0.2, "angry": 0.1, "happy": 0.1}
                dominant = "neutral"
                audio_confidence = 0.3

        # Fallback full emotion set
        full_emotions = {
            "neutral": 0.0, "happy": 0.0, "sad": 0.0,
            "angry": 0.0, "fear": 0.0, "surprise": 0.0, "disgust": 0.0,
        }
        full_emotions.update(emotions_audio)

        stress_score = sum(
            full_emotions.get(em, 0) * weight
            for em, weight in EMOTION_STRESS_MAP.items()
        ) * 100

        return {
            "transcript": transcript,
            "emotions": full_emotions,
            "dominant_emotion": dominant,
            "stress_score": round(min(stress_score, 100), 2),
            "confidence": round(audio_confidence, 4),
            "modality": "speech",
            "status": "success",
        }

    except Exception as e:
        return {
            "transcript": "",
            "emotions": {"neutral": 1.0},
            "dominant_emotion": "neutral",
            "stress_score": 10.0,
            "confidence": 0.1,
            "modality": "speech",
            "status": "error",
            "error": str(e),
        }
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def analyze_speech_transcript(transcript: str) -> dict:
    """
    Analyze emotion from a transcript (text) only — used when
    browser Web Speech API provides the text directly.
    Falls back to text-based emotion analysis.
    """
    from models.text_model import analyze_text
    result = analyze_text(transcript)
    result["transcript"] = transcript
    result["modality"] = "speech"
    return result
