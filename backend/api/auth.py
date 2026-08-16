from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.api.schemas import LoginRequest, SignupRequest, TokenResponse, UpdateProfileRequest, UserOut
from backend.auth import create_access_token, get_current_user, hash_password, verify_password
from backend.db import get_db
from backend.models import User

router = APIRouter()


def _user_out(user: User) -> UserOut:
    return UserOut(id=str(user.id), email=user.email, full_name=user.full_name, created_at=user.created_at)


@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(email=request.email, hashed_password=hash_password(request.password), full_name=request.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_user_out(user))


@router.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_user_out(user))


@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(current_user)


@router.patch("/auth/me", response_model=UserOut)
def update_me(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    current_user.full_name = request.full_name
    db.commit()
    db.refresh(current_user)
    return _user_out(current_user)
