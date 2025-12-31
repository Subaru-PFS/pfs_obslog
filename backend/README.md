# PFS Obslog Backend

## セットアップ

```bash
cd backend
uv sync --all-extras

# PFS datamodel と pfs_utils のインストール（external/ からのサブモジュール）
uv pip install -e ../external/pfs-datamodel
uv pip install --no-deps -e ../external/pfs_utils
```

## 開発

### テストの実行

```bash
uv run pytest
```

### カバレッジ付きテスト

```bash
uv run pytest --cov=pfs_obslog --cov-report=html
```

## パッケージ構造

```
backend/
├── src/
│   └── pfs_obslog/    # メインパッケージ
│       └── module.py
├── tests/             # テストディレクトリ
│   └── test_module.py
└── pyproject.toml
```

`import pfs_obslog.module` でモジュールをインポートできます。
