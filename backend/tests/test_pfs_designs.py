"""PFS Design API テスト

PFS Design APIの基本的なテスト。
Note: pfs.datamodel が必要です。インストールされていない場合はエラーになります。
      セットアップ方法は backend/README.md を参照してください。
"""

import pytest
from fastapi.testclient import TestClient


class TestPfsDesignAPIAuth:
    """PFS Design API の認証テスト"""

    def test_pfs_design_api_requires_auth(self, client: TestClient):
        """認証なしでPFS Design APIにアクセスすると401を返す"""
        response = client.get("/api/pfs_designs")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


class TestPfsDesignListAPI:
    """PFS Design 一覧 API のテスト"""

    @pytest.mark.timeout(60)  # FITSファイル読み込みがあるため長めに設定
    @pytest.mark.slow  # 遅いテストとしてマーク
    def test_list_pfs_designs(self, authenticated_client: TestClient):
        """Design一覧を取得（ページネーション形式）"""
        response = authenticated_client.get("/api/pfs_designs")
        assert response.status_code == 200
        data = response.json()
        # ページネーション形式のレスポンス
        assert "items" in data
        assert "total" in data
        assert "offset" in data
        assert "limit" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)
        assert data["offset"] == 0
        assert data["limit"] == 50  # デフォルト値

    @pytest.mark.timeout(60)
    @pytest.mark.slow
    def test_list_pfs_designs_with_pagination(self, authenticated_client: TestClient):
        """ページネーションパラメータを指定してDesign一覧を取得"""
        response = authenticated_client.get(
            "/api/pfs_designs", params={"offset": 10, "limit": 20}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["offset"] == 10
        assert data["limit"] == 20

    @pytest.mark.timeout(60)
    @pytest.mark.slow
    def test_list_pfs_designs_positions(self, authenticated_client: TestClient):
        """全Designの位置情報を取得"""
        response = authenticated_client.get("/api/pfs_designs/positions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # 位置情報がある場合、各要素にid, ra, decが含まれる
        if len(data) > 0:
            assert "id" in data[0]
            assert "ra" in data[0]
            assert "dec" in data[0]


class TestPfsDesignDownloadAPI:
    """PFS Design ダウンロード API のテスト"""

    def test_download_design_invalid_id_format(self, authenticated_client: TestClient):
        """無効なID形式はエラーを返す"""
        response = authenticated_client.get("/api/pfs_designs/invalid.fits")
        assert response.status_code == 400

    def test_download_design_not_found(self, authenticated_client: TestClient):
        """存在しないDesignへのアクセスは404を返す"""
        response = authenticated_client.get("/api/pfs_designs/0000000000000000.fits")
        assert response.status_code == 404


class TestPfsDesignDetailAPI:
    """PFS Design 詳細 API のテスト"""

    def test_get_design_invalid_id_format(self, authenticated_client: TestClient):
        """無効なID形式はエラーを返す"""
        response = authenticated_client.get("/api/pfs_designs/invalid")
        assert response.status_code == 400

    def test_get_design_not_found(self, authenticated_client: TestClient):
        """存在しないDesignへのアクセスは404を返す"""
        response = authenticated_client.get("/api/pfs_designs/0000000000000000")
        assert response.status_code == 404
