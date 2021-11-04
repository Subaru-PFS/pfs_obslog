import csv
import functools
import io
from logging import getLogger
from typing import Any, Callable, Generator, Iterable, Optional, TypeVar

from fastapi import APIRouter, Depends, HTTPException
from opdb import models as M
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
from sqlalchemy.orm.session import Session
from starlette.responses import StreamingResponse
from starlette.status import HTTP_400_BAD_REQUEST

from ...utils import myitertools

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
def list_visit(
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


@router.get('/api/visits.csv')
def list_visit_csv(
    sql: Optional[str] = None,
    ctx: Context = Depends(),
):
    vq = visit_q(ctx.db, sql)
    batch_size = 512

    def g():
        for i_batch, v_batch in enumerate(myitertools.batch(vq, batch_size)):
            buf = io.StringIO()
            writer = csv.writer(buf)
            if i_batch == 0:
                columns = [f'# {c}' if i_c == 0 else c for i_c, c in enumerate(csv_columns().keys())]
                writer.writerow(columns)
            for v in v_batch:
                writer.writerow(visit_q_row_to_csv_row(v))
            yield buf.getvalue()

    content_disposition = f'attachment; filename="pfsobslog.utf8.csv"'
    return StreamingResponse(g(), media_type='text/csv; charset=utf8', headers={'content-disposition': content_disposition})


@router.get('/api/visits/{id}', response_model=VisitDetail)
def show_visit(
    id: int,
    ctx: Context = Depends(),
):
    return ctx.db.query(M.pfs_visit).get(id)


@functools.lru_cache()
def csv_columns():
    columns: dict = {}
    columns['visit_id'] = lambda v: v.pfs_visit.pfs_visit_id
    columns['description'] = lambda v: v.pfs_visit.pfs_visit_description
    columns['issued_at'] = lambda v: v.pfs_visit.issued_at
    columns['visit_set_id'] = lambda v: v.visit_set_id
    columns['n_sps_exposures'] = lambda v: v.n_sps_exposures
    columns['n_mcs_exposures'] = lambda v: v.n_mcs_exposures
    columns['avg_exptime'] = lambda v: v.avg_exptime
    columns['avg_azimuth'] = lambda v: v.avg_azimuth
    columns['avg_altitude'] = lambda v: v.avg_altitude
    columns['avg_insrot'] = lambda v: v.avg_insrot
    columns['notes'] = lambda v: visit_notes_to_csv_cell(v.pfs_visit.obslog_notes)
    return columns


def visit_q_row_to_csv_row(v):
    return [m(v) for m in csv_columns().values()]


def visit_notes_to_csv_cell(notes: list[M.obslog_visit_note]):
    return '\n'.join(f'{n.body} by {n.user.account_name}' for n in notes)
