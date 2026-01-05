.PHONY: dev production setup test test-all cov typecheck openapi-for-frontend logs logs-follow clean help

# 開発サーバーを起動
dev:
	PFS_OBSLOG_session_secret_key='???' \
	uv run uvicorn pfs_obslog.main:app --reload --host 0.0.0.0 --port 8000

# プロダクションサーバーを起動
production: setup
	@echo "Starting production server..."
	@HOST=$$(echo "$${BIND_ADDRESS:?BIND_ADDRESS is required}" | cut -d: -f1); \
	PORT=$$(echo "$$BIND_ADDRESS" | cut -d: -f2); \
	export PFS_OBSLOG_session_secret_key=$$(cat secrets/session_secret_key); \
	export PFS_OBSLOG_attachments_dir=$${PFS_OBSLOG_attachments_dir:-$${PWD}/attachments}; \
	uv run gunicorn pfs_obslog.main:app \
		--workers 8 \
		--worker-class uvicorn.workers.UvicornWorker \
		--bind "$$BIND_ADDRESS" \
		--access-logfile ../logs/access.log \
		--error-logfile ../logs/error.log

# 初期セットアップ（シークレットキー生成、ディレクトリ作成）
setup:
	@echo "Running initial setup..."
	@mkdir -p secrets attachments ../logs
	@if [ ! -f secrets/session_secret_key ]; then \
		echo "Generating session secret key..."; \
		openssl rand -hex 64 > secrets/session_secret_key; \
		chmod 600 secrets/session_secret_key; \
	fi
	@echo "Setup complete."

# テストを実行（遅いテストをスキップ）
test:
	uv run pytest -m "not slow"

# 全テストを実行（遅いテスト含む）
test-all:
	uv run pytest

# 型チェック（pyright）
typecheck:
	uv run pyright src/

# カバレッジ付きテスト（HTML レポート生成）
cov:
	uv run pytest -m "not slow" --cov=pfs_obslog --cov-branch --cov-report=term-missing --cov-report=html

# フロントエンド用にOpenAPIスキーマを出力（フロントエンドから呼ばれる）
openapi-for-frontend:
	@uv run python -c "import json; from pfs_obslog.main import app; print(json.dumps(app.openapi(), indent=2))"

# ログを表示（systemdサービスのログ）
logs:
	@echo "Displaying logs for pfs-obslog2 service..."
	journalctl _UID=$$(id -u) -u pfs-obslog2 -n 100 --no-pager

# ログをフォロー（リアルタイム）
logs-follow:
	@echo "Following logs for pfs-obslog2 service (Ctrl+C to exit)..."
	journalctl _UID=$$(id -u) -u pfs-obslog2 -f

# クリーンアップ
clean:
	rm -rf __pycache__ .pytest_cache .coverage htmlcov
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# ヘルプ
help:
	@echo "使用可能なコマンド:"
	@echo "  make dev              - 開発サーバーを起動"
	@echo "  make production       - プロダクションサーバーを起動"
	@echo "  make setup            - 初期セットアップ（シークレットキー生成など）"
	@echo "  make test             - テストを実行（遅いテストをスキップ）"
	@echo "  make test-all         - 全テストを実行（遅いテスト含む）"
	@echo "  make cov              - カバレッジ付きテスト（HTMLレポート生成）"
	@echo "  make typecheck        - 型チェック（pyright）"
	@echo "  make openapi-for-frontend - フロントエンド用にOpenAPIスキーマを出力"
	@echo "  make logs             - サービスログを表示（最新100行）"
	@echo "  make logs-follow      - サービスログをリアルタイムで表示"
	@echo "  make clean            - 一時ファイルを削除"
