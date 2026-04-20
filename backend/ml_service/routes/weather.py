"""
GET /api/weather-advisory
Real-time weather + crop suggestions, irrigation advice, fertilizer timing
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import logging
from services.weather_service import get_weather_data

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_advisory(weather: dict, crop: str = None) -> dict:
    temp     = weather.get("temperature", 25)
    humidity = weather.get("humidity", 60)
    rainfall = weather.get("rainfall_mm", 0)
    wind     = weather.get("wind_speed_kmh", 10)
    desc     = weather.get("description", "").lower()

    advisories = []
    irrigation_advice = []
    fertilizer_advice = []
    crop_suggestions  = []
    alerts            = []

    # 🌡️ Temperature
    if temp > 38:
        advisories.append("Extreme heat – protect crops & irrigate early morning/evening.")
        alerts.append({"type": "heat_stress", "severity": "high"})
        irrigation_advice.append("Increase irrigation frequency.")
    elif temp > 32:
        advisories.append("High temperature – monitor soil moisture.")
    elif temp < 10:
        advisories.append("Cold weather – protect frost-sensitive crops.")
        fertilizer_advice.append("Avoid fertilizer below 10°C.")

    # 💧 Humidity
    if humidity > 85:
        advisories.append("High humidity – risk of fungal diseases.")
        alerts.append({"type": "disease_risk", "severity": "high"})
    elif humidity < 30:
        advisories.append("Low humidity – increase irrigation.")

    # 🌧️ Rainfall
    if rainfall > 30:
        advisories.append("Heavy rain – ensure drainage.")
        fertilizer_advice.append("Avoid fertilizer before rain.")
    elif rainfall > 10:
        advisories.append("Moderate rain – good for sowing.")
    elif rainfall < 5 and temp > 28:
        advisories.append("Dry conditions – irrigate crops.")

    # 💨 Wind
    if wind > 40:
        advisories.append("High wind – avoid spraying.")
        alerts.append({"type": "high_wind", "severity": "medium"})

    # 🌱 Crop Suggestions
    if 20 <= temp <= 35 and humidity > 60:
        crop_suggestions = ["Rice", "Maize", "Cotton"]
    elif temp > 30:
        crop_suggestions = ["Millets", "Sesame"]
    elif temp < 20:
        crop_suggestions = ["Wheat", "Potato"]
    else:
        crop_suggestions = ["Tomato", "Brinjal"]

    # Fertilizer default
    if not fertilizer_advice:
        fertilizer_advice.append("Apply fertilizer in dry morning conditions.")

    # Irrigation default
    if not irrigation_advice:
        irrigation_advice.append("Maintain regular irrigation.")

    return {
        "advisories": advisories,
        "irrigation_advice": irrigation_advice,
        "fertilizer_advice": fertilizer_advice,
        "crop_suggestions": crop_suggestions,
        "alerts": alerts,
    }


@router.get("/weather-advisory")
async def weather_advisory(
    lat: float = Query(17.385, description="Latitude"),
    lon: float = Query(78.487, description="Longitude"),
    crop: str = Query(None, description="Crop (optional)")
):
    try:
        # Validate input
        if not (-90 <= lat <= 90):
            raise HTTPException(422, detail="Invalid latitude")
        if not (-180 <= lon <= 180):
            raise HTTPException(422, detail="Invalid longitude")

        # 🌦️ Get weather data
        weather = await get_weather_data(lat, lon)

        # 🌱 Generate advisory
        advisory = generate_advisory(weather, crop)

        return JSONResponse(content={
            "weather": weather,
            "advisory": advisory,
            "location": {"lat": lat, "lon": lon},
            "crop": crop
        })

    except Exception as e:
        logger.error(f"Weather advisory error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")