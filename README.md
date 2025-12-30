# PFS Obslog 2

PFS観測ログシステムのリファクタリングプロジェクトです。

## 技術スタック

**Backend:** FastAPI, SQLAlchemy  
**Frontend:** React, TypeScript, Vite, RTK Query, React Router

## 開発環境のセットアップ

### 前提条件

- Python 3.13 + [uv](https://github.com/astral-sh/uv)
- Node.js + npm
- PostgreSQL

### 1. 開発用DBのセットアップ

開発用DB（テスト用DB）は、本番DBからスキーマとサンプルデータをコピーしたローカルPostgreSQLインスタンスです。本番環境に影響を与えずに開発・テストを行うために使用します。

```bash
cd backend/devel/make_test_db
./run.sh
```

このスクリプトは以下を実行します：
1. 既存のテスト用PostgreSQLを停止・削除
2. 新しいPostgreSQLクラスタを初期化
3. 本番DBからスキーマをコピー
4. 本番DBから各テーブルの新しいレコードの5%（最大1000件）をインポート

詳細は [backend/devel/make_test_db/README.md](backend/devel/make_test_db/README.md) を参照してください。

#### 開発用DBへの接続

```bash
# 接続
psql -p 15432 opdb

# データディレクトリ
~/pgdata_for_pfs_obslog_test

# 起動（停止している場合）
pg_ctl -D ~/pgdata_for_pfs_obslog_test -l ~/pgdata_for_pfs_obslog_test/logfile start

# 停止
pg_ctl -D ~/pgdata_for_pfs_obslog_test stop
```

**接続情報:**
- Host: localhost
- Port: 15432
- Database: opdb
- User: pfs（ローカルはtrust認証のためパスワード不要）

### 2. バックエンドのセットアップ

```bash
cd backend
uv sync --all-extras
```

詳細は [backend/README.md](backend/README.md) を参照してください。

### 3. フロントエンドのセットアップ

```bash
cd frontend
npm install
```

詳細は [frontend/README.md](frontend/README.md) を参照してください。

## 開発サーバーの起動

開発サーバーはローカルマシンで動作するサーバーで、コード変更時に自動でリロードされます。

### バックエンド開発サーバー

```bash
cd backend
make dev
```

アクセス: http://localhost:8000

- API ドキュメント: http://localhost:8000/docs
- OpenAPI スキーマ: http://localhost:8000/openapi.json

### フロントエンド開発サーバー

```bash
cd frontend
npm run dev
```

アクセス: http://localhost:5173

## テストの実行

### バックエンド

```bash
cd backend
make test
```

### フロントエンド

```bash
cd frontend
npm run test
```

## ドキュメント

- [バックエンド詳細](backend/README.md)
- [フロントエンド詳細](frontend/README.md)
- [テスト用DB作成](backend/devel/make_test_db/README.md)
- [SQLAlchemyモデル自動生成](backend/devel/generate_models.md)
