from fastapi import FastAPI
from fastapi.routing import APIRoute
from pfs_obslog.server.logging import reset_loggers

from .routers.visit import router as visit_router
from .routers.session import router as session_router
from .staticassets import setup_static_assets

app = FastAPI()
app.include_router(session_router)
app.include_router(visit_router)
setup_static_assets(app)


@app.on_event('startup')
def use_route_names_as_operation_ids() -> None:  # pragma: no cover
    """
    Simplify operation IDs so that generated API clients have simpler function names.
    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name  # in this case, 'read_items'


@app.on_event('startup')
def setup_logging():  # pragma: no cover
    reset_loggers()