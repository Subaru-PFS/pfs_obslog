from fastapi import FastAPI
from fastapi.routing import APIRoute
from pfs_obslog.server.app.routers.asynctask import (setup_asynctask,
                                                     shutdown_asynctask)
from pfs_obslog.server.env import PFS_OBSLOG_ENV
from pfs_obslog.server.logging import reset_loggers

from .debug import setup_debugger
from .routers.attachment import router as attachment_router
from .routers.fits import router as fits_router
from .routers.healthz import router as healthz_router
from .routers.mcs_data import router as mcs_data_router
from .routers.mcs_exposure_note import router as mcs_exposure_note_router
from .routers.session import router as session_router
from .routers.visit import router as visit_router
from .routers.visit_note import router as visit_note_router
from .routers.visit_set_note import router as visit_set_note_router
from .staticassets import setup_static_assets

setup_debugger()

app = FastAPI()
app.include_router(session_router)
app.include_router(visit_router)
app.include_router(visit_note_router)
app.include_router(visit_set_note_router)
app.include_router(mcs_exposure_note_router)
app.include_router(mcs_data_router)
app.include_router(fits_router)
app.include_router(attachment_router)
app.include_router(healthz_router)
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


if PFS_OBSLOG_ENV == 'development':  # pragma: no cover
    app.on_event('startup')(reset_loggers)
app.on_event('startup')(setup_asynctask)


app.on_event('shutdown')(shutdown_asynctask)
