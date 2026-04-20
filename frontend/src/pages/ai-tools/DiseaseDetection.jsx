import { useState, useRef } from 'react';

const PLANTS = [
  'Apple', 'Banana', 'Blueberry', 'Cherry', 'Chilli', 'Coconut',
  'Corn', 'Cotton', 'Grape', 'Lemon', 'Mango', 'Orange',
  'Peach', 'Pepper', 'Potato', 'Rice', 'Raspberry', 'Soybean',
  'Squash', 'Strawberry', 'Sugarcane', 'Tomato', 'Wheat', 'Pomegranate',
  'Guava', 'Papaya', 'Brinjal', 'Cauliflower', 'Cabbage'
].sort();

const SEVERITY_STYLES = {
  'High': { bg: '#fee2e2', color: '#b91c1c', icon: '🔴' },
  'Medium': { bg: '#fff7ed', color: '#c2410c', icon: '🟠' },
  'Low – Monitor closely': { bg: '#fef9c3', color: '#a16207', icon: '🟡' },
};

function ConfidenceArc({ confidence }) {
  const pct = Math.round(confidence * 100);
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const stroke = circ - (circ * pct) / 100;
  const color = pct >= 90 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={55} cy={55} r={radius} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <text x={55} y={60} textAnchor="middle" fontSize={20} fontWeight={800} fill={color}>
          {pct}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Confidence</div>
    </div>
  );
}

function ResultCard({ result }) {
  const isHealthy = result.is_healthy;
  const sevStyle = SEVERITY_STYLES[result.severity] || SEVERITY_STYLES['Medium'];

  return (
    <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        borderRadius: 20,
        padding: 28,
        textAlign: 'center',
        background: isHealthy
          ? 'linear-gradient(135deg, #14532d, #166534)'
          : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        color: 'white',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>
          {isHealthy ? '🌿✅' : '🦠'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {result.plant}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>
          {result.disease}
        </h2>
      </div>

      {/* Confidence + Severity */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ConfidenceArc confidence={result.confidence} />

        {!isHealthy && (
          <div style={{
            flex: 1,
            padding: '14px 18px',
            background: sevStyle.bg,
            borderRadius: 16,
            border: `2px solid ${sevStyle.color}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{sevStyle.icon}</span>
              <span style={{ fontWeight: 700, color: sevStyle.color, fontSize: 15.5 }}>
                Severity: {result.severity}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#444' }}>
              Immediate attention recommended
            </div>
          </div>
        )}
      </div>

      {/* Treatment Recommendation */}
      {!isHealthy && result.pesticide && (
        <div style={{
          padding: 20,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c2410c', marginBottom: 10 }}>
            💊 Recommended Treatment
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#9a3412' }}>
            {result.pesticide}
          </p>
        </div>
      )}

      {/* Safety Note */}
      <div style={{
        padding: '14px 18px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 12,
        fontSize: 12.5,
        color: '#166534',
        lineHeight: 1.6,
      }}>
        ⚠️ Always follow safety precautions. Wear gloves and mask while applying any treatment. 
        For best results, consult your local agriculture officer or KVK.
      </div>
    </div>
  );
}

export default function DiseaseDetection() {
  const fileRef = useRef(null);
  const [plant, setPlant] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG image only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB.');
      return;
    }

    setImageFile(file);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!plant) {
      setError('Please select a plant type.');
      return;
    }
    if (!imageFile) {
      setError('Please upload a leaf image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('plant_name', plant);
    formData.append('leaf_image', imageFile);

    try {
      const res = await fetch('/api/predict-disease', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        throw new Error(data.detail?.message || data.message || 'Detection failed. Please try again.');
      }

      setResult(data);
    } catch (err) {
      console.error('❌ Disease detection failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: '20px 0 60px' }}>
      <div className="page-header animate-fadeUp" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 34, marginBottom: 10 }}>🦠 Plant Disease Detection</h1>
        <p style={{ fontSize: 17.5, color: '#64748b', maxWidth: 720 }}>
          Select crop type and upload a clear photo of the affected leaf. 
          Our AI (EfficientNetB4) will detect the disease and suggest treatment.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }}>
        {/* Input Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Beautiful Plant Dropdown */}
          <div className="agri-card" style={{ padding: 20 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10, display: 'block', color: '#1f2937' }}>
              🌱 Select Plant / Crop Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={plant}
              onChange={(e) => {
                setPlant(e.target.value);
                setResult(null);
                setError(null);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 15.5,
                borderRadius: 12,
                border: '2px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
              }}
            >
              <option value="">-- Choose a plant --</option>
              {PLANTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `3px dashed ${preview ? '#16a34a' : '#94a3b8'}`,
              borderRadius: 24,
              padding: preview ? 16 : 60,
              textAlign: 'center',
              cursor: 'pointer',
              background: preview ? '#f0fdf4' : '#fff',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)',
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Leaf Preview"
                style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 16, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
              />
            ) : (
              <>
                <div style={{ fontSize: 68, marginBottom: 16 }}>🍃</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Upload affected leaf photo</div>
                <div style={{ color: '#64748b', marginBottom: 12 }}>Drag & drop or click to select</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>JPG / PNG • Max 10MB • Clear daylight photo recommended</div>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {error && (
            <div style={{
              padding: '16px 20px',
              background: '#fef2f2',
              color: '#991b1b',
              borderRadius: 16,
              borderLeft: '6px solid #ef4444',
              fontSize: 14.5,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!plant || !imageFile || loading}
            className="btn-primary"
            style={{
              padding: '18px',
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 16,
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                Detecting Disease...
              </span>
            ) : (
              '🔬 Detect Disease'
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div>
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div style={{
              minHeight: 520,
              background: '#ffffff',
              borderRadius: 24,
              border: '2px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 40,
            }}>
              <div style={{ fontSize: 82, opacity: 0.6, marginBottom: 24 }}>🍃</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                Detection result will appear here
              </div>
              <div style={{ color: '#64748b', maxWidth: 320 }}>
                Select a plant and upload a clear photo of the affected leaf
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}