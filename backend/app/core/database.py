import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings

settings = get_settings()

# ensure the sqlite data directory exists
_db_url = settings.database_url
if "sqlite" in _db_url:
    db_path = _db_url.split("///")[-1]
    if db_path and not db_path.startswith(":"):
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug and not settings.is_production,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db():
    """Create all tables. Called during application startup."""
    from app.models import Base  # noqa: F811
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db():
    """Dispose engine connections. Called during application shutdown."""
    await engine.dispose()
