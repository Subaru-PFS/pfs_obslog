from pathlib import Path

from fastapi import FastAPI
from fastapi.routing import APIRoute
from .staticassets import setup_static_assets

from .routers.session import router as session_router
from .routers.pfs_visits import router as pfs_visits_router

app = FastAPI()
app.include_router(session_router)
app.include_router(pfs_visits_router)
setup_static_assets(app)


def use_route_names_as_operation_ids(app: FastAPI) -> None:
    """
    Simplify operation IDs so that generated API clients have simpler function names.
    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name  # in this case, 'read_items'


use_route_names_as_operation_ids(app)
