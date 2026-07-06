import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import bcrypt
from jose import jwt, JWTError
from models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET", "expense_iq_super_secret_session_key_98123749")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days token expiry

security = HTTPBearer(auto_error=False)


class AuthIn(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str


class UserOut(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    created_at: datetime


class ProfileUpdateIn(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    created_at: datetime
    access_token: Optional[str] = None


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": username, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.find_one(User.username == username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=Token, status_code=201)
async def register(data: AuthIn):
    username_clean = data.username.strip()
    existing = await User.find_one(User.username == username_clean)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    
    user = User(
        username=username_clean,
        password_hash=hash_password(data.password),
    )
    await user.insert()
    
    token = create_access_token(user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
    }


@router.post("/login", response_model=Token)
async def login(data: AuthIn):
    username_clean = data.username.strip()
    user = await User.find_one(User.username == username_clean)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    token = create_access_token(user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
    }


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "whatsapp": user.whatsapp,
        "created_at": user.created_at,
    }


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(data: ProfileUpdateIn, user: User = Depends(get_current_user)):
    token = None
    if data.username is not None:
        new_username = data.username.strip()
        if new_username and new_username != user.username:
            existing = await User.find_one(User.username == new_username)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )
            user.username = new_username
            token = create_access_token(new_username)

    if data.password is not None and data.password.strip():
        user.password_hash = hash_password(data.password)

    if data.email is not None:
        user.email = data.email

    if data.whatsapp is not None:
        user.whatsapp = data.whatsapp

    await user.save()
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "whatsapp": user.whatsapp,
        "created_at": user.created_at,
        "access_token": token,
    }

