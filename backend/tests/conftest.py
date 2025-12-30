"""pytest共通設定とフィクスチャ

開発用DBへの接続を提供し、本番DBへの誤接続を防止します。
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from urllib.parse import urlparse

from pfs_obslog.config import Settings


# 開発用DBの設定
DEV_DATABASE_URL = "postgresql://pfs@localhost:15432/opdb"


def _is_safe_database_url(url: str) -> bool:
    """データベースURLが安全（localhost）かどうかを確認"""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    return hostname in ("localhost", "127.0.0.1", "::1")


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """テスト用設定を取得

    安全のため、localhostのDBのみ許可します。
    """
    settings = Settings(database_url=DEV_DATABASE_URL)

    if not _is_safe_database_url(settings.database_url):
        pytest.fail(
            f"テストは localhost のDBに対してのみ実行できます。"
            f"現在の接続先: {settings.database_url}"
        )

    return settings


@pytest.fixture(scope="session")
def db_engine(test_settings: Settings):
    """テスト用DBエンジンを作成"""
    engine = create_engine(
        test_settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )

    # 接続テスト
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.scalar() == 1

    return engine


@pytest.fixture(scope="function")
def db_session(db_engine) -> Session:
    """テスト用DBセッションを作成

    各テスト関数ごとに新しいセッションを作成します。
    テスト終了後にロールバックします。
    """
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="session")
def db_session_readonly(db_engine) -> Session:
    """読み取り専用のDBセッション（セッションスコープ）

    パフォーマンスのため、セッションスコープで再利用します。
    変更を加えないテストで使用してください。
    """
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    yield session

    session.close()
