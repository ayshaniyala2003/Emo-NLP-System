import React, { useState, useCallback, useRef } from 'react';
import { analyzeText } from '../services/api';
import EmotionBars from './EmotionBars';
import './TextAnalysis.css';

const DEBOUNCE_MS = 700;

/**
 * TextAnalysis — Text input with real-time debounced emotion analysis
 * Uses j-hartmann/emotion-english-distilroberta-base via backend
 */
export default function TextAnalysis({ onResult }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const debounceRef = useRef(null);

  const runAnalysis = useCallback(async (inputText) => {
    if (!inputText.trim() || inputText.trim().length < 3) return;
    setLoading(true);
    setError('');
    try {
      const data = await analyzeText(inputText);
      setResult(data);
      onResult?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    setCharCount(val.length);
    clearTimeout(debounceRef.current);
    if (val.trim().length > 3) {
      debounceRef.current = setTimeout(() => runAnalysis(val), DEBOUNCE_MS);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    runAnalysis(text);
  };

  const stressColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const EXAMPLE_PROMPTS = [
    "I feel completely overwhelmed with everything at work",
    "Having a great day, things are going well",
    "I can't sleep, my mind won't stop racing",
    "I feel calm and at peace today",
  ];

  return (
    <div className="text-analysis">
      <div className="ta-header">
        <div>
          <h3>📝 Text Sentiment Analysis</h3>
          <p className="ta-subtitle">DistilRoBERTa emotion classifier — auto-analyzes as you type</p>
        </div>
        {loading && <span className="spinner" />}
      </div>

      {/* Example prompts */}
      <div className="ta-examples">
        {EXAMPLE_PROMPTS.map((ex, i) => (
          <button
            key={i}
            className="ta-example-btn"
            onClick={() => { setText(ex); setCharCount(ex.length); runAnalysis(ex); }}
          >
            {ex}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="ta-form">
        <textarea
          className="input-area ta-textarea"
          rows={5}
          placeholder="Describe how you're feeling... The more detail, the better the analysis."
          value={text}
          onChange={handleChange}
          maxLength={2000}
        />
        <div className="ta-form-footer">
          <span className="ta-char-count">{charCount} / 2000</span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" /> Analyzing…</> : '🔍 Analyze'}
          </button>
        </div>
      </form>

      {error && <div className="ta-error">⚠️ {error}</div>}

      {result && (
        <div className="ta-results anim-fade-in">
          <div className="ta-result-header">
            <div className="ta-result-kv">
              <span className="ta-kv-label">Dominant</span>
              <span className="ta-kv-val" style={{
                textTransform: 'capitalize',
                color: stressColor(result.stress_score)
              }}>
                {result.dominant_emotion}
              </span>
            </div>
            <div className="ta-result-kv">
              <span className="ta-kv-label">Stress Score</span>
              <span className="ta-kv-val" style={{ color: stressColor(result.stress_score) }}>
                {result.stress_score?.toFixed(1)}
              </span>
            </div>
            <div className="ta-result-kv">
              <span className="ta-kv-label">Confidence</span>
              <span className="ta-kv-val">{(result.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
          <EmotionBars emotions={result.emotions} highlight={result.dominant_emotion} />
        </div>
      )}
    </div>
  );
}
