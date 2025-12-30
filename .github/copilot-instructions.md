# pfs-obslog2 開発ガイド

## プロジェクト概要

このプロジェクトは既存のpfs-obslogプロジェクト（`./old-project`へのリンク）のリファクタリングです。

### 技術スタック

**Backend:**
- FastAPI
- SQLAlchemy

**Frontend:**
- SolidJS

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
