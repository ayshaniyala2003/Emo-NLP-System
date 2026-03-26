import React from 'react';
import './EmotionRadar.css';

const EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'];
const EMOTION_COLORS = {
  face: 'rgba(99,102,241,0.8)',
  text: 'rgba(139,92,246,0.8)',
  speech: 'rgba(6,182,212,0.8)',
};
const FILL_COLORS = {
  face: 'rgba(99,102,241,0.15)',
  text: 'rgba(139,92,246,0.15)',
  speech: 'rgba(6,182,212,0.15)',
};

/**
 * EmotionRadar — SVG hexagonal radar spider chart
 * Props:
 *   face   - emotion dict from face analysis
 *   text   - emotion dict from text analysis
 *   speech - emotion dict from speech analysis
 *   size   - SVG size in px
 */
export default function EmotionRadar({ face = {}, text = {}, speech = {}, size = 300 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;
  const n = EMOTIONS.length;

  const polarToXY = (index, value) => {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2;
    const r = R * Math.min(value, 1);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const axisEndpoint = (index) => {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  };

  const labelPos = (index) => {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2;
    const r = R + 22;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Build polygon points from an emotion dict
  const polygonPoints = (emotions) =>
    EMOTIONS.map((em, i) => {
      const val = emotions[em] ?? 0;
      const pt = polarToXY(i, val);
      return `${pt.x},${pt.y}`;
    }).join(' ');

  // Concentric rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  const datasets = [
    { key: 'face', data: face, label: 'Face' },
    { key: 'text', data: text, label: 'Text' },
    { key: 'speech', data: speech, label: 'Speech' },
  ].filter((d) => Object.keys(d.data).length > 0);

  return (
    <div className="emotion-radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {datasets.map(({ key }) => (
            <filter key={key} id={`radar-glow-${key}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Concentric rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={EMOTIONS.map((_, i) => {
              const angle = (2 * Math.PI * i) / n - Math.PI / 2;
              const r = R * ring;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={ring === 1.0 ? 1.5 : 1}
          />
        ))}

        {/* Axis lines */}
        {EMOTIONS.map((_, i) => {
          const end = axisEndpoint(i);
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={end.x} y2={end.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygons */}
        {datasets.map(({ key, data }) => (
          <g key={key}>
            <polygon
              points={polygonPoints(data)}
              fill={FILL_COLORS[key]}
              stroke={EMOTION_COLORS[key]}
              strokeWidth="2"
              strokeLinejoin="round"
              filter={`url(#radar-glow-${key})`}
              style={{ transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
            />
            {/* Dots at each point */}
            {EMOTIONS.map((em, i) => {
              const val = data[em] ?? 0;
              const pt = polarToXY(i, val);
              return (
                <circle
                  key={em}
                  cx={pt.x} cy={pt.y} r="3.5"
                  fill={EMOTION_COLORS[key]}
                  style={{ transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
              );
            })}
          </g>
        ))}

        {/* Axis labels */}
        {EMOTIONS.map((em, i) => {
          const pos = labelPos(i);
          return (
            <text
              key={em}
              x={pos.x} y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize="10"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
              style={{ textTransform: 'capitalize' }}
            >
              {em.charAt(0).toUpperCase() + em.slice(1)}
            </text>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.2)" />
      </svg>

      {/* Legend */}
      {datasets.length > 0 && (
        <div className="radar-legend">
          {datasets.map(({ key, label }) => (
            <div key={key} className="radar-legend-item">
              <span className="radar-legend-dot" style={{ background: EMOTION_COLORS[key] }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
