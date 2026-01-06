# モデル自動生成スクリプト

DBスキーマからSQLAlchemy 2.0スタイルのモデルを自動生成するスクリプトです。

## 使用方法

### テスト用DBからモデルを生成

```bash
cd backend
uv run python devel/generate_models.py --env test
```

### 本番DBからモデルを生成

```bash
cd backend
uv run python devel/generate_models.py --env production
```

※本番DBへの接続には `~/.pgpass` の設定が必要です。

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|----------|
| `--env` | 接続先環境 (`test` / `production`) | `test` |
| `--password` | DBパスワード（`~/.pgpass`を使わない場合） | - |
| `--output`, `-o` | 出力ファイルパス | `src/pfs_obslog/models.py` |
| `--schemas` | 対象スキーマ（複数指定可） | 全スキーマ |

## 出力例

```
Running: python -m sqlacodegen [db_url] --generator dataclasses --outfile src/pfs_obslog/models.py
Models generated successfully: src/pfs_obslog/models.py
Generated 54 model classes
```

## 生成されるモデルについて

- SQLAlchemy 2.0の`DeclarativeBase`スタイルで生成
- `Mapped[]`型アノテーション付き
- リレーションシップも自動生成

## DB接続情報

| 環境 | ホスト | ポート | データベース | ユーザー |
|------|--------|--------|-------------|---------|
| test | localhost | 15432 | opdb | pfs |
| production | 133.40.164.48 | 5432 | opdb | pfs |
