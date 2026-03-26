"""
Multimodal Emotion Recognition System — FastAPI Backend
Author: Emo-NLP-System
Models: DeepFace (face), DistilRoBERTa (text), Whisper+wav2vec2 (speech)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

from models.face_model import analyze_face
from models.text_model import analyze_text
from models.speech_model import analyze_speech, analyze_speech_transcript
from models.fusion_engine import compute_fusion, generate_report

# ─── App Setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Multimodal Emotion Recognition API",
    description="PhD-level mental health stress analysis from face, text, and speech",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request/Response Models ─────────────────────────────────────────────────
class FaceRequest(BaseModel):
    image_base64: str  # base64-encoded JPEG

class TextRequest(BaseModel):
    text: str

class SpeechTranscriptRequest(BaseModel):
    transcript: str   # from Web Speech API

class FusionRequest(BaseModel):
    face_result: Optional[dict] = None
    text_result: Optional[dict] = None
    speech_result: Optional[dict] = None
    face_weight: Optional[float] = 1.0
    text_weight: Optional[float] = 1.0
    speech_weight: Optional[float] = 1.0

class ReportRequest(BaseModel):
    fusion_result: dict
    face_result: Optional[dict] = None
    text_result: Optional[dict] = None
    speech_result: Optional[dict] = None

# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Multimodal Emotion Recognition API",
        "models": {
            "face": "DeepFace (FER2013/AffectNet)",
            "text": "j-hartmann/emotion-english-distilroberta-base",
            "speech_stt": "openai/whisper-tiny",
            "speech_emotion": "speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
        }
    }


@app.post("/analyze/face")
async def analyze_face_endpoint(req: FaceRequest):
    """
    Analyze facial emotion from a base64-encoded JPEG image.
    Uses DeepFace with FER2013/AffectNet backend.
    Returns 7-class emotion scores + stress score.
    """
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")
    try:
        result = analyze_face(req.image_base64)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/text")
async def analyze_text_endpoint(req: TextRequest):
    """
    Analyze emotion from text using DistilRoBERTa.
    Returns multi-class emotion scores + stress score.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        result = analyze_text(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/speech/transcript")
async def analyze_speech_transcript_endpoint(req: SpeechTranscriptRequest):
    """
    Analyze emotion from a speech transcript (from Web Speech API).
    Uses the text emotion model on the transcript.
    """
    if not req.transcript or not req.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is required")
    try:
        result = analyze_speech_transcript(req.transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/speech/audio")
async def analyze_speech_audio_endpoint(audio: UploadFile = File(...)):
    """
    Analyze emotion from uploaded WAV audio file.
    Runs Whisper-tiny for STT + wav2vec2 for audio emotion.
    """
    try:
        audio_bytes = await audio.read()
        result = analyze_speech(audio_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/fusion")
async def analyze_fusion_endpoint(req: FusionRequest):
    """
    Attention-weighted late fusion of all three modalities.
    Produces unified stress score + risk level.
    """
    try:
        result = compute_fusion(
            face_result=req.face_result,
            text_result=req.text_result,
            speech_result=req.speech_result,
            face_weight=req.face_weight or 1.0,
            text_weight=req.text_weight or 1.0,
            speech_weight=req.speech_weight or 1.0,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/report")
async def analyze_report_endpoint(req: ReportRequest):
    """
    Generate a rule-based clinical mental health narrative report
    from the fusion result and individual modality results.
    """
    try:
        result = generate_report(
            fusion_result=req.fusion_result,
            face_result=req.face_result,
            text_result=req.text_result,
            speech_result=req.speech_result,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Entry Point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
