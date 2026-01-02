"""pytest共通設定とフィクスチャ

開発用DBへの接続を提供し、本番DBへの誤接続を防止します。
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from urllib.parse import urlparse
from collections.abc import AsyncGenerator
from fastapi.testclient import TestClient

from pfs_obslog.config import Settings
from pfs_obslog.main import app
from pfs_obslog.database import get_db
from pfs_obslog.pfs_design_cache import clear_pfs_design_cache


# 開発用DBの設定
DEV_DATABASE_URL = "postgresql://pfs@localhost:15432/opdb"
DEV_DATABASE_URL_ASYNC = "postgresql+psycopg://pfs@localhost:15432/opdb"


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
    """テスト用DBエンジンを作成（同期）"""
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


@pytest.fixture(scope="session")
def async_db_engine():
    """テスト用非同期DBエンジンを作成"""
    engine = create_async_engine(
        DEV_DATABASE_URL_ASYNC,
        echo=False,
        pool_pre_ping=True,
    )
    return engine


@pytest.fixture(scope="function")
def db_session(db_engine) -> Session:
    """テスト用DBセッションを作成（同期）

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
    """読み取り専用のDBセッション（セッションスコープ）（同期）

    パフォーマンスのため、セッションスコープで再利用します。
    変更を加えないテストで使用してください。
    """
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    yield session

    session.close()


@pytest.fixture(scope="function")
async def async_db_session(async_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """テスト用非同期DBセッションを作成

    各テスト関数ごとに新しいセッションを作成します。
    テスト終了後にロールバックします。
    """
    AsyncSessionLocal = async_sessionmaker(
        async_db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


# テスト用の非同期DBセッションファクトリ（セッションスコープ）
_test_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_test_async_session_factory():
    """テスト用の非同期セッションファクトリを取得または作成"""
    global _test_async_session_factory
    if _test_async_session_factory is None:
        engine = create_async_engine(
            DEV_DATABASE_URL_ASYNC,
            echo=False,
            pool_pre_ping=True,
        )
        _test_async_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _test_async_session_factory


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """テスト用のget_dbオーバーライド"""
    factory = _get_test_async_session_factory()
    async with factory() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest.fixture(scope="function")
def client():
    """テスト用のFastAPI TestClientを作成

    get_db依存関係をテスト用DBに向けてオーバーライドします。
    各テスト関数ごとに新しいクライアントを作成します（セッションの分離）。

    認証が必要なエンドポイントをテストする場合は、
    authenticated_client フィクスチャを使用してください。
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def authenticated_client(client):
    """認証済みのテスト用クライアントを作成

    テスト用ユーザー(testuser)でログイン済みの状態のクライアントを返します。
    認証が必要なエンドポイントのテストに使用してください。
    """
    from unittest.mock import patch

    # LDAPの認証をモックしてログイン
    with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
        mock_authorize.return_value = "testuser"
        response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpass"},
        )
        assert response.status_code == 200, f"Login failed: {response.json()}"

    return client


@pytest.fixture(autouse=True)
def cleanup_pfs_design_cache():
    """各テスト前後にPFS Designキャッシュをクリア

    シングルトンインスタンスの状態がテスト間で引き継がれないようにします。
    """
    clear_pfs_design_cache()
    yield
    clear_pfs_design_cache()
