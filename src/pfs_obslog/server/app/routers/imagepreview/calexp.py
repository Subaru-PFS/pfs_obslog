import datetime
from functools import cache
from logging import getLogger
from pathlib import Path

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import background_process
from pfs_obslog.server.env import PFS_OBSLOG_DATA_ROOT, PFS_OBSLOG_ROOT
from pfs_obslog.server.image import fits2png
from sqlalchemy.orm.session import Session
from starlette.responses import Response

from pfs_obslog.server.simplecache import SimpleCache


logger = getLogger(__name__)
data_root = Path(PFS_OBSLOG_DATA_ROOT)


router = APIRouter()

# const imageSize = {
#   raw: {
#     width: 4416, height: 4300,
#   },
#   calexp: {
#     width: 4096, height: 4176,
#   }
# }


cache = SimpleCache(PFS_OBSLOG_ROOT / 'simplecache.sock')


@router.get('/api/imagepreview/calexp/{visit_id}/{camera_id}')
async def calexp_preview(
    visit_id: int,
    camera_id: int,
    width: int = int(0.25 * 4096),
    height: int = int(0.25 * 4176),
    ctx: Context = Depends(),
):
    use_cache = False
    if use_cache:
        cache_key = f'/api/imagepreview/calexp/{visit_id}/{camera_id}?width={width}&height={height}'
        png_bytes = cache.get(cache_key)
        if png_bytes is None:
            png_bytes = await make_calexp_preview(ctx.db, visit_id, camera_id, width, height)
            cache.set(cache_key, png_bytes)
    else:
        png_bytes = await make_calexp_preview(ctx.db, visit_id, camera_id, width, height)
    return Response(content=png_bytes, media_type='image/png')


async def make_calexp_preview(db: Session, visit_id: int, camera_id: int, width: int, height: int):
    visit = db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = fits_path(visit, camera_id)
    png_bytes = await background_process(make_fits_preview, (filepath, height, width))
    return png_bytes


make_fits_preview_type = tuple[Path, int, int]


def make_fits_preview(args: make_fits_preview_type):
    filepath, height, width = args
    return fits2png(filepath, dimensions=(height, width))


def fits_path(visit: M.pfs_visit, camera_id: int):
    # /data/drp/sm1-5.2/rerun/ginga/detrend/calExp/2021-07-06/v063797/calExp-SA063364b1.fits
    visit_id = visit.pfs_visit_id
    date = visit_date(visit)
    date_dir = data_root / 'drp/sm1-5.2/rerun/ginga/detrend/calExp' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = 'brnm'[camera_id % 4]
    path = date_dir / f'v{visit_id:06d}' / f'calExp-SA{visit_id:06d}{arm}{sm}.fits'
    return path


def visit_date(visit: M.pfs_visit) -> datetime.date:
    return (visit.issued_at + datetime.timedelta(hours=10)).date()
