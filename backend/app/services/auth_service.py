import logging
from datetime import datetime, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession


from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_token,
)
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.services import email_service

logger = logging.getLogger(__name__)
ACCOUNT_NOT_REGISTERED_MESSAGE = "Account not registered. Please sign up first."


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_username(username: str) -> str:
    return username.strip()





async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    try:
        payload = decode_token(token)
    except Exception:
        raise ValueError("Invalid or expired reset token")

    if payload.get("type") != "reset":
        raise ValueError("Not a valid reset token")

    email = payload.get("sub")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("User no longer exists")

    user.password_hash = hash_password(new_password)
    await revoke_all_refresh_tokens(db, user.id)
    await db.flush()
    logger.info("Password successfully reset for user %s", user.email)


async def register_user(
    db: AsyncSession,
    email: str,
    username: str,
    password: str,
    full_name: str = "",
) -> User:
    email = _normalize_email(email)
    username = _normalize_username(username)

    existing = await db.execute(
        select(User).where(User.email == email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Account with this email already exists. Please sign in.")

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
    normalized_email = _normalize_email(email)
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError(ACCOUNT_NOT_REGISTERED_MESSAGE)

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("This account has been deactivated")

    return user


async def issue_token_pair(db: AsyncSession, user: User) -> dict:
    access = create_access_token(subject=user.id, extra_claims={"role": user.role})
    refresh = create_refresh_token(subject=user.id)

    payload = decode_token(refresh)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    token_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=expires_at,
    )
    db.add(token_record)
    await db.flush()

    logger.debug("Issued new token pair for user %s", user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


async def refresh_tokens(db: AsyncSession, raw_refresh_token: str) -> dict:
    from jose import JWTError

    try:
        payload = decode_token(raw_refresh_token)
    except Exception as exc:
        logger.warning("Failed to decode refresh token: %s", str(exc))
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
    # Ensure both datetimes are timezone-aware and in UTC for comparison
    stored_expiry = stored.expires_at
    if stored_expiry.tzinfo is None:
        stored_expiry = stored_expiry.replace(tzinfo=timezone.utc)
    
    if stored_expiry <= datetime.now(timezone.utc):
        stored.is_revoked = True
        raise ValueError("Refresh token is expired")

    stored.is_revoked = True

    user_result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise ValueError("User account is not valid")

    return await issue_token_pair(db, user)


async def revoke_refresh_token(db: AsyncSession, raw_refresh_token: str) -> None:
    token_h = hash_token(raw_refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_h)
    )
    stored = result.scalar_one_or_none()
    if stored:
        stored.is_revoked = True
        logger.info("Revoked refresh token for user %s", stored.user_id)


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,  # noqa: E712
            )
        )
    )
    for token in result.scalars().all():
        token.is_revoked = True
