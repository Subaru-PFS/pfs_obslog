"""PFS Design Cache のテスト"""

import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from pfs_obslog.pfs_design_cache import PfsDesignCache, _pick_id, clear_pfs_design_cache


class TestPickId:
    """_pick_id関数のテスト"""

    def test_valid_filename(self):
        assert _pick_id("pfsDesign-0x1234567890abcdef.fits") == "1234567890abcdef"

    def test_uppercase_hex(self):
        assert _pick_id("pfsDesign-0xABCDEF1234567890.fits") == "abcdef1234567890"

    def test_invalid_filename(self):
        assert _pick_id("invalid.fits") == ""


class TestPfsDesignCache:
    """PfsDesignCacheクラスのテスト"""

    @pytest.fixture
    def cache_dir(self, tmp_path):
        """キャッシュディレクトリ"""
        return tmp_path / "cache"

    @pytest.fixture
    def design_dir(self, tmp_path):
        """Designディレクトリ"""
        d = tmp_path / "designs"
        d.mkdir()
        return d

    @pytest.fixture
    def cache(self, cache_dir, design_dir):
        """テスト用キャッシュインスタンスを作成"""
        db_path = cache_dir / "test.db"
        return PfsDesignCache(db_path, design_dir)

    def test_init_creates_db(self, cache_dir, design_dir):
        """初期化時にデータベースが作成される"""
        db_path = cache_dir / "test.db"
        cache = PfsDesignCache(db_path, design_dir)

        assert db_path.exists()

    def test_get_all_entries_empty(self, cache):
        """空のキャッシュから取得"""
        entries = cache.get_all_entries()
        assert entries == []

    def test_get_all_entries_nonexistent_dir(self, cache_dir):
        """存在しないディレクトリの場合は空リストを返す"""
        db_path = cache_dir / "test.db"
        nonexistent_dir = Path("/nonexistent/dir")
        cache = PfsDesignCache(db_path, nonexistent_dir)

        entries = cache.get_all_entries()
        assert entries == []

    def test_sync_empty_dir(self, cache):
        """空のディレクトリの同期"""
        result = cache.sync()
        assert result is True

    def test_sync_double_call_blocked(self, cache):
        """二重起動がブロックされる"""
        # 同期をロック
        cache._sync_lock.acquire()
        cache._syncing = True

        try:
            # 二重起動はスキップされる
            result = cache.sync()
            assert result is False
        finally:
            cache._sync_lock.release()
            cache._syncing = False

    def test_is_syncing(self, cache):
        """同期状態の確認"""
        assert cache.is_syncing() is False

        cache._syncing = True
        assert cache.is_syncing() is True

        cache._syncing = False
        assert cache.is_syncing() is False

    @patch("pfs_obslog.pfs_design_cache.PfsDesignCache._update_entry")
    def test_sync_with_files(self, mock_update, cache_dir, design_dir):
        """ファイルがある場合の同期"""
        db_path = cache_dir / "test.db"

        # ダミーファイルを作成
        dummy_file = design_dir / "pfsDesign-0x1234567890abcdef.fits"
        dummy_file.touch()

        cache = PfsDesignCache(db_path, design_dir)
        cache.sync()

        # _update_entryが呼ばれたことを確認
        mock_update.assert_called_once()
        call_args = mock_update.call_args[0]
        assert call_args[0] == "1234567890abcdef"
        assert call_args[1] == "pfsDesign-0x1234567890abcdef.fits"


class TestPfsDesignCacheIntegration:
    """統合テスト（実際のFITSファイルは使用しない）"""

    def test_get_all_entries_with_data(self, tmp_path):
        """データがある場合の取得"""
        cache_dir = tmp_path / "cache"
        design_dir = tmp_path / "designs"
        design_dir.mkdir()
        
        db_path = cache_dir / "test.db"
        cache = PfsDesignCache(db_path, design_dir)

        # 直接データを挿入
        import sqlite3
        import time

        conn = sqlite3.connect(db_path)
        try:
            conn.execute(
                """
                INSERT INTO pfs_design_metadata (
                    id, frameid, name, file_mtime, ra, dec, arms,
                    num_design_rows, num_photometry_rows, num_guidestar_rows,
                    science_count, sky_count, fluxstd_count,
                    unassigned_count, engineering_count,
                    sunss_imaging_count, sunss_diffuse_count,
                    cached_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "1234567890abcdef",
                    "pfsDesign-0x1234567890abcdef.fits",
                    "Test Design",
                    time.time(),
                    180.0,
                    45.0,
                    "brn",
                    100,
                    50,
                    6,
                    80,
                    10,
                    5,
                    3,
                    2,
                    0,
                    0,
                    time.time(),
                ),
            )
            conn.commit()
        finally:
            conn.close()

        entries = cache.get_all_entries()

        assert len(entries) == 1
        entry = entries[0]

        assert entry["id"] == "1234567890abcdef"
        assert entry["frameid"] == "pfsDesign-0x1234567890abcdef.fits"
        assert entry["name"] == "Test Design"
        assert entry["ra"] == 180.0
        assert entry["dec"] == 45.0
        assert entry["arms"] == "brn"
        assert entry["num_design_rows"] == 100
        assert entry["design_rows"]["science"] == 80
        assert entry["design_rows"]["sky"] == 10
