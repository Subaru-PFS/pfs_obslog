from datetime import datetime
from typing import Optional

from opdb import models as M
from sqlalchemy.sql.sqltypes import Enum
from pfs_obslog.server.orm import (OrmConfig, skip_validation,
                                   static_check_init_args)
from pydantic import BaseModel


@static_check_init_args
class SpsAnnotation(BaseModel):
    data_flag: int
    notes: str
    annotation_id: int
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


@static_check_init_args
class SpsExposure(BaseModel):
    camera_id: int
    exptime: float
    exp_start: datetime
    exp_end: datetime
    annotation: list[SpsAnnotation]

    Config = OrmConfig[M.sps_exposure]()(lambda row: skip_validation(SpsExposure)(
        camera_id=row.sps_camera_id,
        exptime=row.exptime,  # type: ignore
        exp_end=row.time_exp_end,
        exp_start=row.time_exp_end,
        annotation=row.sps_annotation,
    ))


@static_check_init_args
class SpsVisit(BaseModel):
    exp_type: str
    exposures: list[SpsExposure]

    Config = OrmConfig[M.sps_visit]()(lambda row: skip_validation(SpsVisit)(
        exp_type=row.exp_type,
        exposures=row.sps_exposure,
    ))


@static_check_init_args
class ObslogUser(BaseModel):
    id: int
    account_name: str

    class Config:
        orm_mode = True


@static_check_init_args
class McsExposureNote(BaseModel):
    id: int
    body: str
    user: ObslogUser

    class Config:
        orm_mode = True


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
    notes: list[McsExposureNote]

    Config = OrmConfig[M.mcs_exposure]()(lambda row: (skip_validation(McsExposure)(
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
        notes=row.obslog_notes,
    )))


@static_check_init_args
class McsVisit(BaseModel):
    exposures: list[McsExposure]


@static_check_init_args
class AgcGuideOffset(BaseModel):
    ra: Optional[float]
    dec: Optional[float]
    pa: Optional[float]
    delta_ra: Optional[float]
    delta_dec: Optional[float]
    delta_insrot: Optional[float]
    delta_az: Optional[float]
    delta_el: Optional[float]
    delta_z: Optional[float]
    delta_z1: Optional[float]
    delta_z2: Optional[float]
    delta_z3: Optional[float]
    delta_z4: Optional[float]
    delta_z5: Optional[float]
    delta_z6: Optional[float]

    Config = OrmConfig[M.agc_guide_offset]()(lambda row: (skip_validation(AgcGuideOffset)(
        ra=row.guide_ra,  # type: ignore
        dec=row.guide_dec,  # type: ignore
        pa=row.guide_pa,  # type: ignore
        delta_ra=row.guide_delta_ra,  # type: ignore
        delta_dec=row.guide_delta_dec,  # type: ignore
        delta_insrot=row.guide_delta_insrot,  # type: ignore
        delta_az=row.guide_delta_az,  # type: ignore
        delta_el=row.guide_delta_el,  # type: ignore
        delta_z=row.guide_delta_z,  # type: ignore
        delta_z1=row.guide_delta_z1,  # type: ignore
        delta_z2=row.guide_delta_z2,  # type: ignore
        delta_z3=row.guide_delta_z3,  # type: ignore
        delta_z4=row.guide_delta_z4,  # type: ignore
        delta_z5=row.guide_delta_z5,  # type: ignore
        delta_z6=row.guide_delta_z6,  # type: ignore
    )))


@static_check_init_args
class AgcExposure(BaseModel):
    id: int
    exptime: Optional[float]
    altitude: Optional[float]
    azimuth: Optional[float]
    insrot: Optional[float]
    adc_pa: Optional[float]
    m2_pos3: Optional[float]
    outside_temperature: Optional[float]
    outside_pressure: Optional[float]
    outside_humidity: Optional[float]
    measurement_algorithm: Optional[str]
    version_actor: Optional[str]
    version_instdata: Optional[str]
    taken_at: Optional[datetime]
    guide_offset: Optional[AgcGuideOffset]

    Config = OrmConfig[M.agc_exposure]()(lambda row: (skip_validation(AgcExposure)(
        id=row.agc_exposure_id,
        exptime=row.agc_exptime,  # type: ignore
        altitude=row.altitude,  # type: ignore
        azimuth=row.azimuth,  # type: ignore
        insrot=row.insrot,  # type: ignore
        adc_pa=row.adc_pa,  # type: ignore
        m2_pos3=row.m2_pos3,  # type: ignore
        outside_temperature=row.outside_temperature,  # type: ignore
        outside_pressure=row.outside_pressure,  # type: ignore
        outside_humidity=row.outside_humidity,  # type: ignore
        measurement_algorithm=row.measurement_algorithm,
        version_actor=row.version_actor,
        version_instdata=row.version_instdata,
        taken_at=row.taken_at,
        guide_offset=row.agc_guide_offset,
    )))


@static_check_init_args
class AgcVisit(BaseModel):
    exposures: list[AgcExposure]


@static_check_init_args
class VisitNote(BaseModel):
    id: int
    user_id: int
    pfs_visit_id: int
    body: str
    user: ObslogUser

    class Config:
        orm_mode = True


@static_check_init_args
class VisitSetNote(BaseModel):
    id: int
    user_id: int
    visit_set_id: int
    body: str
    user: ObslogUser

    class Config:
        orm_mode = True


@static_check_init_args
class IicSequenceStatus(BaseModel):
    visit_set_id: int
    status_flag: Optional[int]
    cmd_output: Optional[str]

    Config = OrmConfig[M.iic_sequence_status]()(lambda row: skip_validation(IicSequenceStatus)(
        visit_set_id=row.visit_set_id,
        status_flag=row.status_flag,
        cmd_output=row.cmd_output,
    ))


@static_check_init_args
class IicSequence(BaseModel):
    visit_set_id: int
    sequence_type: Optional[str]
    name: Optional[str]
    comments: Optional[str]
    cmd_str: Optional[str]
    status: Optional[IicSequenceStatus]
    notes: list[VisitSetNote]

    Config = OrmConfig[M.iic_sequence]()(lambda row: skip_validation(SpsSequence)(
        visit_set_id=row.visit_set_id,
        sequence_type=row.sequence_type,
        name=row.name,
        comments=row.comments,
        cmd_str=row.cmd_str,
        status=row.iic_sequence_status,
        notes=row.obslog_notes,
    ))


SpsSequence = IicSequence


@static_check_init_args
class VisitSet(BaseModel):
    id: int
    visit_id: int
    sps_sequence: SpsSequence

    Config = OrmConfig[M.visit_set]()(lambda row: skip_validation(VisitSet)(
        id=row.visit_set_id,
        visit_id=row.pfs_visit_id,
        sps_sequence=row.iic_sequence,
    ))


@static_check_init_args
class VisitBase(BaseModel):
    id: int
    description: Optional[str]
    issued_at: Optional[datetime]

    Config = OrmConfig[M.pfs_visit]()(lambda row: skip_validation(VisitBase)(
        id=row.pfs_visit_id,
        description=row.pfs_visit_description,
        issued_at=row.issued_at,
    ))
