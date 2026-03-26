"""
Face Emotion Recognition using DeepFace
Models: VGG-Face, AffectNet CNN with FER2013 dataset
Detects 7 emotions: angry, disgust, fear, happy, sad, surprise, neutral
"""
import base64
import io
import numpy as np
from PIL import Image
import cv2

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False


# Stress contribution weights per emotion (0.0 = calm, 1.0 = max stress)
EMOTION_STRESS_MAP = {
    "angry": 0.92,
    "disgust": 0.78,
    "fear": 0.88,
    "happy": 0.05,
    "sad": 0.70,
    "surprise": 0.40,
    "neutral": 0.18,
}


def analyze_face(image_base64: str) -> dict:
    """
    Analyze facial emotion from a base64-encoded JPEG image.
    Returns normalized emotion scores, dominant emotion, stress score,
    and overall confidence.
    """
    # Decode base64 image
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]

    image_bytes = base64.b64decode(image_base64)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    frame = np.array(pil_image)
    bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

    if not DEEPFACE_AVAILABLE:
        return _mock_face_result()

    try:
        results = DeepFace.analyze(
            img_path=bgr_frame,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",
            silent=True,
        )

        # Handle both single and multiple face results
        result = results[0] if isinstance(results, list) else results
        raw_emotions = result.get("emotion", {})
        dominant = result.get("dominant_emotion", "neutral")

        # Normalize to 0-1 range
        total = sum(raw_emotions.values()) or 1.0
        emotions = {k.lower(): round(v / total, 4) for k, v in raw_emotions.items()}

        # Compute stress score 0-100
        stress_score = sum(
            emotions.get(em, 0) * weight
            for em, weight in EMOTION_STRESS_MAP.items()
        ) * 100

        # Confidence = max emotion score
        confidence = max(emotions.values()) if emotions else 0.5

        return {
            "emotions": emotions,
            "dominant_emotion": dominant.lower(),
            "stress_score": round(min(stress_score, 100), 2),
            "confidence": round(confidence, 4),
            "modality": "face",
            "status": "success",
        }

    except Exception as e:
        return {
            "emotions": {k: 1 / 7 for k in EMOTION_STRESS_MAP},
            "dominant_emotion": "neutral",
            "stress_score": 20.0,
            "confidence": 0.1,
            "modality": "face",
            "status": "error",
            "error": str(e),
        }


def _mock_face_result():
    return {
        "emotions": {"happy": 0.5, "neutral": 0.3, "sad": 0.1, "angry": 0.1},
        "dominant_emotion": "happy",
        "stress_score": 15.0,
        "confidence": 0.5,
        "modality": "face",
        "status": "mock",
    }
