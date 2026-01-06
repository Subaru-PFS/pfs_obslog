#!/bin/bash
# テスト用QADB をセットアップするスクリプト
# 既存のテスト用PostgreSQL（ポート15432）にqadbデータベースを作成

set -e

PGPORT=15432
DBNAME="qadb"
SOURCE_HOST="pfsa-db.subaru.nao.ac.jp"
SOURCE_PORT=5436
SOURCE_USER="pfs"

echo "=== テスト用QADB セットアップ ==="

# PostgreSQLが起動しているか確認
if ! pg_isready -p "$PGPORT" -q; then
    echo "エラー: ポート${PGPORT}でPostgreSQLが起動していません"
    echo "先に make_test_db/run.sh を実行してください"
    exit 1
fi

# 既存のqadbを削除（存在する場合）
if psql -p "$PGPORT" -lqt | cut -d \| -f 1 | grep -qw "$DBNAME"; then
    echo "既存のqadbを削除中..."
    dropdb -p "$PGPORT" "$DBNAME"
fi

# DB作成
echo "データベース '$DBNAME' を作成中..."
createdb -p "$PGPORT" "$DBNAME"

# スキーマダンプ
echo "本番QADBからスキーマをダンプ中..."
pg_dump -h "$SOURCE_HOST" -p "$SOURCE_PORT" -U "$SOURCE_USER" "$DBNAME" --schema-only -f /tmp/qadb_schema.sql

# スキーマ適用
echo "スキーマを適用中..."
psql -p "$PGPORT" "$DBNAME" -f /tmp/qadb_schema.sql 2>&1 | grep -v "role .* does not exist" || true

echo ""
echo "=== スキーマセットアップ完了 ==="
echo "接続: psql -p $PGPORT $DBNAME"
