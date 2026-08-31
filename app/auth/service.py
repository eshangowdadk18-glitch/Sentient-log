from datetime import datetime, timezone
from typing import Tuple
from fastapi import HTTPException, status
from app.auth.models import User, RefreshToken
from app.auth.schemas import UserCreate, LoginRequest
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt import create_access_token, create_refresh_token, decode_token


def _to_utc(dt: datetime) -> datetime:
    # Older records may store naive datetimes; treat them as UTC for safe comparison.
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

async def register_user(user_in: UserCreate) -> User:
    existing_user = await User.find_one(User.email == user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role="viewer" # Default role
    )
    await user.insert()
    return user

async def authenticate_user(login_in: LoginRequest) -> User:
    user = await User.find_one(User.email == login_in.email)
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    user.last_login = datetime.now(timezone.utc)
    await user.save()
    return user

async def generate_auth_tokens(user: User) -> Tuple[str, str]:
    access_payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role
    }
    access_token = create_access_token(access_payload)
    refresh_token = create_refresh_token(str(user.id))
    
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    decoded = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    
    rt_doc = RefreshToken(
        user_id=str(user.id),
        token_hash=token_hash,
        expires_at=expires_at
    )
    await rt_doc.insert()
    
    return access_token, refresh_token

async def rotate_refresh_token(old_refresh_token: str) -> Tuple[str, str]:
    decoded = decode_token(old_refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = decoded.get("sub")
    
    import hashlib
    token_hash = hashlib.sha256(old_refresh_token.encode()).hexdigest()
    
    rt_doc = await RefreshToken.find_one(RefreshToken.token_hash == token_hash, RefreshToken.user_id == user_id)
    expires_at = _to_utc(rt_doc.expires_at) if rt_doc else None
    if not rt_doc or rt_doc.revoked or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    rt_doc.revoked = True
    await rt_doc.save()
    
    user = await User.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    return await generate_auth_tokens(user)

async def revoke_refresh_token(refresh_token: str):
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    rt_doc = await RefreshToken.find_one(RefreshToken.token_hash == token_hash)
    if rt_doc:
        rt_doc.revoked = True
        await rt_doc.save()
