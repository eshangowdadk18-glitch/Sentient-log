import logging
import clickhouse_connect
from clickhouse_connect.driver.asyncclient import AsyncClient
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from app.core.config import settings

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    event_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now(),
    event_type String,
    url String,
    latency_ms Float32,
    user_agent String,
    metadata JSON
) ENGINE = MergeTree()
ORDER BY (timestamp, event_type);
"""

class ClickHouseManager:
    _instance = None
    _client: AsyncClient | None = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ClickHouseManager, cls).__new__(cls)
        return cls._instance

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    async def get_client(self) -> AsyncClient:
        if self._client is None:
            logger.info("Initializing ClickHouse async client...")
            self._client = await clickhouse_connect.get_async_client(
                host=settings.CLICKHOUSE_URL,
                port=settings.CLICKHOUSE_PORT,
                username=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                database=settings.CLICKHOUSE_DATABASE,
                # Increase timeout for production workloads
                send_receive_timeout=30,
                settings={"enable_json_type": 1}
            )
            # Verify connectivity immediately
            await self._client.command("SELECT 1")
            logger.info("Successfully connected to ClickHouse.")
        return self._client

    async def close(self):
        if self._client:
            logger.info("Closing ClickHouse connection...")
            self._client.close()
            self._client = None
            logger.info("ClickHouse connection closed.")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    async def run_migrations(self):
        logger.info("Running ClickHouse migrations...")
        try:
            client = await self.get_client()
            await client.command(SCHEMA)
            
            # Non-destructive patches for existing table
            try:
                await client.command("ALTER TABLE events ADD COLUMN IF NOT EXISTS user_agent String")
                await client.command("ALTER TABLE events MODIFY COLUMN latency_ms Float32")
                logger.info("Schema patches applied successfully.")
            except Exception as patch_e:
                logger.warning(f"Failed to apply schema patches (this is normal if the table was just created): {patch_e}")
                
            logger.info("Database migrations completed successfully.")
        except Exception as e:
            logger.error(f"Failed to run ClickHouse migrations: {e}")
            raise

manager = ClickHouseManager()

async def get_client() -> AsyncClient:
    return await manager.get_client()

async def close_client():
    await manager.close()

async def run_migrations():
    await manager.run_migrations()
