import logging
from pymongo import AsyncMongoClient
from beanie import init_beanie
from app.core.config import settings

# Import Beanie models here so init_beanie can register them
from app.auth.models import User, RefreshToken, ApiKey, AuditLog

logger = logging.getLogger(__name__)

async def init_mongodb():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}")
    client = AsyncMongoClient(settings.MONGODB_URI)
    database = client.get_database(settings.MONGODB_DB_NAME)
    
    # Initialize Beanie with the Document models
    await init_beanie(
        database=database,
        document_models=[
            User,
            RefreshToken,
            ApiKey,
            AuditLog
        ]
    )
    logger.info("MongoDB and Beanie initialized successfully.")
