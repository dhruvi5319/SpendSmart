from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator
import ssl

from app.config import settings

# Convert postgresql:// to postgresql+asyncpg:// for async support
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Remove sslmode parameter (asyncpg uses 'ssl' instead)
# We'll handle SSL via connect_args
if "?sslmode=" in database_url:
    database_url = database_url.split("?sslmode=")[0]
elif "&sslmode=" in database_url:
    database_url = database_url.replace("&sslmode=require", "").replace("&sslmode=prefer", "")

# Create SSL context for asyncpg
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create async engine
engine = create_async_engine(
    database_url,
    echo=settings.python_env == "development",
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": ssl_context},
)

# Create session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
