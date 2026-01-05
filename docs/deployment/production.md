# プロダクション環境セットアップ

このドキュメントでは、PFS Obslog 2をプロダクション環境で実行するための手順を説明します。

## 概要

プロダクション環境では以下の構成で動作します：

- **Webサーバー:** Gunicorn + Uvicorn Worker（8プロセス）
- **プロセス管理:** systemd（ユーザーモード）
- **ポート:** 5000（デフォルト）

## 前提条件

- Python 3.13 以上
- uv（パッケージマネージャー）
- systemd が利用可能なLinux環境
- PostgreSQL（本番DB）への接続権限

## ディレクトリ構造

```
~/pfs-obslog2/
├── backend/
│   ├── Makefile                # ビルド・起動コマンド
│   ├── scripts/
│   │   └── pfs-obslog2.service # systemdサービスファイル
│   └── secrets/
│       └── session_secret_key  # 自動生成
├── frontend/
│   └── dist/                   # ビルド済みフロントエンド
├── logs/
│   ├── access.log              # アクセスログ
│   └── error.log               # エラーログ
└── external/
    ├── pfs-datamodel/
    └── pfs_utils/
```
```

## セットアップ手順

### 1. リポジトリのクローン

```bash
cd ~
git clone <repository-url> pfs-obslog2
cd pfs-obslog2
```

### 2. 外部依存関係のセットアップ

```bash
# pfs-datamodel
cd external/pfs-datamodel
git submodule update --init

# pfs_utils
cd ../pfs_utils
git submodule update --init
```

### 3. バックエンドのセットアップ

```bash
cd ~/pfs-obslog2/backend

# 依存関係のインストール
uv sync

# 初期セットアップ（シークレットキー生成など）
make setup
```

これにより以下が自動的に行われます：
- セッション用シークレットキーの生成（`secrets/session_secret_key`）
- 添付ファイルディレクトリの作成
- ログディレクトリの作成

### 4. フロントエンドのビルド

```bash
cd ~/pfs-obslog2/frontend

# 依存関係のインストール
npm install

# stellar-globeのビルド（初回のみ）
npm run build:stellar-globe

# 本番用ビルド
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### 5. 動作確認（手動起動）

```bash
cd ~/pfs-obslog2/backend

# プロダクションモードで起動
make production
```

ブラウザで `http://<hostname>:5000/obslog/` にアクセスして動作を確認します。

### 6. systemd サービスの設定

```bash
# サービスファイルをユーザーsystemdにリンク
mkdir -p ~/.config/systemd/user
ln -sf ~/pfs-obslog2/backend/scripts/pfs-obslog2.service ~/.config/systemd/user/

# systemdをリロード
systemctl --user daemon-reload

# サービスを起動
systemctl --user start pfs-obslog2

# 状態確認
systemctl --user status pfs-obslog2

# ログを確認（下記「ログ確認について」を参照）
journalctl _UID=$(id -u) -u pfs-obslog2 -f
```

### 7. 自動起動の設定

```bash
# ログイン時に自動起動を有効化
systemctl --user enable pfs-obslog2

# システム起動時にユーザーサービスを起動するために
# lingering を有効化（再起動後もサービスが動作）
loginctl enable-linger $USER
```

## サービス管理コマンド

```bash
# 起動
systemctl --user start pfs-obslog2

# 停止
systemctl --user stop pfs-obslog2

# 再起動
systemctl --user restart pfs-obslog2

# 状態確認
systemctl --user status pfs-obslog2

# ログ確認（下記「ログ確認について」を参照）
journalctl _UID=$(id -u) -u pfs-obslog2 -f

# アプリケーションログの直接確認
tail -f ~/pfs-obslog2/logs/access.log
tail -f ~/pfs-obslog2/logs/error.log
```

### ログ確認について

**注意:** 一部の環境では `journalctl --user` がログを表示しない場合があります。これは、ユーザー専用のジャーナルファイルが存在せず、すべてのログがシステムジャーナルに統合されているためです。

その場合は、ユーザーIDでフィルタリングする方法を使用してください：

```bash
# --user の代わりに _UID=$(id -u) を使用
journalctl _UID=$(id -u) -u pfs-obslog2 -f

# 最新100行を表示
journalctl _UID=$(id -u) -u pfs-obslog2 -n 100 --no-pager
```

## 設定のカスタマイズ

### 環境変数

systemdサービスファイル（`pfs-obslog2.service`）で以下の環境変数を設定できます：

| 環境変数 | デフォルト値 | 説明 |
|----------|-------------|------|
| `BIND_ADDRESS` | `0.0.0.0:5000` | バインドするアドレスとポート |
| `PFS_OBSLOG_app_env` | `production` | 環境（development/production） |
| `PFS_OBSLOG_database_url` | - | PostgreSQL接続URL |
| `PFS_OBSLOG_session_secret_key` | 自動生成 | セッション暗号化キー |

### サービスファイルの編集

```bash
# 直接編集する場合
vi ~/pfs-obslog2/backend/scripts/pfs-obslog2.service

# 編集後はリロードして再起動
systemctl --user daemon-reload
systemctl --user restart pfs-obslog2
```

### ワーカー数の調整

`backend/Makefile` の `production` ターゲット内の `--workers` オプションを変更します：

```makefile
# backend/Makefile
production: setup
	uv run gunicorn pfs_obslog.main:app \
		--workers 8 \  # ← ワーカー数を調整
		...
```

推奨値: `(CPUコア数 × 2) + 1`

## 開発環境と本番環境でのディレクトリ共有

同一ディレクトリで開発サーバーと本番サーバーを同時に動作させる場合、以下の点に注意してください。

### キャッシュディレクトリ

キャッシュディレクトリは `/tmp/$USER/obslog/cache` に配置され、ユーザーごとに自動的に分離されます。
同一ユーザーで開発・本番の両方を実行する場合、キャッシュが共有されますが、これは問題ありません（読み取り専用キャッシュのため）。

### ログディレクトリ

ログは `~/pfs-obslog2/logs/` に保存されます。開発サーバーと本番サーバーで同じログファイルに書き込むため、
区別したい場合は環境変数でログファイルのパスを変更してください：

```bash
# 開発用
uv run gunicorn ... \
  --access-logfile ../logs/dev-access.log \
  --error-logfile ../logs/dev-error.log
```

### セッションシークレットキー

`backend/secrets/session_secret_key` は開発・本番で共有されます。
これは問題ありませんが、セキュリティを強化したい場合は環境変数で分けることができます：

```bash
# 本番用の別のキー
export PFS_OBSLOG_session_secret_key=$(cat ~/pfs-obslog2-prod-secret)
```

### ポートの衝突

開発サーバー（デフォルト: 8000）と本番サーバー（デフォルト: 5000）は異なるポートを使用するため、
デフォルト設定のまま同時に起動できます。

### 依存関係の管理

`uv sync` でインストールされる依存関係は `.venv/` に保存され、開発・本番で共有されます。
これは通常問題ありませんが、異なるバージョンの依存関係が必要な場合は、別のディレクトリにクローンしてください。

## Webサーバー（Nginx）との連携

本番環境では、Nginx をリバースプロキシとして使用することを推奨します。

### Nginx 設定例

```nginx
upstream obslog_backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name obslog.example.com;

    # フロントエンド静的ファイル
    location /obslog/ {
        alias /home/pfs/pfs-obslog2/frontend/dist/;
        try_files $uri $uri/ /obslog/index.html;
    }

    # バックエンドAPI
    location /obslog/api/ {
        proxy_pass http://obslog_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## トラブルシューティング

### サービスが起動しない

```bash
# 詳細なログを確認
journalctl _UID=$(id -u) -u pfs-obslog2 -n 100 --no-pager

# 手動で起動してエラーを確認
cd ~/pfs-obslog2/backend
make production
```

### データベース接続エラー

```bash
# 接続テスト
psql -h 133.40.164.48 -U pfs opdb -c "SELECT 1"

# ~/.pgpass の確認
cat ~/.pgpass
chmod 600 ~/.pgpass
```

### ポートが使用中

```bash
# 使用中のポートを確認
ss -tlnp | grep 5000

# 別プロセスを終了するか、ポートを変更
```

## 既存プロジェクトからの移行

既存の pfs-obslog（旧プロジェクト）から移行する場合：

1. 旧サービスを停止
   ```bash
   systemctl --user stop pfs-obslog
   ```

2. 新サービスを起動
   ```bash
   systemctl --user start pfs-obslog2
   ```

3. 動作確認後、旧サービスの自動起動を無効化
   ```bash
   systemctl --user disable pfs-obslog
   ```

## 関連ドキュメント

- [バックエンド開発ガイド](../copilot/backend.md)
- [フロントエンド開発ガイド](../copilot/frontend.md)
- [README](../README.md)
