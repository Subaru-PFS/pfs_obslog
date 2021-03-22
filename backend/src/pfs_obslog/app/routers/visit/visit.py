from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from opdb import models as M
from pfs_obslog.app.context import Context
from pfs_obslog.orm import OrmConfig, skip_validation, static_check_init_args
from pfs_obslog.parsesql.ast import SqlError
from pfs_obslog.schema import (AgcVisit, IicSequence, McsVisit, SpsSequence,
                               SpsVisit, VisitBase, VisitNote, VisitSetNote)
from pfs_obslog.visitquery import evaluate_where_clause, extract_where_clause
from pydantic.main import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.session import Session

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class SpsSequenceDetail(SpsSequence):
    notes: list[VisitSetNote]

    Config = OrmConfig[M.iic_sequence]()(lambda row: skip_validation(SpsSequenceDetail)(
        visit_set_id=row.iic_sequence_id,  # type: ignore
        sequence_type=row.sequence_type,  # type: ignore
        name=row.name,  # type: ignore
        comments=row.comments,  # type: ignore
        cmd_str=row.cmd_str,  # type: ignore
        status=row.iic_sequence_status,
        notes=row.obslog_notes,
    ))


@static_check_init_args
class VisitDetail(VisitBase):
    notes: list[VisitNote]
    sps: Optional[SpsVisit]
    mcs: Optional[McsVisit]
    agc: Optional[AgcVisit]
    sps_sequence: Optional[SpsSequenceDetail]

    Config = OrmConfig[M.pfs_visit]()(lambda row: skip_validation(VisitDetail)(
        id=row.pfs_visit_id,  # type: ignore
        description=row.pfs_visit_description,  # type: ignore
        issued_at=row.issued_at,  # type: ignore
        notes=row.obslog_notes,
        sps=row.sps_visit,
        mcs=None if len(row.mcs_exposure) == 0 else McsVisit(exposures=row.mcs_exposure),
        agc=None if len(row.agc_exposure) == 0 else AgcVisit(exposures=row.agc_exposure),
        sps_sequence=row.visit_set.iic_sequence if row.visit_set else None,
    ))


class VisitListEntry(VisitBase):
    visit_set_id: Optional[int]
    n_sps_exposures: int
    n_mcs_exposures: int
    n_agc_exposures: int
    avg_exptime: Optional[float]
    avg_azimuth: Optional[float]
    avg_altitude: Optional[float]
    avg_insrot: Optional[float]
    notes: list[VisitNote]


@static_check_init_args
class VisitSetBase(BaseModel):
    id: int
    visit_id: int

    Config = OrmConfig[M.visit_set]()(lambda row: skip_validation(VisitSetBase)(
        id=row.iic_sequence_id,  # type: ignore
        visit_id=row.pfs_visit_id,  # type: ignore
    ))


@static_check_init_args
class VisitList(BaseModel):
    visits: list[VisitListEntry]
    iic_sequence: list[IicSequence]
    count: int


@router.get('/api/visits', response_model=VisitList)
def index_visits(
    sql: Optional[str] = None,
    offset: int = 0,
    limit: Optional[int] = 50,
    ctx: Context = Depends(),
):
    if limit and limit < 0:
        limit = None

    try:
        visits, count = list_visits(ctx.db, sql, limit, offset)
    except SqlError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error))
    iic_sequence_q = ctx.db.query(M.iic_sequence)\
        .filter(M.iic_sequence.iic_sequence_id.in_(
            ctx.db.query(M.visit_set.iic_sequence_id).filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))
        ))\
        .options(selectinload('obslog_notes'))\
        .options(selectinload('iic_sequence_status'))
    return VisitList(
        visits=visits,
        iic_sequence=[*iic_sequence_q],
        count=count,
    )


@router.get('/api/visits/{id}', response_model=VisitDetail)
def show_visit(
    id: int,
    ctx: Context = Depends(),
):
    return (
        ctx.db.query(M.pfs_visit)
        .filter(M.pfs_visit.pfs_visit_id == id)
        .options(selectinload('sps_visit').selectinload('sps_exposure'))
        .options(selectinload('obslog_notes').selectinload('user'))
        .options(selectinload('sps_visit').selectinload('sps_exposure'))
        .options(selectinload('mcs_exposure').selectinload('obslog_notes').selectinload('user'))
        .options(selectinload('agc_exposure').selectinload('agc_guide_offset'))
        .one()
    )


class VisitRankResponse(BaseModel):
    rank: Optional[int]


@router.get('/api/visits/{id}/rank', response_model=VisitRankResponse)
def visit_rank(
    id: int,
    sql: Optional[str] = None,
    ctx: Context = Depends(),
):
    where = extract_where_clause(sql or 'select *')
    src = (
        select(M.pfs_visit).filter(M.pfs_visit.pfs_visit_id.in_(evaluate_where_clause(where)))
        if where  # frontend always does not send SQL with where clause.
        else select(M.pfs_visit))
    sub = (
        src
        .with_only_columns(M.pfs_visit.pfs_visit_id.label('id'), func.rank().over(order_by=M.pfs_visit.pfs_visit_id.desc()).label('rank'))
        .order_by(M.pfs_visit.pfs_visit_id.desc())
    ).subquery('src')
    rank = ctx.db.execute(select(sub).with_only_columns(sub.c.rank).filter(sub.c.id == id)).scalar_one_or_none()
    return VisitRankResponse(rank=rank)


def list_visits(
    db: Session,
    sql: Optional[str],
    limit: Optional[int],
    offset: Optional[int],
) -> tuple[list[VisitListEntry], int]:
    where = extract_where_clause(sql or 'select *')
    if where:
        id_src = evaluate_where_clause(where)
        count: int = db.execute(
            evaluate_where_clause(where)
            .with_only_columns(func.count(distinct(M.pfs_visit.pfs_visit_id)))
        ).scalar_one()
    else:
        id_src = db.query(M.pfs_visit.pfs_visit_id)
        count: int = db.query(M.pfs_visit).count()

    ids = (
        id_src
        .order_by(M.pfs_visit.pfs_visit_id.desc())
        .limit(limit)
        .offset(offset)
    )

    q2 = (db.query(
        M.pfs_visit,
        M.visit_set.iic_sequence_id,
        func.count(distinct(M.sps_exposure.sps_camera_id)).label('n_sps_exposures'),
        func.count(distinct(M.mcs_exposure.mcs_frame_id)).label('n_mcs_exposures'),
        func.count(distinct(M.agc_exposure.agc_exposure_id)).label('n_agc_exposures'),
        func.coalesce(
            func.avg(M.sps_exposure.exptime),
            func.avg(M.mcs_exposure.mcs_exptime),
        ).label('avg_exptime'),
        func.avg(M.mcs_exposure.azimuth).label('avg_azimuth'),
        func.avg(M.mcs_exposure.altitude).label('avg_altitude'),
        func.avg(M.mcs_exposure.insrot).label('avg_insrot'),
    )\
        .outerjoin(M.mcs_exposure)
        .outerjoin(M.sps_visit)
        .outerjoin(M.sps_exposure)
        .outerjoin(M.visit_set)
        .outerjoin(M.agc_exposure)
        .group_by(M.pfs_visit, M.visit_set.iic_sequence_id)
        .options(selectinload('obslog_notes').selectinload('user'))
        .filter(M.pfs_visit.pfs_visit_id.in_(ids))
        .order_by(M.pfs_visit.pfs_visit_id.desc())
    )

    visits = [
        VisitListEntry(
            **VisitBase.Config.row_to_model(row.pfs_visit).dict(),  # type: ignore
            visit_set_id=row.iic_sequence_id,  # type: ignore
            n_sps_exposures=row.n_sps_exposures,  # type: ignore
            n_mcs_exposures=row.n_mcs_exposures,  # type: ignore
            n_agc_exposures=row.n_agc_exposures,  # type: ignore
            avg_exptime=row.avg_exptime,  # type: ignore
            avg_azimuth=row.avg_azimuth,  # type: ignore
            avg_altitude=row.avg_altitude,  # type: ignore
            avg_insrot=row.avg_insrot,  # type: ignore
            notes=row.pfs_visit.obslog_notes,  # type: ignore
        ) for row in q2
    ]

    return visits, count
