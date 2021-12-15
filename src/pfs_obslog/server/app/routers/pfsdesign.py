import asyncio
import io
from logging import getLogger
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.param_functions import Query
from matplotlib import pyplot
from pfs.datamodel.pfsConfig import PfsDesign
from pfs.utils.pfsDesignUtils import showPfsDesign
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import (background_process,
                                                     background_thread)
from pfs_obslog.server.env import PFS_OBSLOG_DATA_ROOT
from pfs_obslog.server.fitsmeta import FitsMeta, fits_meta
from pydantic import BaseModel
from starlette.responses import Response

logger = getLogger(__name__)

data_root = Path(PFS_OBSLOG_DATA_ROOT)
pfs_design_dir = data_root / 'pfsDesign'


router = APIRouter()


class PfsDesignDetail(BaseModel):
    id: str


@router.get('/api/pfs_design', response_model=list[FitsMeta])
async def list_pfs_design(
    ctx: Context = Depends(),
):
    return await asyncio.gather(*(
        background_thread(fits_meta, p) for p in
        pfs_design_dir.glob('pfsDesign-0x*.fits')
    ))


@router.get('/api/pfs_design.png')
async def pfs_design_chart(
    id_hex: list[str] = Query(...),
    ctx: Context = Depends(),
):
    pfs_design_ids = [int(h, 16) for h in id_hex]
    png = await background_process(plot_design, (pfs_design_ids,), new_process=True)
    return Response(content=png, media_type='image/png')


def plot_design(args) -> bytes:
    pfs_design_ids, = args
    DPI = 72
    # set_mpl_theme(args.theme)
    pyplot.figure(dpi=DPI, figsize=(640 / DPI, 480 / DPI))
    pfsDesigns = [PfsDesign.read(id, pfs_design_dir) for id in pfs_design_ids]
    showPfsDesign(pfsDesigns)
    out = io.BytesIO()
    pyplot.savefig(out, format='png', transparent=True)
    return out.getvalue()
