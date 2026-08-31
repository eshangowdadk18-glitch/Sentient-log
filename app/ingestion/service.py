import logging
import time
from app.schemas.log import LogEvent
from app.clickhouse.client import get_client

logger = logging.getLogger(__name__)

class IngestionService:
    def __init__(self):
        self.successful_inserts = 0
        self.failed_inserts = 0
        self.last_flush_time = 0.0

    async def flush_batch(self, events: list[LogEvent]) -> bool:
        """
        Inserts a batch of events into ClickHouse.
        Returns True if successful, False if failed.
        """
        if not events:
            return True

        start_time = time.time()
        try:
            client = await get_client()
            data = []
            for e in events:
                data.append([
                    e.event_id,
                    e.timestamp,
                    e.event_type,
                    e.url,
                    e.latency_ms,
                    e.user_agent,
                    e.metadata
                ])
                
            await client.insert(
                'events',
                data,
                column_names=['event_id', 'timestamp', 'event_type', 'url', 'latency_ms', 'user_agent', 'metadata']
            )
            
            self.successful_inserts += len(events)
            self.last_flush_time = time.time()
            latency = (self.last_flush_time - start_time) * 1000
            
            logger.info(f"Flushed {len(events)} events to ClickHouse in {latency:.2f}ms")
            return True
            
        except Exception as e:
            self.failed_inserts += len(events)
            logger.error(f"Failed to flush {len(events)} events to ClickHouse: {str(e)}", exc_info=True)
            return False

ingestion_service = IngestionService()
