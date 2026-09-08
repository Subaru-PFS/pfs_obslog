# バックエンド開発ガイド

## 概要

- **フレームワーク:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Python バージョン:** 3.13
- **パッケージ管理:** uv

## パッケージ構造

```
backend/
├── src/
│   └── pfs_obslog/    # メインパッケージ
│       ├── main.py
│       ├── models.py
│       ├── auth/      # 認証関連
│       └── routers/   # APIルーター
├── tests/             # テストディレクトリ
└── devel/             # 開発ツール
```

- `import pfs_obslog.module` でモジュールをインポート可能
- `__init__.py` なしでもインポート可能（implicit namespace packages）

## データベース接続情報

### 本番DB

```bash
psql -h 133.40.164.48 -U pfs opdb
```

認証情報は `~/.pgpass` を参照してください。

### 実環境DBに接続して開発用バックエンドを起動

開発用バックエンド（`make dev`）の接続先は、デフォルトではローカルのテストDBです。実環境DBに接続して起動する場合は、起動時に接続URLを環境変数で指定します。

```bash
cd backend
PFS_OBSLOG_database_url=postgresql://pfs@133.40.164.48/opdb make dev
```

`~/.pgpass` に実環境DBの認証情報を登録しておいてください。QAデータも実環境から取得する場合は、`PFS_OBSLOG_qadb_url` も指定します。

```bash
PFS_OBSLOG_database_url=postgresql://pfs@133.40.164.48/opdb \
PFS_OBSLOG_qadb_url=postgresql://pfs@<実環境QADBホスト>:<ポート>/qadb \
make dev
```

実環境DBに対して書き込みを行う可能性があるため、通常の開発・テストではローカルのテストDBを使用してください。

### テスト用DB（開発用）

```bash
# 接続
psql -p 15432 opdb

# 起動
pg_ctl -D ~/pgdata_for_pfs_obslog_test -l ~/pgdata_for_pfs_obslog_test/logfile start

# 停止
pg_ctl -D ~/pgdata_for_pfs_obslog_test stop
```

**接続情報:**
- Host: localhost
- Port: 15432
- Database: opdb
- User: pfs（trust認証）

### テスト用DBの再作成

```bash
cd backend/devel/make_test_db
./run.sh
```

## 開発コマンド

```bash
cd backend

# 依存関係のインストール（開発用パッケージ含む）
# pfs-datamodel と pfs-utils も external/ から自動インストールされる
uv sync --all-extras

# 開発サーバーの起動
uv run uvicorn pfs_obslog.main:app --reload --port 8000

# テストの実行
uv run pytest

# カバレッジ付きテスト
uv run pytest --cov=pfs_obslog --cov-report=html
```

## SQLAlchemyモデルの自動生成

DBスキーマからSQLAlchemy 2.0スタイルのモデルを自動生成できます。

```bash
cd backend

# テスト用DBからモデルを生成
uv run python devel/generate_models.py --env test

# 本番DBからモデルを生成
uv run python devel/generate_models.py --env production
```

詳細は [backend/devel/generate_models.md](../backend/devel/generate_models.md) を参照。
