from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles

from .routers import devel, obsdata, session, websocket
from .utils import logging as mylogging

app = FastAPI()

app.include_router(session.router)
app.include_router(obsdata.router)
app.include_router(devel.router)
app.include_router(websocket.router)

if False:
    app.mount("/_assets/", StaticFiles(directory="./dist/_assets"), name="static")

    @app.get("/")
    async def index():
        return FileResponse('./dist/index.html')


def use_route_names_as_operation_ids(app: FastAPI) -> None:
    """
    Simplify operation IDs so that generated API clients have simpler function
    names.

    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name  # in this case, 'read_items'


use_route_names_as_operation_ids(app)
mylogging.setup()
mylogging.logger.info('server up')
