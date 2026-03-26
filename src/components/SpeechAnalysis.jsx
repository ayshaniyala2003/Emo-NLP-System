import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeSpeechTranscript, analyzeSpeechAudio } from '../services/api';
import EmotionBars from './EmotionBars';
import './SpeechAnalysis.css';

/**
 * SpeechAnalysis — Microphone recording with waveform visualizer
 * Uses Web Speech API for real-time transcript + MediaRecorder for audio file upload
 */
export default function SpeechAnalysis({ onResult }) {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waveData, setWaveData] = useState(new Array(40).fill(2));

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  // Ref mirrors transcript state to avoid stale closure in stopRecording
  const transcriptRef = useRef('');

  // Waveform animation
  const animateWave = useCallback(() => {
    if (!analyserRef.current) return;
    const bufLen = analyserRef.current.frequencyBinCount;
    const buf = new Uint8Array(bufLen);
    analyserRef.current.getByteTimeDomainData(buf);
    const step = Math.floor(bufLen / 40);
    const wave = Array.from({ length: 40 }, (_, i) => {
      const v = buf[i * step] / 128 - 1;
      return Math.max(2, Math.abs(v) * 40);
    });
    setWaveData(wave);
    animFrameRef.current = requestAnimationFrame(animateWave);
  }, []);

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];
    transcriptRef.current = '';
    setTranscript('');
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio context for waveform
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      animateWave();

      // MediaRecorder for audio upload
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.start(100);

      // Web Speech API for real-time transcript
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
          }
          if (final) {
            setTranscript((t) => {
              const next = (t + ' ' + final).trim();
              transcriptRef.current = next; // keep ref in sync
              return next;
            });
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    cancelAnimationFrame(animFrameRef.current);
    setWaveData(new Array(40).fill(2));

    // Stop speech recognition and wait 600ms for final results to arrive
    // (Web Speech API fires onresult asynchronously after stop())
    recognitionRef.current?.stop();
    await new Promise((res) => setTimeout(res, 600));

    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      await new Promise((res) => { mediaRecorderRef.current.onstop = res; });
    }

    // Use ref — always has latest value, avoids stale closure
    const currentTranscript = transcriptRef.current;

    if (!currentTranscript.trim() && audioChunksRef.current.length === 0) {
      setError('No audio detected. Please speak into your microphone.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (currentTranscript.trim()) {
        // Primary: Web Speech API transcript → text emotion model (no ffmpeg needed)
        data = await analyzeSpeechTranscript(currentTranscript.trim());
      } else {
        // Fallback: audio blob → Whisper STT (requires ffmpeg installed on PATH)
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        data = await analyzeSpeechAudio(blob);
      }
      setResult(data);
      onResult?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className="speech-analysis">
      <div className="sa-header">
        <div>
          <h3>🎤 Speech Emotion Analysis</h3>
          <p className="sa-subtitle">Web Speech API transcription + wav2vec2 audio emotion</p>
        </div>
        {isRecording && <span className="live-badge"><span className="pulse-dot" />REC</span>}
      </div>

      {/* Waveform Visualizer */}
      <div className="sa-waveform">
        {waveData.map((h, i) => (
          <div
            key={i}
            className="sa-wave-bar"
            style={{
              height: `${h}px`,
              background: isRecording
                ? `hsl(${240 + i * 4}, 80%, 65%)`
                : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="sa-controls">
        {!isRecording ? (
          <button className="btn btn-primary" onClick={startRecording} disabled={loading}>
            🎤 Start Recording
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopRecording}>
            ⏹ Stop & Analyze
          </button>
        )}
        {loading && <span className="spinner" />}
      </div>

      {/* Live Transcript */}
      {(transcript || isRecording) && (
        <div className="sa-transcript">
          <div className="sa-transcript-label">Live Transcript</div>
          <div className="sa-transcript-text">
            {transcript || <span style={{ color: 'var(--text-muted)' }}>Listening…</span>}
          </div>
        </div>
      )}

      {error && <div className="sa-error">⚠️ {error}</div>}

      {/* Results */}
      {result && (
        <div className="sa-results anim-fade-in">
          <div className="sa-result-row">
            {result.transcript && (
              <div className="sa-result-kv">
                <span className="sa-kv-label">Transcript</span>
                <span className="sa-kv-text">{result.transcript}</span>
              </div>
            )}
            <div className="sa-result-kv">
              <span className="sa-kv-label">Dominant</span>
              <span className="sa-kv-val" style={{ textTransform: 'capitalize' }}>
                {result.dominant_emotion}
              </span>
            </div>
            <div className="sa-result-kv">
              <span className="sa-kv-label">Stress</span>
              <span className="sa-kv-val">{result.stress_score?.toFixed(1)}</span>
            </div>
          </div>
          <EmotionBars emotions={result.emotions} highlight={result.dominant_emotion} />
        </div>
      )}
    </div>
  );
}
