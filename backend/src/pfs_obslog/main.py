"""PFS Obslog API - メインアプリケーション"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from pfs_obslog.config import get_settings
from pfs_obslog.orjsonresponse import ORJSONResponse
from pfs_obslog.routers import attachments, auth, fits, health, notes, pfs_designs, visits

settings = get_settings()

app = FastAPI(
    title="PFS Obslog API",
    description="PFS Observation Log System API",
    version="0.1.0",
    root_path=settings.root_path,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    default_response_class=ORJSONResponse,
)

# セッションミドルウェア（クッキーセッション）
# max_age=None でセッションクッキー（ブラウザを閉じると消える）
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key,
    session_cookie="session",
    max_age=None,  # セッションクッキー
    same_site="lax",
    https_only=settings.session_https_only,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限してください
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録（/api配下に配置）
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api")
app.include_router(visits.router, prefix="/api", tags=["visits"])
app.include_router(notes.router, tags=["notes"])
app.include_router(fits.router, tags=["fits"])
app.include_router(pfs_designs.router, tags=["pfs_designs"])
app.include_router(attachments.router, tags=["attachments"])


@app.get("/api")
async def root():  # pragma: no cover
    """ルートエンドポイント"""
    return {"message": "PFS Obslog API", "docs": f"{settings.root_path}/api/docs"}
