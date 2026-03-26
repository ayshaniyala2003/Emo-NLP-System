"""
Text Emotion Recognition using DistilRoBERTa
Model: j-hartmann/emotion-english-distilroberta-base
Labels: anger, disgust, fear, joy, neutral, sadness, surprise
~82MB — fast CPU inference (~50ms / sample)
"""
from transformers import pipeline
import threading

# Lazy-load the model (downloads ~82MB on first call)
_model = None
_lock = threading.Lock()

EMOTION_STRESS_MAP = {
    "anger": 0.92,
    "disgust": 0.78,
    "fear": 0.88,
    "joy": 0.05,
    "neutral": 0.18,
    "sadness": 0.72,
    "surprise": 0.40,
}

# Map model labels to our unified label set
LABEL_MAP = {
    "anger": "angry",
    "disgust": "disgust",
    "fear": "fear",
    "joy": "happy",
    "neutral": "neutral",
    "sadness": "sad",
    "surprise": "surprise",
}


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    top_k=None,
                    device=-1,  # CPU
                )
    return _model


def analyze_text(text: str) -> dict:
    """
    Analyze emotion from text using DistilRoBERTa emotion classifier.
    Returns normalized emotion scores, dominant emotion, and stress score.
    """
    if not text or not text.strip():
        return _neutral_result("empty input")

    try:
        clf = _get_model()
        raw_results = clf(text[:512])  # Truncate to model max

        # raw_results is a list of lists: [[{label, score}, ...]]
        scores_list = raw_results[0] if isinstance(raw_results[0], list) else raw_results

        # Normalize scores
        total = sum(r["score"] for r in scores_list) or 1.0
        emotions_raw = {
            LABEL_MAP.get(r["label"].lower(), r["label"].lower()): round(r["score"] / total, 4)
            for r in scores_list
        }

        dominant = max(emotions_raw, key=emotions_raw.get)

        # Stress score using mapped labels
        stress_score = 0.0
        for orig_label, score in [(r["label"].lower(), r["score"]) for r in scores_list]:
            weight = EMOTION_STRESS_MAP.get(orig_label, 0.3)
            stress_score += (score / total) * weight * 100

        confidence = max(emotions_raw.values()) if emotions_raw else 0.5

        return {
            "emotions": emotions_raw,
            "dominant_emotion": dominant,
            "stress_score": round(min(stress_score, 100), 2),
            "confidence": round(confidence, 4),
            "modality": "text",
            "text_analyzed": text[:200],
            "status": "success",
        }

    except Exception as e:
        return {**_neutral_result("error"), "error": str(e), "status": "error"}


def _neutral_result(reason: str) -> dict:
    return {
        "emotions": {"neutral": 1.0, "happy": 0.0, "sad": 0.0,
                     "angry": 0.0, "fear": 0.0, "surprise": 0.0, "disgust": 0.0},
        "dominant_emotion": "neutral",
        "stress_score": 10.0,
        "confidence": 0.3,
        "modality": "text",
        "status": reason,
    }
