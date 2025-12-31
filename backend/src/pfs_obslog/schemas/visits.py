"""Visit関連のPydanticスキーマ

APIのリクエスト/レスポンスで使用するスキーマを定義します。
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ObslogUser(BaseModel):
    """ユーザー情報"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    account_name: str


class VisitNote(BaseModel):
    """Visitに紐づくメモ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    pfs_visit_id: int
    body: str
    user: ObslogUser


class VisitSetNote(BaseModel):
    """シーケンス（Visit Set）に紐づくメモ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    iic_sequence_id: int
    body: str
    user: ObslogUser


class IicSequenceStatus(BaseModel):
    """シーケンスのステータス"""

    model_config = ConfigDict(from_attributes=True)

    iic_sequence_id: int
    status_flag: int | None = None
    cmd_output: str | None = None


class SequenceGroup(BaseModel):
    """シーケンスグループ"""

    model_config = ConfigDict(from_attributes=True)

    group_id: int
    group_name: str | None = None
    created_at: datetime | None = None


class IicSequence(BaseModel):
    """IICシーケンス情報"""

    model_config = ConfigDict(from_attributes=True)

    iic_sequence_id: int
    sequence_type: str | None = None
    name: str | None = None
    comments: str | None = None
    cmd_str: str | None = None
    group_id: int | None = None
    created_at: datetime | None = None

    # リレーション（オプション）
    group: SequenceGroup | None = None
    notes: list[VisitSetNote] = []


class VisitListEntry(BaseModel):
    """Visit一覧の各エントリ"""

    # 基本情報
    id: int  # pfs_visit_id
    description: str | None = None  # pfs_visit_description
    issued_at: datetime | None = None

    # シーケンス情報
    iic_sequence_id: int | None = None

    # 露出数（集計値）
    n_sps_exposures: int = 0
    n_mcs_exposures: int = 0
    n_agc_exposures: int = 0

    # 平均値
    avg_exptime: float | None = None
    avg_azimuth: float | None = None
    avg_altitude: float | None = None
    avg_ra: float | None = None
    avg_dec: float | None = None
    avg_insrot: float | None = None

    # メモ
    notes: list[VisitNote] = []

    # QA情報（将来実装）
    # seeing_median: float | None = None
    # transparency_median: float | None = None
    # effective_exposure_time_b: float | None = None
    # effective_exposure_time_r: float | None = None
    # effective_exposure_time_n: float | None = None
    # effective_exposure_time_m: float | None = None

    # 設計ID（16進数文字列）
    pfs_design_id: str | None = None


class VisitList(BaseModel):
    """Visit一覧のレスポンス"""

    visits: list[VisitListEntry]
    iic_sequences: list[IicSequence]
    count: int  # 総件数（ページネーション用）


# =============================================================================
# Visit詳細用スキーマ
# =============================================================================


class SpsAnnotation(BaseModel):
    """SpS露出のアノテーション"""

    model_config = ConfigDict(from_attributes=True)

    annotation_id: int
    data_flag: int | None = None
    notes: str | None = None
    created_at: datetime | None = None


class SpsExposure(BaseModel):
    """SpS露出"""

    model_config = ConfigDict(from_attributes=True)

    camera_id: int  # sps_camera_id
    exptime: float | None = None
    exp_start: datetime | None = None  # time_exp_start
    exp_end: datetime | None = None  # time_exp_end
    annotations: list[SpsAnnotation] = []


class SpsVisitDetail(BaseModel):
    """SpS Visit詳細"""

    exp_type: str | None = None
    exposures: list[SpsExposure] = []


class McsExposureNote(BaseModel):
    """MCS露出に紐づくメモ"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    user: ObslogUser


class McsExposure(BaseModel):
    """MCS露出"""

    model_config = ConfigDict(from_attributes=True)

    frame_id: int  # mcs_frame_id
    exptime: float | None = None  # mcs_exptime
    altitude: float | None = None
    azimuth: float | None = None
    insrot: float | None = None
    adc_pa: float | None = None
    dome_temperature: float | None = None
    dome_pressure: float | None = None
    dome_humidity: float | None = None
    outside_temperature: float | None = None
    outside_pressure: float | None = None
    outside_humidity: float | None = None
    mcs_cover_temperature: float | None = None
    mcs_m1_temperature: float | None = None
    taken_at: datetime | None = None
    notes: list[McsExposureNote] = []


class McsVisitDetail(BaseModel):
    """MCS Visit詳細"""

    exposures: list[McsExposure] = []


class AgcGuideOffset(BaseModel):
    """AGCガイドオフセット"""

    model_config = ConfigDict(from_attributes=True)

    ra: float | None = None  # guide_ra
    dec: float | None = None  # guide_dec
    pa: float | None = None  # guide_pa
    delta_ra: float | None = None  # guide_delta_ra
    delta_dec: float | None = None  # guide_delta_dec
    delta_insrot: float | None = None  # guide_delta_insrot
    delta_az: float | None = None  # guide_delta_az
    delta_el: float | None = None  # guide_delta_el
    delta_z: float | None = None  # guide_delta_z
    delta_z1: float | None = None  # guide_delta_z1
    delta_z2: float | None = None  # guide_delta_z2
    delta_z3: float | None = None  # guide_delta_z3
    delta_z4: float | None = None  # guide_delta_z4
    delta_z5: float | None = None  # guide_delta_z5
    delta_z6: float | None = None  # guide_delta_z6


class AgcExposure(BaseModel):
    """AGC露出"""

    model_config = ConfigDict(from_attributes=True)

    id: int  # agc_exposure_id
    exptime: float | None = None  # agc_exptime
    altitude: float | None = None
    azimuth: float | None = None
    insrot: float | None = None
    adc_pa: float | None = None
    m2_pos3: float | None = None
    outside_temperature: float | None = None
    outside_pressure: float | None = None
    outside_humidity: float | None = None
    measurement_algorithm: str | None = None
    version_actor: str | None = None
    version_instdata: str | None = None
    taken_at: datetime | None = None
    guide_offset: AgcGuideOffset | None = None


class AgcVisitDetail(BaseModel):
    """AGC Visit詳細"""

    exposures: list[AgcExposure] = []


class IicSequenceDetail(IicSequence):
    """IICシーケンス詳細（Visit詳細用）

    statusを追加
    """

    status: IicSequenceStatus | None = None


class VisitDetail(BaseModel):
    """Visit詳細のレスポンス"""

    id: int  # pfs_visit_id
    description: str | None = None  # pfs_visit_description
    issued_at: datetime | None = None
    notes: list[VisitNote] = []
    sps: SpsVisitDetail | None = None
    mcs: McsVisitDetail | None = None
    agc: AgcVisitDetail | None = None
    iic_sequence: IicSequenceDetail | None = None


class VisitRankResponse(BaseModel):
    """Visit順位のレスポンス"""

    rank: int | None = None
