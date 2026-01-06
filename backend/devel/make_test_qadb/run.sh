#!/bin/bash
# テスト用QADB セットアップスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== テスト用QADB セットアップ開始 ==="
echo ""

# Step 1: DBとスキーマのセットアップ
bash "$SCRIPT_DIR/setup_qadb.sh"

echo ""
echo "=== データ移行開始 ==="
echo ""

# Step 2: データ移行
cd "$SCRIPT_DIR"
uv run python migrate_qadb.py

echo ""
echo "=== 完了 ==="
echo ""
echo "テスト用QADBに接続: psql -p 15432 qadb"
