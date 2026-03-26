/**
 * API service layer — connects React frontend to FastAPI backend
 */
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for model inference
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error normalization
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err?.response?.data?.detail ||
      err?.message ||
      'Backend connection failed. Make sure the server is running on port 8000.';
    return Promise.reject(new Error(msg));
  }
);

// ── Health Check ──────────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health');

// ── Face Analysis ─────────────────────────────────────────────────────────
export const analyzeFace = (imageBase64) =>
  api.post('/analyze/face', { image_base64: imageBase64 });

// ── Text Analysis ─────────────────────────────────────────────────────────
export const analyzeText = (text) =>
  api.post('/analyze/text', { text });

// ── Speech Transcript Analysis ────────────────────────────────────────────
export const analyzeSpeechTranscript = (transcript) =>
  api.post('/analyze/speech/transcript', { transcript });

// ── Speech Audio Upload ───────────────────────────────────────────────────
export const analyzeSpeechAudio = (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  return axios.post(`${BASE_URL}/analyze/speech/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then((r) => r.data);
};

// ── Fusion ────────────────────────────────────────────────────────────────
export const analyzeFusion = (faceResult, textResult, speechResult, weights = {}) =>
  api.post('/analyze/fusion', {
    face_result: faceResult,
    text_result: textResult,
    speech_result: speechResult,
    face_weight: weights.face ?? 1.0,
    text_weight: weights.text ?? 1.0,
    speech_weight: weights.speech ?? 1.0,
  });

// ── Report ────────────────────────────────────────────────────────────────
export const analyzeReport = (fusionResult, faceResult, textResult, speechResult) =>
  api.post('/analyze/report', {
    fusion_result: fusionResult,
    face_result: faceResult,
    text_result: textResult,
    speech_result: speechResult,
  });

export default api;
