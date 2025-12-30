"""PFS Obslog API - メインアプリケーション"""

import os
import secrets

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from pfs_obslog.routers import auth, health

# セッション用の秘密鍵（環境変数から取得、なければランダム生成）
# 本番環境では必ず環境変数で設定してください
SESSION_SECRET_KEY = os.environ.get("SESSION_SECRET_KEY", secrets.token_hex(32))

app = FastAPI(
    title="PFS Obslog API",
    description="PFS Observation Log System API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# セッションミドルウェア（クッキーセッション）
# max_age=None でセッションクッキー（ブラウザを閉じると消える）
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    session_cookie="session",
    max_age=None,  # セッションクッキー
    same_site="lax",
    https_only=False,  # 開発環境ではFalse、本番ではTrue推奨
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限してください
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(health.router, tags=["health"])
app.include_router(auth.router)


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {"message": "PFS Obslog API", "docs": "/docs"}
