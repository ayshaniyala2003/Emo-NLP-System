import React, { useState } from 'react';
import { analyzeFusion, analyzeReport } from '../services/api';
import StressMeter from './StressMeter';
import EmotionRadar from './EmotionRadar';
import EmotionBars from './EmotionBars';
import MentalHealthReport from './MentalHealthReport';
import './FusionDashboard.css';

/**
 * FusionDashboard — Combined multimodal view with fusion analysis
 * Shows all modality results, stress meter, radar chart, and triggers fusion
 */
export default function FusionDashboard({
  faceResult, textResult, speechResult,
  onFusionResult,
}) {
  const [fusionResult, setFusionResult] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weights, setWeights] = useState({ face: 1, text: 1, speech: 1 });

  const activeCount = [faceResult, textResult, speechResult].filter(Boolean).length;

  const runFusion = async () => {
    if (activeCount === 0) {
      setError('Run at least one modality analysis first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fusion = await analyzeFusion(faceResult, textResult, speechResult, weights);
      setFusionResult(fusion);
      onFusionResult?.(fusion);
      // Auto-generate report
      const rpt = await analyzeReport(fusion, faceResult, textResult, speechResult);
      setReportResult(rpt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const map = { Critical: '#ef4444', High: '#f97316', Moderate: '#f59e0b', Mild: '#34d399', Low: '#10b981' };
    return map[level] || '#10b981';
  };

  return (
    <div className="fusion-dashboard">
      {/* Header */}
      <div className="fd-header">
        <div>
          <h2 className="gradient-text">Fusion Analysis Dashboard</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Attention-weighted late fusion of all active modalities
          </p>
        </div>
        <div className="fd-header-right">
          <span className="badge badge-ghost">{activeCount} modalities active</span>
          <button
            className="btn btn-primary btn-lg"
            onClick={runFusion}
            disabled={loading || activeCount === 0}
          >
            {loading ? <><span className="spinner" />Analyzing…</> : '⚡ Run Full Analysis'}
          </button>
        </div>
      </div>

      {error && <div className="fd-error">⚠️ {error}</div>}

      {/* Modality cards row */}
      <div className="grid-3">
        {[
          { key: 'face', label: '📷 Face', icon: '📷', result: faceResult },
          { key: 'text', label: '📝 Text', icon: '📝', result: textResult },
          { key: 'speech', label: '🎤 Speech', icon: '🎤', result: speechResult },
        ].map(({ key, label, icon, result }) => (
          <div key={key} className={`glass-card fd-modal-card ${result ? 'active' : ''}`}>
            <div className="fd-card-head">
              <span className="fd-card-title">{label}</span>
              <span className={`badge ${result ? 'badge-success' : 'badge-ghost'}`}>
                {result ? 'Ready' : 'Pending'}
              </span>
            </div>
            {result ? (
              <>
                <div className="fd-card-score" style={{ color: getRiskColor('') }}>
                  <span className="fd-score-num">{result.stress_score?.toFixed(0)}</span>
                  <span className="fd-score-label">stress</span>
                </div>
                <div className="fd-card-dominant">{result.dominant_emotion}</div>
                <div className="fd-card-conf">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </div>
              </>
            ) : (
              <div className="fd-card-empty">
                <span>{icon}</span>
                <p>Navigate to the {label.split(' ')[1]} tab to analyze</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modality weight sliders */}
      <div className="glass-card fd-weights">
        <h4 style={{ marginBottom: 14 }}>⚖️ Modality Weights</h4>
        <div className="fd-sliders">
          {Object.entries(weights).map(([mod, val]) => (
            <div key={mod} className="fd-slider-row">
              <span className="fd-slider-label">{mod.charAt(0).toUpperCase() + mod.slice(1)}</span>
              <input
                type="range" min="0" max="3" step="0.1" value={val}
                onChange={(e) => setWeights((w) => ({ ...w, [mod]: parseFloat(e.target.value) }))}
                className="fd-slider"
              />
              <span className="fd-slider-val mono">{val.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fusion results */}
      {fusionResult && (
        <div className="fd-results anim-fade-up">

          {/* Stress meter + radar */}
          <div className="fd-viz-row">
            <div className="glass-card fd-viz-card text-center section">
              <h4 style={{ marginBottom: 16 }}>Stress Meter</h4>
              <StressMeter
                score={fusionResult.stress_score}
                dominantEmotion={fusionResult.dominant_emotion}
                size={240}
              />
              <div className="fd-risk-badge" style={{ marginTop: 12 }}>
                <div
                  className="fd-risk-pill"
                  style={{
                    background: `${getRiskColor(fusionResult.risk_level)}22`,
                    border: `1px solid ${getRiskColor(fusionResult.risk_level)}55`,
                    color: getRiskColor(fusionResult.risk_level),
                  }}
                >
                  {fusionResult.risk_level} Risk
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  {fusionResult.risk_message}
                </p>
              </div>
            </div>

            <div className="glass-card fd-viz-card text-center section">
              <h4 style={{ marginBottom: 16 }}>Emotion Radar</h4>
              <EmotionRadar
                face={faceResult?.emotions || {}}
                text={textResult?.emotions || {}}
                speech={speechResult?.emotions || {}}
                size={280}
              />
            </div>
          </div>

          {/* Fused emotions */}
          <div className="glass-card section">
            <h4 style={{ marginBottom: 14 }}>🧬 Fused Emotion Profile</h4>
            <EmotionBars emotions={fusionResult.emotions} highlight={fusionResult.dominant_emotion} />
          </div>

          {/* Mental health report */}
          {reportResult && <MentalHealthReport report={reportResult} />}
        </div>
      )}
    </div>
  );
}
