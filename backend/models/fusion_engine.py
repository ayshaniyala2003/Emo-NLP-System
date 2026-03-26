"""
Fusion Engine — Attention-Weighted Late Fusion
Combines face, text, and speech emotion results into a unified stress score
and generates a rule-based clinical mental health report.
"""
from typing import Optional

# Mental health risk thresholds
RISK_LEVELS = [
    (80, "Critical",  "#FF2D55", "Seek immediate professional support."),
    (60, "High",      "#FF6B35", "High stress detected. Consider talking to someone."),
    (40, "Moderate",  "#FFB800", "Moderate stress. Practice mindfulness and self-care."),
    (20, "Mild",      "#34C759", "Mild stress. You're managing well."),
    (0,  "Low",       "#30D158", "Low stress. Emotional state appears stable."),
]

EMOTION_STRESS_MAP = {
    "angry": 0.92, "anger": 0.92,
    "disgust": 0.78,
    "fear": 0.88,
    "happy": 0.05, "joy": 0.05,
    "neutral": 0.18,
    "sad": 0.72, "sadness": 0.72,
    "surprise": 0.40,
    "calm": 0.05,
}

RECOMMENDATIONS = {
    "Critical": [
        "Contact a mental health professional immediately.",
        "Reach out to a trusted friend or family member.",
        "Consider calling a mental health helpline.",
        "Avoid making major decisions while stressed.",
    ],
    "High": [
        "Try deep breathing exercises (4-7-8 technique).",
        "Take a break from screens and go outside.",
        "Journal your feelings to process emotions.",
        "Consider scheduling a therapy session.",
    ],
    "Moderate": [
        "Practice 10 minutes of mindfulness meditation.",
        "Engage in light physical activity.",
        "Limit caffeine and ensure adequate sleep.",
        "Connect with a supportive friend.",
    ],
    "Mild": [
        "Maintain your current healthy habits.",
        "Continue regular physical activity.",
        "Practice gratitude journaling.",
    ],
    "Low": [
        "Keep up your positive emotional practices.",
        "Share your well-being strategies with others.",
    ],
}


def compute_fusion(
    face_result: Optional[dict] = None,
    text_result: Optional[dict] = None,
    speech_result: Optional[dict] = None,
    face_weight: float = 1.0,
    text_weight: float = 1.0,
    speech_weight: float = 1.0,
) -> dict:
    """
    Attention-weighted late fusion of three modality results.
    Confidence scores act as dynamic attention weights.
    """
    contributions = []

    if face_result and face_result.get("status") in ("success", "mock"):
        conf = face_result.get("confidence", 0.5)
        stress = face_result.get("stress_score", 20.0)
        contributions.append((stress, conf * face_weight, face_result.get("emotions", {})))

    if text_result and text_result.get("status") in ("success",):
        conf = text_result.get("confidence", 0.5)
        stress = text_result.get("stress_score", 10.0)
        contributions.append((stress, conf * text_weight, text_result.get("emotions", {})))

    if speech_result and speech_result.get("status") in ("success",):
        conf = speech_result.get("confidence", 0.3)
        stress = speech_result.get("stress_score", 10.0)
        contributions.append((stress, conf * speech_weight, speech_result.get("emotions", {})))

    if not contributions:
        return _empty_fusion()

    # Weighted average of stress scores
    total_weight = sum(w for _, w, _ in contributions)
    fused_stress = sum(s * w for s, w, _ in contributions) / (total_weight or 1.0)

    # Fuse emotion vectors
    all_emotions: dict[str, float] = {}
    for _, w, emotions in contributions:
        for emotion, score in emotions.items():
            all_emotions[emotion] = all_emotions.get(emotion, 0.0) + score * (w / total_weight)

    # Normalize fused emotions
    em_total = sum(all_emotions.values()) or 1.0
    fused_emotions = {k: round(v / em_total, 4) for k, v in all_emotions.items()}
    dominant = max(fused_emotions, key=fused_emotions.get) if fused_emotions else "neutral"

    # Determine risk level
    risk_label, risk_color, risk_msg = _get_risk(fused_stress)

    # Active modalities
    active = []
    if face_result and face_result.get("status") in ("success", "mock"):
        active.append("face")
    if text_result and text_result.get("status") == "success":
        active.append("text")
    if speech_result and speech_result.get("status") == "success":
        active.append("speech")

    return {
        "stress_score": round(min(fused_stress, 100), 2),
        "emotions": fused_emotions,
        "dominant_emotion": dominant,
        "risk_level": risk_label,
        "risk_color": risk_color,
        "risk_message": risk_msg,
        "active_modalities": active,
        "modality_count": len(contributions),
        "status": "success",
    }


def generate_report(fusion_result: dict, face_result=None, text_result=None, speech_result=None) -> dict:
    """
    Generate rule-based clinical mental health report.
    """
    stress = fusion_result.get("stress_score", 0)
    risk = fusion_result.get("risk_level", "Low")
    dominant = fusion_result.get("dominant_emotion", "neutral")
    emotions = fusion_result.get("emotions", {})

    # Build narrative
    em_list = sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:3]
    top_emotions_str = ", ".join(f"{e} ({round(s*100)}%)" for e, s in em_list)

    face_note = ""
    if face_result and face_result.get("status") in ("success", "mock"):
        face_note = f"Facial analysis detected predominant {face_result.get('dominant_emotion','neutral')} expression. "

    text_note = ""
    if text_result and text_result.get("status") == "success":
        transcript = text_result.get("text_analyzed", "")[:100]
        text_note = f"Text sentiment analysis of the provided input revealed emotional markers consistent with {text_result.get('dominant_emotion','neutral')} affect. "

    speech_note = ""
    if speech_result and speech_result.get("status") == "success":
        transcript = speech_result.get("transcript", "")[:80]
        speech_note = f"Speech prosody analysis indicated {speech_result.get('dominant_emotion','neutral')} vocal characteristics. "

    narrative = (
        f"Multimodal assessment indicates a **{risk} stress level** with a composite stress score of "
        f"**{stress:.1f}/100**. The dominant emotional state is **{dominant}**, with top detected emotions: "
        f"{top_emotions_str}. {face_note}{text_note}{speech_note}"
        f"This assessment is based on {fusion_result.get('modality_count', 1)} active input modalities."
    )

    return {
        "stress_score": stress,
        "risk_level": risk,
        "risk_color": fusion_result.get("risk_color", "#34C759"),
        "dominant_emotion": dominant,
        "narrative": narrative,
        "recommendations": RECOMMENDATIONS.get(risk, RECOMMENDATIONS["Low"]),
        "emotions_summary": emotions,
        "status": "success",
    }


def _get_risk(stress_score: float):
    for threshold, label, color, msg in RISK_LEVELS:
        if stress_score >= threshold:
            return label, color, msg
    return "Low", "#30D158", "Low stress detected."


def _empty_fusion():
    return {
        "stress_score": 0.0,
        "emotions": {"neutral": 1.0},
        "dominant_emotion": "neutral",
        "risk_level": "Low",
        "risk_color": "#30D158",
        "risk_message": "No analysis data available.",
        "active_modalities": [],
        "modality_count": 0,
        "status": "no_data",
    }
