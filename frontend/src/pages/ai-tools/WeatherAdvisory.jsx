// src/pages/ai-tools/WeatherAdvisory.jsx
// Real-time weather + crop/irrigation/fertilizer advice
// Calls GET /api/weather-advisory

import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function AlertBadge({ alert }) {
  const styles = {
    high:   { bg: '#fee2e2', color: '#b91c1c', icon: '🚨' },
    medium: { bg: '#fff7ed', color: '#c2410c', icon: '⚠️' },
    low:    { bg: '#fef9c3', color: '#a16207', icon: 'ℹ️' },
  };
  const s = styles[alert.severity] || styles.low;
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 10,
      background: s.bg, marginBottom: 8,
    }}>
      <span style={{ fontSize: 18 }}>{s.icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: s.color, textTransform: 'capitalize' }}>
          {alert.type.replace('_', ' ')}
        </div>
        <div style={{ fontSize: 12, color: s.color, opacity: 0.9, lineHeight: 1.5 }}>
          {alert.message}
        </div>
      </div>
    </div>
  );
}

function WeatherWidget({ weather }) {
  const desc = weather.description || 'N/A';
  const icon = desc.includes('rain') ? '🌧️' : desc.includes('cloud') ? '☁️' : desc.includes('clear') ? '☀️' : '🌤️';

  return (
    <div style={{
      borderRadius: 16, padding: 24,
      background: 'linear-gradient(135deg, #0c1445, #1a365d, #2d6a4f)',
      color: 'white',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
            {weather.city ? `📍 ${weather.city}` : '📍 Current Location'}
          </div>
          <div style={{ fontSize: 48, fontWeight: 800 }}>{weather.temperature}°C</div>
          <div style={{ fontSize: 13, opacity: 0.8, textTransform: 'capitalize', marginTop: 4 }}>
            {weather.description}
          </div>
        </div>
        <div style={{ fontSize: 64 }}>{icon}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 20 }}>
        {[
          ['💧', `${weather.humidity}%`, 'Humidity'],
          ['🌧️', `${weather.rainfall_mm}mm`, 'Rainfall'],
          ['💨', `${weather.wind_speed_kmh}km/h`, 'Wind'],
          ['🌡️', `${weather.feels_like || weather.temperature}°C`, 'Feels Like'],
        ].map(([ic, val, lbl]) => (
          <div key={lbl} style={{
            background: 'rgba(255,255,255,.12)', borderRadius: 10,
            padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{ic}</div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{val}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvisorySection({ icon, title, items, color = 'var(--green-dark)', bg = 'var(--green-xlight)' }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="agri-card" style={{ padding: 18, background: bg, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12 }}>{icon} {title}</div>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color, lineHeight: 1.6, paddingLeft: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WeatherAdvisory() {
  const [lat, setLat]         = useState('');
  const [lon, setLon]         = useState('');
  const [crop, setCrop]       = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLon(pos.coords.longitude.toFixed(4));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError('Could not detect location. Please enter coordinates manually.');
      }
    );
  };

  const fetchAdvisory = async () => {
    if (!lat || !lon) { setError('Please provide location coordinates.'); return; }
    const latF = parseFloat(lat), lonF = parseFloat(lon);
    if (isNaN(latF) || isNaN(lonF)) { setError('Invalid coordinates.'); return; }
    setLoading(true); setError(null);

    try {
      const url = `${API_BASE}/api/weather-advisory?lat=${latF}&lon=${lonF}${crop ? `&crop=${encodeURIComponent(crop)}` : ''}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail?.message || 'Failed to fetch advisory');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1>🌤 Weather Advisory</h1>
        <p>Real-time weather analysis with actionable farming advice for your location.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="agri-card animate-fadeUp" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📍 Your Location</div>

            <button
              onClick={detectLocation}
              disabled={geoLoading}
              className="btn-outline"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 12 }}
            >
              {geoLoading ? '🔄 Detecting...' : '🎯 Auto-detect Location'}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Latitude</label>
                <input value={lat} onChange={(e) => setLat(e.target.value)}
                  placeholder="17.3850" className="agri-input" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Longitude</label>
                <input value={lon} onChange={(e) => setLon(e.target.value)}
                  placeholder="78.4867" className="agri-input" />
              </div>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Current Crop <span style={{ color: 'var(--text-xlight)' }}>(optional)</span>
            </label>
            <input value={crop} onChange={(e) => setCrop(e.target.value)}
              placeholder="e.g. Tomato, Rice, Cotton"
              className="agri-input" style={{ marginBottom: 14 }} />

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={fetchAdvisory}
              disabled={loading || !lat || !lon}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: (loading || !lat || !lon) ? 0.6 : 1 }}
            >
              {loading ? '🔄 Fetching advisory...' : '🌤 Get Weather Advisory'}
            </button>
          </div>

          {/* Quick location presets */}
          <div className="agri-card animate-fadeUp" style={{ padding: 16, animationDelay: '60ms' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-mid)' }}>
              🏙 Quick Locations
            </div>
            {[
              ['Hyderabad, TG', 17.385, 78.487],
              ['Nashik, MH', 19.997, 73.790],
              ['Ludhiana, PB', 30.900, 75.857],
              ['Coimbatore, TN', 11.017, 76.966],
            ].map(([city, la, lo]) => (
              <button key={city} onClick={() => { setLat(la.toString()); setLon(lo.toString()); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: lat === la.toString() ? 'var(--green-xlight)' : 'transparent',
                  cursor: 'pointer', fontSize: 12,
                  color: lat === la.toString() ? 'var(--green-dark)' : 'var(--text-mid)',
                  fontWeight: lat === la.toString() ? 700 : 500,
                  fontFamily: 'inherit', marginBottom: 2,
                }}
              >
                📍 {city}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data ? (
            <>
              <div className="animate-fadeUp">
                <WeatherWidget weather={data.weather} />
              </div>

              {/* Alerts */}
              {data.advisory.alerts?.length > 0 && (
                <div className="animate-fadeUp" style={{ animationDelay: '60ms' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🚨 Active Alerts</div>
                  {data.advisory.alerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <AdvisorySection
                  icon="📋" title="General Advisory"
                  items={data.advisory.advisories}
                  color="var(--text-mid)" bg="white"
                />
                <AdvisorySection
                  icon="💧" title="Irrigation Advice"
                  items={data.advisory.irrigation_advice}
                  color="#1e40af" bg="#eff6ff"
                />
                <AdvisorySection
                  icon="🧪" title="Fertilizer Timing"
                  items={data.advisory.fertilizer_advice}
                  color="#7c3aed" bg="#f5f3ff"
                />
                <div className="agri-card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 12 }}>
                    🌾 Suitable Crops Now
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.advisory.crop_suggestions?.map((c, i) => (
                      <span key={i} style={{
                        padding: '5px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600,
                        background: 'var(--green-xlight)', color: 'var(--green-dark)',
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              height: 400, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              background: 'white', borderRadius: 16, border: '2px dashed var(--border)',
            }}>
              <div style={{ fontSize: 64 }}>🌤</div>
              <div style={{ fontWeight: 700 }}>Weather advisory appears here</div>
              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Enter location and click Get Advisory</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
