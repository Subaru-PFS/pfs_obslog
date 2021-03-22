import dataclasses
import datetime
import functools
import itertools
from concurrent.futures import thread
from enum import Enum
from glob import glob
from logging import getLogger
from pathlib import Path
from typing import Any, Literal, Optional, TypeAlias

from fastapi import APIRouter, Depends, HTTPException, Request, status
from opdb import models as M
from sqlalchemy.orm import selectinload
from starlette.responses import FileResponse, Response

from pfs_obslog.app.context import Context
from pfs_obslog.app.routers.asynctask import (background_process,
                                              background_thread)
from pfs_obslog.config import settings
from pfs_obslog.filecache import FileBackedCache, PickleCache
from pfs_obslog.fitsmeta import FitsMeta, fits_meta
from pfs_obslog.image import Fits2PngTask, SizeHint
from pfs_obslog.utils.metafits import load_fits_headers
from pfs_obslog.utils.timeit import timeit

logger = getLogger(__name__)
router = APIRouter()
cache_control_header = f'max-age={3*24*3600}'


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


bytes_cache = FileBackedCache(settings.cache_dir / f'{__name__}.bytes_cache')


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
    png, save_cache = bytes_cache.value_and_setter(str(req.url))
    if png is None:
        visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
        if type == FitsType.raw:
            filepath = sps_fits_path(visit, camera_id)
        else:
            filepath = calexp_fits_path(visit, camera_id)
        try:
            png = await background_process(Fits2PngTask(filepath, size_hint=SizeHint(max_width=width, max_height=height)))
        except Exception as error:
            return Response(str(error), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        save_cache(png)
    return CachedResponse(content=png, media_type='image/png')


@router.get('/api/fits/visits/{visit_id}/agc/{exposure_id}.fits')
def show_agc_fits(
    visit_id: int,
    exposure_id: int,
    ctx: Context = Depends(),
):
    agc_exposure = ctx.db.query(M.agc_exposure).filter(M.agc_exposure.agc_exposure_id == exposure_id).one()
    filepath = agc_fits_path(agc_exposure)
    return FileResponse(filepath, filename=filepath.name, media_type='image/fits')


@router.get('/api/fits/visits/{visit_id}/mcs/{frame_id}.fits')
def show_mcs_fits(
    visit_id: int,
    frame_id: int,
    ctx: Context = Depends(),
):
    visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
    path = mcs_fits_path(visit, frame_id)
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
    png, save_cache = bytes_cache.value_and_setter(str(req.url))
    if png is None:
        visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
        filepath = mcs_fits_path(visit, frame_id)
        with timeit('make_fits_preview'):
            png = await background_process(Fits2PngTask(filepath, SizeHint(max_width=width, max_height=height)))
        save_cache(png)
    return CachedResponse(content=png, media_type='image/png')


@router.get('/api/fits/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png')
async def show_agc_fits_preview(
    req: Request,
    visit_id: int,
    exposure_id: int,  # FRAMEID in FITS and agc_exposure_id in opdb
    hdu_index: int,
    width: int = 512,
    height: int = 512,
    ctx: Context = Depends(),
):
    png, save_cache = bytes_cache.value_and_setter(str(req.url))
    if png is None:
        agc_exposure = ctx.db.query(M.agc_exposure).filter(M.agc_exposure.agc_exposure_id == exposure_id).one()
        try:
            filepath = agc_fits_path(agc_exposure)
        except AgcFitsNotAccessible as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
        png = await background_process(Fits2PngTask(
            filepath,
            SizeHint(max_width=width, max_height=height),
            hdu_index=hdu_index,
        ))
        save_cache(png)
    return CachedResponse(content=png, media_type='image/png')


def sps_fits_path(visit: M.pfs_visit, camera_id: int):
    date = visit_date(visit)
    date_dir = settings.data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = camera_id % 4 + 1
    path = date_dir / 'sps' / f'PFSA{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits'
    return path


def calexp_fits_path(visit: M.pfs_visit, camera_id: int):
    visit_id = visit.pfs_visit_id
    date = visit_date(visit)
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = 'brnm'[camera_id % 4]
    for rerun in settings.calexp_ginga_reruns:
        date_dir = settings.data_root / f'drp/sm1-5.2/rerun/ginga/{rerun}/calExp' / date.strftime(r'%Y-%m-%d')
        path = date_dir / f'v{visit_id:06d}' / f'calExp-SA{visit_id:06d}{arm}{sm}.fits'
        if path.exists():
            return path
    raise FileNotFoundError(f'No such file for calexp visit={visit.pfs_visit_id} camera_id={camera_id}')


def mcs_fits_path(visit: M.pfs_visit, frame_id: int):
    date = visit_date(visit)
    date_dir = settings.data_root / 'raw' / date.strftime(r'%Y-%m-%d')
    # PFSC06735159.fits
    path = date_dir / 'mcs' / f'PFSC{frame_id:08d}.fits'
    return path


class AgcFitsNotAccessible(FileNotFoundError):
    pass


def agc_fits_path(agc_exposure: M.agc_exposure):
    cache = PickleCache[Path].getCacheRepository(settings.cache_dir / f'{__name__}.agc_fits_path')
    path, save = cache.value_and_setter(str(agc_exposure.agc_exposure_id))
    if path is None:
        path = save(agc_fits_path_without_cache(agc_exposure))
    return path


def agc_fits_path_newer_than_202211(agc_exposure: M.agc_exposure):
    fs_date = dbdate2filesystem_date(agc_exposure.taken_at)
    date_dir = settings.data_root / 'raw' / fs_date.strftime(r'%Y-%m-%d')
    pfs_visit = agc_exposure.pfs_visit.pfs_visit_id
    agc_exposure_id = agc_exposure.agc_exposure_id
    return Path(f'{date_dir}/agcc/agcc_{pfs_visit:06d}_{agc_exposure_id:08d}.fits')


def agc_fits_path_without_cache(agc_exposure: M.agc_exposure):
    new_path = agc_fits_path_newer_than_202211(agc_exposure)
    if new_path.exists():
        return new_path

    # agc file naming scheme is bit tricky
    if agc_exposure.taken_at is None:
        return agc_fits_path_bisection_search(agc_exposure)
    fs_date = dbdate2filesystem_date(agc_exposure.taken_at)
    date_dir = settings.data_root / 'raw' / fs_date.strftime(r'%Y-%m-%d')
    fname_pattern = agc_exposure.taken_at.strftime(f'agcc_%Y%m%d_%H%M%S?.fits')  # type: ignore
    for path in (date_dir / 'agcc').glob(fname_pattern):
        if agc_frame_id_from_id(path) == agc_exposure.agc_exposure_id:
            return path
    return agc_fits_path_bisection_search(agc_exposure)


def agc_fits_path_bisection_search(agc_exposure: M.agc_exposure):
    fs_date = dbdate2filesystem_date(agc_exposure.pfs_visit.issued_at)
    date_dir = settings.data_root / 'raw' / fs_date.strftime(r'%Y-%m-%d')
    haystack = sorted((date_dir / 'agcc').glob('agcc_*.fits'))

    x = haystack

    @functools.cache
    def y(path: Path):
        path_y = agc_frame_id_from_id(path)
        if path_y is None:
            raise AgcFitsNotAccessible(f'No FITS file for agc_exposure_id={agc_exposure.agc_exposure_id}')
        return path_y - agc_exposure.agc_exposure_id

    if len(x) == 0:
        raise AgcFitsNotAccessible(f'No FITS file for agc_exposure_id={agc_exposure.agc_exposure_id}')

    while True:
        n = len(x)
        if n <= 2:
            if y(x[0]) == 0:
                return x[0]
            elif y(x[-1]) == 0:
                return x[-1]
            raise AgcFitsNotAccessible(f'No FITS file for agc_exposure_id={agc_exposure.agc_exposure_id}')
        assert y(x[0]) * y(x[-1]) <= 0
        m = n // 2
        if y(x[0]) * y(x[m]) <= 0:
            x = x[0:m + 1]
        else:
            x = x[m:]


def agc_frame_id_from_id(path: Path) -> Optional[int]:
    headers = load_fits_headers(str(path))
    for header in headers[1:]:
        frameid: Optional[int] = header.get('FRAMEID')  # type: ignore
        if frameid is not None:
            return frameid


ExposureType: TypeAlias = Literal['sps', 'mcs', 'agc']


@router.get('/api/fits/visits/{visit_id}/{exposure_type}/{fits_id}/meta', response_model=FitsMeta)
async def show_fits_meta(
    visit_id: int,
    exposure_type: ExposureType,
    fits_id: int,
    ctx: Context = Depends(),
):
    try:
        if exposure_type == 'sps':
            visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
            path = sps_fits_path(visit, camera_id=fits_id)
        elif exposure_type == 'mcs':
            visit = ctx.db.query(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id == visit_id).one()
            path = mcs_fits_path(visit, frame_id=fits_id)
        elif exposure_type == 'agc':
            agc_exposure = ctx.db.query(M.agc_exposure).filter(M.agc_exposure.agc_exposure_id == fits_id).one()
            path = agc_fits_path(agc_exposure)
        else:  # pragma: no cover
            raise RuntimeError()
        return fits_meta(path)
    except FileNotFoundError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))


@dataclasses.dataclass
class CachedFitsMetaTask:
    path: Path

    def __call__(self):
        cache = PickleCache[FitsMeta] .getCacheRepository(settings.cache_dir / f'{__name__}.fits_meta')
        path = self.path
        data, save = cache.value_and_setter(
            str(path),
            valid_after=path.exists() and path.stat().st_mtime
        )
        if data is None:
            data = save(fits_meta(path))
        return data


def visit_date(visit: M.pfs_visit) -> datetime.date:
    return dbdate2filesystem_date(visit.issued_at).date()


def dbdate2filesystem_date(dbdate: Any) -> datetime.datetime:
    # FITS files are stored in a directory whose name is the date in HST.
    return dbdate + datetime.timedelta(hours=10)


def CachedResponse(*, content: bytes, media_type: str):
    return Response(content=content, media_type=media_type, headers={'cache-control': cache_control_header})
