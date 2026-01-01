"""認証API エンドポイント

ログイン、ログアウト、ユーザー情報取得のAPIを提供します。
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pfs_obslog import models as M
from pfs_obslog.auth.ldap_auth import authorize
from pfs_obslog.auth.session import (
    CurrentUser,
    RequireUser,
    clear_user,
    set_user,
)
from pfs_obslog.database import get_db

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


class AuthUser(BaseModel):
    """認証ユーザー情報"""

    id: int
    account_name: str


class AuthStatusResponse(BaseModel):
    """認証状態レスポンス"""

    authenticated: bool
    user: AuthUser | None = None


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


@router.get("/status", response_model=AuthStatusResponse)
async def get_status(
    user_id: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AuthStatusResponse:
    """認証状態を取得

    ログイン中かどうかを確認できます。認証は必要ありません。
    ログイン中の場合は、ユーザーの詳細情報（id, account_name）も返します。
    """
    if user_id:
        # ユーザー情報を取得
        result = await db.execute(
            select(M.ObslogUser).where(M.ObslogUser.account_name == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return AuthStatusResponse(
                authenticated=True,
                user=AuthUser(id=user.id, account_name=user.account_name),
            )
    return AuthStatusResponse(authenticated=False, user=None)
