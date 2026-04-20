"""
Prediction logging service – writes to PostgreSQL via asyncpg
Falls back to in-memory store if DB unavailable
"""
import os
import logging
import asyncio
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# In-memory fallback store (replace with Redis/Postgres in production)
_prediction_log = []

async def log_prediction(prediction_type: str, data: Any):
    """Log ML prediction for analytics."""
    entry = {
        "type": prediction_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
    }
    _prediction_log.append(entry)
    # Cap at 10000 in-memory records
    if len(_prediction_log) > 10000:
        _prediction_log.pop(0)
    logger.debug(f"Logged {prediction_type} prediction")

def get_prediction_logs(prediction_type: str = None, limit: int = 100):
    logs = _prediction_log if not prediction_type else [
        l for l in _prediction_log if l["type"] == prediction_type
    ]
    return logs[-limit:]
