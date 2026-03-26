import React from 'react';
import './MentalHealthReport.css';

const RISK_COLORS = {
  Critical: '#ef4444', High: '#f97316', Moderate: '#f59e0b', Mild: '#34d399', Low: '#10b981',
};
const RISK_ICONS = {
  Critical: '🚨', High: '⚠️', Moderate: '🔶', Mild: '🟡', Low: '✅',
};

/**
 * MentalHealthReport — Displays AI-generated clinical summary and recommendations
 */
export default function MentalHealthReport({ report }) {
  if (!report) return null;
  const { risk_level, stress_score, narrative, recommendations, emotions_summary } = report;
  const color = RISK_COLORS[risk_level] || '#10b981';
  const icon = RISK_ICONS[risk_level] || '✅';

  // Parse markdown bold from narrative (**text** → <strong>)
  const parseNarrative = (text = '') =>
    text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  return (
    <div className={`mhr glass-card anim-scale-in`}>
      {/* Risk banner */}
      <div className="mhr-banner" style={{ background: `${color}18`, borderColor: `${color}44` }}>
        <div className="mhr-banner-left">
          <span className="mhr-icon">{icon}</span>
          <div>
            <div className="mhr-risk" style={{ color }}>{risk_level} Stress Level</div>
            <div className="mhr-score-line">Composite Score: <strong style={{ color }}>{stress_score?.toFixed(1)}/100</strong></div>
          </div>
        </div>
        <div className="mhr-date">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* Narrative */}
      <div className="mhr-body">
        <h4 className="mhr-section-title">Clinical Assessment</h4>
        <p className="mhr-narrative">{parseNarrative(narrative)}</p>

        <div className="divider" />

        {/* Recommendations */}
        <h4 className="mhr-section-title">Recommendations</h4>
        <ul className="mhr-recs">
          {(recommendations || []).map((rec, i) => (
            <li key={i} className="mhr-rec-item">
              <span className="mhr-rec-bullet" style={{ background: color }}>
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>

        {/* Disclaimer */}
        <div className="mhr-disclaimer">
          ⚕️ This assessment is for informational purposes only and does not constitute medical advice.
          Please consult a qualified mental health professional for a clinical diagnosis.
        </div>
      </div>
    </div>
  );
}
