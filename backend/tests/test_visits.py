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


class TestGetVisit:
    """GET /api/visits/{visit_id} のテスト"""

    def test_get_visit_success(self):
        """存在するVisitの詳細を取得"""
        # まずVisit一覧から1件取得
        list_response = client.get("/api/visits?limit=1")
        assert list_response.status_code == 200
        visits = list_response.json()["visits"]

        if len(visits) == 0:
            pytest.skip("No visits in database")

        visit_id = visits[0]["id"]

        # Visit詳細を取得
        response = client.get(f"/api/visits/{visit_id}")
        assert response.status_code == 200

        data = response.json()

        # 基本情報
        assert data["id"] == visit_id
        assert "description" in data
        assert "issued_at" in data
        assert "notes" in data
        assert isinstance(data["notes"], list)

        # 露出情報（存在する場合）
        assert "sps" in data
        assert "mcs" in data
        assert "agc" in data
        assert "iic_sequence" in data

    def test_get_visit_not_found(self):
        """存在しないVisitの詳細を取得"""
        response = client.get("/api/visits/999999999")
        assert response.status_code == 404

    def test_get_visit_sps_structure(self):
        """SPS露出情報の構造を確認"""
        # SPS露出があるVisitを探す
        list_response = client.get("/api/visits?limit=100")
        visits = list_response.json()["visits"]
        sps_visit = next((v for v in visits if v["n_sps_exposures"] > 0), None)

        if sps_visit is None:
            pytest.skip("No visits with SPS exposures")

        response = client.get(f"/api/visits/{sps_visit['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["sps"] is not None
        assert "exp_type" in data["sps"]
        assert "exposures" in data["sps"]

        if len(data["sps"]["exposures"]) > 0:
            exp = data["sps"]["exposures"][0]
            assert "camera_id" in exp
            assert "exptime" in exp
            assert "exp_start" in exp
            assert "exp_end" in exp
            assert "annotations" in exp

    def test_get_visit_mcs_structure(self):
        """MCS露出情報の構造を確認"""
        # MCS露出があるVisitを探す
        list_response = client.get("/api/visits?limit=100")
        visits = list_response.json()["visits"]
        mcs_visit = next((v for v in visits if v["n_mcs_exposures"] > 0), None)

        if mcs_visit is None:
            pytest.skip("No visits with MCS exposures")

        response = client.get(f"/api/visits/{mcs_visit['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["mcs"] is not None
        assert "exposures" in data["mcs"]

        if len(data["mcs"]["exposures"]) > 0:
            exp = data["mcs"]["exposures"][0]
            assert "frame_id" in exp
            assert "exptime" in exp
            assert "altitude" in exp
            assert "taken_at" in exp
            assert "notes" in exp

    def test_get_visit_agc_structure(self):
        """AGC露出情報の構造を確認"""
        # AGC露出があるVisitを探す
        list_response = client.get("/api/visits?limit=100")
        visits = list_response.json()["visits"]
        agc_visit = next((v for v in visits if v["n_agc_exposures"] > 0), None)

        if agc_visit is None:
            pytest.skip("No visits with AGC exposures")

        response = client.get(f"/api/visits/{agc_visit['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["agc"] is not None
        assert "exposures" in data["agc"]

        if len(data["agc"]["exposures"]) > 0:
            exp = data["agc"]["exposures"][0]
            assert "id" in exp
            assert "exptime" in exp
            assert "altitude" in exp
            assert "taken_at" in exp
            assert "guide_offset" in exp

    def test_get_visit_iic_sequence_structure(self):
        """IICシーケンス情報の構造を確認"""
        # IICシーケンスがあるVisitを探す
        list_response = client.get("/api/visits?limit=100")
        visits = list_response.json()["visits"]
        seq_visit = next((v for v in visits if v["iic_sequence_id"] is not None), None)

        if seq_visit is None:
            pytest.skip("No visits with IIC sequence")

        response = client.get(f"/api/visits/{seq_visit['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["iic_sequence"] is not None
        assert "iic_sequence_id" in data["iic_sequence"]
        assert "sequence_type" in data["iic_sequence"]
        assert "name" in data["iic_sequence"]
        assert "cmd_str" in data["iic_sequence"]
        assert "group" in data["iic_sequence"]
        assert "notes" in data["iic_sequence"]
        assert "status" in data["iic_sequence"]


class TestSqlFiltering:
    """SQLフィルタリング機能のテスト"""

    def test_filter_by_id(self):
        """ID指定でフィルタリング"""
        # まずVisit一覧から1件取得
        list_response = client.get("/api/visits?limit=1")
        visits = list_response.json()["visits"]

        if len(visits) == 0:
            pytest.skip("No visits in database")

        visit_id = visits[0]["id"]

        # IDでフィルタリング
        response = client.get(f"/api/visits?sql=where id = {visit_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["count"] == 1
        assert len(data["visits"]) == 1
        assert data["visits"][0]["id"] == visit_id

    def test_filter_by_id_range(self):
        """ID範囲指定でフィルタリング"""
        # まず複数件取得
        list_response = client.get("/api/visits?limit=10")
        visits = list_response.json()["visits"]

        if len(visits) < 2:
            pytest.skip("Not enough visits in database")

        # 最大・最小ID
        ids = [v["id"] for v in visits]
        min_id = min(ids)
        max_id = max(ids)

        # ID範囲でフィルタリング
        response = client.get(f"/api/visits?sql=where id between {min_id} and {max_id}")
        assert response.status_code == 200

        data = response.json()
        # フィルタリング結果のIDが範囲内であること
        for v in data["visits"]:
            assert min_id <= v["id"] <= max_id

    def test_filter_invalid_sql(self):
        """無効なSQLでエラー"""
        response = client.get("/api/visits?sql=invalid sql syntax")
        assert response.status_code == 400

    def test_filter_with_pagination(self):
        """SQLフィルタリングとページネーションの組み合わせ"""
        # まず全件数を確認
        all_response = client.get("/api/visits?limit=1")
        total = all_response.json()["count"]

        if total == 0:
            pytest.skip("No visits in database")

        # 存在するIDを取得
        ids = [v["id"] for v in client.get("/api/visits?limit=10").json()["visits"]]
        if len(ids) == 0:
            pytest.skip("No visits in database")

        median_id = ids[len(ids) // 2]

        # より大きいIDでフィルタリング（offset=0, limit=5）
        response1 = client.get(f"/api/visits?sql=where id >= {median_id}&limit=5&offset=0")
        assert response1.status_code == 200
        data1 = response1.json()

        # offset=5で取得
        response2 = client.get(f"/api/visits?sql=where id >= {median_id}&limit=5&offset=5")
        assert response2.status_code == 200
        data2 = response2.json()

        # countは同じ
        assert data1["count"] == data2["count"]

        # データが重複しないこと
        if len(data1["visits"]) > 0 and len(data2["visits"]) > 0:
            ids1 = {v["id"] for v in data1["visits"]}
            ids2 = {v["id"] for v in data2["visits"]}
            assert ids1.isdisjoint(ids2)


class TestVisitRank:
    """GET /api/visits/{visit_id}/rank のテスト"""

    def test_get_visit_rank(self):
        """Visitの順位を取得"""
        # まずVisit一覧から数件取得
        list_response = client.get("/api/visits?limit=10")
        assert list_response.status_code == 200
        visits = list_response.json()["visits"]

        if len(visits) == 0:
            pytest.skip("No visits in database")

        # 最新のVisit（リストの先頭）は順位1になるはず
        visit_id = visits[0]["id"]
        response = client.get(f"/api/visits/{visit_id}/rank")
        assert response.status_code == 200

        data = response.json()
        assert "rank" in data
        assert data["rank"] == 1  # 最新なので順位は1

    def test_get_visit_rank_with_filter(self):
        """SQLフィルタリング内での順位を取得"""
        # Visit一覧から取得
        list_response = client.get("/api/visits?limit=20")
        assert list_response.status_code == 200
        visits = list_response.json()["visits"]

        if len(visits) < 5:
            pytest.skip("Not enough visits in database")

        # 中間のVisitを選択
        mid_visit = visits[len(visits) // 2]
        visit_id = mid_visit["id"]

        # そのID以上でフィルタリングした場合の順位
        response = client.get(f"/api/visits/{visit_id}/rank?sql=where id >= {visit_id}")
        assert response.status_code == 200

        data = response.json()
        assert "rank" in data
        # フィルタリング結果内での順位を確認
        assert data["rank"] is not None
        assert data["rank"] >= 1

    def test_get_visit_rank_not_found(self):
        """存在しないVisitの順位を取得"""
        response = client.get("/api/visits/999999999/rank")
        assert response.status_code == 200

        data = response.json()
        assert data["rank"] is None

    def test_get_visit_rank_invalid_sql(self):
        """不正なSQLでの順位取得"""
        # まずVisit一覧から1件取得
        list_response = client.get("/api/visits?limit=1")
        visits = list_response.json()["visits"]

        if len(visits) == 0:
            pytest.skip("No visits in database")

        visit_id = visits[0]["id"]
        response = client.get(f"/api/visits/{visit_id}/rank?sql=where invalid_column = 1")
        assert response.status_code == 400


class TestVisitCSVExport:
    """GET /api/visits.csv のテスト"""

    def test_export_visits_csv(self):
        """Visit一覧をCSVでエクスポート"""
        response = client.get("/api/visits.csv?limit=10")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "content-disposition" in response.headers
        assert "pfsobslog.utf8.csv" in response.headers["content-disposition"]

        # CSVの内容を確認
        content = response.text
        lines = content.strip().split("\n")

        # ヘッダー行があるか
        assert len(lines) >= 1
        header = lines[0]
        assert header.startswith("# ")  # 最初の列は#で始まる
        assert "visit_id" in header

    def test_export_visits_csv_with_filter(self):
        """SQLフィルタリングしてCSVエクスポート"""
        # まずVisit一覧から取得
        list_response = client.get("/api/visits?limit=10")
        visits = list_response.json()["visits"]

        if len(visits) == 0:
            pytest.skip("No visits in database")

        # 存在するIDでフィルタリング
        visit_id = visits[0]["id"]
        response = client.get(f"/api/visits.csv?sql=where id = {visit_id}")
        assert response.status_code == 200

        content = response.text
        lines = content.strip().split("\n")

        # ヘッダー + 1行
        assert len(lines) == 2

    def test_export_visits_csv_empty(self):
        """空の結果をCSVエクスポート"""
        response = client.get("/api/visits.csv?sql=where id = -1")
        assert response.status_code == 200

        content = response.text
        # 空のCSV
        assert content.strip() == ""

    def test_export_visits_csv_columns(self):
        """CSVの列を確認"""
        response = client.get("/api/visits.csv?limit=1")
        assert response.status_code == 200

        content = response.text
        lines = content.strip().split("\n")

        if len(lines) < 1:
            pytest.skip("No data in CSV")

        header = lines[0]
        expected_columns = [
            "visit_id",
            "description",
            "sequence_name",
            "issued_at",
            "iic_sequence_id",
            "n_sps_exposures",
            "n_mcs_exposures",
            "n_agc_exposures",
            "avg_exptime",
            "pfs_design_id",
            "avg_azimuth",
            "avg_altitude",
            "avg_insrot",
            "notes",
            "visit_set_notes",
        ]

        for col in expected_columns:
            assert col in header, f"Column {col} not found in header"
