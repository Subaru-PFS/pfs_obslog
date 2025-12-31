#!/bin/bash
# プロダクション環境用エントリーポイント
#
# Usage:
#   ./entrypoint.bash           # サーバー起動
#   ./entrypoint.bash --setup   # 初期セットアップのみ実行
#
# Environment Variables:
#   BIND_ADDRESS            - バインドアドレス (例: 0.0.0.0:5000)
#   PFS_OBSLOG_app_env      - アプリケーション環境 (development/production)
#   PFS_OBSLOG_database_url - データベース接続URL

set -eu

cd "$(dirname "$0")/.."

# オプション解析
only_setup=
while [[ $# -gt 0 ]]; do
  case $1 in
  --setup)
    only_setup=yes
    shift
    ;;
  *)
    echo "Unknown argument: $1" 1>&2
    exit 1
    ;;
  esac
done

# PYTHONPATHにexternal（pfs.datamodel, pfs.utils）を追加
export PYTHONPATH="${PWD}/../external/pfs-datamodel/python:${PWD}/../external/pfs_utils/python:${PYTHONPATH:-}"

# シークレットキーファイルの設定
secrets_dir="${PWD}/secrets"
secret_key_file="${secrets_dir}/session_secret_key"

mkdir -p "$secrets_dir"
if [ ! -f "$secret_key_file" ]; then
  echo "Generating session secret key..."
  openssl rand -hex 64 > "$secret_key_file"
  chmod 600 "$secret_key_file"
fi

# シークレットキーを環境変数に設定（ファイルから読み込み）
export PFS_OBSLOG_session_secret_key=$(cat "$secret_key_file")

# 添付ファイルディレクトリを作成
attachments_dir="${PFS_OBSLOG_attachments_dir:-${PWD}/attachments}"
mkdir -p "$attachments_dir"
export PFS_OBSLOG_attachments_dir="$attachments_dir"

# ログディレクトリを作成
logs_dir="${PWD}/../logs"
mkdir -p "$logs_dir"

# セットアップのみの場合はここで終了
if [ "$only_setup" == "yes" ]; then
  echo "Setup complete."
  exit 0
fi

# サーバー起動
BIND_ADDRESS="${BIND_ADDRESS:?BIND_ADDRESS is required}"
HOST=$(echo "$BIND_ADDRESS" | cut -d: -f1)
PORT=$(echo "$BIND_ADDRESS" | cut -d: -f2)

# アプリケーション環境に応じてサーバーを選択
app_env="${PFS_OBSLOG_app_env:-production}"

if [ "$app_env" = "development" ]; then
  echo "Starting development server..."
  exec uv run uvicorn pfs_obslog.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --reload
else
  echo "Starting production server (gunicorn)..."
  exec uv run gunicorn pfs_obslog.main:app \
    --workers 8 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "$BIND_ADDRESS" \
    --access-logfile "${logs_dir}/access.log" \
    --error-logfile "${logs_dir}/error.log"
fi
