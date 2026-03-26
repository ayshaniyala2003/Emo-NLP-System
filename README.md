# 🧠 EmoNLP — Multimodal Emotion Recognition System for Mental Health Analysis

A PhD-level full-stack system that detects emotional stress from **facial expressions**, **text input**, and **speech** using free, open-source AI models. Results are fused using **attention-weighted late fusion** to produce a real-time Stress Meter and Mental Health Risk Score.

> **Device:** AMD Ryzen 5 + Radeon GPU | **Python 3.12** | **Windows 11**  
> All models run on **CPU only** — no GPU required.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ FaceAnalysis│  │TextAnalysis │  │    SpeechAnalysis        │ │
│  │  (Webcam)   │  │  (Textarea) │  │  (Mic + Waveform)        │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┬────────────┘ │
│         │                │                        │              │
│  ┌──────▼────────────────▼────────────────────────▼────────────┐ │
│  │  FusionDashboard (StressMeter + EmotionRadar + Report)      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP REST (localhost:8000)
┌────────────────────────────▼─────────────────────────────────────┐
│                     FastAPI Backend (Python)                      │
│  POST /analyze/face         →  DeepFace (FER CNN)                │
│  POST /analyze/text         →  DistilRoBERTa emotion             │
│  POST /analyze/speech/transcript  →  DistilRoBERTa (via text)    │
│  POST /analyze/speech/audio       →  Whisper-tiny + wav2vec2     │
│  POST /analyze/fusion       →  Attention-Weighted Late Fusion    │
│  POST /analyze/report       →  Rule-based Clinical Narrative     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Face
```
Webcam → Canvas (base64 JPEG) → /analyze/face
  → DeepFace.analyze (FER2013/AffectNet CNN + OpenCV detector)
  → 7 emotion scores → stress_score = Σ(emotion × weight) × 100
```

### Text
```
Textarea (debounced 700ms) → /analyze/text
  → distilroberta-emotion (~82MB) → 7-class softmax
  → stress_score from weighted emotion sum
```

### Speech
```
Microphone → Web Audio API (waveform) + Web Speech API (transcript)
  → transcript available?
       YES → /analyze/speech/transcript → DistilRoBERTa  [preferred — no ffmpeg]
       NO  → MediaRecorder WAV → /analyze/speech/audio
                → whisper-tiny (STT, needs ffmpeg) + wav2vec2 (audio emotion)

  Race-condition fix: 600ms grace after recognition.stop()
  lets final Web Speech results arrive before reading transcript.
```

### Fusion
```
face_result + text_result + speech_result
  → stress = Σ(confidence_i × stress_i) / Σ(confidence_i)   [attention weighting]
  → fused emotions (weighted average of all vectors)
  → risk_level: Low / Mild / Moderate / High / Critical
  → /analyze/report → clinical narrative + recommendations
  → saved to localStorage → HistoryTimeline SVG trend chart
```

---

## 🤖 Models Used

| Modality | Model | Size | CPU Speed |
|----------|-------|------|-----------|
| **Face** | DeepFace (FER2013 + AffectNet CNN) | ~500 MB | ~200 ms/frame |
| **Text** | `j-hartmann/emotion-english-distilroberta-base` | 82 MB | ~50 ms |
| **Speech STT** | `openai/whisper-tiny` (+ ffmpeg) | 74 MB | ~2× RT |
| **Speech Emotion** | `speechbrain/emotion-recognition-wav2vec2-IEMOCAP` | 360 MB | ~300 ms |
| **Fusion + Report** | Custom rule engine | 0 MB | instant |

**Emotion → Stress weights:**
```python
STRESS_WEIGHTS = {
    "angry": 0.92, "fear": 0.88, "disgust": 0.78, "sad": 0.72,
    "surprise": 0.40, "neutral": 0.18, "happy": 0.05,
}
```

> **Total first-run download:** ~1 GB (TensorFlow, models). Cached after first use. No API keys.

---

## 🗂️ Project Structure

```
Emo-NLP-System/
├── backend/
│   ├── main.py                    # FastAPI — 6 endpoints
│   ├── requirements.txt
│   └── models/
│       ├── face_model.py          # DeepFace wrapper
│       ├── text_model.py          # DistilRoBERTa (lazy-loaded)
│       ├── speech_model.py        # Whisper + wav2vec2 + torchaudio patch
│       └── fusion_engine.py       # Late fusion + report
├── src/
│   ├── App.jsx / App.css          # Sidebar shell + tab routing
│   ├── index.css                  # Dark glassmorphism design system
│   ├── main.jsx
│   ├── services/api.js            # Axios client
│   └── components/
│       ├── FaceAnalysis.jsx/css
│       ├── TextAnalysis.jsx/css
│       ├── SpeechAnalysis.jsx/css  # ← includes race-condition fix
│       ├── FusionDashboard.jsx/css
│       ├── StressMeter.jsx/css
│       ├── EmotionRadar.jsx/css
│       ├── EmotionBars.jsx
│       ├── MentalHealthReport.jsx/css
│       └── HistoryTimeline.jsx/css
├── index.html
├── package.json
├── start.bat                      # One-click Windows launcher
└── setup.ps1                      # Automated first-time setup
```

---

## 🚀 Setup & Running

### Option A — Automated (recommended)

```powershell
# Run once as Administrator for Long Paths + PATH changes:
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
cd d:\Code\Emo-NLP-System
.\setup.ps1
```

### Option B — Manual step by step

#### 1. Enable Windows Long Paths (one-time, needs admin)
```powershell
# Admin PowerShell:
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
```
Or: **Settings → System → For Developers → Enable Win32 Long Paths**

#### 2. Fix pip / setuptools (Python 3.12 Windows)
```powershell
python -m pip install --upgrade pip setuptools wheel
```

#### 3. Install PyTorch CPU-only *first*
```powershell
cd d:\Code\Emo-NLP-System\backend
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```
> ⚠️ Must be done before other packages — plain `pip install torch` pulls CUDA (~5 GB).

#### 4. Install remaining backend packages
```powershell
python -m pip install fastapi "uvicorn[standard]" python-multipart httpx pydantic transformers tokenizers sentencepiece numpy pillow scipy opencv-python-headless

python -m pip install deepface tf-keras openai-whisper speechbrain
```

#### 5. Install ffmpeg (needed by Whisper for audio fallback)
```powershell
# Download and extract:
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip" -OutFile "$env:TEMP\ffmpeg.zip" -UseBasicParsing
Expand-Archive -Path "$env:TEMP\ffmpeg.zip" -DestinationPath "C:\ffmpeg" -Force

# Add to PATH permanently:
$bin = (Get-ChildItem "C:\ffmpeg" -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1).DirectoryName
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$bin", "User")
```
Then **restart your terminal** so the new PATH takes effect.

#### 6. Install frontend packages
```powershell
cd d:\Code\Emo-NLP-System
npm install
```

#### 7. Start the servers

```powershell
# Terminal 1 — Backend:
cd d:\Code\Emo-NLP-System\backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend:
cd d:\Code\Emo-NLP-System
npm run dev
```

Or just **double-click `start.bat`**.

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | React frontend |
| http://localhost:8000 | FastAPI backend |
| http://localhost:8000/docs | Swagger API explorer |

---

## 🔌 API Reference

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/health` | — | status + model info |
| POST | `/analyze/face` | `{"image_base64": "…"}` | emotions, stress_score, confidence |
| POST | `/analyze/text` | `{"text": "…"}` | emotions, stress_score, dominant |
| POST | `/analyze/speech/transcript` | `{"transcript": "…"}` | same as text |
| POST | `/analyze/speech/audio` | multipart WAV | transcript + audio emotions |
| POST | `/analyze/fusion` | face/text/speech + weights | fused stress_score, risk_level |
| POST | `/analyze/report` | fusion + modalities | narrative, recommendations |

```powershell
# Quick smoke test:
curl http://localhost:8000/health
curl -X POST http://localhost:8000/analyze/text -H "Content-Type: application/json" -d '{"text":"I am completely overwhelmed"}'
```

---

## 🐛 Troubleshooting

### `No module named 'pkg_resources'`
**Cause:** Python 3.12 (Store) ships without setuptools.  
**Fix:** `python -m pip install --upgrade pip setuptools wheel`

---

### `OSError: [Errno 2] … Windows Long Path support`
**Cause:** TensorFlow's install paths exceed 260 chars.  
**Fix:** Enable Long Paths (see Setup Step 1 above), then restart and retry.

---

### `AttributeError: module 'torchaudio' has no attribute 'list_audio_backends'`
**Cause:** speechbrain calls an API removed in torchaudio 2.0.  
**Fix (already in `speech_model.py`):**
```python
import torchaudio as _ta
if not hasattr(_ta, 'list_audio_backends'):
    _ta.list_audio_backends = lambda: []
```

---

### `ImportError: cannot import name 'EncoderClassifier' from 'speechbrain.pretrained'`
**Cause:** speechbrain 1.x moved the class to `speechbrain.inference.classifiers`.  
**Fix (already in `speech_model.py`):**
```python
try:
    from speechbrain.inference.classifiers import EncoderClassifier
except ImportError:
    from speechbrain.pretrained import EncoderClassifier
```

---

### `[STT error: [WinError 2] The system cannot find the file specified]`
**Cause:** Whisper calls `ffmpeg` as a subprocess — it isn't installed or not on PATH.  
**Fix:** Install ffmpeg (Setup Step 5). The primary path (Web Speech API transcript) doesn't need ffmpeg at all and works by default in Chrome/Edge.

---

### Speech result is always Neutral / 0% emotions
**Cause:** React stale-closure bug — `stopRecording` captured an empty transcript before Web Speech API fired its final result.  
**Fix (already in `SpeechAnalysis.jsx`):**
- Added `transcriptRef` (always current, unlike state)
- Added 600 ms grace window after `recognition.stop()` so final results arrive before analysis runs

---

### Backend shows "Offline" red badge in UI
```powershell
cd d:\Code\Emo-NLP-System\backend
python -m uvicorn main:app --reload --port 8000
# Read terminal output — look for errors above the startup line
```
Quick isolation check:
```powershell
python -c "import fastapi, transformers, deepface, whisper; print('OK')"
```

---

### Port 8000 already in use
```powershell
netstat -ano | findstr :8000
# Note the PID in the last column, then:
taskkill /PID <PID> /F
```

---

### First API call is slow (10–30 s)
Expected. Models are lazy-loaded on first request, then cached in memory:

| Model | First load |
|-------|-----------|
| DeepFace + TensorFlow | ~10 s |
| DistilRoBERTa | ~5 s |
| Whisper-tiny | ~8 s |
| wav2vec2-IEMOCAP | ~15 s (+ download on very first use) |

---

### Webcam not working
- Allow camera in browser permissions
- Must use `localhost` (not LAN IP) for camera/mic APIs in Chrome
- Close other apps using the camera

---

### Speech transcript empty / mic not working
- Web Speech API: **Chrome or Edge only** (not Firefox)  
- Grant mic permission when prompted
- Speak within 2 s of pressing "Start Recording"
- If STT is unavailable, the audio blob path is used (Whisper + ffmpeg)

---

## 🖥️ System Requirements

| | Minimum | This Project |
|--|---------|-------------|
| CPU | 4-core | AMD Ryzen 5 |
| RAM | 8 GB | 16 GB recommended |
| Disk | 5 GB | ~3 GB packages + 1 GB models |
| GPU | Not required | AMD Radeon (unused, CPU inference) |
| Python | 3.10 | 3.12 (MS Store) |
| Node.js | 18 | 18+ |
| OS | Windows 10 | Windows 11 |

---

## 📚 References

| Model | Source |
|-------|--------|
| DeepFace | Serengil & Ozpinar, ICST 2020 |
| DistilRoBERTa Emotion | Hartmann et al., HuggingFace 2022 |
| Whisper | Radford et al., OpenAI 2022 |
| wav2vec2-IEMOCAP | Baevski et al., NeurIPS 2020 + SpeechBrain |
| Late Fusion | Zadeh et al., CMU-Multimodal SDK 2018 |
| Stress-Emotion Mapping | Alberdi et al., Springer Applied Sciences 2016 |
