"""MCS Plot APIのテスト"""

import pytest
from fastapi.testclient import TestClient


class TestMcsDataChart:
    """GET /api/mcs_data/{frame_id}.png のテスト"""

    def test_mcs_data_chart_not_found(self, client: TestClient):
        """存在しないframe_idでは204を返す"""
        response = client.get("/api/mcs_data/999999999.png")
        assert response.status_code == 204

    def test_mcs_data_chart_with_valid_frame(self, client: TestClient):
        """有効なframe_idでチャートを取得"""
        # まずMCS露出があるVisitを取得
        visits_response = client.get("/api/visits?limit=100")
        assert visits_response.status_code == 200
        visits = visits_response.json()["visits"]

        # MCS露出があるVisitを探す
        mcs_visit = None
        for visit in visits:
            if visit["n_mcs_exposures"] > 0:
                mcs_visit = visit
                break

        if mcs_visit is None:
            pytest.skip("No visits with MCS exposures in database")

        # Visit詳細からframe_idを取得
        detail_response = client.get(f"/api/visits/{mcs_visit['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()

        if detail["mcs"] is None or len(detail["mcs"]["exposures"]) == 0:
            pytest.skip("No MCS exposures found")

        frame_id = detail["mcs"]["exposures"][0]["frame_id"]

        # チャートを取得
        response = client.get(f"/api/mcs_data/{frame_id}.png")

        # mcs_dataテーブルにデータがない場合は204
        if response.status_code == 204:
            pytest.skip("No mcs_data for this frame")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"

        # PNG形式を確認（PNGのマジックバイト）
        assert response.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_mcs_data_chart_with_custom_size(self, client: TestClient):
        """カスタムサイズでチャートを取得"""
        response = client.get("/api/mcs_data/1.png?width=320&height=240")
        # データがなくても200か204のいずれか
        assert response.status_code in [200, 204]

    def test_mcs_data_chart_size_too_large(self, client: TestClient):
        """サイズ上限を超える場合は422を返す"""
        response = client.get("/api/mcs_data/1.png?width=9999")
        assert response.status_code == 422

        response = client.get("/api/mcs_data/1.png?height=9999")
        assert response.status_code == 422
