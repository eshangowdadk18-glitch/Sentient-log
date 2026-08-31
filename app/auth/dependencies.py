from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from app.auth.jwt import decode_token
from app.auth.models import User, ApiKey
from app.auth.hashing import hash_api_key

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("user_id")
    if user_id is None:
        raise credentials_exception
        
    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise credentials_exception
        
    return user

class RequireRole:
    def __init__(self, roles: List[str]):
        self.roles = roles

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return user

async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> Optional[ApiKey]:
    if not x_api_key:
        return None
        
    key_hash = hash_api_key(x_api_key)
    api_key_doc = await ApiKey.find_one(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    
    if api_key_doc:
        from datetime import datetime, timezone
        api_key_doc.last_used = datetime.now(timezone.utc)
        await api_key_doc.save()
        return api_key_doc
        
    return None

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def verify_ingest_auth(
    api_key_doc: Optional[ApiKey] = Depends(verify_api_key),
    token: Optional[str] = Depends(oauth2_scheme_optional)
):
    if api_key_doc:
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid API Key or Bearer token required")

    # Ingestion is available to any authenticated user in the UI.
    await get_current_user(token)
