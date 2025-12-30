#!/usr/bin/env python3
"""
本番DBからテスト用DBにデータを移行するスクリプト
各テーブルから新しいレコードの5%または最大1000件を抽出
"""

import os
import psycopg2
from psycopg2 import sql
from typing import NamedTuple
from dataclasses import dataclass


@dataclass
class DBConfig:
    host: str
    port: int
    dbname: str
    user: str
    password: str | None = None


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
SOURCE_DB = DBConfig(
    host="133.40.164.48",
    port=5432,
    dbname="opdb",
    user="pfs",
    password=get_password("133.40.164.48", "*", "opdb", "pfs"),
)

TARGET_DB = DBConfig(
    host="localhost",
    port=15432,
    dbname="opdb",
    user="pfs",
)


class TableInfo(NamedTuple):
    name: str
    row_count: int
    primary_keys: list[str]
    order_column: str | None  # ORDER BYに使用するカラム


def get_connection(config: DBConfig):
    """DB接続を取得"""
    return psycopg2.connect(
        host=config.host,
        port=config.port,
        dbname=config.dbname,
        user=config.user,
        password=config.password,
    )


def get_table_info(conn) -> list[TableInfo]:
    """テーブル情報を取得"""
    with conn.cursor() as cur:
        # テーブル一覧と行数を取得
        cur.execute("""
            SELECT 
                t.table_name,
                (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as approx_row_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = {row[0]: row[1] for row in cur.fetchall()}

        # 主キー情報を取得
        cur.execute("""
            SELECT
                kcu.table_name,
                kcu.column_name,
                kcu.ordinal_position
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' 
                AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.table_name, kcu.ordinal_position
        """)
        primary_keys: dict[str, list[str]] = {}
        for table_name, column_name, _ in cur.fetchall():
            if table_name not in primary_keys:
                primary_keys[table_name] = []
            primary_keys[table_name].append(column_name)

        # 各テーブルのカラム情報を取得（ORDER BY用）
        order_columns: dict[str, str | None] = {}
        for table_name in tables:
            cur.execute(
                sql.SQL("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = %s AND table_schema = 'public'
                    ORDER BY ordinal_position
                """),
                [table_name],
            )
            columns = cur.fetchall()

            # ORDER BY用のカラムを決定（新しいレコードを取得するため）
            order_col = None
            for col_name, data_type in columns:
                # 優先順位: created_at > id系 > 主キー
                if col_name in ("created_at", "created", "timestamp"):
                    order_col = col_name
                    break
            if order_col is None:
                # 主キーの最初のカラムを使用
                pks = primary_keys.get(table_name, [])
                if pks:
                    order_col = pks[0]
            order_columns[table_name] = order_col

        return [
            TableInfo(
                name=name,
                row_count=int(count) if count else 0,
                primary_keys=primary_keys.get(name, []),
                order_column=order_columns.get(name),
            )
            for name, count in tables.items()
        ]


def get_foreign_key_dependencies(conn) -> dict[str, list[str]]:
    """外部キー依存関係を取得 (table -> [依存先テーブル])"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT
                cl.relname AS table_name,
                ref.relname AS referenced_table
            FROM pg_constraint con
            JOIN pg_class cl ON con.conrelid = cl.oid
            JOIN pg_class ref ON con.confrelid = ref.oid
            WHERE con.contype = 'f'
        """)
        deps: dict[str, list[str]] = {}
        for table_name, referenced_table in cur.fetchall():
            if table_name not in deps:
                deps[table_name] = []
            deps[table_name].append(referenced_table)
        return deps


def topological_sort(tables: list[str], deps: dict[str, list[str]]) -> list[str]:
    """トポロジカルソートでテーブルの挿入順序を決定"""
    result = []
    visited = set()
    temp_visited = set()

    def visit(table: str):
        if table in temp_visited:
            # 循環依存を検出した場合はスキップ
            return
        if table in visited:
            return
        temp_visited.add(table)
        for dep in deps.get(table, []):
            if dep in [t for t in tables]:
                visit(dep)
        temp_visited.remove(table)
        visited.add(table)
        result.append(table)

    for table in tables:
        if table not in visited:
            visit(table)

    return result


def calculate_limit(row_count: int) -> int:
    """抽出件数を計算（5%または最大1000件）"""
    if row_count == 0:
        return 0
    limit = max(1, int(row_count * 0.05))
    return min(limit, 1000)


def migrate_table(
    source_conn,
    target_conn,
    table: TableInfo,
    collected_keys: dict[str, set],
    deps: dict[str, list[str]],
):
    """テーブルデータを移行"""
    limit = calculate_limit(table.row_count)
    if limit == 0:
        print(f"  {table.name}: 空テーブルをスキップ")
        return

    # 依存先のキーでフィルタリングが必要か確認
    table_deps = deps.get(table.name, [])

    with source_conn.cursor() as src_cur:
        # カラム一覧を取得
        src_cur.execute(
            sql.SQL("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s AND table_schema = 'public'
                ORDER BY ordinal_position
            """),
            [table.name],
        )
        columns = [row[0] for row in src_cur.fetchall()]

        # 外部キー制約の詳細を取得
        src_cur.execute(
            """
            SELECT
                a.attname as column_name,
                ref.relname as referenced_table,
                ref_a.attname as referenced_column
            FROM pg_constraint con
            JOIN pg_class cl ON con.conrelid = cl.oid
            JOIN pg_class ref ON con.confrelid = ref.oid
            JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ANY(con.conkey)
            JOIN pg_attribute ref_a ON ref_a.attrelid = ref.oid AND ref_a.attnum = ANY(con.confkey)
            WHERE con.contype = 'f' AND cl.relname = %s
        """,
            [table.name],
        )
        fk_constraints = src_cur.fetchall()

        # WHERE句を構築（依存先テーブルのキーでフィルタ）
        where_conditions = []
        for col, ref_table, ref_col in fk_constraints:
            if ref_table in collected_keys and collected_keys[ref_table]:
                keys = collected_keys[ref_table]
                # 大量のキーがある場合はIN句を使用
                if len(keys) <= 10000:
                    placeholders = ",".join(["%s"] * len(keys))
                    where_conditions.append((col, list(keys), placeholders))

        # クエリ構築
        order_clause = ""
        if table.order_column:
            order_clause = f"ORDER BY {table.order_column} DESC"

        if where_conditions:
            # 依存先のキーでフィルタリング
            where_parts = []
            params = []
            for col, keys, placeholders in where_conditions:
                where_parts.append(f'"{col}" IN ({placeholders})')
                params.extend(keys)

            query = f"""
                SELECT * FROM "{table.name}"
                WHERE {' AND '.join(where_parts)}
                {order_clause}
                LIMIT {limit}
            """
            src_cur.execute(query, params)
        else:
            # フィルタなし
            query = f"""
                SELECT * FROM "{table.name}"
                {order_clause}
                LIMIT {limit}
            """
            src_cur.execute(query)

        rows = src_cur.fetchall()

        if not rows:
            print(f"  {table.name}: データなし")
            return

        # 主キーの値を記録
        if table.primary_keys:
            pk_indices = [columns.index(pk) for pk in table.primary_keys if pk in columns]
            if len(pk_indices) == 1:
                # 単一主キーの場合
                if table.name not in collected_keys:
                    collected_keys[table.name] = set()
                for row in rows:
                    collected_keys[table.name].add(row[pk_indices[0]])

        # ターゲットDBに挿入
        with target_conn.cursor() as tgt_cur:
            col_names = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))
            insert_query = f'INSERT INTO "{table.name}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

            for row in rows:
                try:
                    tgt_cur.execute(insert_query, row)
                except Exception as e:
                    print(f"    警告: {table.name}への挿入エラー: {e}")
                    target_conn.rollback()
                    continue

        target_conn.commit()
        print(f"  {table.name}: {len(rows)}件を移行")


def main():
    print("=== テスト用DBへのデータ移行 ===\n")

    # 接続
    print("接続中...")
    source_conn = get_connection(SOURCE_DB)
    target_conn = get_connection(TARGET_DB)

    try:
        # テーブル情報を取得
        print("テーブル情報を取得中...")
        tables = get_table_info(source_conn)
        deps = get_foreign_key_dependencies(source_conn)

        # 依存関係に基づいてソート
        table_names = [t.name for t in tables]
        sorted_names = topological_sort(table_names, deps)
        tables_dict = {t.name: t for t in tables}

        print(f"\n{len(tables)}テーブルを処理します\n")

        # 収集したキーを保持
        collected_keys: dict[str, set] = {}

        # データ移行
        for name in sorted_names:
            table = tables_dict[name]
            migrate_table(source_conn, target_conn, table, collected_keys, deps)

        print("\n=== 移行完了 ===")

    finally:
        source_conn.close()
        target_conn.close()


if __name__ == "__main__":
    main()
