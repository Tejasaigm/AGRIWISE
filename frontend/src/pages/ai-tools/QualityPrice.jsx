// src/pages/ai-tools/QualityPrice.jsx
// Crop Quality Assessment + Price Prediction
// Calls POST /api/quality-price

import { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CROPS = [
  'tomato','potato','onion','rice','wheat','banana','mango',
  'cotton','maize','soybean','sugarcane','groundnut',
  'chilli','turmeric','ginger','garlic',
];

const GRADE_STYLES = {
  A: { bg: '#dcfce7', color: '#15803d', label: 'Premium', icon: '🥇' },
  B: { bg: '#dbeafe', color: '#1e40af', label: 'Standard', icon: '🥈' },
  C: { bg: '#fff7ed', color: '#c2410c', label: 'Below Standard', icon: '🥉' },
};

function GaugeMeter({ score }) {
  const pct   = score / 100;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 52;
  const circ  = Math.PI * r;           // half-circle circumference
  const dash  = circ * (1 - pct);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={130} height={76} viewBox="0 0 130 76">
        {/* Track */}
        <path d="M 14 70 A 51 51 0 0 1 116 70" fill="none" stroke="#e5e7eb" strokeWidth={12} strokeLinecap="round" />
        {/* Value */}
        <path d="M 14 70 A 51 51 0 0 1 116 70" fill="none"
          stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)', transformOrigin: '65px 70px', transform: 'scaleX(-1)' }}
        />
        <text x={65} y={64} textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{score}</text>
        <text x={65} y={76} textAnchor="middle" fontSize={10} fill="#9ca3af">/100</text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: -4 }}>Quality Score</div>
    </div>
  );
}

function ResultCard({ result }) {
  const grade = GRADE_STYLES[result.grade] || GRADE_STYLES.B;

  return (
    <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Grade header */}
      <div style={{
        borderRadius: 16, padding: 20, textAlign: 'center',
        background: `linear-gradient(135deg, ${grade.color}22, ${grade.color}11)`,
        border: `2px solid ${grade.color}44`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>{grade.icon}</div>
        <div style={{ fontSize: 11, color: grade.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          Grade {result.grade} — {grade.label}
        </div>
        <GaugeMeter score={result.quality_score} />
      </div>

      {/* Price breakdown */}
      <div className="agri-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 14 }}>💰 Price Analysis</div>
        {[
          ['Base Price (market modal)', `₹${result.base_price_per_kg?.toFixed(2)}/kg`],
          ['Quality Factor', `${result.quality_score}%`],
          ['Final Price', `₹${result.price_per_kg?.toFixed(2)}/kg`],
        ].map(([label, val], i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{label}</span>
            <span style={{
              fontSize: i === 2 ? 20 : 14,
              fontWeight: i === 2 ? 800 : 600,
              color: i === 2 ? 'var(--green-dark)' : 'var(--text)',
            }}>{val}</span>
          </div>
        ))}
        {result.market_range_per_ton && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 8,
            background: 'var(--gray-bg)', fontSize: 11, color: 'var(--text-light)',
          }}>
            📊 Market range: ₹{(result.market_range_per_ton.min / 1000).toFixed(1)} – ₹{(result.market_range_per_ton.max / 1000).toFixed(1)}/kg
            &nbsp;· Source: {result.price_source === 'market_data' ? 'AgriWise Market Data' : 'Estimate'}
          </div>
        )}
      </div>

      {/* Quality breakdown */}
      {result.quality_details && Object.keys(result.quality_details).length > 0 && (
        <div className="agri-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 12 }}>🔍 Quality Breakdown</div>
          {Object.entries(result.quality_details).map(([key, val]) => {
            const label = key.replace('_score', '').replace(/_/g, ' ');
            const pct   = (val / 100) * 100;
            return (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{val}</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 50, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 50, transition: 'width .8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: '10px 14px', borderRadius: 8, fontSize: 11,
        background: 'var(--green-xlight)', color: 'var(--green-dark)',
        lineHeight: 1.6,
      }}>
        💡 Formula: <code>price_per_kg = (base_price_per_ton ÷ 1000) × (quality_score ÷ 100)</code>
      </div>
    </div>
  );
}

export default function QualityPrice() {
  const fileRef = useRef(null);
  const [crop, setCrop]             = useState('');
  const [basePrice, setBasePrice]   = useState('');
  const [imageFile, setImageFile]   = useState(null);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please upload a valid image.'); return; }
    setImageFile(file); setError(null); setResult(null);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!crop)      { setError('Please select a crop type.'); return; }
    if (!imageFile) { setError('Please upload a crop image.'); return; }
    setLoading(true); setError(null); setResult(null);

    const formData = new FormData();
    formData.append('crop_image', imageFile);
    formData.append('crop_type', crop);
    if (basePrice) formData.append('base_price', parseFloat(basePrice));

    try {
      const res  = await fetch(`${API_BASE}/api/quality-price`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || data.message || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1>📈 Crop Quality & Price Prediction</h1>
        <p>Upload a crop photo — AI scores quality and calculates fair market price.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Crop selector */}
          <div className="agri-card animate-fadeUp" style={{ padding: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 10 }}>
              🌾 Crop Type <span style={{ color: 'var(--red)', fontSize: 11 }}>*required</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CROPS.map((c) => (
                <button key={c} onClick={() => { setCrop(c); setResult(null); setError(null); }}
                  style={{
                    padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600,
                    border: `2px solid ${crop === c ? 'var(--green)' : 'var(--border)'}`,
                    background: crop === c ? 'var(--green-xlight)' : 'white',
                    color: crop === c ? 'var(--green-dark)' : 'var(--text-mid)',
                    cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Optional base price override */}
          <div className="agri-card animate-fadeUp" style={{ padding: 16, animationDelay: '40ms' }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>
              💰 Base Price Override <span style={{ fontSize: 11, color: 'var(--text-light)' }}>(₹/ton – optional)</span>
            </label>
            <input
              type="number" value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 18000 — leave blank to use market data"
              className="agri-input" min="1" step="100"
            />
            <div style={{ fontSize: 11, color: 'var(--text-xlight)', marginTop: 6 }}>
              Market price from Agriculture_Commodities_Week.csv will be used if left blank.
            </div>
          </div>

          {/* Image upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className="animate-fadeUp"
            style={{
              border: `2px dashed ${preview ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer',
              background: preview ? 'var(--green-xlight)' : 'white',
              minHeight: 160, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              animationDelay: '80ms',
            }}
          >
            {preview
              ? <img src={preview} alt="Crop" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8 }} />
              : <><div style={{ fontSize: 40 }}>🥬</div><div style={{ fontWeight: 700 }}>Upload crop photo</div><div style={{ fontSize: 11, color: 'var(--text-light)' }}>Clear photo on plain background</div></>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])} />

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fee2e2', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!crop || !imageFile || loading}
            className="btn-primary"
            style={{ padding: '14px', borderRadius: 12, justifyContent: 'center', fontSize: 15, fontWeight: 700, opacity: (!crop || !imageFile || loading) ? 0.6 : 1 }}
          >
            {loading ? '🔄 Analyzing quality...' : '📊 Analyze Quality & Price'}
          </button>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div style={{
              height: 400, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              background: 'white', borderRadius: 16, border: '2px dashed var(--border)',
            }}>
              <div style={{ fontSize: 52 }}>📊</div>
              <div style={{ fontWeight: 700 }}>Quality & price results here</div>
              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Select crop + upload image</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
