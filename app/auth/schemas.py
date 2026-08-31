from pydantic import BaseModel, Field
from typing import Optional

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

class UserCreate(BaseModel):
    email: str = Field(pattern=EMAIL_REGEX)
    password: str

class UserRead(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool

class LoginRequest(BaseModel):
    email: str = Field(pattern=EMAIL_REGEX)
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
