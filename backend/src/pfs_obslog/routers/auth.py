"""認証API エンドポイント

ログイン、ログアウト、ユーザー情報取得のAPIを提供します。
"""

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from pfs_obslog.auth.ldap_auth import authorize
from pfs_obslog.auth.session import (
    CurrentUser,
    RequireUser,
    clear_user,
    set_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """ログインリクエスト"""

    username: str
    password: str


class LoginResponse(BaseModel):
    """ログインレスポンス"""

    success: bool
    user_id: str | None = None
    message: str | None = None


class UserResponse(BaseModel):
    """ユーザー情報レスポンス"""

    user_id: str


class LogoutResponse(BaseModel):
    """ログアウトレスポンス"""

    success: bool
    message: str


@router.post("/login", response_model=LoginResponse)
async def login(request: Request, body: LoginRequest) -> LoginResponse:
    """ログイン

    ユーザー名とパスワードでLDAP認証を行い、成功した場合はセッションを作成します。
    """
    user_id = authorize(body.username, body.password)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    set_user(request, user_id)
    return LoginResponse(success=True, user_id=user_id)


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request) -> LogoutResponse:
    """ログアウト

    セッションからユーザー情報を削除します。
    """
    clear_user(request)
    return LogoutResponse(success=True, message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: RequireUser) -> UserResponse:
    """現在のユーザー情報を取得

    認証が必要なエンドポイントです。
    """
    return UserResponse(user_id=user_id)


@router.get("/status")
async def get_status(user_id: CurrentUser) -> dict:
    """認証状態を取得

    ログイン中かどうかを確認できます。認証は必要ありません。
    """
    if user_id:
        return {"authenticated": True, "user_id": user_id}
    return {"authenticated": False, "user_id": None}
