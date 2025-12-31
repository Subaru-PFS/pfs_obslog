"""MCS Plot APIのテスト"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pfs_obslog.database import get_db
from pfs_obslog.main import app


# テスト用DBセッション
TEST_DATABASE_URL = "postgresql://pfs@localhost:15432/opdb"
engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """テスト用DBセッションを提供"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# DBをオーバーライド
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class TestMcsDataChart:
    """GET /api/mcs_data/{frame_id}.png のテスト"""

    def test_mcs_data_chart_not_found(self):
        """存在しないframe_idでは204を返す"""
        response = client.get("/api/mcs_data/999999999.png")
        assert response.status_code == 204

    def test_mcs_data_chart_with_valid_frame(self):
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

    def test_mcs_data_chart_with_custom_size(self):
        """カスタムサイズでチャートを取得"""
        response = client.get("/api/mcs_data/1.png?width=320&height=240")
        # データがなくても200か204のいずれか
        assert response.status_code in [200, 204]

    def test_mcs_data_chart_size_too_large(self):
        """サイズ上限を超える場合は422を返す"""
        response = client.get("/api/mcs_data/1.png?width=9999")
        assert response.status_code == 422

        response = client.get("/api/mcs_data/1.png?height=9999")
        assert response.status_code == 422
