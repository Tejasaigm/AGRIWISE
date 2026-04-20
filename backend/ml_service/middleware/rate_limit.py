"""
Rate limiting middleware – sliding window per IP
"""
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests   = max_requests
        self.window_seconds = window_seconds
        self._store = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Remove expired timestamps
        self._store[ip] = [t for t in self._store[ip] if now - t < self.window_seconds]

        if len(self._store[ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Max {self.max_requests} per {self.window_seconds}s.",
                    "retry_after": self.window_seconds,
                }
            )

        self._store[ip].append(now)
        return await call_next(request)
