from typing import Any, Optional, cast

from fastapi import APIRouter, Depends
from opdb import models as M
from pydantic.main import BaseModel
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.schema import McsVisit, SpsSequence, SpsVisit, Visit, VisitNote, VisitSet
from pfs_obslog.server.orm import orm_getter_dict, static_check_init_args
from sqlalchemy.orm import selectinload

router = APIRouter()


@static_check_init_args
class VisitListEntry(Visit):
    sps_present: bool
    mcs_present: bool
    visit_set_id: Optional[int]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row):
                return VisitListEntry(
                    id=row.pfs_visit.pfs_visit_id,
                    description=row.pfs_visit.pfs_visit_description,
                    issued_at=row.pfs_visit.issued_at,
                    sps_present=row.sps_present,
                    mcs_present=row.mcs_present,
                    visit_set_id=row.visit_set_id,
                )


@static_check_init_args
class VisitSetDetail(VisitSet):
    sps_sequence: SpsSequence

    class Config:
        orm_mode = True


@static_check_init_args
class VisitList(BaseModel):
    visits: list[VisitListEntry]
    visit_sets: list[VisitSetDetail]


@router.get('/api/visists', response_model=VisitList)
def visit_list(
    offset: int = 0,
    ctx: Context = Depends(),
):
    q = ctx.db.query(
        M.pfs_visit,
        M.pfs_visit.mcs_exposure.any().label('sps_present'),
        M.pfs_visit.sps_visit.has().label('mcs_present'),
        M.pfs_visit.pfs_design_id,
        M.visit_set.visit_set_id,
    )\
        .select_from(M.pfs_visit)\
        .outerjoin(M.sps_visit)\
        .outerjoin(M.visit_set)\
        .order_by(M.pfs_visit.pfs_visit_id.desc())\
        .limit(100)\
        .offset(offset)

    visits = [VisitListEntry.from_orm(row) for row in q]

    q2 = ctx.db.query(M.visit_set)\
        .filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))\
        .options(selectinload('sps_sequence'))
    visit_sets = [VisitSetDetail.from_orm(row) for row in q2]

    return VisitList(
        visits=visits,
        visit_sets=visit_sets,
    )


@static_check_init_args
class VisitDetail(Visit):
    notes: list[VisitNote]
    sps: Optional[SpsVisit]
    mcs: Optional[McsVisit]
    visit_set: Optional[VisitSet]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.pfs_visit):
                return VisitDetail(
                    id=row.pfs_visit_id,
                    description=row.pfs_visit_description,
                    issued_at=row.issued_at,
                    notes=row.obslog_notes,
                    sps=row.sps_visit,
                    mcs=None if len(row.mcs_exposure) == 0 else McsVisit(exposures=row.mcs_exposure),
                    visit_set=row.sps_visit.visit_set,
                )


@ router.get('/api/visits/{id}', response_model=VisitDetail)
def visit_detail(
    id: int,
    ctx: Context = Depends(),
):
    return ctx.db.query(M.pfs_visit).get(id)
