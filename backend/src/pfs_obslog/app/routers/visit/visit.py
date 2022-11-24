from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from opdb import models as M
from pydantic.main import BaseModel
from sqlalchemy import distinct, func, select, union_all
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.session import Session

from pfs_obslog.app.context import Context
from pfs_obslog.orm import OrmConfig, skip_validation
from pfs_obslog.parsesql.ast import SqlError
from pfs_obslog.schema import (AgcVisit, IicSequence, McsVisit, SpsSequence,
                               SpsVisit, VisitBase, VisitNote, VisitSetNote)
from pfs_obslog.visitquery import evaluate_where_clause, extract_where_clause

logger = getLogger(__name__)
router = APIRouter()


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
    avg_ra: Optional[float]
    avg_dec: Optional[float]
    avg_insrot: Optional[float]
    notes: list[VisitNote]


class VisitSetBase(BaseModel):
    id: int
    visit_id: int

    Config = OrmConfig[M.visit_set]()(lambda row: skip_validation(VisitSetBase)(
        id=row.iic_sequence_id,  # type: ignore
        visit_id=row.pfs_visit_id,  # type: ignore
    ))


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
        id_src = select(M.pfs_visit.pfs_visit_id)
        count: int = db.execute(select(func.count()).select_from(M.pfs_visit)).scalar_one()

    ids = [id for id, in db.execute(
        id_src
        .order_by(M.pfs_visit.pfs_visit_id.desc())
        .limit(limit)
        .offset(offset)
    )]
    visits = visit_list_entries(db, ids)
    return visits, count


def visit_list_entries(db: Session, id_list: list[int]) -> list[VisitListEntry]:
    ids = select('*').select_from(union_all(*(select(id) for id in id_list)).cte())
    pfs_visit = (
        select(M.pfs_visit)
        .filter(M.pfs_visit.pfs_visit_id.in_(ids))
        .subquery()
    )
    mcs_exposure = (
        select(
            M.mcs_exposure.pfs_visit_id,
            func.avg(M.mcs_exposure.mcs_exptime).label('mcs_exposure_avg_exptime'),
            func.count().label('mcs_exposure_count'),
        )
        .filter(M.mcs_exposure.pfs_visit_id.in_(ids))
        .group_by(M.mcs_exposure.pfs_visit_id)
        .subquery('mcs_exposure')
    )
    sps_exposure = (
        select(
            M.sps_exposure.pfs_visit_id,
            func.avg(M.sps_exposure.exptime).label('sps_exposure_avg_exptime'),
            func.count().label('sps_exposure_count'),
        )
        .filter(M.sps_exposure.pfs_visit_id.in_(ids))
        .group_by(M.sps_exposure.pfs_visit_id)
        .subquery('sps_exposure')
    )
    agc_exposure = (
        select(
            M.agc_exposure.pfs_visit_id,
            func.avg(M.agc_exposure.agc_exptime).label('agc_exposure_avg_exptime'),
            func.count().label('agc_exposure_count'),
        )
        .filter(M.agc_exposure.pfs_visit_id.in_(ids))
        .group_by(M.agc_exposure.pfs_visit_id)
        .subquery('agc_exposure')
    )
    tel_status = (
        select(
            M.tel_status.pfs_visit_id,
            func.avg(M.tel_status.altitude).label('tel_status_altitude'),
            func.avg(M.tel_status.azimuth).label('tel_status_azimuth'),
            func.avg(M.tel_status.insrot).label('tel_status_insrot'),
            func.avg(M.tel_status.tel_ra).label('tel_status_ra'),
            func.avg(M.tel_status.tel_dec).label('tel_status_dec'),
        )
        .filter(M.tel_status.pfs_visit_id.in_(ids))
        .group_by(M.tel_status.pfs_visit_id)
        .subquery('tel_status')
    )
    q = (
        db.query(
            M.pfs_visit,
            mcs_exposure,
            sps_exposure,
            agc_exposure,
            tel_status,
            M.sps_visit,
            M.visit_set,
        )
        .filter(M.pfs_visit.pfs_visit_id.in_(ids))
        .order_by(M.pfs_visit.pfs_visit_id.desc())
        .options(selectinload('obslog_notes').selectinload('user'))
        .outerjoin(mcs_exposure, mcs_exposure.c.pfs_visit_id == M.pfs_visit.pfs_visit_id)
        .outerjoin(sps_exposure, sps_exposure.c.pfs_visit_id == M.pfs_visit.pfs_visit_id)
        .outerjoin(agc_exposure, agc_exposure.c.pfs_visit_id == M.pfs_visit.pfs_visit_id)
        .outerjoin(tel_status, tel_status.c.pfs_visit_id == M.pfs_visit.pfs_visit_id)
        .outerjoin(M.sps_visit, M.sps_visit.pfs_visit_id == M.pfs_visit.pfs_visit_id)
        .outerjoin(M.visit_set, M.visit_set.pfs_visit_id == M.pfs_visit.pfs_visit_id)
    )
    visits = [
        VisitListEntry(
            id=row.pfs_visit.pfs_visit_id,  # type: ignore
            description=row.pfs_visit.pfs_visit_description,  # type: ignore
            issued_at=row.pfs_visit.issued_at,  # type: ignore
            visit_set_id=row.visit_set.iic_sequence_id if row.visit_set else None,  # type: ignore
            n_sps_exposures=row.sps_exposure_count or 0,  # type: ignore
            n_mcs_exposures=row.mcs_exposure_count or 0,  # type: ignore
            n_agc_exposures=row.agc_exposure_count or 0,  # type: ignore
            avg_exptime=(
                row.sps_exposure_avg_exptime or  # type: ignore
                row.mcs_exposure_avg_exptime or  # type: ignore
                row.agc_exposure_avg_exptime  # type: ignore
            ),
            avg_azimuth=row.tel_status_azimuth,  # type: ignore
            avg_altitude=row.tel_status_altitude,  # type: ignore
            avg_insrot=row.tel_status_insrot,  # type: ignore
            avg_ra=row.tel_status_ra,  # type: ignore
            avg_dec=row.tel_status_dec,  # type: ignore
            notes=row.pfs_visit.obslog_notes,  # type: ignore
        ) for row in q
    ]
    return visits
