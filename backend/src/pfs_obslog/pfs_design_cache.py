"""PFS Design メタデータキャッシュ

PFS Design FITSファイルのメタデータをSQLiteにキャッシュし、
一覧取得を高速化します。
"""

import datetime
import os
import re
import sqlite3
import threading
import time
from contextlib import contextmanager
from logging import getLogger
from pathlib import Path
from typing import Generator, Optional

logger = getLogger(__name__)

# FITSファイル名のパターン
DESIGN_FILE_PATTERN = re.compile(r"^pfsDesign-0x([0-9a-fA-F]{16})\.fits$")


def _pick_id(filename: str) -> str:
    """ファイル名からDesign IDを抽出

    例: 'pfsDesign-0x1234567890abcdef.fits' -> '1234567890abcdef'
    """
    match = DESIGN_FILE_PATTERN.match(filename)
    if match:
        return match.group(1).lower()
    return ""


class PfsDesignCache:
    """PFS Design メタデータのSQLiteキャッシュ

    FITSファイルのメタデータをSQLiteにキャッシュし、
    一覧取得を高速化します。

    キャッシュ更新はファイルのmtimeベースで差分更新され、
    二重起動を防ぐためのロック機構を持ちます。
    """

    # SQLiteスキーマ
    SCHEMA = """
    CREATE TABLE IF NOT EXISTS pfs_design_metadata (
        id TEXT PRIMARY KEY,
        frameid TEXT NOT NULL,
        name TEXT,
        file_mtime REAL NOT NULL,
        ra REAL,
        dec REAL,
        x REAL,
        y REAL,
        z REAL,
        arms TEXT,
        num_design_rows INTEGER,
        num_photometry_rows INTEGER,
        num_guidestar_rows INTEGER,
        science_count INTEGER,
        sky_count INTEGER,
        fluxstd_count INTEGER,
        unassigned_count INTEGER,
        engineering_count INTEGER,
        sunss_imaging_count INTEGER,
        sunss_diffuse_count INTEGER,
        cached_at REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pfs_design_mtime ON pfs_design_metadata(file_mtime);
    """

    def __init__(self, db_path: Path, design_dir: Path):
        """
        Args:
            db_path: SQLiteデータベースファイルのパス
            design_dir: PFS DesignファイルのFITSファイルがあるディレクトリ
        """
        self.db_path = db_path
        self.design_dir = design_dir
        self._sync_lock = threading.Lock()
        self._syncing = False
        self._init_db()

    def _init_db(self) -> None:
        """データベースを初期化"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        try:
            conn.executescript(self.SCHEMA)
            # マイグレーション：x, y, zカラムがなければ追加
            self._migrate_add_xyz_columns(conn)
        finally:
            conn.close()

    def _migrate_add_xyz_columns(self, conn: sqlite3.Connection) -> None:
        """x, y, zカラムを追加するマイグレーション

        既存のDBにx, y, zカラムがない場合に追加します。
        既にカラムが存在する場合は何もしません。
        """
        cursor = conn.execute("PRAGMA table_info(pfs_design_metadata)")
        columns = {row[1] for row in cursor.fetchall()}

        if "x" not in columns:
            logger.info("Migrating: Adding x, y, z columns to pfs_design_metadata")
            # カラムを追加
            conn.execute("ALTER TABLE pfs_design_metadata ADD COLUMN x REAL")
            conn.execute("ALTER TABLE pfs_design_metadata ADD COLUMN y REAL")
            conn.execute("ALTER TABLE pfs_design_metadata ADD COLUMN z REAL")
            # 既存データにx, y, zを計算して設定（ra, decが0の場合もあるので注意）
            conn.execute(
                """
                UPDATE pfs_design_metadata
                SET x = cos(dec * 3.141592653589793 / 180) * cos(ra * 3.141592653589793 / 180),
                    y = cos(dec * 3.141592653589793 / 180) * sin(ra * 3.141592653589793 / 180),
                    z = sin(dec * 3.141592653589793 / 180)
                """
            )
            conn.commit()
            logger.info("Migration complete: x, y, z columns added")

    @contextmanager
    def _get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """データベース接続を取得（コンテキストマネージャー）"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def get_all_entries(self) -> list[dict]:
        """キャッシュから全エントリを取得

        キャッシュが空またはディレクトリが存在しない場合は空リストを返します。

        Returns:
            Design エントリのリスト（辞書形式）
        """
        if not self.design_dir.exists():
            return []

        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, frameid, name, file_mtime, ra, dec, x, y, z, arms,
                       num_design_rows, num_photometry_rows, num_guidestar_rows,
                       science_count, sky_count, fluxstd_count,
                       unassigned_count, engineering_count,
                       sunss_imaging_count, sunss_diffuse_count
                FROM pfs_design_metadata
                ORDER BY file_mtime DESC
                """
            )
            rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "frameid": row["frameid"],
                "name": row["name"] or "",
                "date_modified": datetime.datetime.fromtimestamp(row["file_mtime"]),
                "ra": row["ra"] or 0.0,
                "dec": row["dec"] or 0.0,
                "x": row["x"],
                "y": row["y"],
                "z": row["z"],
                "arms": row["arms"] or "-",
                "num_design_rows": row["num_design_rows"] or 0,
                "num_photometry_rows": row["num_photometry_rows"] or 0,
                "num_guidestar_rows": row["num_guidestar_rows"] or 0,
                "design_rows": {
                    "science": row["science_count"] or 0,
                    "sky": row["sky_count"] or 0,
                    "fluxstd": row["fluxstd_count"] or 0,
                    "unassigned": row["unassigned_count"] or 0,
                    "engineering": row["engineering_count"] or 0,
                    "sunss_imaging": row["sunss_imaging_count"] or 0,
                    "sunss_diffuse": row["sunss_diffuse_count"] or 0,
                },
            }
            for row in rows
        ]

    def get_entries_paginated(
        self,
        search: str | None = None,
        sort_by: str = "date_modified",
        sort_order: str = "desc",
        offset: int = 0,
        limit: int = 50,
        zenith_ra: float | None = None,
        zenith_dec: float | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> tuple[list[dict], int]:
        """ページネーション、フィルタリング、ソート対応でエントリを取得

        Args:
            search: 検索文字列（name または id に部分一致）
            sort_by: ソートキー（"date_modified", "name", "id", "altitude"）
            sort_order: ソート順序（"asc", "desc"）
            offset: 取得開始位置
            limit: 取得件数
            zenith_ra: 天頂のRA（度）- 高度ソート時に必要
            zenith_dec: 天頂のDec（度）- 高度ソート時に必要
            date_from: 日付範囲開始（YYYY-MM-DD形式）
            date_to: 日付範囲終了（YYYY-MM-DD形式）

        Returns:
            (エントリリスト, 総件数) のタプル
        """
        if not self.design_dir.exists():
            return [], 0

        import math

        # 天頂の単位ベクトルを計算（高度ソート用）
        zenith_x: float | None = None
        zenith_y: float | None = None
        zenith_z: float | None = None
        if sort_by == "altitude" and zenith_ra is not None and zenith_dec is not None:
            ra_rad = math.radians(zenith_ra)
            dec_rad = math.radians(zenith_dec)
            zenith_x = math.cos(dec_rad) * math.cos(ra_rad)
            zenith_y = math.cos(dec_rad) * math.sin(ra_rad)
            zenith_z = math.sin(dec_rad)

        # SQLクエリの構築
        select_columns = """id, frameid, name, file_mtime, ra, dec, x, y, z, arms,
                   num_design_rows, num_photometry_rows, num_guidestar_rows,
                   science_count, sky_count, fluxstd_count,
                   unassigned_count, engineering_count,
                   sunss_imaging_count, sunss_diffuse_count"""

        base_query = f"""
            SELECT {select_columns}
            FROM pfs_design_metadata
        """
        count_query = "SELECT COUNT(*) FROM pfs_design_metadata"
        where_clauses: list[str] = []
        params: list = []

        # 検索条件
        if search:
            where_clauses.append("(name LIKE ? OR id LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        # 日付フィルター
        if date_from:
            where_clauses.append("date(file_mtime) >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("date(file_mtime) <= ?")
            params.append(date_to)

        # WHERE句を追加
        if where_clauses:
            where_clause = " WHERE " + " AND ".join(where_clauses)
            base_query += where_clause
            count_query += where_clause

        # WHERE句のパラメータ数を記録（ソートパラメータ追加前）
        count_params = params.copy()

        # ソート
        sort_dir = "ASC" if sort_order.lower() == "asc" else "DESC"
        if sort_by == "altitude" and zenith_x is not None:
            # 高度はcos(角距離) = 内積で計算
            # コサインが大きいほど天頂に近い（descで高度順）
            base_query += f" ORDER BY (x * ? + y * ? + z * ?) {sort_dir}"
            params.extend([zenith_x, zenith_y, zenith_z])
        else:
            sort_column_map = {
                "date_modified": "file_mtime",
                "name": "name",
                "id": "id",
            }
            sort_column = sort_column_map.get(sort_by, "file_mtime")
            base_query += f" ORDER BY {sort_column} {sort_dir}"

        # ページネーション
        base_query += " LIMIT ? OFFSET ?"
        query_params = params + [limit, offset]

        with self._get_connection() as conn:
            # 総件数を取得（WHERE句のパラメータのみ使用）
            cursor = conn.execute(count_query, count_params)
            total = cursor.fetchone()[0]

            # データを取得
            cursor = conn.execute(base_query, query_params)
            rows = cursor.fetchall()

        entries = [
            {
                "id": row["id"],
                "frameid": row["frameid"],
                "name": row["name"] or "",
                "date_modified": datetime.datetime.fromtimestamp(row["file_mtime"]),
                "ra": row["ra"] or 0.0,
                "dec": row["dec"] or 0.0,
                "x": row["x"],
                "y": row["y"],
                "z": row["z"],
                "arms": row["arms"] or "-",
                "num_design_rows": row["num_design_rows"] or 0,
                "num_photometry_rows": row["num_photometry_rows"] or 0,
                "num_guidestar_rows": row["num_guidestar_rows"] or 0,
                "design_rows": {
                    "science": row["science_count"] or 0,
                    "sky": row["sky_count"] or 0,
                    "fluxstd": row["fluxstd_count"] or 0,
                    "unassigned": row["unassigned_count"] or 0,
                    "engineering": row["engineering_count"] or 0,
                    "sunss_imaging": row["sunss_imaging_count"] or 0,
                    "sunss_diffuse": row["sunss_diffuse_count"] or 0,
                },
            }
            for row in rows
        ]

        return entries, total

    def get_design_rank(
        self,
        design_id: str,
        search: str | None = None,
        sort_by: str = "date_modified",
        sort_order: str = "desc",
        zenith_ra: float | None = None,
        zenith_dec: float | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> int | None:
        """指定したDesign IDの順位（0始まり）を取得

        現在のフィルター・ソート条件での順位を返します。
        見つからない場合はNoneを返します。

        Args:
            design_id: Design ID（hex形式）
            search: 検索文字列
            sort_by: ソートキー
            sort_order: ソート順序
            zenith_ra: 天頂のRA（度）- 高度ソート時に必要
            zenith_dec: 天頂のDec（度）- 高度ソート時に必要
            date_from: 日付範囲開始（YYYY-MM-DD形式）
            date_to: 日付範囲終了（YYYY-MM-DD形式）

        Returns:
            順位（0始まり）またはNone
        """
        if not self.design_dir.exists():
            return None

        import math

        # 天頂の単位ベクトルを計算（高度ソート用）
        zenith_x: float | None = None
        zenith_y: float | None = None
        zenith_z: float | None = None
        if sort_by == "altitude" and zenith_ra is not None and zenith_dec is not None:
            ra_rad = math.radians(zenith_ra)
            dec_rad = math.radians(zenith_dec)
            zenith_x = math.cos(dec_rad) * math.cos(ra_rad)
            zenith_y = math.cos(dec_rad) * math.sin(ra_rad)
            zenith_z = math.sin(dec_rad)

        # サブクエリでソート順を定義し、ROW_NUMBER相当を計算
        # SQLiteにはWINDOW関数があるのでROW_NUMBER()が使える
        select_columns = "id"
        base_query = f"""
            SELECT {select_columns}
            FROM pfs_design_metadata
        """
        where_clauses: list[str] = []
        params: list = []

        if search:
            where_clauses.append("(name LIKE ? OR id LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        if date_from:
            where_clauses.append("date(file_mtime) >= ?")
            params.append(date_from)

        if date_to:
            where_clauses.append("date(file_mtime) <= ?")
            params.append(date_to)

        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)

        # ソート
        sort_dir = "ASC" if sort_order.lower() == "asc" else "DESC"
        if sort_by == "altitude" and zenith_x is not None:
            base_query += f" ORDER BY (x * ? + y * ? + z * ?) {sort_dir}"
            params.extend([zenith_x, zenith_y, zenith_z])
        else:
            sort_column_map = {
                "date_modified": "file_mtime",
                "name": "name",
                "id": "id",
            }
            sort_column = sort_column_map.get(sort_by, "file_mtime")
            base_query += f" ORDER BY {sort_column} {sort_dir}"

        with self._get_connection() as conn:
            cursor = conn.execute(base_query, params)
            rows = cursor.fetchall()

        # 順位を検索
        for i, row in enumerate(rows):
            if row["id"] == design_id:
                return i

        return None

    def get_all_positions(self) -> list[dict]:
        """全Designの位置情報を取得（軽量版）

        Returns:
            位置情報（id, ra, dec）のリスト
        """
        if not self.design_dir.exists():
            return []

        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, ra, dec
                FROM pfs_design_metadata
                """
            )
            rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "ra": row["ra"] or 0.0,
                "dec": row["dec"] or 0.0,
            }
            for row in rows
        ]

    def get_positions_filtered(
        self,
        search: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[dict]:
        """フィルター条件に合うDesignの位置情報を取得

        Args:
            search: 検索文字列（name または id に部分一致）
            date_from: 日付範囲開始（YYYY-MM-DD形式）
            date_to: 日付範囲終了（YYYY-MM-DD形式）

        Returns:
            位置情報（id, ra, dec）のリスト
        """
        if not self.design_dir.exists():
            return []

        query = "SELECT id, ra, dec FROM pfs_design_metadata"
        where_clauses: list[str] = []
        params: list = []

        if search:
            where_clauses.append("(name LIKE ? OR id LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        if date_from:
            where_clauses.append("date(file_mtime) >= ?")
            params.append(date_from)

        if date_to:
            where_clauses.append("date(file_mtime) <= ?")
            params.append(date_to)

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "ra": row["ra"] or 0.0,
                "dec": row["dec"] or 0.0,
            }
            for row in rows
        ]

    def sync(self) -> bool:
        """ファイルシステムとデータベースを同期

        二重起動を防ぐためのロック機構があります。
        既に同期中の場合は何もせずFalseを返します。

        Returns:
            True: 同期を実行した
            False: 既に同期中のためスキップした
        """
        # 二重起動防止
        if not self._sync_lock.acquire(blocking=False):
            logger.debug("Sync already in progress, skipping")
            return False

        try:
            self._syncing = True
            self._do_sync()
            return True
        finally:
            self._syncing = False
            self._sync_lock.release()

    def is_syncing(self) -> bool:
        """同期中かどうか"""
        return self._syncing

    def _do_sync(self) -> None:
        """実際の同期処理"""
        if not self.design_dir.exists():
            logger.debug(f"Design directory does not exist: {self.design_dir}")
            return

        logger.info(f"Starting PFS Design cache sync for {self.design_dir}")
        start_time = time.time()

        # ファイル一覧を高速取得
        file_info: dict[str, tuple[str, float]] = {}  # id -> (filename, mtime)
        try:
            with os.scandir(self.design_dir) as entries:
                for entry in entries:
                    if entry.is_file():
                        match = DESIGN_FILE_PATTERN.match(entry.name)
                        if match:
                            design_id = match.group(1).lower()
                            mtime = entry.stat().st_mtime
                            file_info[design_id] = (entry.name, mtime)
        except OSError as e:
            logger.warning(f"Failed to scan design directory: {e}")
            return

        # 現在のキャッシュ状態を取得
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT id, file_mtime FROM pfs_design_metadata")
            cached_info = {row["id"]: row["file_mtime"] for row in cursor.fetchall()}

        # 更新・追加が必要なファイルを特定
        to_update: list[tuple[str, str, float]] = []  # (id, filename, mtime)
        for design_id, (filename, mtime) in file_info.items():
            cached_mtime = cached_info.get(design_id)
            if cached_mtime is None or abs(cached_mtime - mtime) > 0.001:
                to_update.append((design_id, filename, mtime))

        # 削除が必要なレコードを特定
        to_delete = set(cached_info.keys()) - set(file_info.keys())

        logger.info(
            f"Cache sync: {len(to_update)} to update, {len(to_delete)} to delete, "
            f"{len(file_info) - len(to_update)} up to date"
        )

        # 削除処理
        if to_delete:
            with self._get_connection() as conn:
                conn.executemany(
                    "DELETE FROM pfs_design_metadata WHERE id = ?",
                    [(id,) for id in to_delete],
                )
                conn.commit()

        # 更新処理（FITSファイル読み込み）
        for design_id, filename, mtime in to_update:
            try:
                self._update_entry(design_id, filename, mtime)
            except Exception as e:
                logger.warning(f"Failed to update cache for {filename}: {e}")

        elapsed = time.time() - start_time
        logger.info(f"PFS Design cache sync completed in {elapsed:.2f}s")

    def _update_entry(self, design_id: str, filename: str, mtime: float) -> None:
        """単一エントリをキャッシュに追加・更新"""
        import numpy

        try:
            import astropy.io.fits as afits
        except ImportError:
            logger.error("astropy is not installed")
            return

        filepath = self.design_dir / filename

        with afits.open(filepath) as hdul:
            # ヘッダーからメタデータ取得
            header = hdul[0].header  # type: ignore[union-attr]
            name = header.get("DSGN_NAM", "")
            ra = float(header.get("RA", 0.0))
            dec = float(header.get("DEC", 0.0))
            arms = header.get("ARMS", "-")

            # ra, decから単位ベクトルを計算（高度ソート用）
            ra_rad = numpy.radians(ra)
            dec_rad = numpy.radians(dec)
            x = float(numpy.cos(dec_rad) * numpy.cos(ra_rad))
            y = float(numpy.cos(dec_rad) * numpy.sin(ra_rad))
            z = float(numpy.sin(dec_rad))

            # 行数を取得
            num_design_rows = len(hdul[1].data) if hdul[1].data is not None else 0  # type: ignore[union-attr]
            num_photometry_rows = len(hdul[2].data) if hdul[2].data is not None else 0  # type: ignore[union-attr]
            num_guidestar_rows = len(hdul[3].data) if hdul[3].data is not None else 0  # type: ignore[union-attr]

            # ターゲットタイプ別カウント
            if hdul[1].data is not None:  # type: ignore[union-attr]
                target_types = numpy.clip(hdul[1].data.field("targetType"), 0, 8)  # type: ignore[union-attr]
                bc = numpy.bincount(target_types, minlength=8)
                science_count = int(bc[1])
                sky_count = int(bc[2])
                fluxstd_count = int(bc[3])
                unassigned_count = int(bc[4])
                engineering_count = int(bc[5])
                sunss_imaging_count = int(bc[6])
                sunss_diffuse_count = int(bc[7])
            else:
                science_count = sky_count = fluxstd_count = 0
                unassigned_count = engineering_count = 0
                sunss_imaging_count = sunss_diffuse_count = 0

        # データベースに保存
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO pfs_design_metadata (
                    id, frameid, name, file_mtime, ra, dec, x, y, z, arms,
                    num_design_rows, num_photometry_rows, num_guidestar_rows,
                    science_count, sky_count, fluxstd_count,
                    unassigned_count, engineering_count,
                    sunss_imaging_count, sunss_diffuse_count,
                    cached_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    design_id,
                    filename,
                    name,
                    mtime,
                    ra,
                    dec,
                    x,
                    y,
                    z,
                    arms,
                    num_design_rows,
                    num_photometry_rows,
                    num_guidestar_rows,
                    science_count,
                    sky_count,
                    fluxstd_count,
                    unassigned_count,
                    engineering_count,
                    sunss_imaging_count,
                    sunss_diffuse_count,
                    time.time(),
                ),
            )
            conn.commit()


# シングルトンインスタンス管理
_cache_instance: Optional[PfsDesignCache] = None
_cache_lock = threading.Lock()


def get_pfs_design_cache(db_path: Path, design_dir: Path) -> PfsDesignCache:
    """PfsDesignCacheのシングルトンインスタンスを取得

    Args:
        db_path: SQLiteデータベースファイルのパス
        design_dir: PFS DesignファイルのFITSファイルがあるディレクトリ

    Returns:
        PfsDesignCacheインスタンス
    """
    global _cache_instance
    with _cache_lock:
        if _cache_instance is None:
            _cache_instance = PfsDesignCache(db_path, design_dir)
        return _cache_instance


def clear_pfs_design_cache() -> None:
    """シングルトンキャッシュインスタンスをクリア

    テスト用のヘルパー関数です。
    """
    global _cache_instance
    with _cache_lock:
        _cache_instance = None
