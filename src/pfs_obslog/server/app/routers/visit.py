from logging import getLogger
from typing import Any, Generator, Iterable, Optional, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from opdb import models as M
from sqlalchemy.orm.session import Session
from starlette.responses import StreamingResponse
from starlette.status import HTTP_400_BAD_REQUEST
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.orm import (OrmConfig, skip_validation,
                                   static_check_init_args)
from pfs_obslog.server.parsesql.ast import SqlError
from pfs_obslog.server.schema import (McsVisit, SpsSequence, SpsVisit,
                                      VisitBase, VisitNote, VisitSet,
                                      VisitSetNote)
from pfs_obslog.server.visitquery import visit_query
from pydantic.main import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import selectinload

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class SpsSequenceDetail(SpsSequence):
    notes: list[VisitSetNote]

    Config = OrmConfig[M.iic_sequence]()(lambda row: skip_validation(SpsSequenceDetail)(
        visit_set_id=row.visit_set_id,
        sequence_type=row.sequence_type,
        name=row.name,
        comments=row.comments,
        cmd_str=row.cmd_str,
        status=row.iic_sequence_status,
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
        sps_sequence=row.visit_set.iic_sequence if row.visit_set else None,
    ))


@static_check_init_args
class VisitListEntry(VisitBase):
    visit_set_id: Optional[int]
    n_sps_exposures: int
    n_mcs_exposures: int
    avg_exptime: Optional[float]
    avg_azimuth: Optional[float]
    avg_altitude: Optional[float]
    avg_insrot: Optional[float]
    notes: list[VisitNote]

    Config = OrmConfig()(lambda row: skip_validation(VisitListEntry)(
        **VisitBase.Config.row_to_model(row.pfs_visit).dict(),
        visit_set_id=row.visit_set_id,
        n_sps_exposures=row.n_sps_exposures,
        n_mcs_exposures=row.n_mcs_exposures,
        avg_exptime=row.avg_exptime,
        avg_azimuth=row.avg_azimuth,
        avg_altitude=row.avg_altitude,
        avg_insrot=row.avg_insrot,
        notes=row.pfs_visit.obslog_notes,
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
    vq = visit_q(ctx.db, sql)

    count = vq.count()

    vq = vq\
        .order_by(M.pfs_visit.pfs_visit_id.desc())\
        .limit(limit)\
        .offset(offset)

    visits = [VisitListEntry.from_orm(row) for row in vq]

    visitset_q = ctx.db.query(M.visit_set)\
        .filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))\
        .options(selectinload('iic_sequence'))\
        .options(selectinload('iic_sequence.obslog_notes'))\
        .options(selectinload('iic_sequence.iic_sequence_status'))

    visit_sets = [VisitSet.from_orm(row) for row in visitset_q]

    return VisitList(
        visits=visits,
        visit_sets=visit_sets,
        count=count,
    )


def visit_q(db: Session, sql: Optional[str]):
    q = db.query(
        M.pfs_visit,
        M.visit_set.visit_set_id,
        func.count(M.sps_exposure.pfs_visit_id).label('n_sps_exposures'),
        func.count(M.mcs_exposure.pfs_visit_id).label('n_mcs_exposures'),
        func.coalesce(
            func.avg(M.sps_exposure.exptime),
            func.avg(M.mcs_exposure.mcs_exptime),
        ).label('avg_exptime'),
        func.avg(M.mcs_exposure.azimuth).label('avg_azimuth'),
        func.avg(M.mcs_exposure.altitude).label('avg_altitude'),
        func.avg(M.mcs_exposure.insrot).label('avg_insrot'),
    )\
        .outerjoin(M.mcs_exposure)\
        .outerjoin(M.sps_visit)\
        .outerjoin(M.sps_exposure)\
        .outerjoin(M.visit_set)\
        .group_by(M.pfs_visit.pfs_visit_id, M.visit_set.visit_set_id)\
        .options(selectinload('obslog_notes').selectinload('user'))

    if sql:
        try:
            vq = visit_query(sql)
        except SqlError as e:
            raise HTTPException(HTTP_400_BAD_REQUEST, str(e))
        if vq.pfs_visit_ids is not None:
            q = q.filter(M.pfs_visit.pfs_visit_id.in_(vq.pfs_visit_ids))

    return q


@router.get('/api/visits/{id}', response_model=VisitDetail)
def visit_detail(
    id: int,
    ctx: Context = Depends(),
):
    return ctx.db.query(M.pfs_visit).get(id)


@router.get('/api/visits.csv')
def visit_csv(
    sql: Optional[str] = None,
    ctx: Context = Depends(),
):
    import csv
    import io

    vq = visit_q(ctx.db, sql)
    batch_size = 512

    def g():
        for i_batch, v_batch in enumerate(batch(vq, batch_size)):
            buf = io.StringIO()
            writer = csv.writer(buf)
            if i_batch == 0:
                writer.writerow([
                    '# visit_id',
                    'description',
                    'issued_at',
                ])
            for v in v_batch:
                writer.writerow([
                    v.pfs_visit.pfs_visit_id,
                    v.pfs_visit.pfs_visit_description,
                    v.pfs_visit.issued_at,
                ])
            yield buf.getvalue()

        # id=row.pfs_visit_id,
        # description=row.pfs_visit_description,
        # issued_at=row.issued_at,
    #     visit_set_id=row.visit_set_id,
    #     n_sps_exposures=row.n_sps_exposures,
    #     n_mcs_exposures=row.n_mcs_exposures,
    #     avg_exptime=row.avg_exptime,
    #     avg_azimuth=row.avg_azimuth,
    #     avg_altitude=row.avg_altitude,
    #     avg_insrot=row.avg_insrot,
    #     notes=row.pfs_visit.obslog_notes,

    content_disposition = f'attachment; filename="pfsobslog.utf8.csv"'
    return StreamingResponse(g(), media_type='text/csv; charset=utf8', headers={'content-disposition': content_disposition})


T = TypeVar('T')


def batch(iterable0: Iterable[T], batch_size: int) -> Generator[Generator[T, None, None], None, None]:
    assert batch_size > 0
    iterable = iter(iterable0)
    q: list[T] = [next(iterable)]

    def g() -> Generator[T, None, None]:
        start = len(q)
        while len(q) > 0:
            yield q.pop(0)
        for i, item in enumerate(iterable, start):
            if i == batch_size:
                q.append(item)
                return
            yield item

    while len(q) > 0:
        yield g()
