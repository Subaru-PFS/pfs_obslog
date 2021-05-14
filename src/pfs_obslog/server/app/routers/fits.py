import datetime
import os
from logging import getLogger
from pathlib import Path
from typing import Any

import astropy.io.fits as afits
from fastapi import APIRouter, Depends
from opdb import models as M
from starlette.responses import FileResponse, Response
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.orm import static_check_init_args
from pydantic import BaseModel
from sqlalchemy.orm.session import Session
from pfs_obslog.server.app.routers.asynctask import background_process, background_thread

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class FitsHeader(BaseModel):
    cards: list


@static_check_init_args
class FitsHdu(BaseModel):
    index: int
    header: FitsHeader


@static_check_init_args
class FitsMeta(BaseModel):
    frameid: str
    hdul: list[FitsHdu]


@router.get('/api/fits/{visit_id}', response_model=list[FitsMeta])
async def visit_fits(
    visit_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).get(visit_id)
    if visit is None:
        return []
    return [await background_thread(fits_meta, (p,)) for p in fits_path_for_visit(visit)]


def main():
    make_fits_preview('/Users/michitaro/Downloads/PFSA05180112.fits')


@router.get('/api/fits_preview/{visit_id}/{camera_id}')
async def fits_preview(
    visit_id: int,
    camera_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = fits_path(visit, camera_id)
    png = await background_process(make_fits_preview, (filepath,))
    return Response(content=png, media_type='image/png')


def make_fits_preview(filepath: str):
    from matplotlib import pyplot
    import io
    from astropy.visualization import ZScaleInterval
    DPI = 72
    width = 800
    height = 800
    pyplot.figure(dpi=DPI, figsize=(width / DPI, height / DPI))
    with afits.open(filepath) as hdul:
        data = hdul[1].data  # type: ignore
        zscale = ZScaleInterval()
        vmin, vmax = zscale.get_limits(data)
        pyplot.imshow(data, vmin=vmin, vmax=vmax)
    pyplot.colorbar()
    out = io.BytesIO()
    # pyplot.savefig('/Users/michitaro/Desktop/a.png')
    pyplot.savefig(out, format='png', transparent=True)
    return out.getvalue()


@router.get('/api/fits_download/{visit_id}/{camera_id}')
def fits_download(
    visit_id: int,
    camera_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = fits_path(visit, camera_id)
    return FileResponse(str(filepath), media_type='image/fits', filename=filepath.name)


def fits_path(visit: M.pfs_visit, camera_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = camera_id % 4 + 1
    path = date_dir / 'sps' / f'PFSA{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits'
    return path


def fits_meta(path: Path) -> FitsMeta:
    with afits.open(path) as hdul:
        return FitsMeta(
            frameid=path.name,
            hdul=[
                FitsHdu(index=i, header=FitsHeader(cards=[[keyword, value, comment]
                        for keyword, value, comment in hdu.header.cards]))
                for i, hdu in enumerate(hdul)
            ]
        )


def visit_date(visit: M.pfs_visit) -> datetime.date:
    return (visit.issued_at + datetime.timedelta(hours=10)).date()


data_root = Path(os.environ['PFS_OBSLOG_DATA_ROOT'])


def fits_path_for_visit(visit: M.pfs_visit):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    return list(date_dir.glob(f'*/PFS?{visit.pfs_visit_id:06d}??.fits'))


if __name__ == '__main__':
    main()
