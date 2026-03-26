import React, { useEffect, useRef } from 'react';
import './StressMeter.css';

const RISK_THRESHOLDS = [
  { min: 80, label: 'Critical', color: '#ef4444' },
  { min: 60, label: 'High',     color: '#f97316' },
  { min: 40, label: 'Moderate', color: '#f59e0b' },
  { min: 20, label: 'Mild',     color: '#34d399' },
  { min: 0,  label: 'Low',      color: '#10b981' },
];

function getRisk(score) {
  return RISK_THRESHOLDS.find((t) => score >= t.min) || RISK_THRESHOLDS[4];
}

/**
 * StressMeter — Animated SVG radial gauge (0–100)
 * Props: score (0-100), dominantEmotion, size
 */
export default function StressMeter({ score = 0, dominantEmotion = 'neutral', size = 260 }) {
  const svgRef = useRef(null);
  const clampedScore = Math.min(100, Math.max(0, score));
  const risk = getRisk(clampedScore);

  // Arc parameters
  const R = size / 2 - 22;
  const cx = size / 2;
  const cy = size / 2 + 20;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle; // 240 deg

  const polarToCart = (angleDeg, radius) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (startDeg, endDeg, r) => {
    const s = polarToCart(startDeg, r);
    const e = polarToCart(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const fillAngle = startAngle + (clampedScore / 100) * totalAngle;

  // Needle calculation
  const needleAngle = startAngle + (clampedScore / 100) * totalAngle;
  const needleTip = polarToCart(needleAngle, R - 14);
  const needleBase1 = polarToCart(needleAngle + 90, 8);
  const needleBase2 = polarToCart(needleAngle - 90, 8);

  // Tick marks
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="stress-meter" style={{ width: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size * 0.85}
        viewBox={`0 0 ${size} ${size * 0.85}`}
      >
        <defs>
          {/* Track gradient */}
          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#10b981" />
            <stop offset="40%"  stopColor="#f59e0b" />
            <stop offset="70%"  stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={describeArc(startAngle, endAngle, R)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Color fill track */}
        <path
          d={describeArc(startAngle, endAngle, R)}
          fill="none"
          stroke="url(#trackGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Active Fill Arc */}
        {clampedScore > 0 && (
          <path
            d={describeArc(startAngle, fillAngle, R)}
            fill="none"
            stroke={risk.color}
            strokeWidth="16"
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              transition: 'all 1.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        )}

        {/* Tick marks */}
        {ticks.map((tick) => {
          const angle = startAngle + (tick / 100) * totalAngle;
          const outer = polarToCart(angle, R + 14);
          const inner = polarToCart(angle, R + 6);
          const label = polarToCart(angle, R + 26);
          return (
            <g key={tick}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
              />
              <text
                x={label.x} y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={risk.color}
          filter="url(#needleGlow)"
          style={{ transition: 'all 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="10" fill="#1e293b" stroke={risk.color} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="4"  fill={risk.color} />

        {/* Score text */}
        <text
          x={cx} y={cy - R * 0.42}
          textAnchor="middle"
          fill={risk.color}
          fontSize={size * 0.13}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          style={{ transition: 'fill 0.5s ease' }}
        >
          {Math.round(clampedScore)}
        </text>
        <text
          x={cx} y={cy - R * 0.42 + size * 0.08}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={size * 0.045}
          fontFamily="Inter, sans-serif"
        >
          / 100
        </text>

        {/* Risk label */}
        <text
          x={cx} y={cy + R * 0.52}
          textAnchor="middle"
          fill={risk.color}
          fontSize={size * 0.065}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          style={{ transition: 'fill 0.5s ease' }}
        >
          {risk.label}
        </text>
      </svg>

      <div className="stress-meter-footer">
        <span className="dominant-label">Dominant: </span>
        <span className="dominant-value" style={{ textTransform: 'capitalize' }}>
          {dominantEmotion}
        </span>
      </div>
    </div>
  );
}
