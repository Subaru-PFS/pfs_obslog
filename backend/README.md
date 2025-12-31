# PFS Obslog Backend

## セットアップ

```bash
cd backend
uv sync --all-extras
```

`pfs-datamodel` と `pfs-utils` は `pyproject.toml` の `[tool.uv.sources]` で
`external/` ディレクトリから自動的にインストールされます。

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
