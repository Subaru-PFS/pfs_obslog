from __future__ import annotations

from collections import OrderedDict
from datetime import date, datetime, timedelta
from re import split
from typing import Any, Dict, Iterable, List, Match, Optional, Tuple, cast

from pydantic import BaseModel
from sqlalchemy.orm import Query, selectinload
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.expression import distinct, or_

from ..database import models
from ..opdb import models as opdbmodels


def query_visit_sets(
    db: Session, *,
    include_sps: bool,
    include_mcs: bool,
    page: int,
    date_start: date = None,
    date_end: date = None,
    sql: Optional[str] = None,
):
    per_page = 100

    q_which: Query = db.query(distinct(opdbmodels.pfs_visit.pfs_visit_id)).\
        outerjoin(opdbmodels.sps_visit).\
        outerjoin(opdbmodels.sps_exposure).\
        outerjoin(opdbmodels.visit_set).\
        outerjoin(opdbmodels.sps_sequence).\
        outerjoin(opdbmodels.mcs_exposure)

    if not include_sps:
        q_which = q_which.filter(opdbmodels.sps_visit.pfs_visit_id == None)
    if not include_mcs:
        q_which = q_which.filter(opdbmodels.mcs_exposure.pfs_visit_id == None)

    if sql is not None:
        q_which = apply_fulltext_search(q_which, sql)

    q_which = apply_date_condition(q_which, date_start, date_end)
    q_which = q_which.order_by(opdbmodels.pfs_visit.pfs_visit_id.desc())
    q_which = q_which[page * per_page: (page + 1) * per_page]  # type: ignore

    return make_visit_sets(db, (row[0] for row in q_which))


def make_visit_sets(db: Session, visit_ids: Iterable):
    q_data = db.query(opdbmodels.pfs_visit).\
        filter(opdbmodels.pfs_visit.pfs_visit_id.in_(visit_ids)).\
        options(selectinload('sps_visit')).\
        options(selectinload('obslog_notes')).\
        options(selectinload('sps_visit.sps_exposure')).\
        options(selectinload('sps_visit.visit_set')).\
        options(selectinload('sps_visit.visit_set.sps_sequence')).\
        options(selectinload('sps_visit.visit_set.sps_sequence.obslog_notes')).\
        options(selectinload('mcs_exposure')).\
        options(selectinload('mcs_exposure.obslog_notes'))
    visit_sets: OrderedDict[int, VisitSet] = OrderedDict()
    for visit in cast(Iterable[opdbmodels.pfs_visit], q_data):
        if visit.sps_visit and visit.sps_visit.visit_set:
            visit_set_id = visit.sps_visit.visit_set.visit_set_id
            if visit_set_id not in visit_sets:
                visit_sets[visit_set_id] = VisitSet.from_row(visit.sps_visit.visit_set.sps_sequence)
            visit_set = visit_sets[visit_set_id]
        else:
            visit_set = VisitSet(id=-visit.pfs_visit_id, visits=[])
            visit_sets[visit_set.id] = visit_set
        visit_set.visits.append(Visit.from_row(visit))
    return list(visit_sets.values())


def apply_date_condition(q: Query, start: Optional[date], end: Optional[date]):
    if start is not None:
        q = q.filter(or_(
            opdbmodels.sps_exposure.time_exp_end >= start,
            opdbmodels.mcs_exposure.taken_at >= start,
        ))
    if end is not None:
        q = q.filter(or_(
            opdbmodels.sps_exposure.time_exp_start <= end + timedelta(days=1),
            opdbmodels.mcs_exposure.taken_at <= end + timedelta(days=1),
        ))
    return q


def apply_fulltext_search(q: Query, sql: str):
    q = q.outerjoin(models.VisitSetNote)
    q = q.outerjoin(models.VisitNote)
    q = q.outerjoin(models.McsExposureNote)
    for s in smart_split(sql):
        q = q.filter(or_(
            opdbmodels.sps_sequence.cmd_str.ilike(f'%{s}%'),
            models.VisitSetNote.body.ilike(f'%{s}%'),
            models.VisitNote.body.ilike(f'%{s}%'),
            models.McsExposureNote.body.ilike(f'%{s}%'),
        ))
    return q


def smart_split(q: str):
    import re
    words: List[str] = []

    def pick(m: Match):
        words.append(m.group(1))
        return ''
    if q.count('"') % 2 == 0:
        q = re.sub(r'"(.*?)"', pick, q)
    return set(words + q.split())


class User(BaseModel):
    id: int
    name: str

    @classmethod
    def from_row(cls, row: models.User):
        return cls(
            id=row.id,
            name=row.email.split('@')[0],
        )


class NoteBase(BaseModel):
    id: int
    body: str
    user: Optional[User]

    @classmethod
    def from_row(cls, row):
        return cls(id=row.id, body=row.body, user=User.from_row(row.user) if row.user else None)


class VisitSetNote(NoteBase):
    pass


class SpsSequence(BaseModel):
    id: int
    name: str
    sequence_type: str
    comments: str
    cmd_str: str
    status: str
    notes: List[VisitSetNote]


class SpsExposure(BaseModel):
    camera_id: int
    exptime: float
    exp_start: datetime
    exp_end: datetime

    @ classmethod
    def from_row(cls, row: opdbmodels.sps_exposure):
        return cls(
            camera_id=row.sps_camera_id,
            exptime=row.exptime,
            exp_start=row.time_exp_start,
            exp_end=row.time_exp_end,
        )


class SpsVisit(BaseModel):
    exp_type: str
    exposures: List[SpsExposure]

    @ classmethod
    def from_row(cls, row: opdbmodels.sps_visit):
        return cls(
            exp_type=row.exp_type,
            exposures=[SpsExposure.from_row(e) for e in row.sps_exposure],
        )


class McsExposureNote(NoteBase):
    pass


class McsExposure(BaseModel):
    frame_id: int
    exptime: Optional[float]
    altitude: Optional[float]
    azimuth: Optional[float]
    insrot: Optional[float]
    adc_pa: Optional[float]
    dome_temperature: Optional[float]
    dome_pressure: Optional[float]
    dome_humidity: Optional[float]
    outside_temperature: Optional[float]
    outside_pressure: Optional[float]
    outside_humidity: Optional[float]
    mcs_cover_temperature: Optional[float]
    mcs_m1_temperature: Optional[float]
    taken_at: datetime
    notes: List[McsExposureNote]

    @ classmethod
    def from_row(cls, row: opdbmodels.mcs_exposure):
        return cls(
            frame_id=row.mcs_frame_id,
            exptime=row.mcs_exptime,
            altitude=row.altitude,
            azimuth=row.azimuth,
            insrot=row.insrot,
            adc_pa=row.adc_pa,
            dome_temperature=row.dome_temperature,
            dome_pressure=row.dome_pressure,
            dome_humidity=row.dome_humidity,
            outside_temperature=row.outside_temperature,
            outside_pressure=row.outside_pressure,
            outside_humidity=row.outside_humidity,
            mcs_cover_temperature=row.mcs_cover_temperature,
            mcs_m1_temperature=row.mcs_m1_temperature,
            taken_at=row.taken_at,
            notes=[VisitSetNote.from_row(n) for n in row.obslog_notes],  # type: ignore
        )


class VisitNote(NoteBase):
    pass


class Visit(BaseModel):
    id: int
    description: Optional[str]
    sps_visit: Optional[SpsVisit]
    mcs_exposures: List[McsExposure]
    notes: List[VisitNote]

    @ classmethod
    def from_row(cls, row: opdbmodels.pfs_visit):
        return cls(
            id=row.pfs_visit_id,
            description=row.pfs_visit_description,
            sps_visit=row.sps_visit and SpsVisit.from_row(row.sps_visit) or None,
            mcs_exposures=[McsExposure.from_row(e) for e in row.mcs_exposure],
            notes=[VisitSetNote.from_row(n) for n in row.obslog_notes],  # type: ignore
        )


class VisitSet(BaseModel):
    '''
    set of visit.
    represents sps_sequence entity for sps_visits
    '''
    id: int
    sps_sequence: Optional[SpsSequence]
    visits: List[Visit]

    @ classmethod
    def from_row(cls, row: opdbmodels.sps_sequence):
        return cls(
            id=row.visit_set_id,
            visits=[],
            sps_sequence=SpsSequence(
                id=row.visit_set_id,
                name=row.name,
                sequence_type=row.sequence_type,
                comments=row.comments,
                cmd_str=row.cmd_str,
                status=row.status,
                notes=[VisitSetNote.from_row(n) for n in row.obslog_notes],  # type: ignore
            ))
