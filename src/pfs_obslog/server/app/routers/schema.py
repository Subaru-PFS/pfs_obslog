from datetime import datetime
from typing import Optional

from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.orm import orm_getter_dict
from pydantic import BaseModel


class VisitNote(BaseModel):
    id: int
    user_id: int
    pfs_visit_id: int
    body: str

    class Config:
        orm_mode = True


class SpsExposure(BaseModel):
    camera_id: int
    exptime: float
    exp_start: datetime
    exp_end: datetime

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row):
                return SpsExposure(
                    camera_id=row.sps_camera_id,
                    exptime=row.exptime,
                    exp_start=row.time_exp_start,
                    exp_end=row.exptime,
                )


class SpsVisit(BaseModel):
    exp_type: str
    exposures: list[SpsExposure]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row):
                return SpsVisit(
                    exp_type=row.exp_type,
                    exposures=row.sps_exposure,
                )


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
    # notes: List[McsExposureNote]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.mcs_exposure):
                return McsExposure(
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
                    # notes=[VisitSetNote.from_row(n) for n in row.obslog_notes],  # type: ignore
                )


class McsVisit(BaseModel):
    exposures: list[McsExposure]


class Visit(BaseModel):
    id: int
    description: str
    issued_at: datetime

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.pfs_visit):
                return Visit(
                    id=row.pfs_visit_id,
                    description=row.pfs_visit_description,
                    issued_at=row.issued_at,
                )


class VisitDetail(Visit):
    notes: list[VisitNote]
    sps_visit: Optional[SpsVisit]
    mcs_visit: Optional[McsVisit]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.pfs_visit):
                return VisitDetail(
                    id=row.pfs_visit_id,
                    description=row.pfs_visit_description,
                    issued_at=row.issued_at,
                    notes=row.obslog_notes,
                    sps_visit=row.sps_visit,
                    mvs_visit=None if len(row.mcs_exposure) == 0 else McsVisit(exposures=row.mcs_exposure),
                )
