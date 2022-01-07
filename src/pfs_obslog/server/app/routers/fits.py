import asyncio
import datetime
import functools
import itertools
from enum import Enum
from logging import getLogger
from pathlib import Path
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import (
    backgrofund_process_typeunsafe_args, background_thread)
from pfs_obslog.server.env import PFS_OBSLOG_DATA_ROOT, PFS_OBSLOG_ENV
from pfs_obslog.server.filecache import FileCache
from pfs_obslog.server.fitsmeta import FitsMeta, fits_meta
from pfs_obslog.server.image import SizeHint, fits2png
from pfs_obslog.server.utils.metafits import load_fits_headers
from pfs_obslog.server.utils.timeit import timeit
from starlette.responses import FileResponse, Response

logger = getLogger(__name__)

data_root = Path(PFS_OBSLOG_DATA_ROOT)


router = APIRouter()


@router.get('/api/fits/{visit_id}', response_model=list[FitsMeta])
async def list_fits_meta(
    visit_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).get(visit_id)
    if visit is None:
        return []
    return await asyncio.gather(*(
        background_thread(fits_meta, p) for p in
        itertools.chain(
            agc_fits_path_for_visit(visit),
            sps_mcs_fits_path_for_visit(visit),
        )
    ))


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
    req: Request,
    visit_id: int,
    camera_id: int,
    width: int = 1024,
    height: int = 1024,
    type: FitsType = FitsType.raw,
    ctx: Context = Depends(),
):
    png, save_cache = preview_cache().get2(str(req.url))
    if png is None:
        visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
        if type == FitsType.raw:
            filepath = sps_fits_path(visit, camera_id)
        else:
            filepath = calexp_fits_path(visit, camera_id)
        png = await backgrofund_process_typeunsafe_args(fits2png, (filepath, SizeHint(max_width=width, max_height=height)))
        save_cache(png)
    return Response(content=png, media_type='image/png')


def mcs_fitspath(
    visit: M.pfs_visit,
    frame_id: str,
):
    return next(p for p in sps_mcs_fits_path_for_visit(visit) if p.name == frame_id)


@router.get('/api/fits/visits/{visit_id}/frames/{frame_id}.fits')
def show_fits_by_frame_id(
    visit_id: int,
    frame_id: str,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    if frame_id.startswith('agcc_'):
        path = agc_fits_path(visit, cast(M.agc_exposure, visit.agc_exposure).agc_exposure_id)
    else:
        path = mcs_fitspath(visit, frame_id)
    return FileResponse(path, filename=path.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/mcs/{frame_id}.fits')
def show_mcs_fits(
    visit_id: int,
    frame_id: str,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    path = mcs_fitspath(visit, frame_id)
    return FileResponse(path, filename=path.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/agc/{frame_id}.fits')
def show_agc_fits(
    visit_id: int,
    frame_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    path = agc_fits_path(visit, frame_id)
    return FileResponse(path, filename=path.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/mcs/{frame_id}.png')
async def show_mcs_fits_preview(
    req: Request,
    visit_id: int,
    frame_id: int,
    width: int = 1024,
    height: int = 1024,
    ctx: Context = Depends(),
):
    png, save_cache = preview_cache().get2(str(req.url))
    if png is None:
        visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
        filepath = mcs_fits_path(visit, frame_id)
        with timeit('make_fits_preview'):
            png = await backgrofund_process_typeunsafe_args(fits2png, (filepath, SizeHint(max_width=width, max_height=height)))
        save_cache(png)
    return Response(content=png, media_type='image/png')


@router.get('/api/fits/visits/{visit_id}/agc/{frame_id}-{hdu_index}.png')
async def show_agc_fits_preview(
    req: Request,
    visit_id: int,
    frame_id: int,  # FRAMEID in FITS and agc_exposure_id in opdb
    hdu_index: int,
    width: int = 512,
    height: int = 512,
    ctx: Context = Depends(),
):
    png, save_cache = preview_cache().get2(str(req.url))
    if png is None:
        visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
        try:
            filepath = agc_fits_path(visit, frame_id)
        except AgcFitsNotFound:
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        png = await backgrofund_process_typeunsafe_args(
            fits2png,
            (filepath, SizeHint(max_width=width, max_height=height)),
            dict(hdu_index=hdu_index),
        )
        save_cache(png)
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


@functools.lru_cache(maxsize=1024)
def agc_frame_id_to_path(date_dir: Path, frame_id: int):
    for path in (date_dir / 'agcc').glob('*.fits'):
        headers = load_fits_headers(str(path), max_hdu=2)
        if headers[1]['FRAMEID'] == frame_id:
            return path
    raise AgcFitsNotFound(f'date_dir={date_dir}, frame_id={frame_id}')


class AgcFitsNotFound(RuntimeError):
    pass


def agc_fits_path(visit: M.pfs_visit, frame_id: int):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    return agc_frame_id_to_path(date_dir, frame_id)


def calexp_fits_path(visit: M.pfs_visit, camera_id: int):
    visit_id = visit.pfs_visit_id
    date = visit_date(visit)
    date_dir = data_root / 'drp/sm1-5.2/rerun/ginga/pfi/calExp' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = 'brnm'[camera_id % 4]
    path = date_dir / f'v{visit_id:06d}' / f'calExp-SA{visit_id:06d}{arm}{sm}.fits'
    return path


def header_value_stringify(value):
    if isinstance(value, float):
        return str(value)
    if isinstance(value, bool):
        return 'T' if value else 'F'
    return value


def visit_date(visit: M.pfs_visit) -> datetime.date:
    return (visit.issued_at + datetime.timedelta(hours=10)).date()


def sps_mcs_fits_path_for_visit(visit: M.pfs_visit):
    date = visit_date(visit)
    date_dir = data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    return sorted(list(date_dir.glob(f'*/PFS?{visit.pfs_visit_id:06d}??.fits')))


def agc_fits_path_for_visit(visit: M.pfs_visit):
    if visit.agc_exposures:
        agc_exposures: list[M.agc_exposure] = visit.agc_exposures
        for agc_exposure in agc_exposures:
            frame_id = agc_exposure.agc_exposure_id
            try:
                yield agc_fits_path(visit, frame_id)
            except AgcFitsNotFound:
                pass


@functools.cache
def preview_cache():
    return FileCache(Path(f'/tmp/obslog/{PFS_OBSLOG_ENV}/preview'))
