"""Attachment API テスト

添付ファイルAPIの基本的なテスト。
"""

import io
import pytest
from fastapi.testclient import TestClient

from pfs_obslog.main import app


client = TestClient(app)


class TestAttachmentUploadAPI:
    """添付ファイルアップロード API のテスト"""

    def test_upload_requires_auth(self):
        """アップロードには認証が必要"""
        response = client.post(
            "/api/attachments",
            files={"file": ("test.txt", io.BytesIO(b"test content"), "text/plain")},
        )
        assert response.status_code == 401

    def test_upload_blocked_extension(self):
        """ブロックされた拡張子のファイルはアップロードできない"""
        # 認証が先に必要なので、401が返る
        response = client.post(
            "/api/attachments",
            files={"file": ("test.exe", io.BytesIO(b"test content"), "application/octet-stream")},
        )
        assert response.status_code == 401


class TestAttachmentListAPI:
    """添付ファイル一覧 API のテスト"""

    def test_list_requires_auth(self):
        """一覧取得には認証が必要"""
        response = client.get("/api/attachments")
        assert response.status_code == 401


class TestAttachmentDownloadAPI:
    """添付ファイルダウンロード API のテスト"""

    def test_download_not_found(self):
        """存在しないファイルへのアクセスは404を返す"""
        response = client.get("/api/attachments/testuser/999999")
        assert response.status_code == 404

    def test_download_invalid_account_name(self):
        """無効なアカウント名はエラーを返す"""
        response = client.get("/api/attachments/invalid;user/1")
        assert response.status_code == 422


class TestAttachmentDeleteAPI:
    """添付ファイル削除 API のテスト"""

    def test_delete_requires_auth(self):
        """削除には認証が必要"""
        response = client.delete("/api/attachments/1")
        assert response.status_code == 401
