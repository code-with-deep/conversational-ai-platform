from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import BACKEND_ROOT, get_settings

settings = get_settings()


def _resolve_database_url(raw_url: str) -> str:
    if not raw_url.startswith("sqlite"):
        return raw_url

    marker = "///./"
    if marker not in raw_url:
        return raw_url

    prefix, relative_path = raw_url.split(marker, maxsplit=1)
    absolute_path = (BACKEND_ROOT / relative_path).resolve()
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    return f"{prefix}///{absolute_path.as_posix()}"


DATABASE_URL = _resolve_database_url(settings.database_url)

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.debug and not settings.is_production,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


async def init_db():
    from app.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db():
    await engine.dispose()
