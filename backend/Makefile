.PHONY: dev test cov openapi-for-frontend clean help

# 開発サーバーを起動
dev:
	PFS_OBSLOG_session_secret_key='???' \
	uv run uvicorn pfs_obslog.main:app --reload --host 0.0.0.0 --port 8000

# テストを実行
test:
	uv run pytest

# カバレッジ付きテスト（HTML レポート生成）
cov:
	uv run pytest --cov=pfs_obslog --cov-branch --cov-report=term-missing --cov-report=html

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
	@echo "  make test             - テストを実行"
	@echo "  make cov              - カバレッジ付きテスト（HTMLレポート生成）"
	@echo "  make openapi-for-frontend - フロントエンド用にOpenAPIスキーマを出力"
	@echo "  make clean            - 一時ファイルを削除"
