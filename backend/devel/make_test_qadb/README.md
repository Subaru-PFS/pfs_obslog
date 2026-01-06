# テスト用QADB作成

本番のQADBから開発用ローカルDBにデータをコピーするスクリプトです。

## 概要

このスクリプトは以下を行います：

1. ローカルPostgreSQLの既存テスト用インスタンス（ポート15432）にqadbデータベースを作成
2. 本番QADBからスキーマをダンプ・適用
3. opdbのテスト用データに対応するvisit_idのデータのみをインポート

## 前提条件

- `make_test_db` が実行済みで、ローカルPostgreSQLが起動していること
- `~/.pgpass` に本番QADBの接続情報が設定されていること

```
pfsa-db.subaru.nao.ac.jp:5436:qadb:pfs:パスワード
```

## 使用方法

```bash
cd backend/devel/make_test_qadb
./run.sh
```

## 接続情報

```bash
# 接続
psql -p 15432 qadb
```

- Host: localhost
- Port: 15432
- Database: qadb
- User: pfs（trust認証）
