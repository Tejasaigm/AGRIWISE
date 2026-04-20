import { useState, useRef, useCallback } from 'react';
const FERTILITY_COLORS = {
  High: { bg: '#dcfce7', color: '#15803d', icon: '🟢' },
  Medium: { bg: '#fef9c3', color: '#a16207', icon: '🟡' },
  Low: { bg: '#fee2e2', color: '#b91c1c', icon: '🔴' },
};

const CROP_ICONS = {
  rice: '🌾', maize: '🌽', wheat: '🌾', cotton: '🌿', banana: '🍌',
  mango: '🥭', grapes: '🍇', apple: '🍎', orange: '🍊', coconut: '🥥',
  coffee: '☕', jute: '🌿', chickpea: '🫘', lentil: '🫘',
};

function NutrientBar({ label, value, max, unit, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 15.5, fontWeight: 700, color }}>{value}{unit}</span>
      </div>
      <div style={{ height: 10, background: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 9999,
            transition: 'width 1.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const fertility = FERTILITY_COLORS[result.fertility] || FERTILITY_COLORS.Medium;
  const cropIcon = CROP_ICONS[result.recommended_crop?.toLowerCase()] || '🌱';
  const confPct = Math.round(result.confidence * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Hero Recommended Crop */}
      <div
        style={{
          background: 'linear-gradient(135deg, #14532d, #166534)',
          borderRadius: 24,
          padding: 32,
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 20px 30px -10px rgba(20, 83, 45, 0.3)',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 12 }}>{cropIcon}</div>
        <div style={{ fontSize: 13, opacity: 0.85, letterSpacing: 2, textTransform: 'uppercase' }}>
          RECOMMENDED CROP
        </div>
        <h2 style={{ fontSize: 34, fontWeight: 800, margin: '12px 0 16px', textTransform: 'capitalize' }}>
          {result.recommended_crop}
        </h2>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 24px',
            background: confPct >= 80 ? '#22c55e' : confPct >= 65 ? '#eab308' : '#ef4444',
            borderRadius: 50,
            fontWeight: 700,
            fontSize: 15.5,
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          }}
        >
          🎯 {confPct}% Confidence
        </div>
      </div>

      {/* Fertility */}
      <div
        style={{
          padding: 22,
          borderRadius: 20,
          background: fertility.bg,
          border: `2px solid ${fertility.color}40`,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ fontSize: 48 }}>{fertility.icon}</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: fertility.color, textTransform: 'uppercase' }}>
            Soil Fertility
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: fertility.color }}>
            {result.fertility}
          </div>
        </div>
      </div>

      {/* Nutrients */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 22,
          padding: 28,
          boxShadow: '0 10px 20px -5px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 22, color: '#1f2937' }}>
          🧪 Soil Nutrient Levels
        </div>
        <NutrientBar label="Nitrogen (N)" value={result.n} max={140} unit=" mg/kg" color="#22c55e" />
        <NutrientBar label="Phosphorus (P)" value={result.p} max={145} unit=" mg/kg" color="#3b82f6" />
        <NutrientBar label="Potassium (K)" value={result.k} max={205} unit=" mg/kg" color="#f97316" />
        <NutrientBar label="pH Level" value={result.ph} max={14} unit="" color="#a855f7" />
      </div>

      {/* Weather */}
      {result.weather_context && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            borderRadius: 22,
            padding: 26,
            border: '1px solid #bae6fd',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 18 }}>
            🌤️ Weather Data Used
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 16 }}>
            {[
              { icon: '🌡️', label: 'Temperature', val: `${result.weather_context.temperature_c}°C` },
              { icon: '💧', label: 'Humidity', val: `${result.weather_context.humidity_pct}%` },
              { icon: '🌧️', label: 'Rainfall', val: `${result.weather_context.rainfall_mm} mm` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'white',
                  padding: 18,
                  borderRadius: 16,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{item.val}</div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives */}
      {result.alternatives?.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: 26,
            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🌿 Alternative Crops</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {result.alternatives.map((alt, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 20px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 50,
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {CROP_ICONS[alt.crop?.toLowerCase()] || '🌱'} {alt.crop}
                <span style={{ fontSize: 13, opacity: 0.75 }}>
                  ({Math.round(alt.confidence * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SoilAnalysis() {
  const fileRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG image only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB.');
      return;
    }
    setImageFile(file);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!imageFile || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const url = '/api/predict-soil';   // ← Using Vite proxy
    console.log('🔍 Calling backend →', url);

    const formData = new FormData();
    formData.append('soil_image', imageFile);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', res.status, res.statusText);

      const text = await res.text();

      if (!text || text.trim() === '') {
        throw new Error(`Server returned empty response (Status ${res.status}). Check backend logs.`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Raw response was:', text);
        throw new Error(`Invalid JSON from server (Status ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(
          data?.detail?.message || 
          data?.message || 
          data?.error || 
          `Server error ${res.status}`
        );
      }

      setResult(data);
    } catch (err) {
      console.error('❌ Analysis failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: '20px 0 60px' }}>
      <div className="page-header animate-fadeUp" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 34, marginBottom: 10 }}>🧪 Soil Analysis & Crop Recommendation</h1>
        <p style={{ fontSize: 17.5, color: '#64748b', maxWidth: 680 }}>
          Upload a clear photo of your soil test strip. Our AI instantly analyzes NPK, pH and recommends the best crop.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }}>
        {/* Upload Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `3px dashed ${preview ? '#16a34a' : '#94a3b8'}`,
              borderRadius: 24,
              padding: preview ? 20 : 60,
              textAlign: 'center',
              cursor: 'pointer',
              background: preview ? '#f0fdf4' : '#fff',
              minHeight: 340,
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
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 16, boxShadow: '0 15px 25px rgba(0,0,0,0.15)' }}
              />
            ) : (
              <>
                <div style={{ fontSize: 72, marginBottom: 20 }}>🌍</div>
                <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 8 }}>Drop soil test image here</div>
                <div style={{ color: '#64748b', marginBottom: 16 }}>or click to select from device</div>
                <div style={{ fontSize: 13.5, color: '#94a3b8' }}>JPG / PNG • Max 10MB</div>
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

          {preview && (
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-outline"
              style={{ padding: '14px 0' }}
            >
              🔄 Change Image
            </button>
          )}

          {error && (
            <div
              style={{
                padding: '16px 22px',
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: 16,
                borderLeft: '6px solid #ef4444',
                fontSize: 14.5,
                lineHeight: 1.5,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!imageFile || loading}
            className="btn-primary"
            style={{
              padding: '18px',
              fontSize: 17.5,
              fontWeight: 700,
              borderRadius: 16,
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                Analyzing with AI...
              </span>
            ) : (
              '🔬 Analyze Soil'
            )}
          </button>

          <div style={{ background: '#f8fafc', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: 14 }}>💡 How It Works</div>
            {[
              'Upload photo of soil test strip',
              'AI extracts colors using HSV analysis',
              'Maps values to N, P, K & pH',
              'Combines with real-time weather',
              'XGBoost model recommends best crop',
            ].map((step, i) => (
              <div key={i} style={{ marginBottom: 7, fontSize: 14.2, color: '#475569' }}>
                • {step}
              </div>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div
              style={{
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
              }}
            >
              <div style={{ fontSize: 82, opacity: 0.6, marginBottom: 24 }}>🔬</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                Analysis results will appear here
              </div>
              <div style={{ color: '#64748b', maxWidth: 300 }}>
                Upload a soil test strip image and click Analyze
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}