"""仮想カラムの定義

SQLフィルタリングで使用可能なカラムを定義する。
各カラムはSQLAlchemyのカラムまたは計算式にマッピングされる。
"""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable

if TYPE_CHECKING:
    from sqlalchemy import ColumnElement


@dataclass
class VirtualColumn:
    """仮想カラムの定義"""

    name: str
    """カラム名（クエリで使用する名前）"""

    description: str
    """カラムの説明"""

    required_joins: set[str] = field(default_factory=set)
    """このカラムを使用する際に必要なJOIN"""

    sqlalchemy_expr: "ColumnElement[Any] | Callable[[], ColumnElement[Any]] | None" = (
        None
    )
    """SQLAlchemyの式（遅延評価用にCallableも可）"""

    is_computed: bool = False
    """計算カラム（IS NULL等の比較結果）かどうか"""

    is_aggregate: bool = False
    """集約カラム（COUNT, AVG等を使用するもの）かどうか"""

    aggregate_table: str | None = None
    """集約対象のテーブル名（集約カラムの場合）"""

    aggregate_func: str | None = None
    """集約関数（'count' または 'avg'）"""

    aggregate_column: str | None = None
    """集約対象のカラム名（AVGの場合）"""


# カラム定義
# 注意: SQLAlchemy式はmodelsのインポート後に設定する必要がある
VIRTUAL_COLUMNS: dict[str, VirtualColumn] = {
    # 基本情報
    "visit_id": VirtualColumn(
        name="visit_id",
        description="Visit ID",
        required_joins=set(),
    ),
    "id": VirtualColumn(
        name="id",
        description="Visit ID (alias)",
        required_joins=set(),
    ),
    "issued_at": VirtualColumn(
        name="issued_at",
        description="発行日時",
        required_joins=set(),
    ),
    # シーケンス情報
    "sequence_type": VirtualColumn(
        name="sequence_type",
        description="シーケンスタイプ",
        required_joins={"visit_set", "iic_sequence"},
    ),
    "comments": VirtualColumn(
        name="comments",
        description="シーケンスのコメント",
        required_joins={"visit_set", "iic_sequence"},
    ),
    "visit_set_id": VirtualColumn(
        name="visit_set_id",
        description="シーケンスID (iic_sequence_id)",
        required_joins={"visit_set", "iic_sequence"},
    ),
    # メモ関連
    "visit_note": VirtualColumn(
        name="visit_note",
        description="Visitメモ",
        required_joins={"obslog_visit_note"},
    ),
    "visit_note_user": VirtualColumn(
        name="visit_note_user",
        description="Visitメモ作成者",
        required_joins={"obslog_visit_note", "visit_note_user"},
    ),
    "visit_set_note": VirtualColumn(
        name="visit_set_note",
        description="シーケンスメモ",
        required_joins={"visit_set", "obslog_visit_set_note"},
    ),
    "visit_set_note_user": VirtualColumn(
        name="visit_set_note_user",
        description="シーケンスメモ作成者",
        required_joins={"visit_set", "obslog_visit_set_note", "visit_set_note_user"},
    ),
    # ステータス
    "status": VirtualColumn(
        name="status",
        description="シーケンスステータス",
        required_joins={"visit_set", "iic_sequence", "iic_sequence_status"},
    ),
    # 露出判定（計算カラム）
    "is_sps_visit": VirtualColumn(
        name="is_sps_visit",
        description="SpS露出があるか",
        required_joins={"sps_visit"},
        is_computed=True,
    ),
    "is_mcs_visit": VirtualColumn(
        name="is_mcs_visit",
        description="MCS露出があるか",
        required_joins={"mcs_exposure"},
        is_computed=True,
    ),
    "is_agc_visit": VirtualColumn(
        name="is_agc_visit",
        description="AGC露出があるか",
        required_joins={"agc_exposure"},
        is_computed=True,
    ),
    # グループ
    "sequence_group_id": VirtualColumn(
        name="sequence_group_id",
        description="シーケンスグループID",
        required_joins={"visit_set", "iic_sequence", "sequence_group"},
    ),
    "sequence_group_name": VirtualColumn(
        name="sequence_group_name",
        description="シーケンスグループ名",
        required_joins={"visit_set", "iic_sequence", "sequence_group"},
    ),
    # FITSヘッダー
    "fits_header": VirtualColumn(
        name="fits_header",
        description="FITSヘッダー（配列アクセス用）",
        required_joins={"obslog_fits_header"},
    ),
    # プロポーザル
    "proposal_id": VirtualColumn(
        name="proposal_id",
        description="プロポーザルID",
        required_joins={"pfs_design_fiber"},
    ),
    # PFS Design
    "pfs_design_id": VirtualColumn(
        name="pfs_design_id",
        description="PFS Design ID",
        required_joins=set(),
    ),
    # 全文検索用
    "any_column": VirtualColumn(
        name="any_column",
        description="複数カラムを対象としたテキスト検索",
        required_joins={
            "obslog_visit_note",
            "visit_note_user",
            "visit_set",
            "obslog_visit_set_note",
            "visit_set_note_user",
            "iic_sequence",
            "iic_sequence_status",
            "sps_visit",
            "sps_exposure",
            "sps_annotation",
            "mcs_exposure",
            "obslog_mcs_exposure_note",
            "mcs_exposure_note_user",
            "pfs_design_fiber",
        },
        is_computed=True,
    ),
    # =============================================================================
    # 集約カラム（COUNT, AVG等）
    # =============================================================================
    # SPS露出の集約
    "sps_count": VirtualColumn(
        name="sps_count",
        description="SPS露出の数",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="sps_exposure",
        aggregate_func="count",
    ),
    "sps_avg_exptime": VirtualColumn(
        name="sps_avg_exptime",
        description="SPS露出の平均露出時間",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="sps_exposure",
        aggregate_func="avg",
        aggregate_column="exptime",
    ),
    # MCS露出の集約
    "mcs_count": VirtualColumn(
        name="mcs_count",
        description="MCS露出の数",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="mcs_exposure",
        aggregate_func="count",
    ),
    "mcs_avg_exptime": VirtualColumn(
        name="mcs_avg_exptime",
        description="MCS露出の平均露出時間",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="mcs_exposure",
        aggregate_func="avg",
        aggregate_column="mcs_exptime",
    ),
    # AGC露出の集約
    "agc_count": VirtualColumn(
        name="agc_count",
        description="AGC露出の数",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="agc_exposure",
        aggregate_func="count",
    ),
    "agc_avg_exptime": VirtualColumn(
        name="agc_avg_exptime",
        description="AGC露出の平均露出時間",
        required_joins=set(),
        is_aggregate=True,
        aggregate_table="agc_exposure",
        aggregate_func="avg",
        aggregate_column="agc_exptime",
    ),
}
