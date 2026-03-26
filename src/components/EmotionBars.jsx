import React from 'react';

const EMOTION_COLORS = {
  angry:    '#ef4444',
  disgust:  '#a855f7',
  fear:     '#f97316',
  happy:    '#10b981',
  neutral:  '#6366f1',
  sad:      '#3b82f6',
  surprise: '#f59e0b',
  joy:      '#10b981',
  calm:     '#06b6d4',
};

const EMOTION_ICONS = {
  angry: '😠', disgust: '🤢', fear: '😨',
  happy: '😊', neutral: '😐', sad: '😢',
  surprise: '😲', joy: '😄', calm: '😌',
};

/**
 * EmotionBars — Animated horizontal bar chart for emotion scores
 * Props: emotions (dict {label: 0-1}), highlight (label to bold)
 */
export default function EmotionBars({ emotions = {}, highlight }) {
  const sorted = Object.entries(emotions)
    .filter(([, v]) => typeof v === 'number')
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No emotion data.</p>;
  }

  return (
    <div className="emotion-bar-wrap">
      {sorted.map(([emotion, score]) => {
        const pct = Math.round(score * 100);
        const color = EMOTION_COLORS[emotion] || '#6366f1';
        const isTop = emotion === highlight || score === sorted[0][1];
        return (
          <div className="emotion-bar-row" key={emotion}>
            <span className="emotion-bar-label" style={{ color: isTop ? color : undefined }}>
              {EMOTION_ICONS[emotion] || '●'} {emotion}
            </span>
            <div className="emotion-bar-track">
              <div
                className="emotion-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  boxShadow: isTop ? `0 0 8px ${color}60` : 'none',
                }}
              />
            </div>
            <span className="emotion-bar-pct" style={{ color: isTop ? color : undefined }}>
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
