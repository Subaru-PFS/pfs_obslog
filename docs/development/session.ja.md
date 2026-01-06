# セッション管理

## 概要

このシステムでは、Starletteの`SessionMiddleware`を使用したクッキーベースのセッション管理を採用しています。
また、デフォルトで全てのAPIエンドポイントに認証を要求する`AuthMiddleware`を使用しています。

## 認証フロー

```
リクエスト → SessionMiddleware → AuthMiddleware → ルーター → レスポンス
```

1. **SessionMiddleware**: クッキーからセッションデータを読み取り、`request.session`にセット
2. **AuthMiddleware**: `request.session`をチェックし、未認証なら401を返す（公開パスは除く）
3. **ルーター**: 認証済みのリクエストを処理

## 仕組み

### セッションクッキー

- **ミドルウェア**: `starlette.middleware.sessions.SessionMiddleware`
- **クッキー名**: `session`
- **有効期限**: `max_age=None`（セッションクッキー）
  - ブラウザを閉じるとクッキーが削除される
- **SameSite**: `lax`（CSRF対策）

### 認証ミドルウェア

認証ミドルウェア（`AuthMiddleware`）は、デフォルトで全てのAPIエンドポイントに認証を要求します。
以下のパスは例外として認証なしでアクセスできます：

| パスパターン | 説明 |
|------------|------|
| `/api/auth/login` | ログインエンドポイント |
| `/api/auth/logout` | ログアウトエンドポイント |
| `/api/auth/status` | 認証状態確認 |
| `/api/auth/me` | ユーザー情報取得（ルーターレベルで認証） |
| `/api/healthz` | ヘルスチェック |
| `/api/readyz` | レディネスチェック |
| `/api/docs*` | Swagger UIドキュメント |
| `/api/redoc*` | ReDocドキュメント |
| `/api/openapi.json` | OpenAPIスキーマ |
| `/api/attachments/{user}/{id}` | 添付ファイルダウンロード |
| 静的ファイル（`/api/`以外） | フロントエンドの静的ファイル |

**注意**: 新しいAPIエンドポイントを追加した場合、デフォルトで認証が必要になります。
公開エンドポイントにする場合は、`backend/src/pfs_obslog/auth/middleware.py`の`DEFAULT_PUBLIC_PATTERNS`に追加してください。

### セッションデータ

セッションデータは署名付きクッキーとして保存されます：

1. セッションデータはJSON形式でシリアライズ
2. `itsdangerous`ライブラリで署名（改ざん検出）
3. Base64エンコードしてクッキーに保存

**注意**: セッションデータは暗号化されていません。機密情報（パスワードなど）をセッションに保存しないでください。

### 秘密鍵

セッションの署名に使用する秘密鍵は：

- 環境変数`SESSION_SECRET_KEY`から取得
- 未設定の場合はランダムに生成（開発環境用）

**本番環境では必ず固定の秘密鍵を設定してください。**

```bash
export SESSION_SECRET_KEY="your-secret-key-here"
```

## APIエンドポイント

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|--------|-----|------|
| `/auth/login` | POST | 不要 | ログイン |
| `/auth/logout` | POST | 不要 | ログアウト |
| `/auth/me` | GET | 必要 | 現在のユーザー情報取得 |
| `/auth/status` | GET | 不要 | 認証状態確認 |

## 使用例

### 認証が必要なエンドポイントの作成

```python
from pfs_obslog.auth.session import RequireUser

@router.get("/protected")
async def protected_endpoint(user_id: RequireUser):
    # user_id にはログイン中のユーザーIDが入る
    return {"message": f"Hello, {user_id}"}
```

### 認証がオプションのエンドポイント

```python
from pfs_obslog.auth.session import CurrentUser

@router.get("/optional")
async def optional_endpoint(user_id: CurrentUser):
    # user_id はログイン中ならユーザーID、未ログインならNone
    if user_id:
        return {"message": f"Hello, {user_id}"}
    return {"message": "Hello, guest"}
```
