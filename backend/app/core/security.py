import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import base64

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(raw_password: str) -> str:
    """SHA-256 prehash to safely handle passwords longer than bcrypt's 72-byte limit."""
    digest = hashlib.sha256(raw_password.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")


# ---------- password helpers ----------

def hash_password(raw_password: str) -> str:
    return pwd_ctx.hash(_prehash(raw_password))


def verify_password(raw_password: str, hashed: str) -> bool:
    return pwd_ctx.verify(_prehash(raw_password), hashed)


# ---------- jwt helpers ----------

def create_access_token(
    subject: str,
    extra_claims: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise


def hash_token(token: str) -> str:
    """SHA-256 hash for storing refresh tokens in DB (never store raw)."""
    return hashlib.sha256(token.encode()).hexdigest()
