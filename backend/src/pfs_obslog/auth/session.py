"""セッション管理モジュール

Starletteのセッションミドルウェアを使用したセッション管理を提供します。
"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

# セッションに保存するキー
SESSION_USER_KEY = "user_id"


def get_current_user(request: Request) -> str | None:
    """現在のセッションからユーザーIDを取得する

    Args:
        request: FastAPIのリクエストオブジェクト

    Returns:
        ログイン中のユーザーID、未ログインの場合は None
    """
    return request.session.get(SESSION_USER_KEY)


def require_user(request: Request) -> str:
    """認証が必要なエンドポイント用の依存関係

    Args:
        request: FastAPIのリクエストオブジェクト

    Returns:
        ログイン中のユーザーID

    Raises:
        HTTPException: 未認証の場合は401エラー
    """
    user_id = get_current_user(request)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user_id


def set_user(request: Request, user_id: str) -> None:
    """セッションにユーザーIDを設定する

    Args:
        request: FastAPIのリクエストオブジェクト
        user_id: ユーザーID
    """
    request.session[SESSION_USER_KEY] = user_id


def clear_user(request: Request) -> None:
    """セッションからユーザーIDを削除する

    Args:
        request: FastAPIのリクエストオブジェクト
    """
    request.session.pop(SESSION_USER_KEY, None)


# 型アノテーション用のエイリアス
CurrentUser = Annotated[str | None, Depends(get_current_user)]
RequireUser = Annotated[str, Depends(require_user)]
