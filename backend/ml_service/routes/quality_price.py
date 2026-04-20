"""
POST /api/quality-price
Crop Quality Scoring + Price Prediction
Model: MobileNetV2 CNN for visual quality assessment
Dataset: Agriculture_Commodities_Week.csv for base price lookup
Formula: final_price = (base_price_per_ton / 1000) * (quality_score / 100)
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import os
import logging
import pandas as pd
from functools import lru_cache
from typing import Optional

from services.prediction_log import log_prediction

router = APIRouter()
logger = logging.getLogger(__name__)

# ─── Load commodity price dataset ────────────────────────────────────────────
PRICE_CSV_PATH = os.getenv("PRICE_CSV_PATH", "data/Agriculture_Commodities_Week.csv")
_price_df: Optional[pd.DataFrame] = None

def load_price_data():
    global _price_df
    if _price_df is None:
        try:
            df = pd.read_csv(PRICE_CSV_PATH)
            df.columns = [c.strip() for c in df.columns]
            df["Commodity_lower"] = df["Commodity"].str.strip().str.lower()
            _price_df = df
            logger.info(f"Price CSV loaded: {len(df)} records, {df['Commodity_lower'].nunique()} commodities")
        except Exception as e:
            logger.warning(f"Could not load price CSV: {e}. Will use fallback pricing.")

load_price_data()

# Fallback prices per TON (₹) when CSV unavailable or commodity not found
FALLBACK_PRICES_PER_TON = {
    "tomato": 12000, "potato": 15000, "onion": 18000, "rice": 28000,
    "wheat": 22000, "banana": 25000, "mango": 35000, "cotton": 55000,
    "maize": 18000, "soybean": 38000, "sugarcane": 3500, "groundnut": 45000,
    "chilli": 60000, "turmeric": 70000, "ginger": 40000, "garlic": 50000,
}

VALID_CROP_TYPES = sorted(FALLBACK_PRICES_PER_TON.keys())

# Grade thresholds
GRADE_MAP = {
    "A": (80, 100),
    "B": (60, 79),
    "C": (0,  59),
}

# ─── Price lookup ─────────────────────────────────────────────────────────────

def get_market_price_per_ton(crop_type: str) -> dict:
    """
    Look up commodity price from CSV (modal price) or fallback.
    Returns dict with modal, min, max in ₹/ton.
    """
    crop_lower = crop_type.strip().lower()

    if _price_df is not None:
        subset = _price_df[_price_df["Commodity_lower"].str.contains(crop_lower, na=False)]
        if len(subset) > 0:
            modal = float(subset["Modal Price"].median())
            min_p = float(subset["Min Price"].median())
            max_p = float(subset["Max Price"].median())
            # CSV prices are in ₹/quintal (100kg) → convert to per ton (1000kg)
            return {
                "modal_per_ton": round(modal * 10, 2),
                "min_per_ton":   round(min_p * 10, 2),
                "max_per_ton":   round(max_p * 10, 2),
                "source":        "market_data"
            }

    # Fallback
    fallback = FALLBACK_PRICES_PER_TON.get(crop_lower)
    if fallback:
        return {
            "modal_per_ton": fallback,
            "min_per_ton":   round(fallback * 0.85, 2),
            "max_per_ton":   round(fallback * 1.15, 2),
            "source":        "fallback_estimate"
        }

    return None

# ─── MobileNetV2 model ─────────────────────────────────────────────────────────
_quality_model = None

def load_quality_model():
    global _quality_model
    model_path = os.getenv("QUALITY_MODEL_PATH", "models/quality_mobilenetv2.h5")
    if _quality_model is None and os.path.exists(model_path):
        try:
            import tensorflow as tf
            _quality_model = tf.keras.models.load_model(model_path)
            logger.info("MobileNetV2 quality model loaded")
        except Exception as e:
            logger.warning(f"Could not load quality model: {e}")

load_quality_model()

# ─── Image quality analysis ───────────────────────────────────────────────────

def analyze_crop_quality(img_bgr: np.ndarray, crop_type: str) -> dict:
    """
    Analyze crop image for:
    - Color uniformity (freshness indicator)
    - Shape regularity (defect proxy)
    - Texture smoothness
    - Defect/blemish detection (dark spots)
    Returns quality_score 0–100.
    """
    if _quality_model is not None:
        try:
            rgb = cv2.cvtColor(cv2.resize(img_bgr, (224, 224)), cv2.COLOR_BGR2RGB)
            inp = rgb.astype(np.float32) / 127.5 - 1.0  # MobileNet preprocessing
            inp = np.expand_dims(inp, 0)
            score = float(_quality_model.predict(inp, verbose=0)[0][0]) * 100
            score = float(np.clip(score, 0, 100))
            return {
                "score":    round(score, 1),
                "method":   "mobilenetv2",
                "details":  {}
            }
        except Exception as e:
            logger.error(f"Quality model inference error: {e}")

    # ── CV-based fallback ─────────────────────────────────────────────────────
    return _cv_quality_score(img_bgr)


def _cv_quality_score(img_bgr: np.ndarray) -> dict:
    """
    Computer vision quality scoring pipeline:
    - Color score: HSV saturation + hue consistency
    - Texture score: Laplacian variance (sharpness)
    - Defect score: dark spot ratio
    - Shape score: contour regularity
    """
    img_resized = cv2.resize(img_bgr, (300, 300))
    hsv = cv2.cvtColor(img_resized, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    # 1) Color score: high saturation = fresh produce
    mean_sat = float(hsv[:, :, 1].mean())
    color_score = min(100, (mean_sat / 200) * 100)

    # 2) Texture score: Laplacian variance (higher = sharper = less mushy)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    texture_score = min(100, (lap_var / 500) * 100)

    # 3) Defect score: ratio of very dark pixels (bruises, rot)
    _, dark_mask = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY_INV)
    dark_ratio = float(dark_mask.sum()) / (255.0 * dark_mask.size)
    defect_score = max(0, 100 - dark_ratio * 1000)

    # 4) Uniformity score: low std dev of hue channel
    hue_std = float(hsv[:, :, 0].std())
    uniformity_score = max(0, 100 - hue_std * 1.5)

    # Weighted composite
    quality_score = (
        color_score       * 0.30 +
        texture_score     * 0.25 +
        defect_score      * 0.30 +
        uniformity_score  * 0.15
    )
    quality_score = float(np.clip(quality_score, 0, 100))

    return {
        "score":  round(quality_score, 1),
        "method": "cv_analysis",
        "details": {
            "color_score":      round(color_score, 1),
            "texture_score":    round(texture_score, 1),
            "defect_score":     round(defect_score, 1),
            "uniformity_score": round(uniformity_score, 1),
        }
    }


def score_to_grade(score: float) -> str:
    for grade, (lo, hi) in GRADE_MAP.items():
        if lo <= score <= hi:
            return grade
    return "C"


# ─── API Endpoint ─────────────────────────────────────────────────────────────

@router.post("/quality-price")
async def quality_price(
    crop_image:  UploadFile = File(...,            description="Crop image for quality analysis"),
    crop_type:   str        = Form(...,            description="Type of crop (e.g. tomato, wheat)"),
    base_price:  Optional[float] = Form(None,     description="Override base price in ₹/ton (optional, uses market data if not provided)"),
):
    """
    Crop Quality Assessment + Price Prediction
    1. Validate inputs
    2. MobileNetV2 / CV-based quality scoring (0-100)
    3. Market price lookup from Agriculture_Commodities_Week.csv
    4. final_price = (base_price_per_ton / 1000) * (quality_score / 100)
    5. Grade assignment (A/B/C)
    """
    # ── Validate crop_type ────────────────────────────────────────────────────
    if not crop_type or not crop_type.strip():
        raise HTTPException(422, detail={
            "error": "CROP_TYPE_REQUIRED",
            "message": "crop_type is required",
            "valid_crop_types": VALID_CROP_TYPES,
        })

    crop_clean = crop_type.strip().lower()

    # ── Validate image ────────────────────────────────────────────────────────
    if not crop_image.filename:
        raise HTTPException(422, detail={"error": "IMAGE_REQUIRED", "message": "crop_image is required"})

    content_type = crop_image.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(422, detail={"error": "INVALID_FILE_TYPE", "message": f"Expected image, got {content_type}"})

    raw_bytes = await crop_image.read()
    if len(raw_bytes) < 1024:
        raise HTTPException(422, detail={"error": "IMAGE_EMPTY", "message": "Image is empty or corrupt"})

    nparr  = np.frombuffer(raw_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(422, detail={"error": "DECODE_FAILED", "message": "Cannot decode image"})

    # ── Validate base_price ───────────────────────────────────────────────────
    market_data = get_market_price_per_ton(crop_clean)

    if base_price is not None:
        if base_price <= 0:
            raise HTTPException(422, detail={"error": "INVALID_BASE_PRICE", "message": "base_price must be a positive number in ₹/ton"})
        if base_price > 10_000_000:
            raise HTTPException(422, detail={"error": "BASE_PRICE_TOO_HIGH", "message": "base_price seems unrealistically high"})
        effective_price_per_ton = base_price
        price_source = "user_provided"
    elif market_data:
        effective_price_per_ton = market_data["modal_per_ton"]
        price_source = market_data["source"]
    else:
        raise HTTPException(422, detail={
            "error": "PRICE_NOT_FOUND",
            "message": f"No market price data for '{crop_type}'. Please provide base_price manually.",
            "supported_crops": VALID_CROP_TYPES,
        })

    # ── Quality analysis ──────────────────────────────────────────────────────
    quality_result = analyze_crop_quality(img_bgr, crop_clean)
    quality_score  = quality_result["score"]
    grade          = score_to_grade(quality_score)

    # ── Price calculation ─────────────────────────────────────────────────────
    # Formula: final_price_per_kg = (base_price_per_ton / 1000) * (quality_score / 100)
    base_per_kg    = effective_price_per_ton / 1000.0
    price_per_kg   = round(base_per_kg * (quality_score / 100.0), 2)

    response = {
        "quality_score":        quality_score,
        "grade":                grade,
        "price_per_kg":         price_per_kg,
        "base_price_per_ton":   effective_price_per_ton,
        "base_price_per_kg":    round(base_per_kg, 2),
        "crop_type":            crop_clean,
        "price_source":         price_source,
        "quality_details":      quality_result.get("details", {}),
        "analysis_method":      quality_result["method"],
        "market_range_per_ton": {
            "min": market_data["min_per_ton"] if market_data else None,
            "max": market_data["max_per_ton"] if market_data else None,
        } if market_data else None,
    }

    await log_prediction("quality_price", response)
    return JSONResponse(content=response, status_code=200)
