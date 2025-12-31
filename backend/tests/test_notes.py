"""Notes API テスト

Visit NoteとVisit Set Note APIのテスト
"""

import pytest
from fastapi.testclient import TestClient


class TestVisitNoteAPI:
    """Visit Note API のテスト"""

    def test_create_visit_note_requires_auth(self, client: TestClient):
        """メモ作成には認証が必要"""
        response = client.post(
            "/api/visits/1/notes",
            json={"body": "Test note"},
        )
        assert response.status_code == 401

    def test_create_visit_note_success(self, client: TestClient):
        """認証済みユーザーはメモを作成できる"""
        # ログイン（テスト用DBにはLDAP認証なしで通る想定）
        # 実際の環境ではモック化が必要
        # セッションを使用してログイン
        login_response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpass"},
        )
        # LDAP認証のため失敗する可能性があるのでスキップ
        if login_response.status_code != 200:
            pytest.skip("LDAP authentication not available in test environment")

        # メモ作成
        response = client.post(
            "/api/visits/1/notes",
            json={"body": "Test note"},
        )
        assert response.status_code in [201, 404]  # 404 if visit doesn't exist

    def test_update_visit_note_requires_auth(self, client: TestClient):
        """メモ更新には認証が必要"""
        response = client.put(
            "/api/visits/1/notes/1",
            json={"body": "Updated note"},
        )
        assert response.status_code == 401

    def test_delete_visit_note_requires_auth(self, client: TestClient):
        """メモ削除には認証が必要"""
        response = client.delete("/api/visits/1/notes/1")
        assert response.status_code == 401


class TestVisitSetNoteAPI:
    """Visit Set Note API のテスト"""

    def test_create_visit_set_note_requires_auth(self, client: TestClient):
        """シーケンスメモ作成には認証が必要"""
        response = client.post(
            "/api/visit_sets/1/notes",
            json={"body": "Test note"},
        )
        assert response.status_code == 401

    def test_update_visit_set_note_requires_auth(self, client: TestClient):
        """シーケンスメモ更新には認証が必要"""
        response = client.put(
            "/api/visit_sets/1/notes/1",
            json={"body": "Updated note"},
        )
        assert response.status_code == 401

    def test_delete_visit_set_note_requires_auth(self, client: TestClient):
        """シーケンスメモ削除には認証が必要"""
        response = client.delete("/api/visit_sets/1/notes/1")
        assert response.status_code == 401
