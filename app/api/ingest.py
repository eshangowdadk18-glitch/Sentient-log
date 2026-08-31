from fastapi import APIRouter, BackgroundTasks, Depends
from app.schemas.log import IngestPayload
from app.ingestion.batcher import batcher
from app.ingestion.service import ingestion_service
from app.auth.dependencies import verify_ingest_auth

router = APIRouter()

@router.get("/ingest/health")
async def ingest_health():
    return {
        "status": "ok",
        "queue_depth": batcher.depth,
        "successful_inserts": ingestion_service.successful_inserts,
        "failed_inserts": ingestion_service.failed_inserts,
        "last_flush_time": ingestion_service.last_flush_time
    }

@router.post("/ingest", status_code=202, dependencies=[Depends(verify_ingest_auth)])
async def ingest_logs(payload: IngestPayload, background_tasks: BackgroundTasks):
    await batcher.add(payload.events)
    return {"status": "accepted"}
