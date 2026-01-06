"""QAデータベース接続

PFS QAデータベース（seeing, transparency, effective_exposure_time）への接続を管理します。
QAデータベースはopdbとは別のデータベースです。
"""

import contextlib
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Connection, create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from pfs_obslog.config import get_settings


@dataclass
class VisitQA:
    """Visit単位のQA情報"""

    visit_id: int
    seeing_median: float | None = None
    transparency_median: float | None = None
    effective_exposure_time_b: float | None = None
    effective_exposure_time_r: float | None = None
    effective_exposure_time_n: float | None = None
    effective_exposure_time_m: float | None = None


def _build_sql_for_value_match(values: list[int]) -> str:
    """Visit IDリストからSQL条件句を作成"""
    if len(values) == 0:
        return "= NULL"  # マッチしない条件
    elif len(values) == 1:
        return f"= {values[0]}"
    else:
        return f"IN ({', '.join(str(v) for v in values)})"


def collect_qa_info(conn: Connection | None, visit_ids: list[int]) -> dict[int, VisitQA]:
    """QAデータベースからQA情報を収集

    Args:
        conn: QAデータベース接続（Noneの場合は空の結果を返す）
        visit_ids: Visit IDリスト

    Returns:
        Visit ID -> VisitQAのマッピング
    """
    qas: dict[int, VisitQA] = {vid: VisitQA(visit_id=vid) for vid in visit_ids}

    if conn is None or not visit_ids:
        return qas

    # 全てのvisit_idが整数であることを確認（SQLインジェクション対策）
    if any(not isinstance(v, int) for v in visit_ids):
        raise ValueError(f"visit_ids must be list of int: {visit_ids}")

    match_sql = _build_sql_for_value_match(visit_ids)

    try:
        # seeing_median を取得
        result = conn.execute(
            text(f"SELECT pfs_visit_id, seeing_median FROM seeing WHERE pfs_visit_id {match_sql}")
        )
        for visit_id, seeing_median in result:
            if visit_id in qas:
                qas[visit_id].seeing_median = seeing_median

        # transparency_median を取得
        result = conn.execute(
            text(
                f"SELECT pfs_visit_id, transparency_median FROM transparency WHERE pfs_visit_id {match_sql}"
            )
        )
        for visit_id, transparency_median in result:
            if visit_id in qas:
                qas[visit_id].transparency_median = transparency_median

        # effective_exposure_time を取得
        result = conn.execute(
            text(
                f"SELECT pfs_visit_id, effective_exposure_time_b, effective_exposure_time_r, "
                f"effective_exposure_time_n, effective_exposure_time_m "
                f"FROM exposure_time WHERE pfs_visit_id {match_sql}"
            )
        )
        for visit_id, eet_b, eet_r, eet_n, eet_m in result:
            if visit_id in qas:
                qas[visit_id].effective_exposure_time_b = eet_b
                qas[visit_id].effective_exposure_time_r = eet_r
                qas[visit_id].effective_exposure_time_n = eet_n
                qas[visit_id].effective_exposure_time_m = eet_m

    except SQLAlchemyError:
        # QAデータベースエラーの場合は空の結果を返す（メイン機能を止めない）
        pass

    return qas


# QADB接続エンジン（遅延初期化）
_qadb_engine = None


def _get_qadb_engine():
    """QADBエンジンを取得（遅延初期化）"""
    global _qadb_engine
    if _qadb_engine is None:
        settings = get_settings()
        if settings.qadb_url:
            _qadb_engine = create_engine(
                settings.qadb_url, echo=settings.database_echo, pool_pre_ping=True
            )
    return _qadb_engine


def get_qadb_connection():
    """QAデータベース接続を取得するDependency

    設定でqadb_urlが空の場合はNoneを返します。

    Usage:
        @router.get("/visits")
        def list_visits(qadb: QADBConnection):
            if qadb:
                # QAデータを取得
                ...
    """
    engine = _get_qadb_engine()
    if engine is None:
        yield None
        return

    with contextlib.ExitStack() as stack:
        try:
            conn = stack.enter_context(engine.connect())
            yield conn
        except SQLAlchemyError:
            # QAデータベース接続エラーの場合はNoneを返す
            yield None


# 型エイリアス
QADBConnection = Annotated[Connection | None, Depends(get_qadb_connection)]
