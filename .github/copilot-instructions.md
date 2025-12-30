# pfs-obslog2 開発ガイド

## プロジェクト概要

このプロジェクトは既存のpfs-obslogプロジェクト（`./old-project/codebase`が既存プロジェクトへのリンク）のリファクタリングです。

### 技術スタック

**Backend:**
- FastAPI
- SQLAlchemy

**Frontend:**
- React
- TypeScript
- Vite
- RTK Query
- React Router
- typed-scss-modules

## データベース接続情報

### 本番DB

```bash
psql -h 133.40.164.48 -U pfs opdb
```

認証情報は `~/.pgpass` を参照してください。

### テスト用DB

テスト用DBは開発マシンのローカルで実行されます。

```bash
# 接続
psql -p 15432 opdb

# データディレクトリ
~/pgdata_for_pfs_obslog_test

# 起動
pg_ctl -D ~/pgdata_for_pfs_obslog_test -l ~/pgdata_for_pfs_obslog_test/logfile start

# 停止
pg_ctl -D ~/pgdata_for_pfs_obslog_test stop
```

**接続情報:**
- Host: localhost
- Port: 15432
- Database: opdb
- User: pfs（ローカルはtrust認証のためパスワード不要）

### テスト用DBの再作成

テスト用DBを最初から作り直す場合:

```bash
cd backend/devel/make_test_db
./run.sh
```

このスクリプトは:
1. 既存のテスト用PostgreSQLを停止・削除
2. 新しいPostgreSQLクラスタを初期化
3. 本番DBからスキーマをコピー
4. 本番DBから各テーブルの新しいレコードの5%（最大1000件）をインポート

## 開発環境

### Python環境

このプロジェクトは `uv` でPython環境を管理しています。Python 3.13を使用。

```bash
# パッケージのインストール
cd backend/devel/make_test_db
uv sync

# スクリプトの実行
uv run python migrate_data.py
```

### バックエンドの開発

```bash
cd backend

# 依存関係のインストール（開発用パッケージ含む）
uv sync --all-extras

# テストの実行
uv run pytest

# カバレッジ付きテスト
uv run pytest --cov=pfs_obslog --cov-report=html
```

**パッケージ構造:**
- `backend/src/pfs_obslog/` - メインパッケージ
- `backend/tests/` - テストディレクトリ
- `import pfs_obslog.module` でモジュールをインポート可能
- `__init__.py` なしでもインポート可能（implicit namespace packages）

### SQLAlchemyモデルの自動生成

DBスキーマからSQLAlchemy 2.0スタイルのモデルを自動生成できます。

```bash
cd backend

# テスト用DBからモデルを生成
uv run python devel/generate_models.py --env test

# 本番DBからモデルを生成
uv run python devel/generate_models.py --env production
```

詳細は [backend/devel/generate_models.md](backend/devel/generate_models.md) を参照してください。

### フロントエンドの開発

フロントエンドの開発については [frontend/README.md](frontend/README.md) を参照してください。

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# テストの実行
npm run test

# SCSSモジュールの型生成
npm run scss:types

# SCSSの型を監視モードで生成（開発中に使用）
npm run scss:watch
```

**重要:** SCSSファイルを追加・変更した場合は、必ず `npm run scss:types` を実行して型ファイルを再生成してください。

## このドキュメントについて

このドキュメント（`.github/copilot-instructions.md`）は、開発環境や手順が変更された場合は随時更新してください。

## 作業について

ひとまとまりの作業が完了したらその作業についてのgit commitを行ってください。