from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.orm import (OrmConfig, skip_validation,
                                   static_check_init_args)
from pfs_obslog.server.schema import (McsVisit, SpsSequence,
                                      SpsVisit, VisitBase, VisitNote, VisitSet, VisitSet,
                                      VisitSetNote)
from pfs_obslog.server.visitquery import visit_query
from pydantic.main import BaseModel
from sqlalchemy.orm import selectinload

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class SpsSequenceDetail(SpsSequence):
    notes: list[VisitSetNote]

    Config = OrmConfig[M.sps_sequence]()(lambda row: skip_validation(SpsSequenceDetail)(
        visit_set_id=row.visit_set_id,
        sequence_type=row.sequence_type,
        name=row.name,
        comments=row.comments,
        cmd_str=row.cmd_str,
        status=row.status,
        notes=row.obslog_notes,
    ))


@static_check_init_args
class VisitDetail(VisitBase):
    notes: list[VisitNote]
    sps: Optional[SpsVisit]
    mcs: Optional[McsVisit]
    sps_sequence: Optional[SpsSequenceDetail]

    Config = OrmConfig[M.pfs_visit]()(lambda row: skip_validation(VisitDetail)(
        id=row.pfs_visit_id,
        description=row.pfs_visit_description,
        issued_at=row.issued_at,
        notes=row.obslog_notes,
        sps=row.sps_visit,
        mcs=None if len(row.mcs_exposure) == 0 else McsVisit(exposures=row.mcs_exposure),
        sps_sequence=row.sps_visit.visit_set.sps_sequence if (row.sps_visit and row.sps_visit.visit_set) else None,
    ))


@static_check_init_args
class VisitListEntry(VisitBase):
    visit_set_id: Optional[int]

    Config = OrmConfig()(lambda row: skip_validation(VisitListEntry)(
        **VisitBase.Config.row_to_model(row.pfs_visit).dict(),
        visit_set_id=row.visit_set_id,
    ))


@static_check_init_args
class VisitSetBase(BaseModel):
    id: int
    visit_id: int

    Config = OrmConfig[M.visit_set]()(lambda row: skip_validation(VisitSetBase)(
        id=row.visit_set_id,
        visit_id=row.pfs_visit_id,
    ))


@static_check_init_args
class VisitList(BaseModel):
    visits: list[VisitListEntry]
    visit_sets: list[VisitSet]
    count: int


@router.get('/api/visits', response_model=VisitList)
def visit_list(
    offset: int = 0,
    limit: int = 50,
    sql: Optional[str] = None,
    ctx: Context = Depends(),
):
    q = ctx.db.query(
        M.pfs_visit,
        M.pfs_visit.pfs_design_id,
        M.visit_set.visit_set_id,
    )\
        .select_from(M.pfs_visit)\
        .outerjoin(M.sps_visit)\
        .outerjoin(M.visit_set)\

    if sql:
        vq = visit_query(sql)
        if vq.pfs_visit_ids is not None:
            q = q.filter(M.pfs_visit.pfs_visit_id.in_(vq.pfs_visit_ids))

    count = q.count()

    q = q\
        .order_by(M.pfs_visit.pfs_visit_id.desc())\
        .limit(limit)\
        .offset(offset)

    visits = [VisitListEntry.from_orm(row) for row in q]

    q2 = ctx.db.query(M.visit_set)\
        .filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))\
        .options(selectinload('sps_sequence'))

    visit_sets = [VisitSet.from_orm(row) for row in q2]

    return VisitList(
        visits=visits,
        visit_sets=visit_sets,
        count=count,
    )


@router.get('/api/visits/{id}', response_model=VisitDetail)
def visit_detail(
    id: int,
    ctx: Context = Depends(),
):
    return ctx.db.query(M.pfs_visit).get(id)
