"""データベース接続管理

SQLAlchemyを使用した非同期データベース接続とセッション管理を提供します。
"""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pfs_obslog.config import get_settings

settings = get_settings()

# PostgreSQL接続URLをasync用に変換
# postgresql://... → postgresql+psycopg://...
_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)

async_engine = create_async_engine(
    _db_url,
    echo=settings.database_echo,
    pool_pre_ping=True,  # 接続の有効性を確認
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:  # pragma: no cover
    """非同期DBセッションを取得するDependency

    Usage:
        @router.get("/items")
        async def get_items(db: DbSession):
            result = await db.execute(select(Item))
            ...
    """
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


# 型エイリアス
DbSession = Annotated[AsyncSession, Depends(get_db)]
