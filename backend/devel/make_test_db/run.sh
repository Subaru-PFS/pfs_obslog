#!/bin/bash
# テスト用DBの完全セットアップと移行を実行するスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== テスト用DB セットアップ開始 ==="
echo ""

# Step 1: PostgreSQLのセットアップ
bash "$SCRIPT_DIR/setup_test_db.sh"

echo ""
echo "=== データ移行開始 ==="
echo ""

# Step 2: データ移行
cd "$SCRIPT_DIR"
uv run python migrate_data.py

echo ""
echo "=== 完了 ==="
echo ""
echo "テスト用DBに接続: psql -p 15432 opdb"
