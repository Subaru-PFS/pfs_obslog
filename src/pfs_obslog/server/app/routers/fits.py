from enum import Enum
import datetime
import os
from logging import getLogger
from pathlib import Path
from typing import Any

import astropy.io.fits as afits
from fastapi import APIRouter, Depends, HTTPException, status
from opdb import models as M
from pydantic.types import FilePath
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import (background_process_typeunsafe,
                                                     background_thread_typeunsafe)
from pfs_obslog.server.env import PFS_OBSLOG_DATA_ROOT, PFS_OBSLOG_ENV
from pfs_obslog.server.image import fits2png
from pfs_obslog.server.orm import static_check_init_args
from pydantic import BaseModel
from starlette.responses import FileResponse, Response

logger = getLogger(__name__)

data_root = Path(PFS_OBSLOG_DATA_ROOT)


@static_check_init_args
class FitsHeader(BaseModel):
    cards: list


@static_check_init_args
class FitsHdu(BaseModel):
    index: int
    header: FitsHeader


@static_check_init_args
class FitsMeta(BaseModel):
    frameid: str  # id of the file
    hdul: list[FitsHdu]


def disable_in_dev():
    if PFS_OBSLOG_ENV == 'development':
        raise HTTPException(status.HTTP_400_BAD_REQUEST)


# router = APIRouter(dependencies=[Depends(disable_in_dev)])
router = APIRouter()


@router.get('/api/fits/{visit_id}', response_model=list[FitsMeta])
async def visit_fits(
    visit_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).get(visit_id)
    if visit is None:
        return []
    return [await background_thread_typeunsafe(fits_meta, (p,)) for p in fits_path_for_visit(visit)]

# const imageSize = {
#   raw: {
#     width: 4416, height: 4300,
#   },
#   calexp: {
#     width: 4096, height: 4176,
#   }
# }


@router.get('/api/fits_preview/{visit_id}/{camera_id}')
async def fits_preview(
    visit_id: int,
    camera_id: int,
    width: int = int(0.25 * 4416),
    height: int = int(0.25 * 4300),
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = sps_fits_path(visit, camera_id)
    png = await background_process_typeunsafe(make_fits_preview, (filepath, width, height))
    return Response(content=png, media_type='image/png')


def make_fits_preview(filepath: str, width: int, height: int):
    return fits2png(filepath, scale=0.08)


class FitsType(str, Enum):
    raw = 'raw'
    calexp = 'calexp'


@router.get('/api/fits_download/{visit_id}/{camera_id}')
def fits_download(
    visit_id: int,
    camera_id: int,
    type: FitsType = FitsType.raw,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    if type == FitsType.calexp:
        filepath = calexp_fits_path(visit, camera_id)
    else:
        filepath = sps_fits_path(visit, camera_id)
    return FileResponse(str(filepath), media_type='image/fits', filename=filepath.name)


@router.get('/api/fits_download/{visit_id}')
def fits_download_by_frameid(
    visit_id: int,
    frameid: str,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    path = [p for p in fits_path_for_visit(visit) if p.name == frameid][0]
    return FileResponse(path, filename=path.name, media_type='image/fits')


def sps_fits_path(visit: M.pfs_visit, camera_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = camera_id % 4 + 1
    path = date_dir / 'sps' / f'PFSA{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits'
    return path


def calexp_fits_path(visit: M.pfs_visit, camera_id: int):
    # /data/drp/sm1-5.2/rerun/ginga/detrend/calExp/2021-07-06/v063797/calExp-SA063364b1.fits
    visit_id = visit.pfs_visit_id
    date = visit_date(visit)
    date_dir = data_root / 'drp/sm1-5.2/rerun/ginga/detrend/calExp' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = 'brnm'[camera_id % 4]
    path = date_dir / f'v{visit_id:06d}' / f'calExp-SA{visit_id:06d}{arm}{sm}.fits'
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


def fits_path_for_visit(visit: M.pfs_visit):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    return sorted(list(date_dir.glob(f'*/PFS?{visit.pfs_visit_id:06d}??.fits')))


'''
naxis1 = 8960
naxis2 = 5778
'''


def mcs_fits_path(visit: M.pfs_visit, frame_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    # PFSC06735159.fits
    path = date_dir / 'mcs' / f'PFSC{frame_id:08d}.fits'
    return path


@router.get('/api/mcs_preview/{visit_id}/{frame_id}')
async def mcs_preview(
    visit_id: int,
    frame_id: int,
    width: int = int(0.25 * 8960),
    height: int = int(0.25 * 5778),
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = mcs_fits_path(visit, frame_id)
    png = await background_process_typeunsafe(make_fits_preview, (filepath, width, height))
    return Response(content=png, media_type='image/png')
