"""
AgriWise AI – ML Service (FastAPI)
Production-ready main entry point
"""

import sys
import os
from pathlib import Path
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ───────────────── PATH FIX ─────────────────
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# ───────────────── IMPORT ROUTES ─────────────────
from routes.soil import router as soil_router
from routes.disease import router as disease_router
from routes.quality_price import router as quality_price_router
from routes.chatbot import router as chatbot_router
from routes.weather import router as weather_router
from routes.analytics import router as analytics_router

# ───────────────── OPTIONAL MIDDLEWARE ─────────────────
try:
    from middleware.rate_limit import RateLimitMiddleware
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    RATE_LIMIT_AVAILABLE = False

# ───────────────── LOGGING ─────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("AgriWise")

# ───────────────── APP INIT ─────────────────
app = FastAPI(
    title="AgriWise AI - ML Service",
    version="2.0.0",
    description="AI-powered agriculture platform (Soil, Disease, Quality, Pricing)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ───────────────── CORS ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ⚠️ Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────── RATE LIMIT ─────────────────
if RATE_LIMIT_AVAILABLE:
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    logger.info("✅ Rate limiting enabled")
else:
    logger.warning("⚠️ Rate limiting middleware not found")

# ───────────────── ROUTES ─────────────────
app.include_router(soil_router, prefix="/api")
app.include_router(disease_router, prefix="/api")
app.include_router(quality_price_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

# ───────────────── STARTUP EVENT ─────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("AgriWise AI ML Service Started")

# ───────────────── SHUTDOWN EVENT ─────────────────
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("AgriWise AI ML Service Stopped")

# ───────────────── ROOT ─────────────────
@app.get("/")
async def root():
    return {
        "message": "AgriWise AI ML Service is running ",
        "version": "2.0.0",
        "status": "healthy"
    }

# ───────────────── HEALTH ─────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AgriWise ML",
        "models_loaded": True
    }

# ───────────────── RUN SERVER ─────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))  # Render uses dynamic port

    logger.info(f"Starting server on http://0.0.0.0:{port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,     # Only for dev (disable in production)
        log_level="info"
    )