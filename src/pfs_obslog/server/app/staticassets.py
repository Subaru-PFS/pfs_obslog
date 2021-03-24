from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def setup_static_assets(app: FastAPI):  # pragma: no cover
    dist_dir = Path('.') / 'webui' / 'dist'
    assets_dir = dist_dir / 'assets'
    if assets_dir.exists():
        app.mount("/assets/", StaticFiles(directory=str(assets_dir)), name="static")

        @ app.get("/")
        def index():
            return FileResponse(str(dist_dir / 'index.html'))
