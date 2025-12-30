#!/bin/bash
# テスト用PostgreSQL DBをセットアップして起動するスクリプト

set -e

PGDATA="${HOME}/pgdata_for_pfs_obslog_test"
PGPORT=15432
DBNAME="opdb"
SOURCE_HOST="133.40.164.48"
SOURCE_USER="pfs"

echo "=== テスト用PostgreSQL セットアップ ==="

# 既存のプロセスを停止
if pg_ctl -D "$PGDATA" status > /dev/null 2>&1; then
    echo "既存のPostgreSQLを停止中..."
    pg_ctl -D "$PGDATA" stop
fi

# データディレクトリが存在する場合は削除
if [ -d "$PGDATA" ]; then
    echo "既存のデータディレクトリを削除中..."
    rm -rf "$PGDATA"
fi

# initdb
echo "データディレクトリを初期化中..."
initdb -D "$PGDATA"

# ポート設定
echo "port = $PGPORT" >> "$PGDATA/postgresql.conf"

# 起動
echo "PostgreSQLを起動中..."
pg_ctl -D "$PGDATA" -l "$PGDATA/logfile" start

# DB作成待機
sleep 2

# DB作成
echo "データベース '$DBNAME' を作成中..."
createdb -p "$PGPORT" "$DBNAME"

# スキーマダンプ
echo "本番DBからスキーマをダンプ中..."
pg_dump -h "$SOURCE_HOST" -U "$SOURCE_USER" "$DBNAME" --schema-only -f /tmp/opdb_schema.sql

# スキーマ適用
echo "スキーマを適用中..."
psql -p "$PGPORT" "$DBNAME" -f /tmp/opdb_schema.sql 2>&1 | grep -v "role .* does not exist" || true

echo ""
echo "=== セットアップ完了 ==="
echo "接続: psql -p $PGPORT $DBNAME"
echo "データディレクトリ: $PGDATA"
