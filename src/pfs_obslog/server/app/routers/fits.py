import datetime
import os
from logging import getLogger
from pathlib import Path
from typing import Any

import astropy.io.fits as afits
from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.orm import static_check_init_args
from pydantic import BaseModel
from sqlalchemy.orm.session import Session
from pfs_obslog.server.app.routers.asynctask import background_thread

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
