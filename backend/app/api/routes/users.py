from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.schemas.user import UserOut, UserUpdate, UserPasswordUpdate
from app.schemas.common import SuccessResponse
from app.core.security import verify_password, hash_password
from app.models.user import User
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserOut)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.preferences is not None:
        current_user.preferences = body.preferences

    await db.flush()
    return current_user

@router.put("/password", response_model=SuccessResponse)
async def update_password(
    body: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    current_user.password_hash = hash_password(body.new_password)
    await auth_service.revoke_all_refresh_tokens(db, current_user.id)
    await db.flush()

    return SuccessResponse(message="Password updated successfully")


@router.delete("/profile", response_model=SuccessResponse)
async def delete_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.flush()
    return SuccessResponse(message="Account deleted successfully")
