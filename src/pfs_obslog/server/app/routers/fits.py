import asyncio
import datetime
from enum import Enum
from logging import getLogger
from pathlib import Path

from fastapi import APIRouter, Depends
from opdb import models as M
from sqlalchemy.orm.session import Session
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import (
    backgrofund_process_typeunsafe_args, background_thread)
from pfs_obslog.server.env import PFS_OBSLOG_DATA_ROOT
from pfs_obslog.server.image import SizeHint, fits2png
from pfs_obslog.server.orm import static_check_init_args
from pfs_obslog.server.utils.metafits import load_fits_headers
from pfs_obslog.server.utils.timeit import timeit
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


router = APIRouter()


@router.get('/api/fits/{visit_id}', response_model=list[FitsMeta])
async def list_fits_meta(
    visit_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).get(visit_id)
    if visit is None:
        return []
    return await asyncio.gather(*(background_thread(fits_meta, p) for p in fits_path_for_visit(visit)))


class FitsType(str, Enum):
    raw = 'raw'
    calexp = 'calexp'


@router.get('/api/fits/visits/{visit_id}/sps/{camera_id}.fits')
def show_sps_fits(
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


@router.get('/api/fits/visits/{visit_id}/sps/{camera_id}.png')
async def show_sps_fits_preview(
    visit_id: int,
    camera_id: int,
    width: int = 1024,
    height: int = 1024,
    type: FitsType = FitsType.raw,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    if type == FitsType.raw:
        filepath = sps_fits_path(visit, camera_id)
    else:
        filepath = calexp_fits_path(visit, camera_id)
    png = await backgrofund_process_typeunsafe_args(fits2png, (filepath, SizeHint(max_width=width, max_height=height)))
    return Response(content=png, media_type='image/png')


def fitspath_from_frame_id(
    db: Session,
    visit_id: int,
    frame_id: str,
):
    visit = db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    return next(p for p in fits_path_for_visit(visit) if p.name == frame_id)


@router.get('/api/fits/visits/{visit_id}/frames/{frame_id}.fits')
def show_fits_by_frame_id(
    visit_id: int,
    frame_id: str,
    ctx: Context = Depends(),
):
    path = fitspath_from_frame_id(ctx.db, visit_id, frame_id)
    return FileResponse(path, filename=path.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/mcs/{frame_id}.fits')
def show_mcs_fits(
    visit_id: int,
    frame_id: str,
    ctx: Context = Depends(),
):
    path = fitspath_from_frame_id(ctx.db, visit_id, frame_id)
    return FileResponse(path, filename=path.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/mcs/{frame_id}.png')
async def show_mcs_fits_preview(
    visit_id: int,
    frame_id: int,
    width: int = 1024,
    height: int = 1024,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    filepath = mcs_fits_path(visit, frame_id)
    with timeit('make_fits_preview'):
        png = await backgrofund_process_typeunsafe_args(fits2png, (filepath, SizeHint(max_width=width, max_height=height)))
    return Response(content=png, media_type='image/png')


def mcs_fits_path(visit: M.pfs_visit, frame_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    # PFSC06735159.fits
    path = date_dir / 'mcs' / f'PFSC{frame_id:08d}.fits'
    return path


def sps_fits_path(visit: M.pfs_visit, camera_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = camera_id % 4 + 1
    path = date_dir / 'sps' / f'PFSA{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits'
    return path


def calexp_fits_path(visit: M.pfs_visit, camera_id: int):
    visit_id = visit.pfs_visit_id
    date = visit_date(visit)
    date_dir = data_root / 'drp/sm1-5.2/rerun/ginga/pfi/calExp' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = 'brnm'[camera_id % 4]
    path = date_dir / f'v{visit_id:06d}' / f'calExp-SA{visit_id:06d}{arm}{sm}.fits'
    return path


def fits_meta(path: Path) -> FitsMeta:
    headers = load_fits_headers(str(path))
    return FitsMeta(
        frameid=path.name,
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(cards=[[keyword, value, comment] for keyword, value, comment in header.cards]),
            )
            for i, header in enumerate(headers)
        ]
    )


def visit_date(visit: M.pfs_visit) -> datetime.date:
    return (visit.issued_at + datetime.timedelta(hours=10)).date()


def fits_path_for_visit(visit: M.pfs_visit):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    return sorted(list(date_dir.glob(f'*/PFS?{visit.pfs_visit_id:06d}??.fits')))
