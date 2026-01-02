"""PFS Design Cache のテスト"""

import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from astropy.io import fits

from pfs_obslog.pfs_design_cache import PfsDesignCache, _pick_id, clear_pfs_design_cache


def create_dummy_pfs_design(
    filepath: Path,
    design_id: str = "1234567890abcdef",
    name: str = "Test Design",
    ra: float = 180.0,
    dec: float = 45.0,
    arms: str = "brn",
    num_fibers: int = 100,
) -> None:
    """テスト用のダミーPFS Designファイルを作成

    Args:
        filepath: 出力先ファイルパス
        design_id: Design ID（16進数文字列）
        name: Design名
        ra: 中心赤経
        dec: 中心赤緯
        arms: 使用するアーム
        num_fibers: ファイバー数
    """
    # Primary HDU
    primary_hdu = fits.PrimaryHDU()
    primary_hdu.header["DSGN_NAM"] = name
    primary_hdu.header["RA"] = ra
    primary_hdu.header["DEC"] = dec
    primary_hdu.header["ARMS"] = arms

    # Design HDU (HDU 1)
    # targetType: 1=science, 2=sky, 3=fluxstd, 4=unassigned, 5=engineering
    fiber_ids = np.arange(1, num_fibers + 1, dtype=np.int32)
    target_types = np.zeros(num_fibers, dtype=np.int32)
    target_types[: num_fibers // 2] = 1  # science
    target_types[num_fibers // 2 : num_fibers * 3 // 4] = 2  # sky
    target_types[num_fibers * 3 // 4 :] = 3  # fluxstd

    design_cols = [
        fits.Column(name="fiberId", format="J", array=fiber_ids),
        fits.Column(name="targetType", format="J", array=target_types),
        fits.Column(name="ra", format="D", array=np.full(num_fibers, ra)),
        fits.Column(name="dec", format="D", array=np.full(num_fibers, dec)),
    ]
    design_hdu = fits.BinTableHDU.from_columns(design_cols, name="DESIGN")

    # Photometry HDU (HDU 2) - 各ファイバーに対して複数のフィルターデータ
    num_photometry = num_fibers * 5  # 各ファイバーに5フィルター分
    photo_fiber_ids = np.repeat(fiber_ids, 5)
    photo_cols = [
        fits.Column(name="fiberId", format="J", array=photo_fiber_ids),
        fits.Column(name="fiberFlux", format="E", array=np.ones(num_photometry)),
        fits.Column(name="psfFlux", format="E", array=np.ones(num_photometry)),
        fits.Column(name="totalFlux", format="E", array=np.ones(num_photometry)),
        fits.Column(
            name="filterName",
            format="5A",
            array=np.tile(["g", "r", "i", "z", "y"], num_fibers),
        ),
    ]
    photometry_hdu = fits.BinTableHDU.from_columns(photo_cols, name="PHOTOMETRY")

    # GuideStars HDU (HDU 3)
    num_guidestars = 6
    guidestar_cols = [
        fits.Column(
            name="ra", format="D", array=np.full(num_guidestars, ra, dtype=np.float64)
        ),
        fits.Column(
            name="dec", format="D", array=np.full(num_guidestars, dec, dtype=np.float64)
        ),
    ]
    guidestar_hdu = fits.BinTableHDU.from_columns(guidestar_cols, name="GUIDESTARS")

    # HDUListを作成して保存
    hdul = fits.HDUList([primary_hdu, design_hdu, photometry_hdu, guidestar_hdu])
    hdul.writeto(filepath, overwrite=True)


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


class TestPfsDesignCacheWithRealFits:
    """実際のFITSファイルを使用したテスト

    テスト用のダミーFITSファイルを生成して、キャッシュ機能を検証します。
    """

    @pytest.fixture
    def design_files(self, tmp_path):
        """テスト用のダミーFITSファイルを生成"""
        design_dir = tmp_path / "designs"
        design_dir.mkdir()

        # 複数のダミーファイルを作成
        files_info = [
            {
                "id": "1234567890abcdef",
                "name": "Test Design 1",
                "ra": 180.0,
                "dec": 45.0,
                "arms": "brn",
                "num_fibers": 100,
            },
            {
                "id": "abcdef1234567890",
                "name": "Test Design 2",
                "ra": 90.0,
                "dec": -30.0,
                "arms": "bm",
                "num_fibers": 50,
            },
            {
                "id": "fedcba0987654321",
                "name": "Science Target",
                "ra": 270.0,
                "dec": 0.0,
                "arms": "bmn",
                "num_fibers": 200,
            },
        ]

        for info in files_info:
            filepath = design_dir / f"pfsDesign-0x{info['id']}.fits"
            create_dummy_pfs_design(
                filepath,
                design_id=info["id"],
                name=info["name"],
                ra=info["ra"],
                dec=info["dec"],
                arms=info["arms"],
                num_fibers=info["num_fibers"],
            )

        return design_dir, files_info

    def test_sync_with_real_fits(self, tmp_path, design_files):
        """実際のFITSファイルを使った同期テスト"""
        design_dir, files_info = design_files
        cache_dir = tmp_path / "cache"
        db_path = cache_dir / "test.db"

        cache = PfsDesignCache(db_path, design_dir)
        result = cache.sync()

        assert result is True

        entries = cache.get_all_entries()
        assert len(entries) == len(files_info)

        # エントリの内容を確認
        entries_by_id = {e["id"]: e for e in entries}

        for info in files_info:
            entry = entries_by_id[info["id"]]
            assert entry["name"] == info["name"]
            assert entry["ra"] == info["ra"]
            assert entry["dec"] == info["dec"]
            assert entry["arms"] == info["arms"]
            assert entry["num_design_rows"] == info["num_fibers"]
            # Photometry rows = num_fibers * 5 (5 filters)
            assert entry["num_photometry_rows"] == info["num_fibers"] * 5
            # GuideStars = 6 (fixed in create_dummy_pfs_design)
            assert entry["num_guidestar_rows"] == 6

    def test_sync_incremental_update(self, tmp_path, design_files):
        """増分更新のテスト（新規ファイル追加）"""
        design_dir, files_info = design_files
        cache_dir = tmp_path / "cache"
        db_path = cache_dir / "test.db"

        cache = PfsDesignCache(db_path, design_dir)

        # 初回同期
        cache.sync()
        entries = cache.get_all_entries()
        assert len(entries) == 3

        # 新しいファイルを追加
        new_filepath = design_dir / "pfsDesign-0x0000000000000001.fits"
        create_dummy_pfs_design(
            new_filepath,
            design_id="0000000000000001",
            name="New Design",
            ra=0.0,
            dec=0.0,
            arms="n",
            num_fibers=10,
        )

        # 2回目の同期
        cache.sync()
        entries = cache.get_all_entries()
        assert len(entries) == 4

        # 新しいファイルが含まれていることを確認
        ids = {e["id"] for e in entries}
        assert "0000000000000001" in ids

    def test_sync_handles_deleted_files(self, tmp_path, design_files):
        """削除されたファイルの処理テスト"""
        design_dir, files_info = design_files
        cache_dir = tmp_path / "cache"
        db_path = cache_dir / "test.db"

        cache = PfsDesignCache(db_path, design_dir)

        # 初回同期
        cache.sync()
        entries = cache.get_all_entries()
        assert len(entries) == 3

        # ファイルを1つ削除
        deleted_id = files_info[0]["id"]
        (design_dir / f"pfsDesign-0x{deleted_id}.fits").unlink()

        # 2回目の同期
        cache.sync()
        entries = cache.get_all_entries()
        assert len(entries) == 2

        # 削除されたファイルが含まれていないことを確認
        ids = {e["id"] for e in entries}
        assert deleted_id not in ids

    def test_target_type_counts(self, tmp_path):
        """ターゲットタイプ別カウントのテスト"""
        design_dir = tmp_path / "designs"
        design_dir.mkdir()
        cache_dir = tmp_path / "cache"
        db_path = cache_dir / "test.db"

        # num_fibers=100 の場合:
        # - science (50): index 0-49
        # - sky (25): index 50-74
        # - fluxstd (25): index 75-99
        filepath = design_dir / "pfsDesign-0x1234567890abcdef.fits"
        create_dummy_pfs_design(filepath, num_fibers=100)

        cache = PfsDesignCache(db_path, design_dir)
        cache.sync()

        entries = cache.get_all_entries()
        assert len(entries) == 1

        entry = entries[0]
        design_rows = entry["design_rows"]

        assert design_rows["science"] == 50
        assert design_rows["sky"] == 25
        assert design_rows["fluxstd"] == 25
        assert design_rows["unassigned"] == 0
        assert design_rows["engineering"] == 0
        assert design_rows["sunss_imaging"] == 0
        assert design_rows["sunss_diffuse"] == 0
