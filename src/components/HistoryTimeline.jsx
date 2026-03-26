import React, { useState, useEffect } from 'react';
import './HistoryTimeline.css';

const STRESS_COLOR = (score) => {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
};

const STORAGE_KEY = 'emo_nlp_history';

export function saveSession(fusionResult) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      stress_score: fusionResult.stress_score,
      risk_level: fusionResult.risk_level,
      dominant_emotion: fusionResult.dominant_emotion,
      emotions: fusionResult.emotions,
      modalities: fusionResult.active_modalities,
    };
    const updated = [entry, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

/**
 * HistoryTimeline — Session history with SVG stress trend line chart
 */
export default function HistoryTimeline() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch { setHistory([]); }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  const last10 = history.slice(0, 10).reverse(); // oldest→newest for chart

  // SVG line chart
  const chartW = 500, chartH = 120;
  const padX = 30, padY = 10;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const points = last10.map((h, i) => {
    const x = padX + (i / Math.max(last10.length - 1, 1)) * innerW;
    const y = padY + innerH - (h.stress_score / 100) * innerH;
    return { x, y, ...h };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = points.length > 1
    ? `M ${points[0].x},${padY + innerH} ` +
      points.map((p) => `L ${p.x},${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x},${padY + innerH} Z`
    : '';

  return (
    <div className="history-timeline">
      <div className="ht-header">
        <div>
          <h3>📈 Session History</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
            {history.length} sessions recorded
          </p>
        </div>
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear History</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="ht-empty">
          <span>📊</span>
          <p>No sessions yet. Run a full analysis to start tracking.</p>
        </div>
      ) : (
        <>
          {/* Trend chart */}
          {last10.length > 1 && (
            <div className="glass-card ht-chart-wrap">
              <div className="ht-chart-title">Stress Score Trend (last {last10.length} sessions)</div>
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                style={{ width: '100%', height: 'auto' }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((v) => {
                  const y = padY + innerH - (v / 100) * innerH;
                  return (
                    <g key={v}>
                      <line x1={padX} y1={y} x2={chartW - padX} y2={y}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
                      <text x={padX - 6} y={y} textAnchor="end" dominantBaseline="middle"
                        fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="JetBrains Mono">
                        {v}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                {area && <path d={area} fill="url(#areaGrad)" />}

                {/* Line */}
                {polyline && (
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {/* Data points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill={STRESS_COLOR(p.stress_score)}
                      stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
                  </g>
                ))}
              </svg>
            </div>
          )}

          {/* Session list */}
          <div className="ht-sessions">
            {history.slice(0, 15).map((entry) => (
              <div key={entry.id} className="glass-card ht-session-card">
                <div className="ht-session-left">
                  <div
                    className="ht-stress-badge"
                    style={{ background: `${STRESS_COLOR(entry.stress_score)}22`,
                      color: STRESS_COLOR(entry.stress_score),
                      border: `1px solid ${STRESS_COLOR(entry.stress_score)}44` }}
                  >
                    {entry.stress_score?.toFixed(0)}
                  </div>
                  <div>
                    <div className="ht-dominant">{entry.dominant_emotion}</div>
                    <div className="ht-risk" style={{ color: STRESS_COLOR(entry.stress_score) }}>
                      {entry.risk_level}
                    </div>
                  </div>
                </div>
                <div className="ht-session-right">
                  <div className="ht-modalities">
                    {(entry.modalities || []).map((m) => (
                      <span key={m} className="badge badge-ghost">{m}</span>
                    ))}
                  </div>
                  <div className="ht-time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
