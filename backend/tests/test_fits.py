"""FITS API テスト

FITS APIの基本的なテスト。
実際のFITSファイルへのアクセスは環境依存のため、
エンドポイントの存在と基本的なエラーハンドリングをテストします。
"""

import pytest
from fastapi.testclient import TestClient


class TestFitsAPIAuth:
    """FITS API の認証テスト"""

    def test_fits_api_requires_auth(self, client: TestClient):
        """認証なしでFITS APIにアクセスすると401を返す"""
        response = client.get("/api/fits/visits/1/sps/1.fits")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


class TestSpsFitsAPI:
    """SPS FITS API のテスト"""

    def test_download_sps_fits_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのアクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/sps/1.fits")
        assert response.status_code == 404

    def test_get_sps_fits_preview_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのプレビュー画像アクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/sps/1.png")
        assert response.status_code == 404

    def test_get_sps_fits_headers_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのヘッダーアクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/sps/1/headers")
        assert response.status_code == 404


class TestMcsFitsAPI:
    """MCS FITS API のテスト"""

    def test_download_mcs_fits_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのアクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/mcs/1.fits")
        assert response.status_code == 404

    def test_get_mcs_fits_preview_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのプレビュー画像アクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/mcs/1.png")
        assert response.status_code == 404

    def test_get_mcs_fits_headers_visit_not_found(self, authenticated_client: TestClient):
        """存在しないVisitへのヘッダーアクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/999999/mcs/1/headers")
        assert response.status_code == 404


class TestAgcFitsAPI:
    """AGC FITS API のテスト"""

    def test_download_agc_fits_exposure_not_found(self, authenticated_client: TestClient):
        """存在しないExposureへのアクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/1/agc/999999.fits")
        assert response.status_code == 404

    def test_get_agc_fits_preview_exposure_not_found(self, authenticated_client: TestClient):
        """存在しないExposureへのプレビュー画像アクセスは404を返す"""
        response = authenticated_client.get("/api/fits/visits/1/agc/999999-1.png")
        assert response.status_code == 404


class TestFitsTypeParameter:
    """FITSタイプパラメータのテスト"""

    def test_sps_fits_invalid_type(self, authenticated_client: TestClient):
        """無効なタイプパラメータはエラーを返す"""
        response = authenticated_client.get("/api/fits/visits/1/sps/1.fits?type=invalid")
        assert response.status_code == 422  # Validation error

    def test_sps_fits_calexp_type(self, authenticated_client: TestClient):
        """calexpタイプのリクエスト"""
        response = authenticated_client.get("/api/fits/visits/999999/sps/1.fits?type=calexp")
        assert response.status_code == 404  # Visit not found

    def test_sps_fits_postISRCCD_type(self, authenticated_client: TestClient):
        """postISRCCDタイプはまだサポートされていない"""
        # まずVisitが存在する場合のテストのため、既存のVisit IDが必要
        # テスト用DBに存在するVisitがない場合は404が返る
        response = authenticated_client.get("/api/fits/visits/1/sps/1.fits?type=postISRCCD")
        # 404 (Visit not found) または 501 (Not implemented)
        assert response.status_code in [404, 501]


class TestSizeParameters:
    """サイズパラメータのテスト"""

    def test_sps_preview_with_custom_size(self, authenticated_client: TestClient):
        """カスタムサイズでのプレビューリクエスト"""
        response = authenticated_client.get(
            "/api/fits/visits/999999/sps/1.png?width=512&height=512"
        )
        assert response.status_code == 404  # Visit not found, but params are valid

    def test_sps_preview_size_too_large(self, authenticated_client: TestClient):
        """サイズが大きすぎる場合はバリデーションエラー"""
        response = authenticated_client.get(
            "/api/fits/visits/1/sps/1.png?width=10000&height=10000"
        )
        assert response.status_code == 422  # Validation error
