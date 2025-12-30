"""Visit一覧API エンドポイント

Visit一覧の取得APIを提供します。
"""

from typing import Sequence

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from pfs_obslog import models as M
from pfs_obslog.database import DbSession
from pfs_obslog.schemas.visits import (
    IicSequence,
    ObslogUser,
    SequenceGroup,
    VisitList,
    VisitListEntry,
    VisitNote,
    VisitSetNote,
)

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get("", response_model=VisitList)
def list_visits(
    db: DbSession,
    offset: int = Query(default=0, ge=0, description="ページネーションのオフセット"),
    limit: int = Query(default=50, ge=-1, le=1000, description="取得件数上限（-1で無制限）"),
    # SQLフィルタリングは後で実装
    # sql: str | None = Query(default=None, description="SQLライクなフィルタ条件"),
) -> VisitList:
    """Visit一覧を取得

    ページネーション付きでVisit一覧を取得します。
    各Visitには露出数、平均値、メモなどの集計情報が含まれます。
    """
    # limitが-1の場合は無制限
    effective_limit: int | None = None if limit == -1 else limit

    # Visit一覧を取得
    visits, count = _fetch_visits(db, effective_limit, offset)

    # 関連するIicSequenceを取得
    iic_sequences = _fetch_related_iic_sequences(db, visits)

    return VisitList(
        visits=visits,
        iic_sequences=iic_sequences,
        count=count,
    )


def _fetch_visits(
    db: Session,
    limit: int | None,
    offset: int,
    # TODO: フィルタリング用のパラメータを追加
) -> tuple[list[VisitListEntry], int]:
    """Visit一覧を取得

    Args:
        db: DBセッション
        limit: 取得件数上限（Noneで無制限）
        offset: オフセット

    Returns:
        (Visit一覧, 総件数)
    """
    # 総件数を取得
    count: int = db.execute(select(func.count()).select_from(M.PfsVisit)).scalar_one()

    # 対象VisitIDを取得（ページネーション適用）
    ids_query = (
        select(M.PfsVisit.pfs_visit_id)
        .order_by(M.PfsVisit.pfs_visit_id.desc())
        .offset(offset)
    )
    if limit is not None:
        ids_query = ids_query.limit(limit)

    ids = [row[0] for row in db.execute(ids_query)]

    if not ids:
        return [], count

    # Visit詳細を取得
    visits = _build_visit_list_entries(db, ids)
    return visits, count


def _build_visit_list_entries(db: Session, visit_ids: list[int]) -> list[VisitListEntry]:
    """VisitIDリストからVisitListEntryを構築

    Args:
        db: DBセッション
        visit_ids: VisitIDリスト

    Returns:
        VisitListEntryリスト
    """
    if not visit_ids:
        return []

    # 各種集計サブクエリ
    # MCS露出の集計
    mcs_exposure_agg = (
        select(
            M.McsExposure.pfs_visit_id,
            func.avg(M.McsExposure.mcs_exptime).label("mcs_avg_exptime"),
            func.count().label("mcs_count"),
        )
        .where(M.McsExposure.pfs_visit_id.in_(visit_ids))
        .group_by(M.McsExposure.pfs_visit_id)
        .subquery("mcs_agg")
    )

    # SPS露出の集計
    sps_exposure_agg = (
        select(
            M.SpsExposure.pfs_visit_id,
            func.avg(M.SpsExposure.exptime).label("sps_avg_exptime"),
            func.count().label("sps_count"),
        )
        .where(M.SpsExposure.pfs_visit_id.in_(visit_ids))
        .group_by(M.SpsExposure.pfs_visit_id)
        .subquery("sps_agg")
    )

    # AGC露出の集計
    agc_exposure_agg = (
        select(
            M.AgcExposure.pfs_visit_id,
            func.avg(M.AgcExposure.agc_exptime).label("agc_avg_exptime"),
            func.count().label("agc_count"),
        )
        .where(M.AgcExposure.pfs_visit_id.in_(visit_ids))
        .group_by(M.AgcExposure.pfs_visit_id)
        .subquery("agc_agg")
    )

    # 望遠鏡ステータスの集計
    tel_status_agg = (
        select(
            M.TelStatus.pfs_visit_id,
            func.avg(M.TelStatus.altitude).label("avg_altitude"),
            func.avg(M.TelStatus.azimuth).label("avg_azimuth"),
            func.avg(M.TelStatus.insrot).label("avg_insrot"),
            func.avg(M.TelStatus.tel_ra).label("avg_ra"),
            func.avg(M.TelStatus.tel_dec).label("avg_dec"),
        )
        .where(M.TelStatus.pfs_visit_id.in_(visit_ids))
        .group_by(M.TelStatus.pfs_visit_id)
        .subquery("tel_agg")
    )

    # メインクエリ
    query = (
        select(
            M.PfsVisit,
            mcs_exposure_agg.c.mcs_avg_exptime,
            mcs_exposure_agg.c.mcs_count,
            sps_exposure_agg.c.sps_avg_exptime,
            sps_exposure_agg.c.sps_count,
            agc_exposure_agg.c.agc_avg_exptime,
            agc_exposure_agg.c.agc_count,
            tel_status_agg.c.avg_altitude,
            tel_status_agg.c.avg_azimuth,
            tel_status_agg.c.avg_insrot,
            tel_status_agg.c.avg_ra,
            tel_status_agg.c.avg_dec,
            M.t_visit_set.c.iic_sequence_id,
        )
        .where(M.PfsVisit.pfs_visit_id.in_(visit_ids))
        .outerjoin(
            mcs_exposure_agg,
            mcs_exposure_agg.c.pfs_visit_id == M.PfsVisit.pfs_visit_id,
        )
        .outerjoin(
            sps_exposure_agg,
            sps_exposure_agg.c.pfs_visit_id == M.PfsVisit.pfs_visit_id,
        )
        .outerjoin(
            agc_exposure_agg,
            agc_exposure_agg.c.pfs_visit_id == M.PfsVisit.pfs_visit_id,
        )
        .outerjoin(
            tel_status_agg,
            tel_status_agg.c.pfs_visit_id == M.PfsVisit.pfs_visit_id,
        )
        .outerjoin(
            M.t_visit_set,
            M.t_visit_set.c.pfs_visit_id == M.PfsVisit.pfs_visit_id,
        )
        .options(selectinload(M.PfsVisit.obslog_visit_note).selectinload(M.ObslogVisitNote.user))
        .order_by(M.PfsVisit.pfs_visit_id.desc())
    )

    results = db.execute(query).all()

    # VisitListEntryに変換
    visits = []
    for row in results:
        pfs_visit: M.PfsVisit = row[0]

        # 平均露出時間はSPS > MCS > AGCの優先順位
        avg_exptime = row.sps_avg_exptime or row.mcs_avg_exptime or row.agc_avg_exptime

        # メモを変換
        notes = [
            VisitNote(
                id=note.id,
                user_id=note.user_id or 0,
                pfs_visit_id=note.pfs_visit_id or 0,
                body=note.body,
                user=ObslogUser(id=note.user.id, account_name=note.user.account_name)
                if note.user
                else ObslogUser(id=0, account_name="unknown"),
            )
            for note in pfs_visit.obslog_visit_note
        ]

        visits.append(
            VisitListEntry(
                id=pfs_visit.pfs_visit_id,
                description=pfs_visit.pfs_visit_description,
                issued_at=pfs_visit.issued_at,
                iic_sequence_id=row.iic_sequence_id,
                n_sps_exposures=row.sps_count or 0,
                n_mcs_exposures=row.mcs_count or 0,
                n_agc_exposures=row.agc_count or 0,
                avg_exptime=avg_exptime,
                avg_azimuth=row.avg_azimuth,
                avg_altitude=row.avg_altitude,
                avg_ra=row.avg_ra,
                avg_dec=row.avg_dec,
                avg_insrot=row.avg_insrot,
                notes=notes,
                pfs_design_id=hex(pfs_visit.pfs_design_id) if pfs_visit.pfs_design_id else None,
            )
        )

    return visits


def _fetch_related_iic_sequences(
    db: Session,
    visits: list[VisitListEntry],
) -> list[IicSequence]:
    """関連するIicSequenceを取得

    Args:
        db: DBセッション
        visits: Visit一覧

    Returns:
        IicSequenceリスト
    """
    # VisitからiicSequenceIdを抽出
    sequence_ids = {v.iic_sequence_id for v in visits if v.iic_sequence_id is not None}
    if not sequence_ids:
        return []

    # IicSequenceを取得
    query = (
        select(M.IicSequence)
        .where(M.IicSequence.iic_sequence_id.in_(sequence_ids))
        .options(selectinload(M.IicSequence.group))
        .options(
            selectinload(M.IicSequence.obslog_visit_set_note).selectinload(
                M.ObslogVisitSetNote.user
            )
        )
    )
    results: Sequence[M.IicSequence] = db.scalars(query).all()

    # IicSequenceスキーマに変換
    sequences = []
    for seq in results:
        # グループ情報
        group = None
        if seq.group:
            group = SequenceGroup(
                group_id=seq.group.group_id,
                group_name=seq.group.group_name,
                created_at=seq.group.created_at,
            )

        # メモ
        notes = [
            VisitSetNote(
                id=note.id,
                user_id=note.user_id or 0,
                iic_sequence_id=note.iic_sequence_id or 0,
                body=note.body,
                user=ObslogUser(id=note.user.id, account_name=note.user.account_name)
                if note.user
                else ObslogUser(id=0, account_name="unknown"),
            )
            for note in seq.obslog_visit_set_note
        ]

        sequences.append(
            IicSequence(
                iic_sequence_id=seq.iic_sequence_id,
                sequence_type=seq.sequence_type,
                name=seq.name,
                comments=seq.comments,
                cmd_str=seq.cmd_str,
                group_id=seq.group_id,
                created_at=seq.created_at,
                group=group,
                notes=notes,
            )
        )

    return sequences
