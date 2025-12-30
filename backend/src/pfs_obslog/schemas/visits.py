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
