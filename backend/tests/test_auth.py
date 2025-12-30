"""認証機能のテスト"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from pfs_obslog.main import app


@pytest.fixture
def client():
    """テスト用クライアント"""
    return TestClient(app)


class TestLogin:
    """ログインAPIのテスト"""

    def test_login_success(self, client: TestClient):
        """正常なログイン"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = "testuser@stn"
            response = client.post(
                "/auth/login",
                json={"username": "testuser", "password": "testpass"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == "testuser@stn"

    def test_login_invalid_credentials(self, client: TestClient):
        """無効な認証情報でのログイン"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = None
            response = client.post(
                "/auth/login",
                json={"username": "testuser", "password": "wrongpass"},
            )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid username or password"

    def test_login_empty_password(self, client: TestClient):
        """空のパスワードでのログイン"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = None
            response = client.post(
                "/auth/login",
                json={"username": "testuser", "password": ""},
            )

        assert response.status_code == 401


class TestLogout:
    """ログアウトAPIのテスト"""

    def test_logout(self, client: TestClient):
        """ログアウト"""
        response = client.post("/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Logged out successfully"


class TestGetMe:
    """ユーザー情報取得APIのテスト"""

    def test_get_me_authenticated(self, client: TestClient):
        """認証済みユーザーの情報取得"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = "testuser@stn"
            # まずログイン
            client.post(
                "/auth/login",
                json={"username": "testuser", "password": "testpass"},
            )
            # ユーザー情報取得
            response = client.get("/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "testuser@stn"

    def test_get_me_not_authenticated(self, client: TestClient):
        """未認証でのユーザー情報取得"""
        response = client.get("/auth/me")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


class TestGetStatus:
    """認証状態取得APIのテスト"""

    def test_status_authenticated(self, client: TestClient):
        """認証済みの状態確認"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = "testuser@stn"
            # まずログイン
            client.post(
                "/auth/login",
                json={"username": "testuser", "password": "testpass"},
            )
            # 状態確認
            response = client.get("/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user_id"] == "testuser@stn"

    def test_status_not_authenticated(self, client: TestClient):
        """未認証の状態確認"""
        response = client.get("/auth/status")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["user_id"] is None


class TestSessionPersistence:
    """セッション永続性のテスト"""

    def test_session_persists_across_requests(self, client: TestClient):
        """セッションがリクエスト間で維持される"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = "testuser@stn"
            # ログイン
            client.post(
                "/auth/login",
                json={"username": "testuser", "password": "testpass"},
            )

        # 別のリクエストでも認証が維持される
        response = client.get("/auth/status")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user_id"] == "testuser@stn"

    def test_logout_clears_session(self, client: TestClient):
        """ログアウトでセッションがクリアされる"""
        with patch("pfs_obslog.routers.auth.authorize") as mock_authorize:
            mock_authorize.return_value = "testuser@stn"
            # ログイン
            client.post(
                "/auth/login",
                json={"username": "testuser", "password": "testpass"},
            )

        # ログアウト
        client.post("/auth/logout")

        # セッションがクリアされている
        response = client.get("/auth/status")
        data = response.json()
        assert data["authenticated"] is False
        assert data["user_id"] is None
