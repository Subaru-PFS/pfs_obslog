import asyncio
import datetime
import io
import re
from dataclasses import dataclass
from logging import getLogger
from pathlib import Path
from traceback import format_exc

from astropy.io import fits as afits
from fastapi import APIRouter, Depends, HTTPException
from fastapi.param_functions import Query
from fastapi.responses import FileResponse
from matplotlib import pyplot
from pfs.datamodel.pfsConfig import PfsDesign
from pfs.utils.pfsDesignUtils import showPfsDesign
from pydantic import BaseModel
from starlette.responses import Response

from pfs_obslog.app.context import Context
from pfs_obslog.app.routers.asynctask import (background_process,
                                              background_thread)
from pfs_obslog.config import settings
from pfs_obslog.filecache import PickleCache
from pfs_obslog.fitsmeta import FitsMeta, fits_meta_from_hdul
from pfs_obslog.utils.timeit import timeit

logger = getLogger(__name__)

router = APIRouter()


class PfsDesignEntry(BaseModel):
    id: str
    frameid: str
    name: str
    date_modified: datetime.datetime
    ra: float
    dec: float
    arms: str
    num_design_rows: int
    num_photometry_rows: int
    num_guidestar_rows: int


@router.get('/api/pfs_designs', response_model=list[PfsDesignEntry])
async def list_pfs_design(
    ctx: Context = Depends(),
):
    design_list = list(await asyncio.gather(*(
        background_thread(DesignEntryTask(p)) for p in
        settings.pfs_design_dir.glob('pfsDesign-0x*.fits') if re.match(r'^pfsDesign-0x[0-9a-fA-F]{16}\.fits$', str(p.name))
    )))
    design_list.sort(key=lambda d: d.date_modified, reverse=True)
    return design_list


@dataclass
class DesignEntryTask:
    path: Path

    def _call_without_cache(self):
        with afits.open(self.path) as hdul:
            meta = fits_meta_from_hdul(self.path.name, hdul)
            return PfsDesignEntry(
                id=pick_id(meta.filename),
                frameid=meta.filename,
                name=meta.hdul[0].header.value('DSGN_NAM') or '',
                date_modified=datetime.datetime.fromtimestamp(self.path.stat().st_mtime),
                ra=meta.hdul[0].header.value('RA', 0.0),
                dec=meta.hdul[0].header.value('DEC', 0.0),
                arms=meta.hdul[0].header.value('ARMS', '-'),
                num_design_rows=len(hdul[1].data),  # type: ignore
                num_photometry_rows=len(hdul[2].data),  # type: ignore
                num_guidestar_rows=len(hdul[3].data),  # type: ignore
            )

    def __call__(self):
        data, save = pfsDesignReadCache.value_and_setter(
            f'DesignEntryTask({self.path})()',
            valid_after=self.path.exists() and self.path.stat().st_mtime)
        if data is None:
            data = save(self._call_without_cache())
        return data


def pick_id(frameid: str):
    # frameid is in the form of 'pfsDesign-0x1234567890abcdef.fits'
    # return '0x1234567890abcdef'
    return frameid[len('pfsDesign-0x'):-len('.fits')]


@router.get('/api/pfs_designs.png')
async def pfs_design_chart(
    id_hex: list[str] = Query(...),
    date: datetime.date = Query(None),
    return_error: bool = False,
    ctx: Context = Depends(),
):
    pfs_design_ids = [int(h, 16) for h in id_hex]
    try:
        png = await background_process(PlotDesignTask(pfs_design_ids, date))
        return Response(content=png, media_type='image/png')
    except Exception:
        if return_error:
            return {"detail": format_exc()}
        raise


class DesignData(BaseModel):
    fiberId: list[int]
    catId: list[int]
    tract: list[int]
    patch: list[str]
    objId: list[int]
    ra: list[float]
    dec: list[float]
    targetType: list[int]
    fiberStatus: list[int]
    pfiNominal: list[list[float]]


class PhotometryData(BaseModel):
    fiberId: list[int]
    fiberFlux: list[float]
    psfFlux: list[float]
    totalFlux: list[float]
    fiberFluxErr: list[float]
    psfFluxErr: list[float]
    totalFluxErr: list[float]
    filterName: list[str]


class PfsDesignDetail(BaseModel):
    fits_meta: FitsMeta
    date_modified: datetime.datetime
    design_data: DesignData
    photometry_data: PhotometryData


@router.get('/api/pfs_designs/{id_hex}.fits')
def download_design(
    id_hex: str,
    ctx: Context = Depends(),
):
    if not re.match(r'^[0-9a-fA-F]{16}$', id_hex):
        raise HTTPException(status_code=400, detail=f'Invalid id_hex: {id_hex}')

    filepath = settings.pfs_design_dir / f'pfsDesign-0x{id_hex}.fits'
    return FileResponse(str(filepath), media_type='image/fits', filename=filepath.name)


@router.get('/api/pfs_designs/{id_hex}', response_model=PfsDesignDetail)
def show_design(
    id_hex: str,
    ctx: Context = Depends(),
):
    filepath = settings.pfs_design_dir / f'pfsDesign-0x{id_hex}.fits'

    def without_cache():
        if not re.match(r'^[0-9a-fA-F]{16}$', id_hex):
            raise HTTPException(status_code=400, detail=f'Invalid id_hex: {id_hex}')

        with afits.open(filepath) as hdul:
            meta = fits_meta_from_hdul(filepath.name, hdul)

            design_data = DesignData(
                fiberId=hdul[1].data.field('fiberId').tolist(),  # type: ignore
                catId=hdul[1].data.field('catId').tolist(),  # type: ignore
                tract=hdul[1].data.field('tract').tolist(),  # type: ignore
                patch=hdul[1].data.field('patch').tolist(),  # type: ignore
                objId=hdul[1].data.field('objId').tolist(),  # type: ignore
                ra=hdul[1].data.field('ra').tolist(),  # type: ignore
                dec=hdul[1].data.field('dec').tolist(),  # type: ignore
                targetType=hdul[1].data.field('targetType').tolist(),  # type: ignore
                fiberStatus=hdul[1].data.field('fiberStatus').tolist(),  # type: ignore
                pfiNominal=hdul[1].data.field('pfiNominal').tolist(),  # type: ignore
            )
            photometry_data = PhotometryData(
                fiberId=hdul[2].data.field('fiberId').tolist(),  # type: ignore
                fiberFlux=hdul[2].data.field('fiberFlux').tolist(),  # type: ignore
                psfFlux=hdul[2].data.field('psfFlux').tolist(),  # type: ignore
                totalFlux=hdul[2].data.field('totalFlux').tolist(),  # type: ignore
                fiberFluxErr=hdul[2].data.field('fiberFluxErr').tolist(),  # type: ignore
                psfFluxErr=hdul[2].data.field('psfFluxErr').tolist(),  # type: ignore
                totalFluxErr=hdul[2].data.field('totalFluxErr').tolist(),  # type: ignore
                filterName=hdul[2].data.field('filterName').tolist(),  # type: ignore
            )
            return PfsDesignDetail(
                fits_meta=meta,
                date_modified=datetime.datetime.fromtimestamp(filepath.stat().st_mtime),
                design_data=design_data,
                photometry_data=photometry_data,
            )

    value, set = pfsDesignReadCache.value_and_setter(
        f'show_design({id_hex})',
        valid_after=filepath.exists() and filepath.stat().st_mtime,
    )
    if value is None:
        value = set(without_cache())
    return value


@dataclass
class PlotDesignTask:
    pfs_design_ids: list[int]
    date: datetime.date
    width: int = 600
    height: int = 250
    dpi: int = 72  # pyplot.figure does not accept dpi in float

    def __call__(self) -> bytes:
        with timeit('PlotDesignTask'):
            pfs_design_ids = self.pfs_design_ids
            DPI = self.dpi
            pyplot.figure(dpi=DPI, figsize=(self.width / DPI, self.height / DPI))
            with timeit('PfsDesign.read'):
                pfsDesigns = [pfs_design_read(id, str(settings.pfs_design_dir)) for id in pfs_design_ids]
            with timeit('showPfsDesign'):
                showPfsDesign(pfsDesigns, date=self.date, showTime=True)
            out = io.BytesIO()
            pyplot.savefig(out, format='png', transparent=True)
            return out.getvalue()


pfsDesignReadCache = PickleCache(settings.cache_dir / f'{__name__}.pfsDesignRead')


def pfs_design_read(id: int, dirname: str):
    path = Path(dirname) / PfsDesign.fileNameFormat.format(id)
    data, save = pfsDesignReadCache.value_and_setter(
        f'PfsDesign.read({repr(id)}, {repr(dirname)})',
        valid_after=path.exists() and path.stat().st_mtime)
    if data is None:
        data = save(PfsDesign.read(id, dirname))
    return data
