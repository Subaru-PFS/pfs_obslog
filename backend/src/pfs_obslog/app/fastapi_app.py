from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.routing import APIRoute

from pfs_obslog.app.orjsonresponse import ORJSONResponse
from pfs_obslog.app.routers.asynctask import (setup_asynctask,
                                              shutdown_asynctask)
from pfs_obslog.config import settings
from pfs_obslog.logging import reset_loggers

from .debug import setup_debugger
from .routers.attachment import router as attachment_router
from .routers.fits import router as fits_router
from .routers.healthz import router as healthz_router
from .routers.pfsdesign import router as pfsdesign_router
from .routers.plot import router as plot_router
from .routers.session import router as session_router
from .routers.visit.csv import router as visit_csv_router
from .routers.visit.visit import router as visit_router
from .routers.visit_note import router as visit_note_router
from .routers.visit_set_note import router as visit_set_note_router
from .staticassets import setup_static_assets

setup_debugger()

app = FastAPI(default_response_class=ORJSONResponse)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(session_router)
app.include_router(visit_router)
app.include_router(visit_csv_router)
app.include_router(visit_note_router)
app.include_router(visit_set_note_router)
app.include_router(plot_router)
app.include_router(pfsdesign_router)
app.include_router(fits_router)
app.include_router(attachment_router)
app.include_router(healthz_router)
setup_static_assets(app)


if settings.app_env == 'development':  # pragma: no cover
    app.on_event('startup')(reset_loggers)


app.on_event('startup')(setup_asynctask)
app.on_event('shutdown')(shutdown_asynctask)


# TODO: remove this section after the migration from vue3 to solidjs is complete
@app.on_event('startup')
def use_route_names_as_operation_ids() -> None:  # pragma: no cover
    """
    Simplify operation IDs so that generated API clients have simpler function names.
    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name  # in this case, 'read_items'
