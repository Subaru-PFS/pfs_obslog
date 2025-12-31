"""FITS API テスト

FITS APIの基本的なテスト。
実際のFITSファイルへのアクセスは環境依存のため、
エンドポイントの存在と基本的なエラーハンドリングをテストします。
"""

import pytest
from fastapi.testclient import TestClient

from pfs_obslog.main import app


client = TestClient(app)


class TestSpsFitsAPI:
    """SPS FITS API のテスト"""

    def test_download_sps_fits_visit_not_found(self):
        """存在しないVisitへのアクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/sps/1.fits")
        assert response.status_code == 404

    def test_get_sps_fits_preview_visit_not_found(self):
        """存在しないVisitへのプレビュー画像アクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/sps/1.png")
        assert response.status_code == 404

    def test_get_sps_fits_headers_visit_not_found(self):
        """存在しないVisitへのヘッダーアクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/sps/1/headers")
        assert response.status_code == 404


class TestMcsFitsAPI:
    """MCS FITS API のテスト"""

    def test_download_mcs_fits_visit_not_found(self):
        """存在しないVisitへのアクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/mcs/1.fits")
        assert response.status_code == 404

    def test_get_mcs_fits_preview_visit_not_found(self):
        """存在しないVisitへのプレビュー画像アクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/mcs/1.png")
        assert response.status_code == 404

    def test_get_mcs_fits_headers_visit_not_found(self):
        """存在しないVisitへのヘッダーアクセスは404を返す"""
        response = client.get("/api/fits/visits/999999/mcs/1/headers")
        assert response.status_code == 404


class TestAgcFitsAPI:
    """AGC FITS API のテスト"""

    def test_download_agc_fits_exposure_not_found(self):
        """存在しないExposureへのアクセスは404を返す"""
        response = client.get("/api/fits/visits/1/agc/999999.fits")
        assert response.status_code == 404

    def test_get_agc_fits_preview_exposure_not_found(self):
        """存在しないExposureへのプレビュー画像アクセスは404を返す"""
        response = client.get("/api/fits/visits/1/agc/999999-1.png")
        assert response.status_code == 404


class TestFitsTypeParameter:
    """FITSタイプパラメータのテスト"""

    def test_sps_fits_invalid_type(self):
        """無効なタイプパラメータはエラーを返す"""
        response = client.get("/api/fits/visits/1/sps/1.fits?type=invalid")
        assert response.status_code == 422  # Validation error

    def test_sps_fits_calexp_type(self):
        """calexpタイプのリクエスト"""
        response = client.get("/api/fits/visits/999999/sps/1.fits?type=calexp")
        assert response.status_code == 404  # Visit not found

    def test_sps_fits_postISRCCD_type(self):
        """postISRCCDタイプはまだサポートされていない"""
        # まずVisitが存在する場合のテストのため、既存のVisit IDが必要
        # テスト用DBに存在するVisitがない場合は404が返る
        response = client.get("/api/fits/visits/1/sps/1.fits?type=postISRCCD")
        # 404 (Visit not found) または 501 (Not implemented)
        assert response.status_code in [404, 501]


class TestSizeParameters:
    """サイズパラメータのテスト"""

    def test_sps_preview_with_custom_size(self):
        """カスタムサイズでのプレビューリクエスト"""
        response = client.get(
            "/api/fits/visits/999999/sps/1.png?width=512&height=512"
        )
        assert response.status_code == 404  # Visit not found, but params are valid

    def test_sps_preview_size_too_large(self):
        """サイズが大きすぎる場合はバリデーションエラー"""
        response = client.get(
            "/api/fits/visits/1/sps/1.png?width=10000&height=10000"
        )
        assert response.status_code == 422  # Validation error
