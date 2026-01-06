#!/usr/bin/env python3
"""
本番QADBからテスト用QADBにデータを移行するスクリプト
テスト用opdbに存在するvisit_idのデータのみを抽出
"""

import os
import psycopg2
from psycopg2 import sql
from typing import NamedTuple


def parse_pgpass() -> dict[str, str]:
    """~/.pgpassから接続情報を読み取る"""
    pgpass_path = os.path.expanduser("~/.pgpass")
    entries = {}
    with open(pgpass_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(":")
            if len(parts) >= 5:
                host, port, dbname, user, password = parts[:5]
                key = f"{host}:{port}:{dbname}:{user}"
                entries[key] = password
    return entries


def get_password(host: str, port: str, dbname: str, user: str) -> str | None:
    """pgpassからパスワードを取得"""
    entries = parse_pgpass()
    # 完全一致
    key = f"{host}:{port}:{dbname}:{user}"
    if key in entries:
        return entries[key]
    # ワイルドカード対応
    key = f"{host}:*:{dbname}:{user}"
    if key in entries:
        return entries[key]
    return None


# DB設定
SOURCE_QADB_HOST = "pfsa-db.subaru.nao.ac.jp"
SOURCE_QADB_PORT = 5436

TARGET_PORT = 15432


def get_source_qadb_connection():
    """本番QADB接続を取得"""
    return psycopg2.connect(
        host=SOURCE_QADB_HOST,
        port=SOURCE_QADB_PORT,
        dbname="qadb",
        user="pfs",
        password=get_password(SOURCE_QADB_HOST, str(SOURCE_QADB_PORT), "qadb", "pfs"),
    )


def get_target_qadb_connection():
    """テスト用QADB接続を取得"""
    return psycopg2.connect(
        host="localhost",
        port=TARGET_PORT,
        dbname="qadb",
        user="pfs",
    )


def get_target_opdb_connection():
    """テスト用opdb接続を取得（visit_id一覧取得用）"""
    return psycopg2.connect(
        host="localhost",
        port=TARGET_PORT,
        dbname="opdb",
        user="pfs",
    )


def get_visit_ids_from_opdb() -> set[int]:
    """テスト用opdbからvisit_id一覧を取得"""
    with get_target_opdb_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT pfs_visit_id FROM pfs_visit")
            return {row[0] for row in cur.fetchall()}


class TableInfo(NamedTuple):
    name: str
    has_pfs_visit_id: bool  # pfs_visit_idカラムがあるか
    has_visit_id: bool  # visit_idカラムがあるか
    row_count: int


def get_table_info(conn) -> list[TableInfo]:
    """テーブル情報を取得"""
    tables = []
    with conn.cursor() as cur:
        # テーブル一覧を取得
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        table_names = [row[0] for row in cur.fetchall()]

        for table_name in table_names:
            # pfs_visit_idカラムがあるか確認
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                  AND table_name = %s
                  AND column_name = 'pfs_visit_id'
                """,
                [table_name],
            )
            has_pfs_visit_id = cur.fetchone() is not None

            # visit_idカラムがあるか確認
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                  AND table_name = %s
                  AND column_name = 'visit_id'
                """,
                [table_name],
            )
            has_visit_id = cur.fetchone() is not None

            # 行数を取得
            cur.execute(
                sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name))
            )
            row_count = cur.fetchone()[0]

            tables.append(TableInfo(table_name, has_pfs_visit_id, has_visit_id, row_count))

    return tables


def get_columns(conn, table_name: str) -> list[str]:
    """テーブルのカラム一覧を取得"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            [table_name],
        )
        return [row[0] for row in cur.fetchall()]


def migrate_table(
    source_conn, target_conn, table_name: str, visit_ids: set[int], 
    has_pfs_visit_id: bool, has_visit_id: bool
) -> int:
    """テーブルのデータを移行"""
    columns = get_columns(source_conn, table_name)
    if not columns:
        return 0

    col_names = sql.SQL(", ").join(sql.Identifier(c) for c in columns)
    placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in columns)

    with source_conn.cursor() as src_cur:
        if has_pfs_visit_id and visit_ids:
            # pfs_visit_idでフィルタリング
            src_cur.execute(
                sql.SQL("SELECT {} FROM {} WHERE pfs_visit_id = ANY(%s)").format(
                    col_names, sql.Identifier(table_name)
                ),
                [list(visit_ids)],
            )
        elif has_visit_id and visit_ids:
            # visit_idでフィルタリング
            src_cur.execute(
                sql.SQL("SELECT {} FROM {} WHERE visit_id = ANY(%s)").format(
                    col_names, sql.Identifier(table_name)
                ),
                [list(visit_ids)],
            )
        else:
            # 全データ取得（alembic_versionなど）
            src_cur.execute(
                sql.SQL("SELECT {} FROM {}").format(col_names, sql.Identifier(table_name))
            )

        rows = src_cur.fetchall()

    if not rows:
        return 0

    insert_query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table_name), col_names, placeholders
    )

    inserted = 0
    with target_conn.cursor() as tgt_cur:
        for row in rows:
            try:
                tgt_cur.execute(insert_query, row)
                inserted += 1
            except psycopg2.errors.UniqueViolation:
                target_conn.rollback()
                continue
            except psycopg2.errors.ForeignKeyViolation:
                target_conn.rollback()
                continue

    target_conn.commit()
    return inserted


def main():
    print("=== QADB データ移行 ===\n")

    # テスト用opdbからvisit_id一覧を取得
    print("テスト用opdbからvisit_id一覧を取得中...")
    visit_ids = get_visit_ids_from_opdb()
    print(f"  取得したvisit_id数: {len(visit_ids)}")
    print()

    # 本番QADBに接続
    print("本番QADBに接続中...")
    source_conn = get_source_qadb_connection()

    # テスト用QADBに接続
    print("テスト用QADBに接続中...")
    target_conn = get_target_qadb_connection()

    # テーブル情報を取得
    print("テーブル情報を取得中...")
    tables = get_table_info(source_conn)
    print()

    # pfs_visitテーブルを最初に移行（外部キー依存のため）
    pfs_visit_tables = [t for t in tables if t.name == "pfs_visit"]
    other_tables = [t for t in tables if t.name != "pfs_visit"]
    ordered_tables = pfs_visit_tables + other_tables

    # 各テーブルを移行
    print("データ移行中:")
    for table in ordered_tables:
        # alembic_versionはスキップ（スキーマダンプで既に存在）
        if table.name == "alembic_version":
            continue

        count = migrate_table(
            source_conn, target_conn, table.name, visit_ids, 
            table.has_pfs_visit_id, table.has_visit_id
        )
        
        filter_col = None
        if table.has_pfs_visit_id:
            filter_col = "pfs_visit_id"
        elif table.has_visit_id:
            filter_col = "visit_id"
        
        if filter_col:
            status = f"({table.row_count} -> {count}, filtered by {filter_col})"
        else:
            status = f"({count})"
        print(f"  {table.name}: {status}")

    source_conn.close()
    target_conn.close()

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
