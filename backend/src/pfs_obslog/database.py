"""データベース接続管理

SQLAlchemyを使用したデータベース接続とセッション管理を提供します。
"""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from pfs_obslog.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,  # 接続の有効性を確認
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:  # pragma: no cover
    """DBセッションを取得するDependency

    Usage:
        @router.get("/items")
        def get_items(db: Annotated[Session, Depends(get_db)]):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 型エイリアス
DbSession = Annotated[Session, Depends(get_db)]
