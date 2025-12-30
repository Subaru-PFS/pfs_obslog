# セッション管理

## 概要

このシステムでは、Starletteの`SessionMiddleware`を使用したクッキーベースのセッション管理を採用しています。

## 仕組み

### セッションクッキー

- **ミドルウェア**: `starlette.middleware.sessions.SessionMiddleware`
- **クッキー名**: `session`
- **有効期限**: `max_age=None`（セッションクッキー）
  - ブラウザを閉じるとクッキーが削除される
- **SameSite**: `lax`（CSRF対策）

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
