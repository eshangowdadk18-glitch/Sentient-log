from fastapi import APIRouter, Depends, Response, Request, HTTPException
from app.auth.schemas import UserCreate, UserRead, LoginRequest, TokenResponse, RefreshResponse
from app.auth.service import register_user, authenticate_user, generate_auth_tokens, rotate_refresh_token, revoke_refresh_token
from app.auth.dependencies import get_current_user
from app.auth.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead)
async def register(user_in: UserCreate):
    user = await register_user(user_in)
    return UserRead(id=str(user.id), email=user.email, role=user.role, is_active=user.is_active)

@router.post("/login", response_model=TokenResponse)
async def login(login_in: LoginRequest, response: Response):
    user = await authenticate_user(login_in)
    access_token, refresh_token = await generate_auth_tokens(user)
    
    # Set HTTP-Only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False, # True for HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    return TokenResponse(access_token=access_token)

@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: Request, response: Response):
    old_refresh_token = request.cookies.get("refresh_token")
    if not old_refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        access_token, new_refresh_token = await rotate_refresh_token(old_refresh_token)
    except Exception as e:
        response.delete_cookie("refresh_token")
        raise e
        
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )
    return RefreshResponse(access_token=access_token)

@router.post("/logout")
async def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await revoke_refresh_token(refresh_token)
    response.delete_cookie("refresh_token")
    return {"status": "ok", "message": "Logged out"}

@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return UserRead(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active
    )
