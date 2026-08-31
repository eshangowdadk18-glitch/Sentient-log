from fastapi import APIRouter, Depends

from app.auth.dependencies import RequireRole
from app.auth.models import User
from app.clickhouse.client import get_client

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/recent")
async def recent_logs(current_user: User = Depends(RequireRole(["admin", "analyst", "viewer"]))):
    client = await get_client()
    result = await client.query(
        """
        SELECT
            timestamp,
            event_type,
            url,
            latency_ms,
            user_agent,
            event_id
        FROM events
        ORDER BY timestamp DESC
        LIMIT 100
        """
    )

    results = []
    if result.result_rows:
        columns = result.column_names
        for row in result.result_rows:
            results.append(dict(zip(columns, row)))

    return {"results": results}