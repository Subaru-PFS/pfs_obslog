バックエンドに認証の仕組みを導入してください。

ユーザー名とパスワードによる認証は
`old-project/codebase/backend/src/pfs_obslog/userauth_secret.py`
を参照してください。

httpセッションの方法は既存のプロジェクトから刷新してください。

`from starlette.middleware.sessions import SessionMiddleware`

によってクッキーセッションが使えるようになります。
これを使い、セッションクッキー(ブラウザを閉じると消えるクッキー)にユーザーIDを保存するようにしてください。

`backend/docs/session.md`に仕組みを簡単にメモしてください。

ログイン・ログアウト・ログイン中のユーザーの情報を取得するAPIエンドポイントを実装してください。

テストも作成してください。
