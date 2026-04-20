
import './../../styles/AIToolsHub.css';

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

const TOOLS = [
  {
    to: '/ai/soil',
    icon: '🧪',
    title: 'Soil Analysis',
    subtitle: 'Accurate NPK, pH analysis and intelligent crop recommendations',
    badge: 'XGBoost + Computer Vision',
    accent: '#15803d',
  },
  {
    to: '/ai/disease',
    icon: '🦠',
    title: 'Disease Detection',
    subtitle: 'Identify diseases early and get precise treatment recommendations',
    badge: 'EfficientNet-B4',
    accent: '#b91c1c',
  },
  {
    to: '/ai/quality',
    icon: '📊',
    title: 'Crop Quality & Pricing',
    subtitle: 'Assess quality grade and estimate fair market price',
    badge: 'MobileNetV2 + Market Intelligence',
    accent: '#1e40af',
  },
  {
    to: '/ai/weather',
    icon: '🌤️',
    title: 'Weather Advisory',
    subtitle: 'Smart recommendations for irrigation, fertilizer and pest control',
    badge: 'OpenWeatherMap + AI',
    accent: '#0369a1',
  },
];

export default function AIToolsHub() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 150);
  }, []);

  return (
    <div className="ai-hub-page">
      <div className="page-header">
        <div className="badge">AI POWERED PRECISION TOOLS</div>
        <h1>Smart Farming Solutions</h1>
        <p className="description">
          Advanced AI tools designed to help Indian farmers increase productivity and reduce risk
        </p>
      </div>

      <div className="tools-grid">
        {TOOLS.map((tool, index) => (
          <Link
            key={tool.to}
            to={tool.to}
            className={`tool-card ${visible ? 'visible' : ''}`}
            style={{ '--delay': `${index * 100}ms`, '--accent': tool.accent }}
          >
            <div className="card">
              <div className="icon-wrapper">
                <span className="icon">{tool.icon}</span>
              </div>

              <div className="content">
                <h3>{tool.title}</h3>
                <p>{tool.subtitle}</p>
              </div>

              <div className="footer">
                <span className="badge">{tool.badge}</span>
                <span className="explore">Learn more →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Professional Chatbot Section */}
      <div className="chatbot-section">
        <div className="chatbot-card">
          <div className="chatbot-icon">🤖</div>
          <div className="chatbot-content">
            <h3>AgriWise AI Assistant</h3>
            <p>
              Ask questions about crops, diseases, soil health, government schemes, or market prices. 
              Available in English, Hindi and Telugu with voice support.
            </p>
          </div>
          <div className="chatbot-status">Voice Enabled • Multilingual</div>
        </div>
      </div>
    </div>
  );
}