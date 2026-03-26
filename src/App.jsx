import React, { useState, useEffect } from 'react';
import './App.css';
import FaceAnalysis from './components/FaceAnalysis';
import TextAnalysis from './components/TextAnalysis';
import SpeechAnalysis from './components/SpeechAnalysis';
import FusionDashboard from './components/FusionDashboard';
import HistoryTimeline, { saveSession } from './components/HistoryTimeline';
import { checkHealth } from './services/api';

const TABS = [
  { id: 'dashboard', label: '⚡ Dashboard', icon: '⚡' },
  { id: 'face',      label: '📷 Face',      icon: '📷' },
  { id: 'text',      label: '📝 Text',      icon: '📝' },
  { id: 'speech',    label: '🎤 Speech',    icon: '🎤' },
  { id: 'history',   label: '📈 History',   icon: '📈' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [faceResult, setFaceResult] = useState(null);
  const [textResult, setTextResult] = useState(null);
  const [speechResult, setSpeechResult] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking'); // checking | ok | error

  useEffect(() => {
    checkHealth()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'));
  }, []);

  const handleFusionResult = (result) => {
    saveSession(result);
  };

  return (
    <div className="app">
      {/* Background blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🧠</div>
          <div>
            <div className="brand-name">EmoNLP</div>
            <div className="brand-tagline">Mental Health AI</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label.split(' ').slice(1).join(' ')}</span>
              {/* Status dot for modality tabs */}
              {tab.id === 'face' && faceResult && <span className="nav-dot" />}
              {tab.id === 'text' && textResult && <span className="nav-dot" />}
              {tab.id === 'speech' && speechResult && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`api-status ${apiStatus}`}>
            <span className={`api-dot ${apiStatus}`} />
            <span className="api-label">
              {apiStatus === 'checking' ? 'Connecting…'
                : apiStatus === 'ok' ? 'Backend Online'
                : 'Backend Offline'}
            </span>
          </div>
          <div className="sidebar-models">
            <div className="model-chip">DeepFace</div>
            <div className="model-chip">DistilRoBERTa</div>
            <div className="model-chip">Whisper</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="topbar-subtitle">Multimodal Emotion Recognition for Mental Health Analysis</p>
          </div>
          <div className="topbar-right">
            <div className="modality-status">
              <span className={`ms-chip ${faceResult ? 'active' : ''}`}>Face</span>
              <span className={`ms-chip ${textResult ? 'active' : ''}`}>Text</span>
              <span className={`ms-chip ${speechResult ? 'active' : ''}`}>Speech</span>
            </div>
          </div>
        </header>

        {/* API offline warning */}
        {apiStatus === 'error' && (
          <div className="api-offline-banner">
            ⚠️ Backend server is offline. Start it with: <code>cd backend && python -m uvicorn main:app --reload --port 8000</code>
          </div>
        )}

        {/* Tab content */}
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <FusionDashboard
              faceResult={faceResult}
              textResult={textResult}
              speechResult={speechResult}
              onFusionResult={handleFusionResult}
            />
          )}
          {activeTab === 'face' && (
            <div className="glass-card section">
              <FaceAnalysis onResult={setFaceResult} />
            </div>
          )}
          {activeTab === 'text' && (
            <div className="glass-card section">
              <TextAnalysis onResult={setTextResult} />
            </div>
          )}
          {activeTab === 'speech' && (
            <div className="glass-card section">
              <SpeechAnalysis onResult={setSpeechResult} />
            </div>
          )}
          {activeTab === 'history' && (
            <HistoryTimeline />
          )}
        </div>
      </main>
    </div>
  );
}
