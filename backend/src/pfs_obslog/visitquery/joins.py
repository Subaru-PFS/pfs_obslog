"""JOIN最適化ロジック

WHERE句で使用されるカラムに基づいて必要なJOINのみを追加する。
"""

from typing import Any, TypeVar

from sqlalchemy.orm import Query, aliased

T = TypeVar("T")


# JOINの依存関係（順序が重要）
JOIN_ORDER = [
    "obslog_visit_note",
    "visit_note_user",
    "sps_visit",
    "sps_exposure",
    "sps_annotation",
    "visit_set",
    "iic_sequence",
    "obslog_visit_set_note",
    "visit_set_note_user",
    "iic_sequence_status",
    "sequence_group",
    "mcs_exposure",
    "obslog_mcs_exposure_note",
    "mcs_exposure_note_user",
    "agc_exposure",
    "pfs_design_fiber",
    "obslog_fits_header",
]

# JOINの依存関係（前提となるJOIN）
JOIN_DEPENDENCIES = {
    "visit_note_user": {"obslog_visit_note"},
    "iic_sequence": {"visit_set"},
    "obslog_visit_set_note": {"visit_set"},
    "visit_set_note_user": {"visit_set", "obslog_visit_set_note"},
    "iic_sequence_status": {"visit_set", "iic_sequence"},
    "sequence_group": {"visit_set", "iic_sequence"},
    "sps_exposure": {"sps_visit"},
    "sps_annotation": {"sps_visit", "sps_exposure"},
    "obslog_mcs_exposure_note": {"mcs_exposure"},
    "mcs_exposure_note_user": {"mcs_exposure", "obslog_mcs_exposure_note"},
}


class JoinBuilder:
    """クエリに必要なJOINを追加するビルダー"""

    def __init__(self, models: Any):
        """
        Args:
            models: SQLAlchemyモデルを含むモジュール
        """
        self.models = models

        # エイリアスの作成（同じテーブルを複数回JOINする場合用）
        self.visit_note_user = aliased(models.ObslogUser)
        self.visit_set_note_user = aliased(models.ObslogUser)
        self.mcs_exposure_note_user = aliased(models.ObslogUser)

    def apply_joins(self, query: Query[T], required_joins: set[str]) -> Query[T]:
        """
        必要なJOINをクエリに適用

        Args:
            query: ベースクエリ
            required_joins: 必要なJOINの名前のセット

        Returns:
            JOINが適用されたクエリ
        """
        # 依存関係を解決
        all_joins = self._resolve_dependencies(required_joins)

        # 順序に従ってJOINを適用
        for join_name in JOIN_ORDER:
            if join_name in all_joins:
                query = self._apply_single_join(query, join_name)

        return query

    def _resolve_dependencies(self, required_joins: set[str]) -> set[str]:
        """JOINの依存関係を解決して必要なすべてのJOINを返す"""
        all_joins = set(required_joins)

        # 依存関係を再帰的に追加
        changed = True
        while changed:
            changed = False
            for join in list(all_joins):
                deps = JOIN_DEPENDENCIES.get(join, set())
                for dep in deps:
                    if dep not in all_joins:
                        all_joins.add(dep)
                        changed = True

        return all_joins

    def _apply_single_join(self, query: Query[T], join_name: str) -> Query[T]:
        """単一のJOINを適用"""
        M = self.models

        join_funcs = {
            "obslog_visit_note": lambda q: q.outerjoin(M.ObslogVisitNote),
            "visit_note_user": lambda q: q.outerjoin(
                self.visit_note_user, M.ObslogVisitNote.user
            ),
            "sps_visit": lambda q: q.outerjoin(M.SpsVisit),
            "sps_exposure": lambda q: q.outerjoin(M.SpsExposure),
            "sps_annotation": lambda q: q.outerjoin(M.SpsAnnotation),
            "visit_set": lambda q: q.outerjoin(M.VisitSet),
            "iic_sequence": lambda q: q.outerjoin(M.IicSequence),
            "obslog_visit_set_note": lambda q: q.outerjoin(M.ObslogVisitSetNote),
            "visit_set_note_user": lambda q: q.outerjoin(
                self.visit_set_note_user, M.ObslogVisitSetNote.user
            ),
            "iic_sequence_status": lambda q: q.outerjoin(
                M.IicSequenceStatus, M.IicSequence.iic_sequence_status
            ),
            "sequence_group": lambda q: q.outerjoin(M.SequenceGroup),
            "mcs_exposure": lambda q: q.outerjoin(M.McsExposure),
            "obslog_mcs_exposure_note": lambda q: q.outerjoin(M.ObslogMcsExposureNote),
            "mcs_exposure_note_user": lambda q: q.outerjoin(
                self.mcs_exposure_note_user, M.ObslogMcsExposureNote.user
            ),
            "agc_exposure": lambda q: q.outerjoin(M.AgcExposure),
            "pfs_design_fiber": lambda q: q.outerjoin(
                M.PfsDesignFiber,
                M.PfsDesignFiber.pfs_design_id == M.PfsVisit.pfs_design_id,
            ),
            "obslog_fits_header": lambda q: q.outerjoin(M.ObslogFitsHeader),
        }

        if join_name not in join_funcs:
            raise ValueError(f"Unknown join: {join_name}")

        return join_funcs[join_name](query)

    def get_visit_note_user_alias(self):
        """visit_note_user のエイリアスを取得"""
        return self.visit_note_user

    def get_visit_set_note_user_alias(self):
        """visit_set_note_user のエイリアスを取得"""
        return self.visit_set_note_user

    def get_mcs_exposure_note_user_alias(self):
        """mcs_exposure_note_user のエイリアスを取得"""
        return self.mcs_exposure_note_user
