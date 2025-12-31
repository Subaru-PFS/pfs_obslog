.PHONY: dev production setup test test-all cov typecheck openapi-for-frontend clean help

# 開発サーバーを起動
dev:
	PFS_OBSLOG_session_secret_key='???' \
	uv run uvicorn pfs_obslog.main:app --reload --host 0.0.0.0 --port 8000

# プロダクションサーバーを起動
production:
	BIND_ADDRESS=0.0.0.0:5000 \
	PFS_OBSLOG_app_env=production \
	PFS_OBSLOG_database_url=postgresql://pfs@133.40.164.48/opdb \
	bash scripts/entrypoint.bash

# 初期セットアップ（シークレットキー生成など）
setup:
	bash scripts/entrypoint.bash --setup

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
	@echo "  make clean            - 一時ファイルを削除"
