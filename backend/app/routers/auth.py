from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.models import User
from ..models.schemas import UserCreate, UserLogin, UserOut, Token
from ..services.auth import hash_pw, verify_pw, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(email=data.email, hashed_password=hash_pw(data.password), full_name=data.full_name, role=data.role, company_name=data.company_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_pw(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
