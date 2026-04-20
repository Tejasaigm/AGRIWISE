"""
GET /api/analytics
Prediction logs, crop trends, disease frequency, price trends
"""
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from collections import Counter
from services.prediction_log import get_prediction_logs

router = APIRouter()


@router.get("/analytics")
async def analytics(
    type:  str = Query(default=None, description="Filter by: soil_analysis | disease_detection | quality_price"),
    limit: int = Query(default=100, ge=1, le=1000),
):
    logs = get_prediction_logs(type, limit)

    # Aggregate stats
    type_counts = Counter(l["type"] for l in get_prediction_logs(limit=10000))

    # Disease frequency
    disease_logs = get_prediction_logs("disease_detection", 1000)
    disease_counts = Counter(
        l["data"].get("disease") for l in disease_logs if l.get("data")
    )

    # Crop recommendation frequency
    soil_logs = get_prediction_logs("soil_analysis", 1000)
    crop_counts = Counter(
        l["data"].get("recommended_crop") for l in soil_logs if l.get("data")
    )

    # Price prediction averages
    price_logs = get_prediction_logs("quality_price", 1000)
    crop_prices = {}
    for l in price_logs:
        d = l.get("data", {})
        crop = d.get("crop_type")
        price = d.get("price_per_kg")
        if crop and price:
            if crop not in crop_prices:
                crop_prices[crop] = []
            crop_prices[crop].append(price)
    avg_prices = {c: round(sum(p) / len(p), 2) for c, p in crop_prices.items()}

    return JSONResponse(content={
        "total_predictions":    sum(type_counts.values()),
        "by_type":              dict(type_counts),
        "top_diseases":         dict(disease_counts.most_common(10)),
        "top_recommended_crops": dict(crop_counts.most_common(10)),
        "avg_price_per_kg":     avg_prices,
        "recent_logs":          logs,
    })
