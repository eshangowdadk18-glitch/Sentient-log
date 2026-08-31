from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Configure structured root logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

from app.api import health, ingest, query, logs
from app.ingestion.worker import worker
from app.clickhouse.client import run_migrations, close_client
from app.database.mongodb import init_mongodb
from app.auth.models import User

# OpenTelemetry setup
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_mongodb()
    await run_migrations()
    worker.start()
    yield
    # Shutdown
    await worker.stop()
    await close_client()

app = FastAPI(
    title="SentientLog",
    description="AI-powered observability analytics platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Root-level Kubernetes Probes
app.include_router(health.router)

# Register API v1 Endpoints
from app.auth.routes import router as auth_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(logs.router, prefix="/api/v1")

@app.get("/api/v1/auth/test-mongo")
async def test_mongo():
    try:
        count = await User.count()
        return {"status": "ok", "message": "Successfully connected to MongoDB", "user_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

FastAPIInstrumentor.instrument_app(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=3100, reload=True)
