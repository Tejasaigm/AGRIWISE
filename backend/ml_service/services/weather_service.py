"""
Weather Service – fetches from OpenWeatherMap API
"""
import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 🔑 Your API Key (directly added)
OWM_API_KEY = os.getenv("OPENWEATHER_API_KEY") or "0c75dfb0cf52f47c17327f877385f0fa"

# Fallback weather data for Hyderabad when API unavailable
FALLBACK_WEATHER = {
    "temperature": 28.0,
    "humidity": 65.0,
    "rainfall_mm": 5.0,
    "wind_speed_kmh": 12.0,
    "description": "partly cloudy",
    "source": "fallback",
}


async def get_weather_data(lat: float, lon: float) -> dict:
    """
    Fetch real-time weather from OpenWeatherMap.
    Falls back to seasonal estimates if API unavailable.
    """

    if not OWM_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set – using fallback weather data")
        return FALLBACK_WEATHER

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": OWM_API_KEY,
                    "units": "metric",
                }
            )
            resp.raise_for_status()
            data = resp.json()

        return {
            "temperature": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": data["main"]["humidity"],
            "rainfall_mm": data.get("rain", {}).get("1h", 0.0),
            "wind_speed_kmh": round(data["wind"]["speed"] * 3.6, 1),
            "description": data["weather"][0]["description"],
            "city": data.get("name", ""),
            "source": "openweathermap",
        }

    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return FALLBACK_WEATHER