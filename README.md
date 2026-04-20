# 🌿 AgriWise AI – Intelligent Agriculture & Marketplace Ecosystem
## v2.0.0 — Production-Ready Platform
cd backend/ml_service
venv\Scripts\activate
uvicorn main:app --reload
---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                      │
│   LoginPage  FarmerDashboard  Marketplace  AI Tools (4 modules)     │
│   VoiceAssistant (multilang)  BuyerDashboard  AddProduct            │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTP / multipart
┌────────────────────────▼────────────────────────────────────────────┐
│              API GATEWAY  (Node.js / Express :3000)                  │
│   /auth → JWT + OTP    /products → CRUD    /orders → state machine  │
│   /payments → Razorpay+Stripe+COD          /api/* → proxy to ML    │
└────────────────────────┬────────────────────────────────────────────┘
              ┌───────────┴────────────┐
              │                        │
┌─────────────▼──────────┐  ┌─────────▼────────────────────────────┐
│  PostgreSQL (RDS/local) │  │  FastAPI ML Service  (:8000)          │
│  users, products,       │  │  POST /api/predict-soil               │
│  orders, predictions,   │  │  POST /api/predict-disease            │
│  analytics, alerts,     │  │  POST /api/quality-price              │
│  market_prices, cart    │  │  POST /api/chatbot                    │
└─────────────────────────┘  │  GET  /api/weather-advisory           │
                              │  GET  /api/analytics                  │
┌─────────────────────────┐  └─────────┬────────────────────────────┘
│  Redis (OTP + cache)    │            │ calls
└─────────────────────────┘  ┌─────────▼────────────────────────────┐
                              │  External Services                     │
                              │  OpenWeatherMap  ·  Anthropic API     │
                              │  Cloudinary      ·  Razorpay/Stripe   │
                              └───────────────────────────────────────┘
```

---

## ML Pipeline Details

```
Soil Image
    │
    ├─ OpenCV decode + resize
    ├─ K-means dominant HSV cluster
    ├─ HSV → (N, P, K, pH) lookup table
    ├─ classify_fertility() → Low/Medium/High
    ├─ OpenWeatherMap → temp, humidity, rainfall
    └─ CalibratedClassifierCV(XGBClassifier) ──→ crop + confidence

Leaf Image + plant_name
    │
    ├─ cv2.fastNlMeansDenoisingColored (denoise)
    ├─ resize 224×224, normalize, EfficientNet preprocessing
    ├─ EfficientNetB4.predict() → 38-class probabilities
    ├─ STRICT FILTER: zero out all classes not belonging to plant_name
    ├─ Renormalize among plant's classes
    └─ confidence ≥ 0.70 → disease + pesticide treatment

Crop Image + crop_type
    │
    ├─ MobileNetV2 quality score (0-100) [or CV fallback]
    │   CV fallback: color_score + texture_score + defect_score + uniformity
    ├─ Market price lookup from Agriculture_Commodities_Week.csv
    ├─ price_per_kg = (modal_per_ton / 1000) × (quality_score / 100)
    └─ Grade: A(80-100), B(60-79), C(0-59)
```

---

## Folder Structure

```
agriwise-platform/
├── backend/
│   ├── ml_service/                   # FastAPI (Python 3.11)
│   │   ├── main.py                   # App + router registration
│   │   ├── routes/
│   │   │   ├── soil.py               # POST /api/predict-soil
│   │   │   ├── disease.py            # POST /api/predict-disease
│   │   │   ├── quality_price.py      # POST /api/quality-price
│   │   │   ├── chatbot.py            # POST /api/chatbot
│   │   │   ├── weather.py            # GET  /api/weather-advisory
│   │   │   └── analytics.py          # GET  /api/analytics
│   │   ├── services/
│   │   │   ├── weather_service.py    # OpenWeatherMap integration
│   │   │   └── prediction_log.py     # Audit logger
│   │   ├── middleware/
│   │   │   └── rate_limit.py         # Sliding window IP limiter
│   │   ├── models/                   # Trained .pkl / .h5 files (gitignored)
│   │   ├── data/                     # CSV datasets (gitignored)
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── api_gateway/                  # Express (Node.js 20)
│       ├── server.js                 # Gateway + proxy
│       ├── routes/
│       │   ├── auth.js               # OTP + JWT
│       │   ├── products.js           # Marketplace CRUD
│       │   ├── orders.js             # Orders + state machine
│       │   └── payments.js           # Razorpay + Stripe webhooks
│       ├── middleware/
│       │   └── auth.js               # JWT verification + RBAC
│       ├── services/
│       │   ├── db.js                 # pg Pool
│       │   └── redis.js              # ioredis
│       ├── package.json
│       └── Dockerfile
│
├── frontend/                         # Vite + React 18
│   ├── src/
│   │   ├── App.jsx                   # Router (UPDATED – adds /ai/* routes)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── farmer/
│   │   │   │   ├── FarmerDashboard.jsx
│   │   │   │   ├── FarmerProducts.jsx
│   │   │   │   └── AddProduct.jsx
│   │   │   ├── buyer/
│   │   │   │   └── BuyerDashboard.jsx
│   │   │   └── ai-tools/             # NEW
│   │   │       ├── AIToolsHub.jsx    # /ai
│   │   │       ├── SoilAnalysis.jsx  # /ai/soil
│   │   │       ├── DiseaseDetection.jsx # /ai/disease
│   │   │       ├── QualityPrice.jsx  # /ai/quality
│   │   │       └── WeatherAdvisory.jsx  # /ai/weather
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Navbar.jsx        # UPDATED – adds AI Tools link
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── LanguageSwitcher.jsx
│   │   │   └── voice/
│   │   │       └── VoiceAssistant.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ProductsContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── i18n/locales/
│   │   │   ├── en.json
│   │   │   ├── hi.json
│   │   │   └── te.json
│   │   └── styles/global.css
│   ├── Dockerfile
│   └── nginx.conf
│
├── database/
│   └── schema.sql                    # Full PostgreSQL schema + views + seed
│
├── ml_models/
│   └── train_soil_model.py           # Train CalibratedClassifierCV on CSV
│
├── docker/
│   └── docker-compose.yml            # Full stack: pg + redis + ml + gateway + frontend
│
├── deployment/
│   ├── DEPLOYMENT.md                 # AWS / GCP / Azure / local guides
│   └── API_REFERENCE.md              # Full API docs with sample requests
│
└── .env.example                      # All required environment variables
```

---

## Integration: Existing App → New Modules

The new modules are **drop-in additions** to your existing Vite app:

| File | Action |
|------|--------|
| `frontend/src/App.jsx` | Replace existing file — adds `/ai/*` routes |
| `frontend/src/components/ui/Navbar.jsx` | Replace — adds 🤖 AI Tools nav link |
| `frontend/src/pages/ai-tools/` | Add new directory with 5 new files |

Nothing else in the existing codebase changes. All contexts, styles, i18n, and existing pages are preserved.

---

## Dataset Usage

| Dataset | Used In | How |
|---------|---------|-----|
| `crop_recommendation.csv` | `train_soil_model.py` | Trains CalibratedClassifierCV(XGBClassifier). 2200 samples, 22 crops, 7 features. |
| `Price_Agriculture_commodities_Week.csv` | `routes/quality_price.py` | Loaded as pandas DataFrame. Modal price lookup by commodity → converted ₹/quintal → ₹/ton. |
| PlantVillage Dataset | `routes/disease.py` | 38-class EfficientNetB4 fine-tuned model. Class map hardcoded. Strict per-plant filtering enforced. |

---

## Quick Smoke Tests

```bash
# Soil analysis
curl -X POST http://localhost:3000/api/predict-soil \
  -F "soil_image=@test_soil.jpg" \
  -F "latitude=17.385" \
  -F "longitude=78.487"

# Disease detection
curl -X POST http://localhost:3000/api/predict-disease \
  -F "plant_name=Tomato" \
  -F "leaf_image=@test_leaf.jpg"

# Quality + price
curl -X POST http://localhost:3000/api/quality-price \
  -F "crop_image=@test_tomato.jpg" \
  -F "crop_type=tomato"

# Chatbot
curl -X POST http://localhost:3000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"Best fertilizer for rice?","language":"en"}'

# Weather advisory
curl "http://localhost:3000/api/weather-advisory?lat=17.385&lon=78.487&crop=tomato"

# OTP login
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","role":"farmer"}'
```
