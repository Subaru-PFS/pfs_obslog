"""ヘルスチェック用エンドポイント"""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str
    timestamp: str
    version: str


@router.get("/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:  # pragma: no cover
    """
    ヘルスチェックエンドポイント

    サービスの稼働状態を確認するために使用します。
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="0.1.0",
    )


@router.get("/readyz", response_model=HealthResponse)
async def readyz() -> HealthResponse:  # pragma: no cover
    """
    レディネスチェックエンドポイント

    サービスがリクエストを受け付ける準備ができているか確認します。
    将来的にはデータベース接続などのチェックを追加できます。
    """
    # TODO: データベース接続チェックなどを追加
    return HealthResponse(
        status="ready",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="0.1.0",
    )
