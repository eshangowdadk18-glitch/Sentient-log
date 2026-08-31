import asyncio
import logging
from app.ingestion.batcher import batcher
from app.ingestion.service import ingestion_service

logger = logging.getLogger(__name__)

class FlushWorker:
    def __init__(self, flush_interval=5.0):
        self.flush_interval = flush_interval
        self._task = None
        self._is_running = False

    def start(self):
        if self._task is None:
            self._is_running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("Flush worker started")

    async def stop(self):
        self._is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        # Perform final flush on shutdown
        await self._flush_now()
        logger.info("Flush worker stopped gracefully")

    async def _loop(self):
        while self._is_running:
            try:
                # Wait for the interval, but wake up early if batcher is full
                wait_time = 0.0
                while wait_time < self.flush_interval and self._is_running:
                    if batcher.is_full:
                        break
                    await asyncio.sleep(0.5)
                    wait_time += 0.5

                if self._is_running:
                    await self._flush_now()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in flush worker loop: {e}", exc_info=True)
                await asyncio.sleep(1.0) # Prevent tight crash loops

    async def _flush_now(self):
        events = await batcher.get_batch()
        if not events:
            return

        logger.debug(f"Worker flushing batch of size: {len(events)}")
        success = await ingestion_service.flush_batch(events)
        
        if not success:
            # Dead-letter or requeue logic. Here we requeue for a simple retry.
            logger.warning(f"Re-queueing {len(events)} events due to insert failure")
            await batcher.requeue(events)

worker = FlushWorker()
