"""Visit一覧APIのテスト"""

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


class TestListVisits:
    """GET /api/visits のテスト"""

    def test_list_visits_default(self):
        """デフォルトパラメータでVisit一覧を取得"""
        response = client.get("/api/visits")
        assert response.status_code == 200

        data = response.json()
        assert "visits" in data
        assert "iic_sequences" in data
        assert "count" in data

        # countは0以上
        assert data["count"] >= 0

        # visitsはリスト
        assert isinstance(data["visits"], list)

        # limitが50なので最大50件
        assert len(data["visits"]) <= 50

    def test_list_visits_with_limit(self):
        """limit指定でVisit一覧を取得"""
        response = client.get("/api/visits?limit=10")
        assert response.status_code == 200

        data = response.json()
        assert len(data["visits"]) <= 10

    def test_list_visits_with_offset(self):
        """offset指定でVisit一覧を取得"""
        # まずoffset=0で取得
        response1 = client.get("/api/visits?limit=5&offset=0")
        assert response1.status_code == 200
        data1 = response1.json()

        # offset=5で取得
        response2 = client.get("/api/visits?limit=5&offset=5")
        assert response2.status_code == 200
        data2 = response2.json()

        # 総件数は同じ
        assert data1["count"] == data2["count"]

        # データが重複しないこと（十分なデータがある場合）
        if len(data1["visits"]) > 0 and len(data2["visits"]) > 0:
            ids1 = {v["id"] for v in data1["visits"]}
            ids2 = {v["id"] for v in data2["visits"]}
            assert ids1.isdisjoint(ids2), "offsetで取得したデータが重複している"

    def test_list_visits_unlimited(self):
        """limit=-1で全件取得"""
        response = client.get("/api/visits?limit=-1")
        assert response.status_code == 200

        data = response.json()
        # 全件取得されている
        assert len(data["visits"]) == data["count"]

    def test_visit_entry_structure(self):
        """VisitListEntryの構造を確認"""
        response = client.get("/api/visits?limit=1")
        assert response.status_code == 200

        data = response.json()
        if len(data["visits"]) > 0:
            visit = data["visits"][0]

            # 必須フィールド
            assert "id" in visit
            assert "description" in visit
            assert "issued_at" in visit
            assert "iic_sequence_id" in visit

            # 露出数
            assert "n_sps_exposures" in visit
            assert "n_mcs_exposures" in visit
            assert "n_agc_exposures" in visit

            # 平均値
            assert "avg_exptime" in visit
            assert "avg_azimuth" in visit
            assert "avg_altitude" in visit
            assert "avg_ra" in visit
            assert "avg_dec" in visit
            assert "avg_insrot" in visit

            # メモ
            assert "notes" in visit
            assert isinstance(visit["notes"], list)

            # 設計ID
            assert "pfs_design_id" in visit

    def test_iic_sequence_structure(self):
        """IicSequenceの構造を確認"""
        response = client.get("/api/visits?limit=100")
        assert response.status_code == 200

        data = response.json()
        if len(data["iic_sequences"]) > 0:
            seq = data["iic_sequences"][0]

            # 必須フィールド
            assert "iic_sequence_id" in seq
            assert "sequence_type" in seq
            assert "name" in seq
            assert "comments" in seq
            assert "cmd_str" in seq
            assert "group_id" in seq
            assert "created_at" in seq

            # リレーション
            assert "group" in seq
            assert "notes" in seq

    def test_visits_ordered_by_id_desc(self):
        """VisitがIDの降順でソートされていることを確認"""
        response = client.get("/api/visits?limit=10")
        assert response.status_code == 200

        data = response.json()
        ids = [v["id"] for v in data["visits"]]

        # 降順でソートされているか
        assert ids == sorted(ids, reverse=True), "VisitがIDの降順でソートされていない"
