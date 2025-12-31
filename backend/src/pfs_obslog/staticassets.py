"""静的アセット配信モジュール

productionモードでフロントエンドのビルド済みアセットを配信します。
- index.html: クライアントキャッシュ無効
- その他: クライアントサイドキャッシュ有効、zstd/gzip圧縮対応
"""

import mimetypes
from pathlib import Path
from typing import cast

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, Response
from starlette.staticfiles import StaticFiles
from starlette.types import Receive, Scope, Send

from pfs_obslog.config import get_settings


def setup_static_assets(app: FastAPI) -> None:  # pragma: no cover
    """静的アセットの配信を設定

    productionモード以外では何もしません。
    """
    settings = get_settings()
    if settings.app_env != "production":
        return

    # フロントエンドのビルド済みディレクトリ
    dist_path = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
    if not dist_path.exists():
        # ビルド済みディレクトリが存在しない場合は警告を出して無視
        import warnings

        warnings.warn(
            f"Static assets directory not found: {dist_path}. "
            "Static file serving is disabled.",
            stacklevel=2,
        )
        return

    mount_static_files("/", app, dist_path)


def mount_static_files(prefix: str, app: FastAPI, path: Path) -> None:
    """静的ファイルをマウント

    - ディレクトリ: StaticFilesでマウント
    - ファイル: 個別にエンドポイントを作成
    - index.html: ルートパスにもマウント、キャッシュ無効
    """
    for i, p in enumerate(path.glob("*")):
        if p.is_dir():
            # ディレクトリは圧縮対応のStaticFilesでマウント
            app.mount(
                f"{prefix}{p.name}/",
                CompressedStaticFiles(directory=p),
            )
        else:
            # ファイルは個別にエンドポイントを作成

            def make_handler(file_path: Path, idx: int):
                """ファイルハンドラを作成するファクトリ関数"""
                is_html = file_path.suffix.lower() == ".html"

                async def handler(request: Request) -> Response:
                    return serve_file_with_compression(request, file_path, no_cache=is_html)

                handler.__name__ = f"static_asset_{idx}"
                return handler

            handler = make_handler(p, i)
            app.get(f"{prefix}{p.name}")(handler)

            # index.htmlはルートパスにもマウント
            if p.name == "index.html":
                root_handler = make_handler(p, i + 1000)
                app.get(f"{prefix}")(root_handler)


def serve_file_with_compression(
    request: Request, file_path: Path, *, no_cache: bool = False
) -> Response:
    """圧縮対応のファイルレスポンスを返す

    クライアントのAccept-Encodingヘッダーを確認し、
    zstdまたはgzip圧縮されたファイルが存在すればそれを返します。

    Args:
        request: FastAPIリクエスト
        file_path: ファイルパス
        no_cache: キャッシュを無効にするか
    """
    accept_encoding = request.headers.get("accept-encoding", "")

    # 圧縮ファイルの確認順序: zstd > gzip
    compressed_variants: list[tuple[str, str]] = [
        ("zstd", ".zst"),
        ("gzip", ".gz"),
    ]

    for encoding, ext in compressed_variants:
        if encoding in accept_encoding:
            compressed_path = file_path.with_suffix(file_path.suffix + ext)
            if compressed_path.exists():
                media_type = (
                    mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
                )
                headers = {"content-encoding": encoding}
                if no_cache:
                    headers["cache-control"] = "no-cache"
                else:
                    # 1年間のキャッシュ（Viteビルドはハッシュ付きファイル名を使用）
                    headers["cache-control"] = "public, max-age=31536000, immutable"

                return FileResponse(
                    path=compressed_path,
                    media_type=media_type,
                    headers=headers,
                )

    # 圧縮ファイルがない場合は元のファイルを返す
    headers = {}
    if no_cache:
        headers["cache-control"] = "no-cache"
    else:
        headers["cache-control"] = "public, max-age=31536000, immutable"

    return FileResponse(path=file_path, headers=headers)


class CompressedStaticFiles(StaticFiles):
    """zstd/gzip圧縮対応のStaticFiles

    StaticFilesを拡張し、圧縮されたファイルの配信とキャッシュヘッダーを追加します。
    """

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """リクエストを処理"""
        if scope["type"] != "http":
            await super().__call__(scope, receive, send)
            return

        request = Request(scope)
        path = self.get_path(scope)
        full_path = Path(cast(str, self.directory)) / path

        # ファイルが存在しない場合は親クラスに任せる
        if not full_path.exists() or full_path.is_dir():
            await super().__call__(scope, receive, send)
            return

        # HTMLファイルはキャッシュ無効
        is_html = full_path.suffix.lower() == ".html"
        response = serve_file_with_compression(request, full_path, no_cache=is_html)
        await response(scope, receive, send)
