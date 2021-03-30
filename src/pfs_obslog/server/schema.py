from datetime import datetime
from typing import Optional

from opdb import models as M
from pfs_obslog.server.orm import orm_getter_dict, static_check_init_args
from pydantic import BaseModel


@static_check_init_args
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


@static_check_init_args
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


@static_check_init_args
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
    # notes: list[McsExposureNote]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.mcs_exposure):
                return McsExposure(
                    frame_id=row.mcs_frame_id,
                    exptime=row.mcs_exptime,  # type: ignore
                    altitude=row.altitude,  # type: ignore
                    azimuth=row.azimuth,  # type: ignore
                    insrot=row.insrot,  # type: ignore
                    adc_pa=row.adc_pa,  # type: ignore
                    dome_temperature=row.dome_temperature,  # type: ignore
                    dome_pressure=row.dome_pressure,  # type: ignore
                    dome_humidity=row.dome_humidity,  # type: ignore
                    outside_temperature=row.outside_temperature,  # type: ignore
                    outside_pressure=row.outside_pressure,  # type: ignore
                    outside_humidity=row.outside_humidity,  # type: ignore
                    mcs_cover_temperature=row.mcs_cover_temperature,  # type: ignore
                    mcs_m1_temperature=row.mcs_m1_temperature,  # type: ignore
                    taken_at=row.taken_at,
                    # notes=[VisitSetNote.from_row(n) for n in row.obslog_notes],  # type: ignore
                )


@static_check_init_args
class McsVisit(BaseModel):
    exposures: list[McsExposure]


@static_check_init_args
class VisitNote(BaseModel):
    id: int
    user_id: int
    pfs_visit_id: int
    body: str

    class Config:
        orm_mode = True


@static_check_init_args
class Visit(BaseModel):
    id: int
    description: Optional[str]
    issued_at: Optional[datetime]

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.pfs_visit):
                return Visit(
                    id=row.pfs_visit_id,
                    description=row.pfs_visit_description,
                    issued_at=row.issued_at,
                )


@static_check_init_args
class SpsSequence(BaseModel):
    sequence_type: Optional[str]
    name: Optional[str]
    comments: Optional[str]
    cmd_str: Optional[str]
    status: Optional[str]

    class Config:
        orm_mode = True


@static_check_init_args
class VisitSet(BaseModel):
    id: int
    visit_id: int

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row: M.visit_set):
                return VisitSet(
                    id=row.visit_set_id,
                    visit_id=row.pfs_visit_id,
                )
