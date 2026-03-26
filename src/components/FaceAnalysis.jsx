import React, { useRef, useState, useCallback, useEffect } from 'react';
import { analyzeFace }  from '../services/api';
import EmotionBars from './EmotionBars';
import './FaceAnalysis.css';

/**
 * FaceAnalysis — Live webcam with emotion detection
 * Uses browser getUserMedia + captures frames as base64 JPEG
 */
export default function FaceAnalysis({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(intervalRef.current);
    setCameraOn(false);
    setAutoMode(false);
  };

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    setLoading(true);
    setError('');
    try {
      const data = await analyzeFace(base64);
      setResult(data);
      setCaptureCount((c) => c + 1);
      onResult?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  // Auto-capture every 5 seconds
  useEffect(() => {
    if (autoMode && cameraOn) {
      captureFrame();
      intervalRef.current = setInterval(captureFrame, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoMode, cameraOn, captureFrame]);

  useEffect(() => () => stopCamera(), []);

  const getStatusColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="face-analysis">
      {/* Header */}
      <div className="fa-header">
        <div>
          <h3>📷 Facial Expression Analysis</h3>
          <p className="fa-subtitle">Real-time emotion detection via DeepFace (FER2013/AffectNet)</p>
        </div>
        <div className="fa-badges">
          {cameraOn && <span className="live-badge"><span className="pulse-dot" />LIVE</span>}
          {captureCount > 0 && (
            <span className="badge badge-ghost">{captureCount} captures</span>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="fa-camera-wrap">
        <video ref={videoRef} className={`fa-video ${cameraOn ? 'active' : ''}`} muted playsInline />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!cameraOn && (
          <div className="fa-placeholder">
            <div className="fa-placeholder-icon">🎥</div>
            <p>Camera not active</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click Start Camera to begin
            </p>
          </div>
        )}

        {/* Live stress overlay */}
        {result && cameraOn && (
          <div className="fa-overlay">
            <span style={{ color: getStatusColor(result.stress_score), fontWeight: 700 }}>
              Stress: {result.stress_score?.toFixed(0)}%
            </span>
            <span style={{ textTransform: 'capitalize', opacity: 0.8 }}>
              {result.dominant_emotion}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="fa-controls">
        {!cameraOn ? (
          <button className="btn btn-primary" onClick={startCamera}>
            🎥 Start Camera
          </button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={captureFrame} disabled={loading}>
              {loading ? <><span className="spinner" />Analyzing…</> : '📸 Capture & Analyze'}
            </button>
            <button
              className={`btn ${autoMode ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setAutoMode((a) => !a)}
            >
              {autoMode ? '⏹ Stop Auto' : '🔄 Auto Mode'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={stopCamera}>
              Stop Camera
            </button>
          </>
        )}
      </div>

      {error && <div className="fa-error">⚠️ {error}</div>}

      {/* Results */}
      {result && (
        <div className="fa-results anim-fade-in">
          <div className="fa-result-header">
            <span className="fa-dominant">
              Dominant: <strong style={{ textTransform: 'capitalize', color: getStatusColor(result.stress_score) }}>
                {result.dominant_emotion}
              </strong>
            </span>
            <span className="fa-confidence">
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <EmotionBars emotions={result.emotions} />
        </div>
      )}
    </div>
  );
}
