import logging
from datetime import datetime, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession


from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from app.models.user import User
from app.models.refresh_token import RefreshToken

logger = logging.getLogger(__name__)


async def register_user(
    db: AsyncSession,
    email: str,
    username: str,
    password: str,
    full_name: str = "",
) -> User:
    # check if email is already taken
    existing = await db.execute(
        select(User).where(User.email == email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("An account with this email already exists")

    # check username uniqueness
    existing = await db.execute(
        select(User).where(User.username == username)
    )
    if existing.scalar_one_or_none():
        raise ValueError("This username is already taken")

    user = User(
        email=email,
        username=username,
        password_hash=hash_password(password),
        full_name=full_name or None,
    )
    db.add(user)
    await db.flush()  # populate the id before returning

    logger.info("Registered new user: %s (%s)", username, email)
    return user


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("This account has been deactivated")

    return user


async def issue_token_pair(db: AsyncSession, user: User) -> dict:
    """Create an access + refresh token pair and persist the refresh hash."""
    access = create_access_token(subject=user.id, extra_claims={"role": user.role})
    refresh = create_refresh_token(subject=user.id)

    # decode to get expiry and jti
    payload = decode_token(refresh)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    token_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=expires_at,
    )
    db.add(token_record)
    await db.flush()

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


async def refresh_tokens(db: AsyncSession, raw_refresh_token: str) -> dict:
    """Validate the refresh token, revoke it, and issue a new pair."""
    from jose import JWTError

    try:
        payload = decode_token(raw_refresh_token)
    except JWTError:
        raise ValueError("Refresh token is invalid or expired")

    if payload.get("type") != "refresh":
        raise ValueError("Not a refresh token")

    token_h = hash_token(raw_refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_hash == token_h,
                RefreshToken.is_revoked == False,  # noqa: E712
            )
        )
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        raise ValueError("Refresh token has been revoked or does not exist")

    # revoke the old token (rotation)
    stored.is_revoked = True

    # fetch the user
    user_result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise ValueError("User account is not valid")

    # issue fresh pair
    return await issue_token_pair(db, user)


async def revoke_refresh_token(db: AsyncSession, raw_refresh_token: str) -> None:
    """Revoke a single refresh token (logout)."""
    token_h = hash_token(raw_refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_h)
    )
    stored = result.scalar_one_or_none()
    if stored:
        stored.is_revoked = True
        logger.info("Revoked refresh token for user %s", stored.user_id)
