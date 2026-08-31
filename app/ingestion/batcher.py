import asyncio
import logging
from app.schemas.log import LogEvent

logger = logging.getLogger(__name__)

class Batcher:
    def __init__(self, batch_size=1000):
        self.batch_size = batch_size
        self.buffer: list[LogEvent] = []
        self._lock = asyncio.Lock()

    async def add(self, events: list[LogEvent]):
        async with self._lock:
            self.buffer.extend(events)

    async def get_batch(self) -> list[LogEvent]:
        """Returns all events currently in the buffer and empties it."""
        async with self._lock:
            if not self.buffer:
                return []
            batch = self.buffer
            self.buffer = []
            return batch
            
    async def requeue(self, events: list[LogEvent]):
        """Place events back at the front of the queue on failure."""
        async with self._lock:
            self.buffer = events + self.buffer

    @property
    def depth(self) -> int:
        return len(self.buffer)

    @property
    def is_full(self) -> bool:
        return len(self.buffer) >= self.batch_size

batcher = Batcher()
