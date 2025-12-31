from typing import Optional
import datetime

from sqlalchemy import ARRAY, BigInteger, Boolean, Column, DateTime, Double, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, REAL, String, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class BeamSwitchMode(Base):
    __tablename__ = 'beam_switch_mode'
    __table_args__ = (
        PrimaryKeyConstraint('beam_switch_mode_id', name='beam_switch_mode_pkey'),
        UniqueConstraint('beam_switch_mode_id', name='beam_switch_mode_beam_switch_mode_id_key')
    )

    beam_switch_mode_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    beam_switch_mode_name: Mapped[Optional[str]] = mapped_column(String)
    beam_switch_mode_description: Mapped[Optional[str]] = mapped_column(String)


class CloudCondition(Base):
    __tablename__ = 'cloud_condition'
    __table_args__ = (
        PrimaryKeyConstraint('cloud_condition_id', name='cloud_condition_pkey'),
        UniqueConstraint('cloud_condition_id', name='cloud_condition_cloud_condition_id_key')
    )

    cloud_condition_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cloud_condition_name: Mapped[Optional[str]] = mapped_column(String)
    cloud_condition_description: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    obs_condition: Mapped[list['ObsCondition']] = relationship('ObsCondition', back_populates='cloud_condition')


class Cobra(Base):
    __tablename__ = 'cobra'
    __table_args__ = (
        PrimaryKeyConstraint('cobra_id', name='cobra_pkey'),
        UniqueConstraint('cobra_id', name='cobra_cobra_id_key')
    )

    cobra_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Cobra identifier (1..2394). There is one of these for each science fiber.')
    field_on_pfi: Mapped[Optional[int]] = mapped_column(Integer, comment='Field (1..3).')
    cobra_in_field: Mapped[Optional[int]] = mapped_column(Integer, comment='Cobra-in-field (1..798). cf = 57*(mf-1)+cm.')
    module_in_field: Mapped[Optional[int]] = mapped_column(Integer, comment='Module-in-field (1..14). The number of the module within the field, with 1 at the center of the PFI.')
    cobra_in_module: Mapped[Optional[int]] = mapped_column(Integer, comment='Cobra-in-module (1..57). 1 is the bottom-left cobra in a module when looked at with the wide (29-cobra) board down. Increasing as you move across the module.')
    version: Mapped[Optional[str]] = mapped_column(String)
    cobra_board_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Cobra board id (1..84). One Cobra module has two boards.')
    cobra_in_board: Mapped[Optional[int]] = mapped_column(Integer, comment='Cobra-in-board (1..29). Each board has either 29 or 28 cobras.')
    cobra_module_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Cobra module id (1..42)')
    fiber_id: Mapped[Optional[int]] = mapped_column(Integer, comment='The fiber identifier (1..2604). This is a unique identifier for each fiber (both science and engineering). fiberId = 651*(sp-1)+fh.')
    mtp: Mapped[Optional[str]] = mapped_column(String(3), comment='Cobra module id associated with MTP ferrule. There are 84 of these, numbered 1 through 42 with A and B suffixes. (e.g.,13B)')
    mtp_a_id: Mapped[Optional[str]] = mapped_column(String, comment='Identifier of the USCONNEC connector hole at the Cable B-C interface. MTP = A)')
    mtp_ba_id: Mapped[Optional[str]] = mapped_column(String, comment='Identifier of the USCONNEC connector hole at the Cable B-C interface. MTP = BA)')
    mtp_bc_id: Mapped[Optional[str]] = mapped_column(String, comment='Identifier of the USCONNEC connector hole at the Cable B-C interface. MTP = BC)')
    mtp_c_id: Mapped[Optional[str]] = mapped_column(String, comment='Identifier of the USCONNEC connector hole at the Cable B-C interface. MTP = C)')
    science_fiber_id: Mapped[Optional[int]] = mapped_column(Integer, comment=' Science fiber (1..2394). This is a unique identifier for each science fiber.')
    sps_module_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Spectrograph that the cobra feeds (1..4)')
    sps_slit_hole: Mapped[Optional[int]] = mapped_column(Integer, comment='Fiber hole (1..651). This is the position in the spectrograph slit head.')
    sunss_id: Mapped[Optional[str]] = mapped_column(String(4), comment='SuNSS fiber id. ID consists of fiber number and mode (i is imaging, and d is diffuse).')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)


class CobraGeometryCalib(Base):
    __tablename__ = 'cobra_geometry_calib'
    __table_args__ = (
        PrimaryKeyConstraint('cobra_geometry_calib_id', name='cobra_geometry_calib_pkey'),
    )

    cobra_geometry_calib_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calibrated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Date at which the model calibration took place [YYYY-MM-DDhh:mm:ss]')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='Comments')


class CobraMotorAxis(Base):
    __tablename__ = 'cobra_motor_axis'
    __table_args__ = (
        PrimaryKeyConstraint('cobra_motor_axis_id', name='cobra_motor_axis_pkey'),
    )

    cobra_motor_axis_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Motor axis stage number [1,2]')
    cobra_motor_axis_name: Mapped[Optional[str]] = mapped_column(String, comment='Corresponding name for axis [Theta, Phi]')

    cobra_motor_model: Mapped[list['CobraMotorModel']] = relationship('CobraMotorModel', back_populates='cobra_motor_axis')


class CobraMotorCalib(Base):
    __tablename__ = 'cobra_motor_calib'
    __table_args__ = (
        PrimaryKeyConstraint('cobra_motor_calib_id', name='cobra_motor_calib_pkey'),
    )

    cobra_motor_calib_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calibrated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Date at which the model calibration took place [YYYY-MM-DDhh:mm:ss]')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='Comments')

    cobra_motor_model: Mapped[list['CobraMotorModel']] = relationship('CobraMotorModel', back_populates='cobra_motor_calib')


class CobraMotorDirection(Base):
    __tablename__ = 'cobra_motor_direction'
    __table_args__ = (
        PrimaryKeyConstraint('cobra_motor_direction_id', name='cobra_motor_direction_pkey'),
    )

    cobra_motor_direction_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Motor movement direction [0,1]')
    cobra_motor_direction_name: Mapped[Optional[str]] = mapped_column(String, comment='Corresponding name for the movement [Forward, Reverse]')

    cobra_motor_model: Mapped[list['CobraMotorModel']] = relationship('CobraMotorModel', back_populates='cobra_motor_direction')


class FiducialFiber(Base):
    __tablename__ = 'fiducial_fiber'
    __table_args__ = (
        PrimaryKeyConstraint('fiducial_fiber_id', name='fiducial_fiber_pkey'),
    )

    fiducial_fiber_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_on_pfi: Mapped[Optional[int]] = mapped_column(Integer)
    ff_in_field: Mapped[Optional[int]] = mapped_column(Integer)
    ff_type: Mapped[Optional[str]] = mapped_column(String(5))
    ff_id_in_type: Mapped[Optional[int]] = mapped_column(Integer)
    version: Mapped[Optional[str]] = mapped_column(String)
    mask: Mapped[Optional[int]] = mapped_column(Integer)

    fiducial_fiber_geometry: Mapped[list['FiducialFiberGeometry']] = relationship('FiducialFiberGeometry', back_populates='fiducial_fiber')


class FiducialFiberCalib(Base):
    __tablename__ = 'fiducial_fiber_calib'
    __table_args__ = (
        PrimaryKeyConstraint('fiducial_fiber_calib_id', name='fiducial_fiber_calib_pkey'),
    )

    fiducial_fiber_calib_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calibrated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Date of the calibration [YYYY-MM-DDhh:mm:ss]')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='Comments')

    fiducial_fiber_geometry: Mapped[list['FiducialFiberGeometry']] = relationship('FiducialFiberGeometry', back_populates='fiducial_fiber_calib')


class InputCatalog(Base):
    __tablename__ = 'input_catalog'
    __table_args__ = (
        PrimaryKeyConstraint('cat_id', name='input_catalog_pkey'),
        UniqueConstraint('cat_id', name='input_catalog_cat_id_key')
    )

    cat_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    input_catalog_name: Mapped[Optional[str]] = mapped_column(String)
    input_catalog_description: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    guide_stars: Mapped[list['GuideStars']] = relationship('GuideStars', back_populates='cat')


class McsCamera(Base):
    __tablename__ = 'mcs_camera'
    __table_args__ = (
        PrimaryKeyConstraint('mcs_camera_id', name='mcs_camera_pkey'),
    )

    mcs_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='MCS camera identifier [e.g. 0=Canon_50M, 1=RMOD_71M]')
    mcs_camera_name: Mapped[Optional[str]] = mapped_column(String, comment='MCS camera name [e.g. "Canon_50M", "RMOD_71M"]')
    comments: Mapped[Optional[str]] = mapped_column(String)

    mcs_exposure: Mapped[list['McsExposure']] = relationship('McsExposure', back_populates='mcs_camera')


class ObslogUser(Base):
    __tablename__ = 'obslog_user'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='obslog_user_pkey'),
        UniqueConstraint('account_name', name='obslog_user_account_name_key')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_name: Mapped[str] = mapped_column(String, nullable=False)

    obslog_visit_note: Mapped[list['ObslogVisitNote']] = relationship('ObslogVisitNote', back_populates='user')
    obslog_mcs_exposure_note: Mapped[list['ObslogMcsExposureNote']] = relationship('ObslogMcsExposureNote', back_populates='user')
    obslog_visit_set_note: Mapped[list['ObslogVisitSetNote']] = relationship('ObslogVisitSetNote', back_populates='user')


class PfsDesign(Base):
    __tablename__ = 'pfs_design'
    __table_args__ = (
        PrimaryKeyConstraint('pfs_design_id', name='pfs_design_pkey'),
        UniqueConstraint('pfs_design_id', name='pfs_design_pfs_design_id_key')
    )

    pfs_design_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    variant: Mapped[int] = mapped_column(Integer, nullable=False, comment='Counter of which variant of `designId0` we are. Requires `designId0`')
    design_id0: Mapped[int] = mapped_column(BigInteger, nullable=False, comment='pfsDesignId of the pfsDesign we are a variant of. Requires `variant`')
    tile_id: Mapped[Optional[int]] = mapped_column(Integer)
    ra_center_designed: Mapped[Optional[float]] = mapped_column(Double(53))
    dec_center_designed: Mapped[Optional[float]] = mapped_column(Double(53))
    pa_designed: Mapped[Optional[float]] = mapped_column(REAL)
    num_sci_designed: Mapped[Optional[int]] = mapped_column(Integer)
    num_cal_designed: Mapped[Optional[int]] = mapped_column(Integer)
    num_sky_designed: Mapped[Optional[int]] = mapped_column(Integer)
    num_guide_stars: Mapped[Optional[int]] = mapped_column(Integer)
    exptime_tot: Mapped[Optional[float]] = mapped_column(REAL)
    exptime_min: Mapped[Optional[float]] = mapped_column(REAL)
    ets_version: Mapped[Optional[str]] = mapped_column(String)
    ets_assigner: Mapped[Optional[str]] = mapped_column(String)
    designed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    to_be_observed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), comment='Planned observation time creating the pfsDesign')
    is_obsolete: Mapped[Optional[bool]] = mapped_column(Boolean)
    design_name: Mapped[Optional[str]] = mapped_column(String, comment='Human-readable name for the design (designName)')
    pfs_utils_version: Mapped[Optional[str]] = mapped_column(String, comment='pfs_utils version creating the pfsDesign')

    calib: Mapped[list['Calib']] = relationship('Calib', back_populates='pfs_design')
    pfs_design_agc: Mapped[list['PfsDesignAgc']] = relationship('PfsDesignAgc', back_populates='pfs_design')


class PfsVisit(Base):
    __tablename__ = 'pfs_visit'
    __table_args__ = (
        PrimaryKeyConstraint('pfs_visit_id', name='pfs_visit_pkey'),
        UniqueConstraint('pfs_visit_id', name='pfs_visit_pfs_visit_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pfs_visit_description: Mapped[Optional[str]] = mapped_column(String)
    pfs_design_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    issued_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Issued time [YYYY-MM-DDThh:mm:ss]')

    agc_exposure: Mapped[list['AgcExposure']] = relationship('AgcExposure', back_populates='pfs_visit')
    cobra_target: Mapped[list['CobraTarget']] = relationship('CobraTarget', back_populates='pfs_visit')
    env_condition: Mapped[list['EnvCondition']] = relationship('EnvCondition', back_populates='pfs_visit')
    iic_sequence: Mapped[list['IicSequence']] = relationship('IicSequence', secondary='visit_set', back_populates='pfs_visit')
    mcs_exposure: Mapped[list['McsExposure']] = relationship('McsExposure', back_populates='pfs_visit')
    obs_condition: Mapped[list['ObsCondition']] = relationship('ObsCondition', back_populates='pfs_visit')
    obslog_fits_header: Mapped[list['ObslogFitsHeader']] = relationship('ObslogFitsHeader', back_populates='pfs_visit')
    obslog_visit_note: Mapped[list['ObslogVisitNote']] = relationship('ObslogVisitNote', back_populates='pfs_visit')
    tel_status: Mapped[list['TelStatus']] = relationship('TelStatus', back_populates='pfs_visit')
    pfs_config_sps: Mapped[list['PfsConfigSps']] = relationship('PfsConfigSps', back_populates='pfs_visit')


class SequenceGroup(Base):
    __tablename__ = 'sequence_group'
    __table_args__ = (
        PrimaryKeyConstraint('group_id', name='sequence_group_pkey'),
    )

    group_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Group identifier')
    group_name: Mapped[Optional[str]] = mapped_column(String, comment='Group name')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Creation time [YYYY-MM-DDThh:mm:ss]')

    iic_sequence: Mapped[list['IicSequence']] = relationship('IicSequence', back_populates='group')


class SpsModule(Base):
    __tablename__ = 'sps_module'
    __table_args__ = (
        PrimaryKeyConstraint('sps_module_id', name='sps_module_pkey'),
        UniqueConstraint('sps_module_id', name='sps_module_sps_module_id_key')
    )

    sps_module_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS module identifier [1-4]')
    description: Mapped[Optional[str]] = mapped_column(String, comment='SpS module name')

    sps_camera: Mapped[list['SpsCamera']] = relationship('SpsCamera', back_populates='sps_module')


class SpsSequence(Base):
    __tablename__ = 'sps_sequence'
    __table_args__ = (
        PrimaryKeyConstraint('visit_set_id', name='sps_sequence_pkey'),
        UniqueConstraint('visit_set_id', name='sps_sequence_visit_set_id_key')
    )

    visit_set_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS visit set identifier')
    sequence_type: Mapped[Optional[str]] = mapped_column(String, comment='SpS sequence type')
    name: Mapped[Optional[str]] = mapped_column(String, comment='The unique name assigned to this set of visits')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='Comments for the sequence')
    cmd_str: Mapped[Optional[str]] = mapped_column(String, comment='ICS command string that generates exposures for this set of visits')
    status: Mapped[Optional[str]] = mapped_column(String, comment='Status of the sequence')


t_test = Table(
    'test', Base.metadata,
    Column('id', Integer),
    Column('value', REAL)
)


class AgcExposure(Base):
    __tablename__ = 'agc_exposure'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='agc_exposure_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('agc_exposure_id', name='agc_exposure_pkey'),
        UniqueConstraint('agc_exposure_id', name='agc_exposure_agc_exposure_id_key')
    )

    agc_exposure_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC exposure number identifier')
    pfs_visit_id: Mapped[Optional[int]] = mapped_column(Integer, comment='PFS visit identifier')
    agc_exptime: Mapped[Optional[float]] = mapped_column(REAL, comment='The exposure time for the frame [sec]')
    altitude: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope altitude [deg]')
    azimuth: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope azimuth [deg]')
    insrot: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope instrument rotation angle [deg]')
    adc_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='ADC PA at which the exposure started [deg]')
    m2_pos3: Mapped[Optional[float]] = mapped_column(REAL, comment='Hexapod position [mm]')
    outside_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside temperature [K]')
    outside_pressure: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside pressure [hPa]')
    outside_humidity: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside humidity [%]')
    taken_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='The time at which the exposure was taken [YYYY-MM-DDThh-mm-sss]')
    measurement_algorithm: Mapped[Optional[str]] = mapped_column(String, comment='Spot measurement algorithm (windowed/sep)')
    version_actor: Mapped[Optional[str]] = mapped_column(String, comment='Version of the actor')
    version_instdata: Mapped[Optional[str]] = mapped_column(String, comment='Version of the pfs_instdata')

    pfs_visit: Mapped[Optional['PfsVisit']] = relationship('PfsVisit', back_populates='agc_exposure')
    agc_data: Mapped[list['AgcData']] = relationship('AgcData', back_populates='agc_exposure')


class Calib(Base):
    __tablename__ = 'calib'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_design_id'], ['pfs_design.pfs_design_id'], name='calib_pfs_design_id_fkey'),
        PrimaryKeyConstraint('calib_id', name='calib_pkey'),
        UniqueConstraint('calib_id', name='calib_calib_id_key')
    )

    calib_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    calib_type: Mapped[Optional[str]] = mapped_column(String)
    sps_frames_to_use: Mapped[Optional[str]] = mapped_column(String)
    calib_date: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    pfs_design_id: Mapped[Optional[int]] = mapped_column(BigInteger)

    pfs_design: Mapped[Optional['PfsDesign']] = relationship('PfsDesign', back_populates='calib')
    calib_set: Mapped[list['CalibSet']] = relationship('CalibSet', foreign_keys='[CalibSet.calib_arcs_id]', back_populates='calib_arcs')
    calib_set_: Mapped[list['CalibSet']] = relationship('CalibSet', foreign_keys='[CalibSet.calib_bias_id]', back_populates='calib_bias')
    calib_set1: Mapped[list['CalibSet']] = relationship('CalibSet', foreign_keys='[CalibSet.calib_dark_id]', back_populates='calib_dark')
    calib_set2: Mapped[list['CalibSet']] = relationship('CalibSet', foreign_keys='[CalibSet.calib_flat_id]', back_populates='calib_flat')


t_cobra_geometry = Table(
    'cobra_geometry', Base.metadata,
    Column('cobra_id', Integer, nullable=False),
    Column('center_x_mm', REAL),
    Column('center_y_mm', REAL),
    Column('cobra_geometry_calib_id', Integer, nullable=False),
    Column('motor_phi_length_mm', REAL),
    Column('motor_phi_limit_in', REAL),
    Column('motor_phi_limit_out', REAL),
    Column('motor_theta_length_mm', REAL),
    Column('motor_theta_limit0', REAL),
    Column('motor_theta_limit1', REAL),
    Column('status', Integer, comment='0x0001=OK/0x0002=INVISIBLE/0x0004=BROKEN_THETA/0x0008=BROKEN_PHI'),
    ForeignKeyConstraint(['cobra_geometry_calib_id'], ['cobra_geometry_calib.cobra_geometry_calib_id'], name='cobra_geometry_cobra_geometry_calib_id_fkey'),
    ForeignKeyConstraint(['cobra_id'], ['cobra.cobra_id'], name='cobra_geometry_cobra_id_fkey'),
    UniqueConstraint('cobra_geometry_calib_id', 'cobra_id', name='cobra_geometry_cobra_geometry_calib_id_cobra_id_key')
)


class CobraMotorModel(Base):
    __tablename__ = 'cobra_motor_model'
    __table_args__ = (
        ForeignKeyConstraint(['cobra_motor_axis_id'], ['cobra_motor_axis.cobra_motor_axis_id'], name='cobra_motor_model_cobra_motor_axis_id_fkey'),
        ForeignKeyConstraint(['cobra_motor_calib_id'], ['cobra_motor_calib.cobra_motor_calib_id'], name='cobra_motor_model_cobra_motor_calib_id_fkey'),
        ForeignKeyConstraint(['cobra_motor_direction_id'], ['cobra_motor_direction.cobra_motor_direction_id'], name='cobra_motor_model_cobra_motor_direction_id_fkey'),
        PrimaryKeyConstraint('cobra_motor_model_id', name='cobra_motor_model_pkey'),
        Index('ix_cobra_motor_model_cobra_id', 'cobra_id'),
        Index('ix_cobra_motor_model_cobra_motor_axis_id', 'cobra_motor_axis_id'),
        Index('ix_cobra_motor_model_cobra_motor_calib_id', 'cobra_motor_calib_id'),
        Index('ix_cobra_motor_model_cobra_motor_direction_id', 'cobra_motor_direction_id')
    )

    cobra_motor_model_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cobra_motor_calib_id: Mapped[Optional[int]] = mapped_column(Integer)
    cobra_id: Mapped[Optional[int]] = mapped_column(Integer, comment='The cobra fiber identifier')
    cobra_motor_axis_id: Mapped[Optional[int]] = mapped_column(Integer)
    cobra_motor_direction_id: Mapped[Optional[int]] = mapped_column(Integer)
    cobra_motor_on_time: Mapped[Optional[float]] = mapped_column(REAL, comment='The ontime level')
    cobra_motor_step_size: Mapped[Optional[float]] = mapped_column(REAL, comment='The step size resolution')
    cobra_motor_frequency: Mapped[Optional[float]] = mapped_column(REAL, comment='The motor frequency')

    cobra_motor_axis: Mapped[Optional['CobraMotorAxis']] = relationship('CobraMotorAxis', back_populates='cobra_motor_model')
    cobra_motor_calib: Mapped[Optional['CobraMotorCalib']] = relationship('CobraMotorCalib', back_populates='cobra_motor_model')
    cobra_motor_direction: Mapped[Optional['CobraMotorDirection']] = relationship('CobraMotorDirection', back_populates='cobra_motor_model')
    cobra_convergence_test: Mapped[list['CobraConvergenceTest']] = relationship('CobraConvergenceTest', back_populates='cobra_motor_model')
    cobra_motor_map: Mapped[list['CobraMotorMap']] = relationship('CobraMotorMap', back_populates='cobra_motor_model')


class CobraTarget(Base):
    __tablename__ = 'cobra_target'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='cobra_target_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_target_pkey'),
        UniqueConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_target_pfs_visit_id_iteration_cobra_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    iteration: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Iteration number for this frame')
    cobra_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Fiber identifier')
    pfs_config_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    pfi_nominal_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Nominal x-position on the PFI as determined from the  pfs_design_fiber table [mm]')
    pfi_nominal_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Nominal y-position on the PFI as determined from the  pfs_design_fiber table [mm]')
    pfi_target_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Target x-position on the PFI for each iteration')
    pfi_target_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Target y-position on the PFI for each iteration')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='flags for movement etc.')

    pfs_visit: Mapped['PfsVisit'] = relationship('PfsVisit', back_populates='cobra_target')


class EnvCondition(Base):
    __tablename__ = 'env_condition'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='env_condition_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'status_sequence_id', name='env_condition_pkey'),
        UniqueConstraint('pfs_visit_id', 'status_sequence_id', name='env_condition_pfs_visit_id_status_sequence_id_key'),
        Index('ix_env_condition_created_at', 'created_at')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status_sequence_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Gen2 status sequence')
    dome_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome temperature [K]')
    dome_pressure: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome pressure [hPa]')
    dome_humidity: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome humidity [%]')
    outside_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside temperature [K]')
    outside_pressure: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside pressure [hPa]')
    outside_humidity: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside humidity [%]')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Issued time [YYYY-MM-DDThh:mm:ss]')

    pfs_visit: Mapped['PfsVisit'] = relationship('PfsVisit', back_populates='env_condition')


class FiducialFiberGeometry(Base):
    __tablename__ = 'fiducial_fiber_geometry'
    __table_args__ = (
        ForeignKeyConstraint(['fiducial_fiber_calib_id'], ['fiducial_fiber_calib.fiducial_fiber_calib_id'], name='fiducial_fiber_geometry_fiducial_fiber_calib_id_fkey'),
        ForeignKeyConstraint(['fiducial_fiber_id'], ['fiducial_fiber.fiducial_fiber_id'], name='fiducial_fiber_geometry_fiducial_fiber_id_fkey'),
        PrimaryKeyConstraint('fiducial_fiber_id', 'fiducial_fiber_calib_id', name='fiducial_fiber_geometry_pkey'),
        UniqueConstraint('fiducial_fiber_id', 'fiducial_fiber_calib_id', name='fiducial_fiber_geometry_fiducial_fiber_id_fiducial_fiber_ca_key')
    )

    fiducial_fiber_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fiducial_fiber_calib_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ff_center_on_pfi_x_mm: Mapped[Optional[float]] = mapped_column(REAL)
    ff_center_on_pfi_y_mm: Mapped[Optional[float]] = mapped_column(REAL)
    ambient_temp: Mapped[Optional[float]] = mapped_column(REAL, comment='Ambient temperature')
    elevation: Mapped[Optional[float]] = mapped_column(REAL, comment='Elevation')

    fiducial_fiber_calib: Mapped['FiducialFiberCalib'] = relationship('FiducialFiberCalib', back_populates='fiducial_fiber_geometry')
    fiducial_fiber: Mapped['FiducialFiber'] = relationship('FiducialFiber', back_populates='fiducial_fiber_geometry')


class GuideStars(Base):
    __tablename__ = 'guide_stars'
    __table_args__ = (
        ForeignKeyConstraint(['cat_id'], ['input_catalog.cat_id'], name='guide_stars_cat_id_fkey'),
        PrimaryKeyConstraint('guide_star_id', name='guide_stars_pkey'),
        UniqueConstraint('guide_star_id', name='guide_stars_guide_star_id_key')
    )

    guide_star_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ra: Mapped[Optional[float]] = mapped_column(Double(53))
    decl: Mapped[Optional[float]] = mapped_column(Double(53))
    cat_id: Mapped[Optional[int]] = mapped_column(Integer)
    obj_type_id: Mapped[Optional[int]] = mapped_column(Integer)
    mag_agc: Mapped[Optional[float]] = mapped_column(REAL)
    flux_agc: Mapped[Optional[float]] = mapped_column(REAL)
    flags: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    cat: Mapped[Optional['InputCatalog']] = relationship('InputCatalog', back_populates='guide_stars')


class IicSequence(Base):
    __tablename__ = 'iic_sequence'
    __table_args__ = (
        ForeignKeyConstraint(['group_id'], ['sequence_group.group_id'], name='iic_sequence_group_id_fkey'),
        PrimaryKeyConstraint('iic_sequence_id', name='iic_sequence_pkey')
    )

    iic_sequence_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Sequence identifier')
    sequence_type: Mapped[Optional[str]] = mapped_column(String, comment='Sequence type')
    name: Mapped[Optional[str]] = mapped_column(String, comment='The unique name assigned to this set of visits')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='Comments for the sequence')
    cmd_str: Mapped[Optional[str]] = mapped_column(String, comment='ICS command string that generates exposures for this set of visits')
    group_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Group identifier')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Creation time [YYYY-MM-DDThh:mm:ss]')

    group: Mapped[Optional['SequenceGroup']] = relationship('SequenceGroup', back_populates='iic_sequence')
    pfs_visit: Mapped[list['PfsVisit']] = relationship('PfsVisit', secondary='visit_set', back_populates='iic_sequence')
    obslog_visit_set_note: Mapped[list['ObslogVisitSetNote']] = relationship('ObslogVisitSetNote', back_populates='iic_sequence')


class McsBoresight(PfsVisit):
    __tablename__ = 'mcs_boresight'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='mcs_boresight_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', name='mcs_boresight_pkey'),
        UniqueConstraint('pfs_visit_id', name='mcs_boresight_pfs_visit_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mcs_boresight_x_pix: Mapped[Optional[float]] = mapped_column(REAL)
    mcs_boresight_y_pix: Mapped[Optional[float]] = mapped_column(REAL)
    calculated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)


class McsExposure(Base):
    __tablename__ = 'mcs_exposure'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_camera_id'], ['mcs_camera.mcs_camera_id'], name='mcs_exposure_mcs_camera_id_fkey'),
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='mcs_exposure_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('mcs_frame_id', name='mcs_exposure_pkey'),
        Index('ix_mcs_exposure_mcs_frame_id', 'mcs_frame_id', unique=True)
    )

    mcs_frame_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='MCS frame identifier as generated from Gen2')
    pfs_visit_id: Mapped[Optional[int]] = mapped_column(Integer)
    mcs_exptime: Mapped[Optional[float]] = mapped_column(REAL, comment='The exposure time for the frame [sec]')
    altitude: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope attitude [deg]')
    azimuth: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope azimuth [deg]')
    insrot: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope instrument rotation angle [deg]')
    adc_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='ADC PA at which the exposure started [deg]')
    dome_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome temperature [K]')
    dome_pressure: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome pressure [hPa]')
    dome_humidity: Mapped[Optional[float]] = mapped_column(REAL, comment='Dome humidity [%]')
    outside_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside temperature [K]')
    outside_pressure: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside pressure [hPa]')
    outside_humidity: Mapped[Optional[float]] = mapped_column(REAL, comment='Outside humidity [%]')
    mcs_cover_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='MCS cover panel temperature [degC]')
    mcs_m1_temperature: Mapped[Optional[float]] = mapped_column(REAL, comment='MCS primary mirror temperature [degC]')
    taken_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='The time at which the exposure was taken [YYYY-MM-DDThh-mm-sss]')
    taken_in_hst_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='The time (in HST) at which the exposure was taken [YYYY-MM-DDThh-mm-sss]')
    mcs_camera_id: Mapped[Optional[int]] = mapped_column(Integer)
    measurement_algorithm: Mapped[Optional[str]] = mapped_column(String, comment='Spot measurement algorithm (windowed/sep)')
    version_actor: Mapped[Optional[str]] = mapped_column(String, comment='Version of the actor')
    version_instdata: Mapped[Optional[str]] = mapped_column(String, comment='Version of the pfs_instdata')

    mcs_camera: Mapped[Optional['McsCamera']] = relationship('McsCamera', back_populates='mcs_exposure')
    pfs_visit: Mapped[Optional['PfsVisit']] = relationship('PfsVisit', back_populates='mcs_exposure')
    mcs_data: Mapped[list['McsData']] = relationship('McsData', back_populates='mcs_frame')
    obslog_mcs_exposure_note: Mapped[list['ObslogMcsExposureNote']] = relationship('ObslogMcsExposureNote', back_populates='mcs_exposure_frame')


class ObsCondition(Base):
    __tablename__ = 'obs_condition'
    __table_args__ = (
        ForeignKeyConstraint(['cloud_condition_id'], ['cloud_condition.cloud_condition_id'], name='obs_condition_cloud_condition_id_fkey'),
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='obs_condition_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'status_sequence_id', name='obs_condition_pkey'),
        UniqueConstraint('pfs_visit_id', 'status_sequence_id', name='obs_condition_pfs_visit_id_status_sequence_id_key'),
        Index('ix_obs_condition_created_at', 'created_at')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status_sequence_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Gen2 status sequence')
    airmass: Mapped[Optional[float]] = mapped_column(REAL)
    moon_phase: Mapped[Optional[float]] = mapped_column(REAL)
    moon_alt: Mapped[Optional[float]] = mapped_column(REAL)
    moon_sep: Mapped[Optional[float]] = mapped_column(REAL)
    seeing: Mapped[Optional[float]] = mapped_column(REAL)
    transparency: Mapped[Optional[float]] = mapped_column(REAL)
    cloud_condition_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Issued time [YYYY-MM-DDThh:mm:ss]')

    cloud_condition: Mapped[Optional['CloudCondition']] = relationship('CloudCondition', back_populates='obs_condition')
    pfs_visit: Mapped['PfsVisit'] = relationship('PfsVisit', back_populates='obs_condition')


class ObslogFitsHeader(Base):
    __tablename__ = 'obslog_fits_header'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='obslog_fits_header_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('filestem', 'hdu_index', name='obslog_fits_header_pkey'),
        Index('ix_obslog_fits_header_pfs_visit_id', 'pfs_visit_id')
    )

    filestem: Mapped[str] = mapped_column(String, primary_key=True)
    hdu_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    cards_dict: Mapped[dict] = mapped_column(JSONB, nullable=False)
    cards_list: Mapped[dict] = mapped_column(JSONB, nullable=False)
    pfs_visit_id: Mapped[Optional[int]] = mapped_column(Integer)

    pfs_visit: Mapped[Optional['PfsVisit']] = relationship('PfsVisit', back_populates='obslog_fits_header')


class ObslogVisitNote(Base):
    __tablename__ = 'obslog_visit_note'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='obslog_visit_note_pfs_visit_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['obslog_user.id'], name='obslog_visit_note_user_id_fkey'),
        PrimaryKeyConstraint('id', name='obslog_visit_note_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    body: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer)
    pfs_visit_id: Mapped[Optional[int]] = mapped_column(Integer)

    pfs_visit: Mapped[Optional['PfsVisit']] = relationship('PfsVisit', back_populates='obslog_visit_note')
    user: Mapped[Optional['ObslogUser']] = relationship('ObslogUser', back_populates='obslog_visit_note')


t_pfs_config = Table(
    'pfs_config', Base.metadata,
    Column('pfs_design_id', BigInteger, nullable=False),
    Column('visit0', Integer, nullable=False, comment='The first visit of the set'),
    Column('ra_center_config', Double(53), comment='The right ascension of the PFI center [deg]'),
    Column('dec_center_config', Double(53), comment='The declination of the PFI center [deg]'),
    Column('pa_config', REAL, comment='The position angle of the PFI [deg]'),
    Column('converg_num_iter', Integer, comment='Allocated total number of cobra iterations towards convergence'),
    Column('converg_elapsed_time', REAL, comment='Allocated time for convergence [sec]'),
    Column('alloc_rms_scatter', REAL, comment='[TBW]'),
    Column('allocated_at', DateTime, comment='Time at which config was allocated [YYYY-MM-DDhhmmss] (TBC)'),
    Column('was_observed', Boolean, comment='True of configuration was observed (XXX relevant?)'),
    Column('converg_tolerance', REAL, comment='Tolerance for convergence [mm]'),
    Column('to_be_observed_at', DateTime(True), comment='Planned observation time creating the pfsConfig'),
    Column('pfs_utils_version', String, comment='pfs_utils version creating the pfsConfig'),
    Column('to_be_observed_at_design', DateTime(True), comment='Planned observation time creating the pfsDesign'),
    Column('pfs_utils_version_design', String, comment='pfs_utils version creating the pfsDesign'),
    ForeignKeyConstraint(['pfs_design_id'], ['pfs_design.pfs_design_id'], name='pfs_config_pfs_design_id_fkey'),
    UniqueConstraint('pfs_design_id', 'visit0', name='pfs_config_pfs_design_id_visit0_key'),
    UniqueConstraint('visit0', name='pfs_config_visit0_key')
)


class PfsDesignAgc(Base):
    __tablename__ = 'pfs_design_agc'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_design_id'], ['pfs_design.pfs_design_id'], name='pfs_design_agc_pfs_design_id_fkey'),
        PrimaryKeyConstraint('pfs_design_id', 'guide_star_id', name='pfs_design_agc_pkey'),
        UniqueConstraint('pfs_design_id', 'guide_star_id', name='pfs_design_agc_pfs_design_id_guide_star_id_key')
    )

    pfs_design_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    guide_star_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment='GuideStar identifier')
    epoch: Mapped[Optional[str]] = mapped_column(String, comment='epoch')
    guide_star_ra: Mapped[Optional[float]] = mapped_column(Double(53), comment='GuideStar R.A. [deg.]')
    guide_star_dec: Mapped[Optional[float]] = mapped_column(Double(53), comment='GuideStar Dec. [deg.]')
    guide_star_pm_ra: Mapped[Optional[float]] = mapped_column(REAL, comment='GuideStar proper motion in R.A. [mas/yr]')
    guide_star_pm_dec: Mapped[Optional[float]] = mapped_column(REAL, comment='GuideStar proper motion in Dec. [mas/yr]')
    guide_star_parallax: Mapped[Optional[float]] = mapped_column(REAL, comment='GuideStar parallax [mas]')
    guide_star_magnitude: Mapped[Optional[float]] = mapped_column(REAL, comment='GuideStar magnitude [mag]')
    passband: Mapped[Optional[str]] = mapped_column(String, comment='passband')
    guide_star_color: Mapped[Optional[float]] = mapped_column(REAL, comment='GuideStar color [mag]')
    agc_camera_id: Mapped[Optional[int]] = mapped_column(Integer, comment='AGC camera identifier')
    agc_target_x_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='Target x-position on the AGC [pix]')
    agc_target_y_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='Target y-position on the AGC [pix]')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='comments')
    guide_star_flag: Mapped[Optional[int]] = mapped_column(Integer, comment='GuideStar catalog flag')

    pfs_design: Mapped['PfsDesign'] = relationship('PfsDesign', back_populates='pfs_design_agc')


t_pfs_design_fiber = Table(
    'pfs_design_fiber', Base.metadata,
    Column('pfs_design_id', BigInteger, nullable=False),
    Column('ets_priority', Integer),
    Column('ets_cost_function', Double(53)),
    Column('ets_cobra_motor_movement', String),
    Column('is_on_source', Boolean),
    Column('pfi_nominal_x_mm', REAL, comment='Nominal x-position on the PFI [mm]'),
    Column('pfi_nominal_y_mm', REAL, comment='Nominal y-position on the PFI [mm]'),
    Column('comments', String, comment='comments'),
    Column('fiber_id', Integer, nullable=False),
    Column('fiber_status', Integer, comment='fiberStatus: enumerated e.g. GOOD,BROKENFIBER,BLOCKED,BLACKSPOT'),
    Column('target_cat_id', Integer, comment='catId of the target'),
    Column('target_dec', Double(53), comment='Dec. of the target'),
    Column('target_obj_id', BigInteger, comment='objId of the target'),
    Column('target_patch', String, comment='patch of the target'),
    Column('target_ra', Double(53), comment='R.A. of the target'),
    Column('target_tract', Integer, comment='tract of the target'),
    Column('target_type', Integer, comment='targetType: enumerated e.g. SCIENCE,SKY,FLUXSTD'),
    Column('target_pm_ra', REAL, comment='Proper motion of the target in R.A. [mas/yr]'),
    Column('target_pm_dec', REAL, comment='Proper motion of the target in Dec. [mas/yr]'),
    Column('target_parallax', REAL, comment='Parallax of the target [mas]'),
    Column('epoch', String, comment='epoch'),
    Column('proposal_id', String, comment='Proposal ID'),
    Column('ob_code', String, comment='OB code'),
    ForeignKeyConstraint(['pfs_design_id'], ['pfs_design.pfs_design_id'], name='pfs_design_fiber_pfs_design_id_fkey'),
    UniqueConstraint('pfs_design_id', 'fiber_id', name='pfs_design_fiber_pfs_design_id_fiber_id_key')
)


class SpsCamera(Base):
    __tablename__ = 'sps_camera'
    __table_args__ = (
        ForeignKeyConstraint(['sps_module_id'], ['sps_module.sps_module_id'], name='sps_camera_sps_module_id_fkey'),
        PrimaryKeyConstraint('sps_camera_id', name='sps_camera_pkey')
    )

    sps_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS camera identifier [1-16]')
    sps_module_id: Mapped[Optional[int]] = mapped_column(Integer, comment='SpS module identifier [1-4]')
    arm: Mapped[Optional[str]] = mapped_column(String(1), comment='Spectrograph arm identifier [b, r, n, m]')
    arm_num: Mapped[Optional[int]] = mapped_column(Integer, comment='Spectrograph arm identifier as a number [1-4]')
    sps_camera_name: Mapped[Optional[str]] = mapped_column(String(2), comment='SpS camera name [e.g. "b3"]')
    sps_module_name: Mapped[Optional[str]] = mapped_column(String(3), comment='SpS module name [e.g. "sm3"]')

    sps_module: Mapped[Optional['SpsModule']] = relationship('SpsModule', back_populates='sps_camera')
    sps_exposure: Mapped[list['SpsExposure']] = relationship('SpsExposure', back_populates='sps_camera')


class SpsVisit(PfsVisit):
    __tablename__ = 'sps_visit'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='sps_visit_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', name='sps_visit_pkey'),
        UniqueConstraint('pfs_visit_id', name='sps_visit_pfs_visit_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    exp_type: Mapped[Optional[str]] = mapped_column(String, comment='Type of exposure: BIAS, FLAT, DFLAT etc.')

    sps_exposure: Mapped[list['SpsExposure']] = relationship('SpsExposure', back_populates='pfs_visit')


class TelStatus(Base):
    __tablename__ = 'tel_status'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='tel_status_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'status_sequence_id', name='tel_status_pkey'),
        UniqueConstraint('pfs_visit_id', 'status_sequence_id', name='tel_status_pfs_visit_id_status_sequence_id_key'),
        Index('ix_tel_status_created_at', 'created_at')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status_sequence_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Gen2 status sequence')
    altitude: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope altitude [deg]')
    azimuth: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope azimuth [deg]')
    insrot: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope instrument rotation angle [deg]')
    adc_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='ADC PA at which the exposure started [deg]')
    m2_pos3: Mapped[Optional[float]] = mapped_column(REAL, comment='Hexapod position [mm]')
    tel_ra: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope target R.A. [deg]')
    tel_dec: Mapped[Optional[float]] = mapped_column(REAL, comment='The telescope target Dec. [deg]')
    dome_shutter_status: Mapped[Optional[int]] = mapped_column(Integer, comment='Dome slit status (open/close/unknown)')
    dome_light_status: Mapped[Optional[int]] = mapped_column(Integer, comment='Dome (room) light mask interger')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Issued time [YYYY-MM-DDThh:mm:ss]')
    dither_ra: Mapped[Optional[float]] = mapped_column(REAL, comment='Offset to the R.A. coordinate [arcsec]')
    dither_dec: Mapped[Optional[float]] = mapped_column(REAL, comment='Offset to the DEC. coordinate [arcsec]')
    dither_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='Offset to the INST_PA [arcsec]')
    inst_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='The INST_PA at which the exposure started [deg]')
    caller: Mapped[Optional[str]] = mapped_column(String, comment='Which sub-system calls (e.g., mcs, agcc, etc.)')
    m2_off3: Mapped[Optional[float]] = mapped_column(REAL, comment='Hexapod focus offset [mm]')

    pfs_visit: Mapped['PfsVisit'] = relationship('PfsVisit', back_populates='tel_status')


class AgcData(Base):
    __tablename__ = 'agc_data'
    __table_args__ = (
        ForeignKeyConstraint(['agc_exposure_id'], ['agc_exposure.agc_exposure_id'], name='agc_data_agc_exposure_id_fkey'),
        PrimaryKeyConstraint('agc_exposure_id', 'agc_camera_id', 'spot_id', name='agc_data_pkey'),
        UniqueConstraint('agc_exposure_id', 'agc_camera_id', 'spot_id', name='agc_data_agc_exposure_id_agc_camera_id_spot_id_key')
    )

    agc_exposure_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC exposure number identifier')
    agc_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC camera identifier')
    spot_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The AGC spot identifier')
    image_moment_00_pix: Mapped[Optional[float]] = mapped_column(REAL)
    centroid_x_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The x-center of the spot image in AGC [pix]')
    centroid_y_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The y-center of the spot image in AGC [pix]]')
    central_image_moment_11_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The 11-component of the second moment')
    central_image_moment_20_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The 20-component of the second moment')
    central_image_moment_02_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The 02-component of the second moment')
    peak_pixel_x_pix: Mapped[Optional[int]] = mapped_column(Integer, comment='The peak x pixel')
    peak_pixel_y_pix: Mapped[Optional[int]] = mapped_column(Integer, comment='The peak y pixel')
    peak_intensity: Mapped[Optional[float]] = mapped_column(REAL, comment='The peak intensity')
    background: Mapped[Optional[float]] = mapped_column(REAL, comment='The background value')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='Flags')
    estimated_magnitude: Mapped[Optional[float]] = mapped_column(REAL, comment='The estimated magnitude of the object')

    agc_exposure: Mapped['AgcExposure'] = relationship('AgcExposure', back_populates='agc_data')


class AgcGuideOffset(AgcExposure):
    __tablename__ = 'agc_guide_offset'
    __table_args__ = (
        ForeignKeyConstraint(['agc_exposure_id'], ['agc_exposure.agc_exposure_id'], name='agc_guide_offset_agc_exposure_id_fkey'),
        PrimaryKeyConstraint('agc_exposure_id', name='agc_guide_offset_pkey')
    )

    agc_exposure_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC exposure number identifier')
    guide_ra: Mapped[Optional[float]] = mapped_column(Double(53), comment='The designed FoV R.A. center [deg.]')
    guide_dec: Mapped[Optional[float]] = mapped_column(Double(53), comment='The designed FoV Dec. center [deg.]')
    guide_pa: Mapped[Optional[float]] = mapped_column(REAL, comment='The designed FoV PA [deg.]')
    guide_delta_ra: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated FoV R.A. offset [arcsec.]')
    guide_delta_dec: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated FoV Dec. offset [arcsec.]')
    guide_delta_insrot: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated InsRot offset [arcsec.]')
    guide_delta_az: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated Az offset [arcsec.] (optional)')
    guide_delta_el: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated El offset [arcsec.] (optional)')
    guide_delta_z: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset [mm]')
    guide_delta_z1: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC1 [mm]')
    guide_delta_z2: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC2 [mm]')
    guide_delta_z3: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC3 [mm]')
    guide_delta_z4: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC4 [mm]')
    guide_delta_z5: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC5 [mm]')
    guide_delta_z6: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated focus offset for AGC6 [mm]')
    guide_delta_scale: Mapped[Optional[float]] = mapped_column(REAL, comment='The calculated scale offset [arcsec.]')
    mask: Mapped[Optional[int]] = mapped_column(Integer, comment='A mask of the active elements being fit')


class CalibSet(Base):
    __tablename__ = 'calib_set'
    __table_args__ = (
        ForeignKeyConstraint(['calib_arcs_id'], ['calib.calib_id'], name='calib_set_calib_arcs_id_fkey'),
        ForeignKeyConstraint(['calib_bias_id'], ['calib.calib_id'], name='calib_set_calib_bias_id_fkey'),
        ForeignKeyConstraint(['calib_dark_id'], ['calib.calib_id'], name='calib_set_calib_dark_id_fkey'),
        ForeignKeyConstraint(['calib_flat_id'], ['calib.calib_id'], name='calib_set_calib_flat_id_fkey'),
        PrimaryKeyConstraint('calib_set_id', name='calib_set_pkey'),
        UniqueConstraint('calib_set_id', name='calib_set_calib_set_id_key')
    )

    calib_set_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    calib_flat_id: Mapped[Optional[int]] = mapped_column(Integer)
    calib_bias_id: Mapped[Optional[int]] = mapped_column(Integer)
    calib_dark_id: Mapped[Optional[int]] = mapped_column(Integer)
    calib_arcs_id: Mapped[Optional[int]] = mapped_column(Integer)

    calib_arcs: Mapped[Optional['Calib']] = relationship('Calib', foreign_keys=[calib_arcs_id], back_populates='calib_set')
    calib_bias: Mapped[Optional['Calib']] = relationship('Calib', foreign_keys=[calib_bias_id], back_populates='calib_set_')
    calib_dark: Mapped[Optional['Calib']] = relationship('Calib', foreign_keys=[calib_dark_id], back_populates='calib_set1')
    calib_flat: Mapped[Optional['Calib']] = relationship('Calib', foreign_keys=[calib_flat_id], back_populates='calib_set2')


class CameraModelF3cMcs(McsExposure):
    __tablename__ = 'camera_model_f3c_mcs'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_frame_id'], ['mcs_exposure.mcs_frame_id'], name='camera_model_f3c_mcs_mcs_frame_id_fkey'),
        PrimaryKeyConstraint('mcs_frame_id', name='camera_model_f3c_mcs_pkey'),
        UniqueConstraint('mcs_frame_id', name='camera_model_f3c_mcs_mcs_frame_id_key')
    )

    mcs_frame_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='MCS frame identifier as generated from Gen2')
    matrix: Mapped[Optional[list[float]]] = mapped_column(ARRAY(REAL()), comment='camMatrix')
    distor: Mapped[Optional[list[float]]] = mapped_column(ARRAY(REAL()), comment='camDistor')
    rot_vector: Mapped[Optional[list[float]]] = mapped_column(ARRAY(REAL()), comment='camRotVec')
    tran_vector: Mapped[Optional[list[float]]] = mapped_column(ARRAY(REAL()), comment='camTranVec')


class CobraConvergenceTest(Base):
    __tablename__ = 'cobra_convergence_test'
    __table_args__ = (
        ForeignKeyConstraint(['cobra_motor_model_id'], ['cobra_motor_model.cobra_motor_model_id'], name='cobra_convergence_test_cobra_motor_model_id_fkey'),
        PrimaryKeyConstraint('cobra_motor_model_id', 'iteration', 'cobra_motor_angle_target_id', name='cobra_convergence_test_pkey'),
        UniqueConstraint('cobra_motor_model_id', 'iteration', 'cobra_motor_angle_target_id', name='cobra_convergence_test_cobra_motor_model_id_iteration_cobra_key')
    )

    cobra_motor_model_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    iteration: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The iteration number')
    cobra_motor_angle_target_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The ID for the target angle of the motor to test')
    cobra_motor_angle_target: Mapped[Optional[float]] = mapped_column(REAL, comment='The target angle of the motor to test')
    cobra_motor_angle_difference: Mapped[Optional[float]] = mapped_column(REAL, comment='The difference of the motor angle [deg.]')
    signal_to_noise_ratio: Mapped[Optional[float]] = mapped_column(REAL, comment='Signal-to-Noise ratio')

    cobra_motor_model: Mapped['CobraMotorModel'] = relationship('CobraMotorModel', back_populates='cobra_convergence_test')


class CobraMotorMap(Base):
    __tablename__ = 'cobra_motor_map'
    __table_args__ = (
        ForeignKeyConstraint(['cobra_motor_model_id'], ['cobra_motor_model.cobra_motor_model_id'], name='cobra_motor_map_cobra_motor_model_id_fkey'),
        PrimaryKeyConstraint('cobra_motor_model_id', 'cobra_motor_move_sequence', name='cobra_motor_map_pkey'),
        UniqueConstraint('cobra_motor_model_id', 'cobra_motor_move_sequence', name='cobra_motor_map_cobra_motor_model_id_cobra_motor_move_seque_key')
    )

    cobra_motor_model_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cobra_motor_move_sequence: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The motor movement sequence')
    cobra_motor_angle: Mapped[Optional[float]] = mapped_column(REAL, comment='The angle of the motor [deg]')
    cobra_motor_speed: Mapped[Optional[float]] = mapped_column(REAL, comment='The speed of the motor [deg/step] (TBC)')

    cobra_motor_model: Mapped['CobraMotorModel'] = relationship('CobraMotorModel', back_populates='cobra_motor_map')


t_field_set = Table(
    'field_set', Base.metadata,
    Column('iic_sequence_id', Integer, primary_key=True),
    Column('visit0', Integer),
    ForeignKeyConstraint(['iic_sequence_id'], ['iic_sequence.iic_sequence_id'], name='field_set_visit_set_id_fkey'),
    ForeignKeyConstraint(['visit0'], ['pfs_config.visit0'], name='field_set_visit0_fkey'),
    PrimaryKeyConstraint('iic_sequence_id', name='field_set_pkey')
)


class IicSequenceStatus(IicSequence):
    __tablename__ = 'iic_sequence_status'
    __table_args__ = (
        ForeignKeyConstraint(['iic_sequence_id'], ['iic_sequence.iic_sequence_id'], name='iic_sequence_status_visit_set_id_fkey'),
        PrimaryKeyConstraint('iic_sequence_id', name='iic_sequence_status_pkey')
    )

    iic_sequence_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Sequence identifier')
    status_flag: Mapped[Optional[int]] = mapped_column(Integer, comment='Status flag of the sequence')
    cmd_output: Mapped[Optional[str]] = mapped_column(String, comment='Status output')
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='End time [YYYY-MM-DDThh:mm:ss]')


class McsData(Base):
    __tablename__ = 'mcs_data'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_frame_id'], ['mcs_exposure.mcs_frame_id'], name='mcs_data_mcs_frame_id_fkey'),
        PrimaryKeyConstraint('mcs_frame_id', 'spot_id', name='mcs_data_pkey'),
        UniqueConstraint('mcs_frame_id', 'spot_id', name='mcs_data_mcs_frame_id_spot_id_key'),
        Index('ix_mcs_data_mcs_frame_id', 'mcs_frame_id')
    )

    mcs_frame_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The cobra spot identifier')
    mcs_center_x_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The x-center of the spot image in MCS [pix]')
    mcs_center_y_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The y-center of the spot image in MCS [pix]]')
    mcs_second_moment_x_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The x-component of the second moment of the image in MCS [pix^2]')
    mcs_second_moment_y_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The y-component of the second moment  of the image [pix^2]')
    mcs_second_moment_xy_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='The xy-component of the second moment  of the image [pix^2]')
    bgvalue: Mapped[Optional[float]] = mapped_column(REAL, comment='The background level')
    peakvalue: Mapped[Optional[float]] = mapped_column(REAL, comment='The peak image value')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='Flags about the fitted centroids parameters')
    flux: Mapped[Optional[float]] = mapped_column(REAL, comment='The measured flux')
    fluxerr: Mapped[Optional[float]] = mapped_column(REAL, comment='The measured flux error')

    mcs_frame: Mapped['McsExposure'] = relationship('McsExposure', back_populates='mcs_data')
    cobra_match: Mapped[list['CobraMatch']] = relationship('CobraMatch', back_populates='mcs_data')
    fiducial_fiber_match: Mapped[list['FiducialFiberMatch']] = relationship('FiducialFiberMatch', back_populates='mcs_data')


class McsPfiTransformation(McsExposure):
    __tablename__ = 'mcs_pfi_transformation'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_frame_id'], ['mcs_exposure.mcs_frame_id'], name='mcs_pfi_transformation_mcs_frame_id_fkey'),
        PrimaryKeyConstraint('mcs_frame_id', name='mcs_pfi_transformation_pkey'),
        UniqueConstraint('mcs_frame_id', name='mcs_pfi_transformation_mcs_frame_id_key')
    )

    mcs_frame_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='MCS frame identifier as generated from Gen2')
    x0: Mapped[Optional[float]] = mapped_column(REAL, comment='Transformation x shift')
    y0: Mapped[Optional[float]] = mapped_column(REAL, comment='Transformation y shift')
    dscale: Mapped[Optional[float]] = mapped_column(REAL, comment='First transformation scale')
    scale2: Mapped[Optional[float]] = mapped_column(REAL, comment='Second transformation scale')
    theta: Mapped[Optional[float]] = mapped_column(REAL, comment='Transformation rotation angle')
    alpha_rot: Mapped[Optional[float]] = mapped_column(REAL, comment='coefficient for the dtheta^2 term in the penalty function')
    camera_name: Mapped[Optional[str]] = mapped_column(String, comment='camera name for transformation function')


class ObslogMcsExposureNote(Base):
    __tablename__ = 'obslog_mcs_exposure_note'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_exposure_frame_id'], ['mcs_exposure.mcs_frame_id'], name='obslog_mcs_exposure_note_mcs_exposure_frame_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['obslog_user.id'], name='obslog_mcs_exposure_note_user_id_fkey'),
        PrimaryKeyConstraint('id', name='obslog_mcs_exposure_note_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    body: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer)
    mcs_exposure_frame_id: Mapped[Optional[int]] = mapped_column(Integer)

    mcs_exposure_frame: Mapped[Optional['McsExposure']] = relationship('McsExposure', back_populates='obslog_mcs_exposure_note')
    user: Mapped[Optional['ObslogUser']] = relationship('ObslogUser', back_populates='obslog_mcs_exposure_note')


class ObslogVisitSetNote(Base):
    __tablename__ = 'obslog_visit_set_note'
    __table_args__ = (
        ForeignKeyConstraint(['iic_sequence_id'], ['iic_sequence.iic_sequence_id'], name='obslog_visit_set_note_visit_set_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['obslog_user.id'], name='obslog_visit_set_note_user_id_fkey'),
        PrimaryKeyConstraint('id', name='obslog_visit_set_note_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    body: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer)
    iic_sequence_id: Mapped[Optional[int]] = mapped_column(Integer)

    iic_sequence: Mapped[Optional['IicSequence']] = relationship('IicSequence', back_populates='obslog_visit_set_note')
    user: Mapped[Optional['ObslogUser']] = relationship('ObslogUser', back_populates='obslog_visit_set_note')


class PfsConfigAgc(Base):
    __tablename__ = 'pfs_config_agc'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_design_id', 'visit0'], ['pfs_config.pfs_design_id', 'pfs_config.visit0'], name='pfs_config_agc_pfs_design_id_fkey'),
        PrimaryKeyConstraint('pfs_design_id', 'visit0', 'guide_star_id', name='pfs_config_agc_pkey'),
        UniqueConstraint('pfs_design_id', 'visit0', 'guide_star_id', name='pfs_config_agc_pfs_design_id_visit0_guide_star_id_key')
    )

    pfs_design_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    visit0: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The first visit of the set')
    guide_star_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment='GuideStar identifier')
    agc_camera_id: Mapped[Optional[int]] = mapped_column(Integer, comment='AGC camera identifier')
    agc_final_x_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='Final x-position on the AGC [pix]')
    agc_final_y_pix: Mapped[Optional[float]] = mapped_column(REAL, comment='Final y-position on the AGC [pix]')
    comments: Mapped[Optional[str]] = mapped_column(String, comment='comments')
    guide_star_ra: Mapped[Optional[float]] = mapped_column(Double(53), comment='GuideStar R.A. [deg.]')
    guide_star_dec: Mapped[Optional[float]] = mapped_column(Double(53), comment='GuideStar Dec. [deg.]')


t_pfs_config_fiber = Table(
    'pfs_config_fiber', Base.metadata,
    Column('pfi_center_final_x_mm', REAL, comment='Final measured x-position on the PFI'),
    Column('pfi_center_final_y_mm', REAL, comment='Final measured y-position on the PFI'),
    Column('motor_map_summary', String),
    Column('config_elapsed_time', REAL),
    Column('is_on_source', Boolean),
    Column('comments', String, comment='comments'),
    Column('fiber_id', Integer, nullable=False),
    Column('pfs_design_id', BigInteger, nullable=False),
    Column('visit0', Integer, nullable=False, comment='The first visit of the set'),
    Column('pfi_nominal_x_mm', REAL, comment='Nominal x-position on the PFI'),
    Column('pfi_nominal_y_mm', REAL, comment='Nominal y-position on the PFI'),
    Column('target_ra', Double(53), comment='R.A. of the target'),
    Column('target_dec', Double(53), comment='Dec. of the target'),
    Column('fiber_status', Integer, comment='fiberStatus: enumerated e.g. GOOD,BROKENFIBER,BLOCKED,BLACKSPOT'),
    ForeignKeyConstraint(['pfs_design_id', 'visit0'], ['pfs_config.pfs_design_id', 'pfs_config.visit0'], name='pfs_config_fiber_pfs_design_id_fkey'),
    UniqueConstraint('pfs_design_id', 'visit0', 'fiber_id', name='pfs_config_fiber_pfs_design_id_visit0_fiber_id_key')
)


class PfsConfigSps(Base):
    __tablename__ = 'pfs_config_sps'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='pfs_config_sps_pfs_visit_id_fkey'),
        ForeignKeyConstraint(['visit0'], ['pfs_config.visit0'], name='pfs_config_sps_visit0_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'visit0', name='pfs_config_sps_pkey'),
        UniqueConstraint('pfs_visit_id', 'visit0', name='pfs_config_sps_pfs_visit_id_visit0_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    visit0: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The first visit of the set')
    cam_mask: Mapped[Optional[int]] = mapped_column(Integer, comment='bitMask describing which cameras were use for this visit.')
    inst_status_flag: Mapped[Optional[int]] = mapped_column(Integer, comment='Bitmask indicating instrument-related status flags for this visit.')

    pfs_visit: Mapped['PfsVisit'] = relationship('PfsVisit', back_populates='pfs_config_sps')


class SpsExposure(Base):
    __tablename__ = 'sps_exposure'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id'], ['sps_visit.pfs_visit_id'], name='sps_exposure_pfs_visit_id_fkey'),
        ForeignKeyConstraint(['sps_camera_id'], ['sps_camera.sps_camera_id'], name='sps_exposure_sps_camera_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'sps_camera_id', name='sps_exposure_pkey'),
        UniqueConstraint('pfs_visit_id', 'sps_camera_id', name='sps_exposure_pfs_visit_id_sps_camera_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    sps_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS camera identifier [1-16]')
    exptime: Mapped[Optional[float]] = mapped_column(REAL, comment='Exposure time for visit [sec]')
    time_exp_start: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Start time for exposure [YYYY-MM-DDThh:mm:ss]')
    time_exp_end: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='End time for exposure [YYYY-MM-DDThh:mm:ss]')
    beam_config_date: Mapped[Optional[float]] = mapped_column(Double(53), comment='MJD when the configuration changed')

    pfs_visit: Mapped['SpsVisit'] = relationship('SpsVisit', back_populates='sps_exposure')
    sps_camera: Mapped['SpsCamera'] = relationship('SpsCamera', back_populates='sps_exposure')
    sps_annotation: Mapped[list['SpsAnnotation']] = relationship('SpsAnnotation', back_populates='sps_exposure')


t_visit_set = Table(
    'visit_set', Base.metadata,
    Column('pfs_visit_id', Integer, primary_key=True),
    Column('iic_sequence_id', Integer),
    ForeignKeyConstraint(['iic_sequence_id'], ['iic_sequence.iic_sequence_id'], name='visit_set_visit_set_id_fkey'),
    ForeignKeyConstraint(['pfs_visit_id'], ['pfs_visit.pfs_visit_id'], name='visit_set_pfs_visit_id_fkey'),
    PrimaryKeyConstraint('pfs_visit_id', name='visit_set_pkey'),
    UniqueConstraint('pfs_visit_id', name='visit_set_pfs_visit_id_key')
)


class AgcMatch(AgcData):
    __tablename__ = 'agc_match'
    __table_args__ = (
        ForeignKeyConstraint(['agc_exposure_id', 'agc_camera_id', 'spot_id'], ['agc_data.agc_exposure_id', 'agc_data.agc_camera_id', 'agc_data.spot_id'], name='agc_match_agc_exposure_id_fkey'),
        PrimaryKeyConstraint('agc_exposure_id', 'agc_camera_id', 'spot_id', name='agc_match_pkey'),
        UniqueConstraint('agc_exposure_id', 'agc_camera_id', 'spot_id', name='agc_match_agc_exposure_id_agc_camera_id_spot_id_key')
    )

    agc_exposure_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC exposure number identifier')
    agc_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='AGC camera identifier')
    spot_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='The AGC spot identifier')
    pfs_design_id: Mapped[Optional[int]] = mapped_column(BigInteger, comment='pfsDesignId')
    guide_star_id: Mapped[Optional[int]] = mapped_column(BigInteger, comment='GuideStar identifier')
    agc_nominal_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Nominal designed x-position on the AGC [PFI mm]')
    agc_nominal_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Nominal designed y-position on the AGC [PFI mm]')
    agc_center_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Center measured x-position on the AGC [PFI mm]')
    agc_center_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Center measured y-position on the AGC [PFI mm]')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='Flags')


class CobraMatch(CobraTarget):
    __tablename__ = 'cobra_match'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_frame_id', 'spot_id'], ['mcs_data.mcs_frame_id', 'mcs_data.spot_id'], name='cobra_match_mcs_frame_id_fkey'),
        ForeignKeyConstraint(['pfs_visit_id', 'iteration', 'cobra_id'], ['cobra_target.pfs_visit_id', 'cobra_target.iteration', 'cobra_target.cobra_id'], name='cobra_match_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_match_pkey'),
        UniqueConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_match_pfs_visit_id_iteration_cobra_id_key'),
        Index('cobra_match_mcs_frame_id_idx', 'mcs_frame_id')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    iteration: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Iteration number for this frame')
    cobra_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Fiber identifier')
    mcs_frame_id: Mapped[Optional[int]] = mapped_column(Integer, comment='MCS frame identifier as generated from Gen2')
    spot_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Corresponding MCS image spot identifier ')
    pfi_center_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Actual x-position on the PFI [mm]')
    pfi_center_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Actual y-position on the PFI [mm]')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='flags for movement etc.')

    mcs_data: Mapped[Optional['McsData']] = relationship('McsData', back_populates='cobra_match')


class FiducialFiberMatch(Base):
    __tablename__ = 'fiducial_fiber_match'
    __table_args__ = (
        ForeignKeyConstraint(['mcs_frame_id', 'spot_id'], ['mcs_data.mcs_frame_id', 'mcs_data.spot_id'], name='fiducial_fiber_match_mcs_frame_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'iteration', 'fiducial_fiber_id', name='fiducial_fiber_match_pkey'),
        UniqueConstraint('pfs_visit_id', 'iteration', 'fiducial_fiber_id', name='fiducial_fiber_match_pfs_visit_id_iteration_fiducial_fiber__key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    iteration: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Iteration number for this frame')
    fiducial_fiber_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Fiducial fiber identifier')
    mcs_frame_id: Mapped[Optional[int]] = mapped_column(Integer, comment='MCS frame identifier as generated from Gen2')
    spot_id: Mapped[Optional[int]] = mapped_column(Integer, comment='Corresponding MCS image spot identifier ')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='flags for movement etc.')
    pfi_center_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Measured FF x-position on the PFI [mm]')
    pfi_center_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Measured FF y-position on the PFI [mm]')
    match_mask: Mapped[Optional[int]] = mapped_column(Integer, comment='mask for FF match (1 for FFs used in outer ring, 2 for FFs used in first iteration of transformation, 4 for FFs used in final transformation.')
    fiducial_tweaked_x_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Expected FF x-position on the PFI at the convergence [mm]')
    fiducial_tweaked_y_mm: Mapped[Optional[float]] = mapped_column(REAL, comment='Expected FF y-position on the PFI at the convergence [mm]')

    mcs_data: Mapped[Optional['McsData']] = relationship('McsData', back_populates='fiducial_fiber_match')


class SpsAnnotation(Base):
    __tablename__ = 'sps_annotation'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id', 'sps_camera_id'], ['sps_exposure.pfs_visit_id', 'sps_exposure.sps_camera_id'], name='sps_annotation_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('annotation_id', name='sps_annotation_pkey')
    )

    annotation_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS annotation identifier (primary key)')
    pfs_visit_id: Mapped[Optional[int]] = mapped_column(Integer, comment='PFS visit identifier')
    sps_camera_id: Mapped[Optional[int]] = mapped_column(Integer, comment='SpS camera identifier [1-16]')
    data_flag: Mapped[Optional[int]] = mapped_column(Integer, comment='Flag of obtained data')
    notes: Mapped[Optional[str]] = mapped_column(String, comment='Notes of obtained data')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, comment='Creation time [YYYY-MM-DDThh:mm:ss]')

    sps_exposure: Mapped[Optional['SpsExposure']] = relationship('SpsExposure', back_populates='sps_annotation')


class SpsCondition(SpsExposure):
    __tablename__ = 'sps_condition'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id', 'sps_camera_id'], ['sps_exposure.pfs_visit_id', 'sps_exposure.sps_camera_id'], name='sps_condition_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'sps_camera_id', name='sps_condition_pkey'),
        UniqueConstraint('pfs_visit_id', 'sps_camera_id', name='sps_condition_pfs_visit_id_sps_camera_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    sps_camera_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='SpS camera identifier [1-16]')
    background: Mapped[Optional[float]] = mapped_column(REAL, comment='Background level (TBD)')
    throughput: Mapped[Optional[float]] = mapped_column(REAL, comment='System throughput (TBD)')


class CobraMove(CobraMatch):
    __tablename__ = 'cobra_move'
    __table_args__ = (
        ForeignKeyConstraint(['pfs_visit_id', 'iteration', 'cobra_id'], ['cobra_match.pfs_visit_id', 'cobra_match.iteration', 'cobra_match.cobra_id'], name='cobra_move_pfs_visit_id_fkey'),
        PrimaryKeyConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_move_pkey'),
        UniqueConstraint('pfs_visit_id', 'iteration', 'cobra_id', name='cobra_move_pfs_visit_id_iteration_cobra_id_key')
    )

    pfs_visit_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='PFS visit identifier')
    iteration: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Iteration number for this frame')
    cobra_id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='Fiber identifier')
    cobra_motor_model_id_theta: Mapped[Optional[int]] = mapped_column(Integer)
    motor_target_theta: Mapped[Optional[float]] = mapped_column(REAL, comment='the target angle of the theta motor')
    motor_num_step_theta: Mapped[Optional[int]] = mapped_column(Integer, comment='the number of steps the theta motor has undertaken')
    motor_on_time_theta: Mapped[Optional[float]] = mapped_column(REAL, comment='the theta motor ontime value')
    cobra_motor_model_id_phi: Mapped[Optional[int]] = mapped_column(Integer)
    motor_target_phi: Mapped[Optional[float]] = mapped_column(REAL, comment='the target angle of the phi motor')
    motor_num_step_phi: Mapped[Optional[int]] = mapped_column(Integer, comment='the number of steps the phi motor has undertaken')
    motor_on_time_phi: Mapped[Optional[float]] = mapped_column(REAL, comment='the phi motor ontime value')
    flags: Mapped[Optional[int]] = mapped_column(Integer, comment='flags for movement etc.')
