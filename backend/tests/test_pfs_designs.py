"""PFS Design API テスト

PFS Design APIの基本的なテスト。
Note: pfs.datamodel が必要です。インストールされていない場合はエラーになります。
      セットアップ方法は backend/README.md を参照してください。
"""

import pytest
from fastapi.testclient import TestClient


class TestPfsDesignListAPI:
    """PFS Design 一覧 API のテスト"""

    @pytest.mark.timeout(60)  # FITSファイル読み込みがあるため長めに設定
    @pytest.mark.slow  # 遅いテストとしてマーク
    def test_list_pfs_designs(self, client: TestClient):
        """Design一覧を取得（ディレクトリがない場合は空配列）"""
        response = client.get("/api/pfs_designs")
        assert response.status_code == 200
        # ディレクトリが存在しない場合は空リスト
        assert isinstance(response.json(), list)


class TestPfsDesignDownloadAPI:
    """PFS Design ダウンロード API のテスト"""

    def test_download_design_invalid_id_format(self, client: TestClient):
        """無効なID形式はエラーを返す"""
        response = client.get("/api/pfs_designs/invalid.fits")
        assert response.status_code == 400

    def test_download_design_not_found(self, client: TestClient):
        """存在しないDesignへのアクセスは404を返す"""
        response = client.get("/api/pfs_designs/0000000000000000.fits")
        assert response.status_code == 404


class TestPfsDesignDetailAPI:
    """PFS Design 詳細 API のテスト"""

    def test_get_design_invalid_id_format(self, client: TestClient):
        """無効なID形式はエラーを返す"""
        response = client.get("/api/pfs_designs/invalid")
        assert response.status_code == 400

    def test_get_design_not_found(self, client: TestClient):
        """存在しないDesignへのアクセスは404を返す"""
        response = client.get("/api/pfs_designs/0000000000000000")
        assert response.status_code == 404
