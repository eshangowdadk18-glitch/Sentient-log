import time
import httpx
import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from app.clickhouse.client import get_client
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

START_TIME = time.time()
VERSION = "1.0.0"

@router.get("/health")
async def liveness_probe():
    """
    Lightweight liveness probe for Kubernetes/Docker.
    Only checks if the FastAPI server event loop is responsive.
    """
    return {
        "status": "healthy",
        "service": "sentient-log",
        "version": VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": int(time.time() - START_TIME)
    }

@router.get("/ready")
async def readiness_probe():
    """
    Readiness probe to verify all external dependencies are operational.
    """
    status = {
        "status": "ready",
        "dependencies": {
            "clickhouse": "unknown",
            "ai_provider": "unknown"
        }
    }
    
    # Check ClickHouse Connectivity
    try:
        client = await get_client()
        await client.command("SELECT 1")
        status["dependencies"]["clickhouse"] = "connected"
    except Exception as e:
        logger.error(f"ClickHouse readiness check failed: {e}")
        status["dependencies"]["clickhouse"] = "disconnected"
        status["status"] = "not_ready"
        
    # Check AI Provider Availability (Lightweight fetch)
    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            response = await http_client.get(
                f"{settings.OPENAI_BASE_URL}/models",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            )
            if response.status_code == 200:
                status["dependencies"]["ai_provider"] = "available"
            else:
                logger.warning(f"AI Provider returned status code {response.status_code}")
                status["dependencies"]["ai_provider"] = "unavailable"
                status["status"] = "not_ready"
    except Exception as e:
        logger.error(f"AI Provider readiness check failed: {e}")
        status["dependencies"]["ai_provider"] = "unavailable"
        status["status"] = "not_ready"

    # Return 503 if any dependency is down
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200 if status["status"] == "ready" else 503,
        content=status
    )
