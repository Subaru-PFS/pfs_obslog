from fastapi import APIRouter, Depends
from opdb import models as M
from sqlalchemy.orm import selectinload
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.schema import Visit, VisitDetail

router = APIRouter()


@router.get('/api/pfs_visits', response_model=list[Visit])
def pfs_visit_index(
    offset: int = 0,
    ctx: Context = Depends(),
):
    q = ctx.db.query(M.pfs_visit)\
        .order_by(M.pfs_visit.pfs_visit_id.desc()).offset(offset).limit(100)\
        .options(selectinload(M.pfs_visit.sps_visit))
    # breakpoint()
    return list(q)


@ router.get('/api/pfs_visits/{id}', response_model=VisitDetail)
def pfs_visit_show(
    id: int,
    ctx: Context = Depends(),
):
    return ctx.db.query(M.pfs_visit).get(id)
