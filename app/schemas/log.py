from pydantic import BaseModel, Field
from typing import Any, Dict
from datetime import datetime, timezone
import uuid

class LogEvent(BaseModel):
    event_type: str = Field(..., max_length=100)
    url: str = Field(..., max_length=2000)
    latency_ms: float = Field(...)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_agent: str = Field(default="", max_length=1000)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)

class IngestPayload(BaseModel):
    events: list[LogEvent] = Field(..., min_length=1, max_length=1000)
