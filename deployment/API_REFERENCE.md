# AgriWise AI – API Reference
## Version 2.0.0  |  Base URL: `http://localhost:3000`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth Endpoints

### POST /auth/send-otp
Send OTP to farmer/buyer mobile number.

**Request:**
```json
{ "phone": "9876543210", "role": "farmer" }
```
**Response 200:**
```json
{
  "message": "OTP sent successfully",
  "expires_in": 300,
  "dev_otp": "482931"
}
```
**Errors:** `422 VALIDATION_ERROR` | `429 OTP_RATE_LIMIT`

---

### POST /auth/verify-otp
Verify OTP and receive JWT.

**Request:**
```json
{ "phone": "9876543210", "otp": "482931", "name": "Raju Reddy" }
```
**Response 200:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "name": "Raju Reddy", "phone": "9876543210", "role": "farmer" }
}
```
**Errors:** `401 OTP_EXPIRED` | `401 OTP_INVALID`

---

## ML Service Endpoints (proxied via Gateway)

### POST /api/predict-soil
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| soil_image | File | ✅ | JPG/PNG soil test strip, max 10MB |
| latitude | float | No | Default: 17.385 (Hyderabad) |
| longitude | float | No | Default: 78.487 |

**Response 200:**
```json
{
  "n": 87.3,
  "p": 45.2,
  "k": 41.8,
  "ph": 6.52,
  "fertility": "High",
  "recommended_crop": "rice",
  "confidence": 0.8734,
  "alternatives": [
    { "crop": "maize",    "confidence": 0.0621 },
    { "crop": "banana",   "confidence": 0.0342 },
    { "crop": "coconut",  "confidence": 0.0189 }
  ],
  "weather_context": {
    "temperature_c": 28.5,
    "humidity_pct": 74,
    "rainfall_mm": 8.2
  },
  "dominant_hsv": { "H": 18.4, "S": 112.3, "V": 62.7 }
}
```
**Errors:**
```json
{ "error": "LOW_CONFIDENCE", "message": "Confidence 0.48 below threshold (0.55)", "confidence": 0.48 }
{ "error": "IMAGE_TOO_SMALL", "message": "Image appears to be empty or corrupt" }
{ "error": "DECODE_FAILED",   "message": "Cannot decode image. Ensure it is a valid JPG or PNG." }
```

---

### POST /api/predict-disease
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| plant_name | string | ✅ | Must be in PlantVillage dataset |
| leaf_image | File | ✅ | JPG/PNG leaf photo, max 15MB |

**Valid plant_name values:**
`Apple, Blueberry, Cherry, Corn, Grape, Orange, Peach, Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato`

**Response 200:**
```json
{
  "plant": "Tomato",
  "disease": "Early Blight",
  "confidence": 0.8912,
  "pesticide": "Mancozeb 75% WP (2.5g/L) or Chlorothalonil (Kavach). Spray every 7 days.",
  "is_healthy": false,
  "severity": "High"
}
```
**Errors:**
```json
{ "error": "PLANT_NOT_IN_DATASET", "message": "'Spinach' is not in the PlantVillage dataset.", "valid_plants": [...] }
{ "error": "LOW_CONFIDENCE", "message": "Confidence 0.62 is below threshold (0.70). Provide clearer image.", "confidence": 0.62 }
```

---

### POST /api/quality-price
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| crop_image | File | ✅ | Crop photo, max 15MB |
| crop_type | string | ✅ | e.g. tomato, wheat, onion |
| base_price | float | No | Override in ₹/ton (uses market data if omitted) |

**Response 200:**
```json
{
  "quality_score": 82.4,
  "grade": "A",
  "price_per_kg": 12.36,
  "base_price_per_ton": 15000,
  "base_price_per_kg": 15.0,
  "crop_type": "tomato",
  "price_source": "market_data",
  "quality_details": {
    "color_score": 88.1,
    "texture_score": 79.3,
    "defect_score": 84.7,
    "uniformity_score": 77.5
  },
  "analysis_method": "cv_analysis",
  "market_range_per_ton": { "min": 10500, "max": 18000 }
}
```
**Formula used:** `price_per_kg = (15000 ÷ 1000) × (82.4 ÷ 100) = ₹12.36/kg`

---

### POST /api/chatbot

**Request:**
```json
{
  "message": "What fertilizer should I use for rice?",
  "history": [
    { "role": "user",      "content": "I grow rice in Telangana" },
    { "role": "assistant", "content": "Great! Telangana's black cotton soil is well-suited for rice." }
  ],
  "language": "en"
}
```
**language values:** `"en"` | `"hi"` | `"te"`

**Response 200:**
```json
{
  "answer": "For rice in Telangana, apply 120:60:60 kg/ha of N:P:K. Use Urea (46% N) split into 3 doses: basal, active tillering, and panicle initiation. Apply MOP (60% K2O) as basal. Maintain 5cm standing water during tillering.",
  "category": "crop",
  "source": "rule_based",
  "language": "en"
}
```

---

### GET /api/weather-advisory

**Query params:** `lat`, `lon`, `crop` (optional)

**Example:** `GET /api/weather-advisory?lat=17.385&lon=78.487&crop=tomato`

**Response 200:**
```json
{
  "weather": {
    "temperature": 32.4,
    "humidity": 58,
    "rainfall_mm": 0,
    "wind_speed_kmh": 14.4,
    "description": "clear sky",
    "city": "Hyderabad",
    "source": "openweathermap"
  },
  "advisory": {
    "advisories": [
      "☀️ High temperature. Monitor soil moisture daily."
    ],
    "irrigation_advice": [
      "Irrigate every 2–3 days for most crops."
    ],
    "fertilizer_advice": [
      "✅ Ideal conditions for fertilizer application. Apply NPK in the morning."
    ],
    "crop_suggestions": ["Tomato","Brinjal","Ladies Finger","Bitter Gourd","Cucumber"],
    "alerts": []
  },
  "location": { "latitude": 17.385, "longitude": 78.487 },
  "crop": "tomato"
}
```

---

## Marketplace Endpoints (JWT Required)

### POST /products
```json
{
  "name": "Red Tomato",
  "category": "vegetables",
  "price": 18,
  "quantity": 500,
  "location": "Nizamabad, TG",
  "description": "Grade A tomatoes, pesticide-free",
  "grade": "A",
  "delivery": true,
  "organic": true,
  "image_url": "https://cloudinary.com/..."
}
```
**Response 201:** `{ "message": "Product listed successfully", "product": { ... } }`

---

### GET /products
**Query params:** `category`, `grade`, `min_price`, `max_price`, `delivery`, `organic`, `search`, `sort`, `page`, `limit`

**Example:** `GET /products?category=vegetables&sort=quality&page=1&limit=20`

---

### POST /orders
```json
{
  "product_id": "uuid",
  "quantity_kg": 50,
  "delivery_address": "12 MG Road, Hyderabad 500001",
  "payment_method": "razorpay"
}
```
**Response 201:** `{ "message": "Order placed successfully", "order": { "id": "uuid", "status": "placed", "total_amount": 900, ... } }`

---

### PATCH /orders/:id/status
```json
{ "status": "confirmed", "notes": "Stock verified, ready to pack" }
```
**Valid transitions:**
```
placed → confirmed → packed → out_for_delivery → delivered
placed → cancelled
confirmed → cancelled
out_for_delivery → failed_delivery → out_for_delivery (retry)
```

---

### GET /api/analytics
**Query params:** `type`, `limit`

**Response 200:**
```json
{
  "total_predictions": 1248,
  "by_type": {
    "soil_analysis":    412,
    "disease_detection": 389,
    "quality_price":    447
  },
  "top_diseases": {
    "Early Blight": 84,
    "Late Blight":  61,
    "Bacterial Spot": 44
  },
  "top_recommended_crops": {
    "rice": 98, "maize": 72, "cotton": 55
  },
  "avg_price_per_kg": {
    "tomato": 13.42, "wheat": 22.18, "onion": 16.75
  }
}
```

---

## Error Response Format (All Endpoints)

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": [ ... ]   // optional: validation error array
}
```

**Common HTTP codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 401 | Unauthorized (bad/missing JWT) |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 413 | Payload too large (image) |
| 422 | Validation error / low confidence |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | ML service unavailable |
