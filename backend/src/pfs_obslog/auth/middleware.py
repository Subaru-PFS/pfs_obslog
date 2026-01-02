"""認証ミドルウェア

デフォルトで全てのAPIエンドポイントに認証を要求するミドルウェアを提供します。
特定のパス（ログイン、ヘルスチェック、静的ファイルなど）は認証をスキップします。
"""

import re
from collections.abc import Awaitable, Callable
from typing import Sequence

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from pfs_obslog.auth.session import SESSION_USER_KEY


# 認証をスキップするパスのパターン
DEFAULT_PUBLIC_PATTERNS: list[str] = [
    # 認証関連
    r"^/api/auth/login$",
    r"^/api/auth/status$",
    r"^/api/auth/logout$",
    r"^/api/auth/me$",  # ルーターレベルで認証を処理
    # ヘルスチェック
    r"^/api/healthz$",
    r"^/api/readyz$",
    # APIドキュメント
    r"^/api/docs",
    r"^/api/redoc",
    r"^/api/openapi\.json$",
    # 添付ファイルダウンロード（メモに貼られた画像等を表示するため）
    r"^/api/attachments/[^/]+/\d+$",
    # 静的ファイル（productionモード）
    r"^(?!/api/).*$",  # /api/ 以外の全てのパス（静的ファイル、index.htmlなど）
]


class AuthMiddleware(BaseHTTPMiddleware):
    """認証ミドルウェア

    デフォルトで全てのAPIエンドポイントに認証を要求します。
    public_patterns に指定したパスは認証をスキップします。

    Args:
        app: ASGI アプリケーション
        public_patterns: 認証をスキップするパスのパターン（正規表現）
    """

    def __init__(
        self,
        app: ASGIApp,
        public_patterns: Sequence[str] | None = None,
    ):
        super().__init__(app)
        patterns = public_patterns if public_patterns is not None else DEFAULT_PUBLIC_PATTERNS
        self._public_patterns = [re.compile(p) for p in patterns]

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """リクエストを処理"""
        # 認証をスキップするパスかチェック
        path = request.url.path
        if self._is_public_path(path):
            return await call_next(request)

        # セッションからユーザーIDを取得
        user_id = request.session.get(SESSION_USER_KEY)
        if user_id is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Not authenticated"},
            )

        return await call_next(request)

    def _is_public_path(self, path: str) -> bool:
        """認証不要のパスかどうかを判定"""
        return any(pattern.match(path) for pattern in self._public_patterns)
