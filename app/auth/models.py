from beanie import Document
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional

def utcnow():
    return datetime.now(timezone.utc)

class User(Document):
    email: str
    password_hash: str
    role: str = "viewer"
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True

    class Settings:
        name = "users"

class RefreshToken(Document):
    user_id: str
    token_hash: str
    expires_at: datetime
    revoked: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    
    class Settings:
        name = "refresh_tokens"

class ApiKey(Document):
    owner_id: str
    name: str
    key_hash: str
    permissions: list[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    last_used: Optional[datetime] = None

    class Settings:
        name = "api_keys"

class AuditLog(Document):
    user_id: str
    role: str
    query: str
    query_plan: dict
    generated_sql: Optional[str] = None
    validation_results: Optional[dict] = None
    execution_metadata: Optional[dict] = None
    intent: Optional[str] = None
    timestamp: datetime = Field(default_factory=utcnow)
    ip_address: Optional[str] = None

    class Settings:
        name = "audit_logs"
