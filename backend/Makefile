.PHONY: dev test openapi clean

# 開発サーバーを起動
dev:
	uv run uvicorn pfs_obslog.main:app --reload --host 0.0.0.0 --port 8000

# テストを実行
test:
	uv run pytest

# OpenAPIスキーマをJSON形式で出力
openapi:
	uv run python -c "import json; from pfs_obslog.main import app; print(json.dumps(app.openapi(), indent=2))"

# OpenAPIスキーマをファイルに保存
openapi-json:
	uv run python -c "import json; from pfs_obslog.main import app; print(json.dumps(app.openapi(), indent=2))" > openapi.json

# フロントエンド用にOpenAPIスキーマを出力（フロントエンドから呼ばれる）
openapi-for-frontend:
	@uv run python -c "import json; from pfs_obslog.main import app; print(json.dumps(app.openapi(), indent=2))"

# クリーンアップ
clean:
	rm -rf __pycache__ .pytest_cache .coverage htmlcov openapi.json
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# ヘルプ
help:
	@echo "使用可能なコマンド:"
	@echo "  make dev              - 開発サーバーを起動"
	@echo "  make test             - テストを実行"
	@echo "  make openapi          - OpenAPIスキーマを標準出力に表示"
	@echo "  make openapi-json     - OpenAPIスキーマをopenapi.jsonに保存"
	@echo "  make openapi-for-frontend - フロントエンド用にOpenAPIスキーマを出力"
	@echo "  make clean            - 一時ファイルを削除"
