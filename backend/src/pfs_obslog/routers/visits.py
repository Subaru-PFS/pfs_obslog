"""Visit一覧API エンドポイント

Visit一覧の取得APIを提供します。
"""

import csv
import io
from typing import Sequence

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

from pfs_obslog import models as M
from pfs_obslog.database import DbSession
from pfs_obslog.visitquery import QueryEvaluator, QueryParseError, parse_where_clause
from pfs_obslog.visitquery.joins import JoinBuilder
from pfs_obslog.schemas.visits import (
    AgcExposure,
    AgcGuideOffset,
    AgcVisitDetail,
    IicSequence,
    IicSequenceDetail,
    IicSequenceStatus,
    McsExposure,
    McsExposureNote,
    McsVisitDetail,
    ObslogUser,
    SequenceGroup,
    SpsAnnotation,
    SpsExposure,
    SpsVisitDetail,
    VisitDetail,
    VisitList,
    VisitListEntry,
    VisitNote,
    VisitRankResponse,
    VisitSetNote,
)

router = APIRouter(prefix="/visits", tags=["visits"])



@router.get("", response_model=VisitList)
def list_visits(
    db: DbSession,
    offset: int = Query(default=0, ge=0, description="ページネーションのオフセット"),
    limit: int = Query(default=50, ge=-1, le=1000, description="取得件数上限（-1で無制限）"),
    sql: str | None = Query(default=None, description="SQLライクなフィルタ条件（例: where id > 100）"),
) -> VisitList:
    """Visit一覧を取得

    ページネーション付きでVisit一覧を取得します。
    各Visitには露出数、平均値、メモなどの集計情報が含まれます。

    sqlパラメータを指定すると、WHERE句でフィルタリングできます。
    例: sql=where id > 100
    """
    # limitが-1の場合は無制限
    effective_limit: int | None = None if limit == -1 else limit

    # SQLフィルタリング条件をパース
    where_condition: ColumnElement | None = None
    required_joins: set[str] = set()

    if sql:
        try:
            where_ast = parse_where_clause(sql)
            if where_ast:
                evaluator = QueryEvaluator(M)
                where_condition = evaluator.evaluate(where_ast)
                required_joins = evaluator.required_joins
        except QueryParseError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    # Visit一覧を取得
    visits, count = _fetch_visits(db, effective_limit, offset, where_condition, required_joins)

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
    where_condition: ColumnElement | None = None,
    required_joins: set[str] | None = None,
) -> tuple[list[VisitListEntry], int]:
    """Visit一覧を取得

    Args:
        db: DBセッション
        limit: 取得件数上限（Noneで無制限）
        offset: オフセット
        where_condition: SQLAlchemy WHERE条件（オプション）
        required_joins: 必要なJOINの名前のセット（オプション）

    Returns:
        (Visit一覧, 総件数)
    """
    if required_joins is None:
        required_joins = set()

    # ベースクエリ
    base_query = select(M.PfsVisit.pfs_visit_id).select_from(M.PfsVisit)

    # フィルタリング条件がある場合、必要なJOINを適用
    if where_condition is not None:
        join_builder = JoinBuilder(M)
        base_query = join_builder.apply_joins(base_query, required_joins)
        base_query = base_query.where(where_condition)
        # フィルタリング時はDISTINCTが必要（JOIN で重複が生じる可能性）
        base_query = base_query.distinct()

    # 総件数を取得
    count_query = select(func.count()).select_from(base_query.subquery())
    count: int = db.execute(count_query).scalar_one()

    # 対象VisitIDを取得（ページネーション適用）
    ids_query = (
        base_query
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
    if not visit_ids:  # pragma: no cover
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
                else ObslogUser(id=0, account_name="unknown"),  # pragma: no cover
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


# =============================================================================
# Visit詳細
# =============================================================================


@router.get("/{visit_id}", response_model=VisitDetail)
def get_visit(
    db: DbSession,
    visit_id: int,
) -> VisitDetail:
    """Visit詳細を取得

    指定されたVisit IDの詳細情報を取得します。
    SPS/MCS/AGC露出情報、IICシーケンス情報、メモを含みます。
    """
    return _fetch_visit_detail(db, visit_id)


def _fetch_visit_detail(db: Session, visit_id: int) -> VisitDetail:
    """Visit詳細を取得

    Args:
        db: DBセッション
        visit_id: Visit ID

    Returns:
        Visit詳細

    Raises:
        HTTPException: Visitが見つからない場合
    """
    # PfsVisitを取得
    pfs_visit = db.execute(
        select(M.PfsVisit)
        .where(M.PfsVisit.pfs_visit_id == visit_id)
        .options(
            selectinload(M.PfsVisit.obslog_visit_note).selectinload(M.ObslogVisitNote.user)
        )
    ).scalar_one_or_none()

    if not pfs_visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")

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

    # SpS情報を取得
    sps = _fetch_sps_detail(db, visit_id)

    # MCS情報を取得
    mcs = _fetch_mcs_detail(db, visit_id)

    # AGC情報を取得
    agc = _fetch_agc_detail(db, visit_id)

    # IicSequence情報を取得
    iic_sequence = _fetch_iic_sequence_detail(db, visit_id)

    return VisitDetail(
        id=pfs_visit.pfs_visit_id,
        description=pfs_visit.pfs_visit_description,
        issued_at=pfs_visit.issued_at,
        notes=notes,
        sps=sps,
        mcs=mcs,
        agc=agc,
        iic_sequence=iic_sequence,
    )


def _fetch_sps_detail(db: Session, visit_id: int) -> SpsVisitDetail | None:
    """SpS露出詳細を取得"""
    # SpsVisitを取得
    sps_visit = db.execute(
        select(M.SpsVisit)
        .where(M.SpsVisit.pfs_visit_id == visit_id)
        .options(selectinload(M.SpsVisit.sps_exposure).selectinload(M.SpsExposure.sps_annotation))
    ).scalar_one_or_none()

    if not sps_visit:
        return None

    exposures = [
        SpsExposure(
            camera_id=exp.sps_camera_id,
            exptime=exp.exptime,
            exp_start=exp.time_exp_start,
            exp_end=exp.time_exp_end,
            annotations=[
                SpsAnnotation(
                    annotation_id=ann.annotation_id,
                    data_flag=ann.data_flag,
                    notes=ann.notes,
                    created_at=ann.created_at,
                )
                for ann in exp.sps_annotation
            ],
        )
        for exp in sps_visit.sps_exposure
    ]

    return SpsVisitDetail(
        exp_type=sps_visit.exp_type,
        exposures=exposures,
    )


def _fetch_mcs_detail(db: Session, visit_id: int) -> McsVisitDetail | None:
    """MCS露出詳細を取得"""
    mcs_exposures = db.scalars(
        select(M.McsExposure)
        .where(M.McsExposure.pfs_visit_id == visit_id)
        .options(selectinload(M.McsExposure.obslog_mcs_exposure_note).selectinload(M.ObslogMcsExposureNote.user))
        .order_by(M.McsExposure.mcs_frame_id)
    ).all()

    if not mcs_exposures:
        return None

    exposures = [
        McsExposure(
            frame_id=exp.mcs_frame_id,
            exptime=exp.mcs_exptime,
            altitude=exp.altitude,
            azimuth=exp.azimuth,
            insrot=exp.insrot,
            adc_pa=exp.adc_pa,
            dome_temperature=exp.dome_temperature,
            dome_pressure=exp.dome_pressure,
            dome_humidity=exp.dome_humidity,
            outside_temperature=exp.outside_temperature,
            outside_pressure=exp.outside_pressure,
            outside_humidity=exp.outside_humidity,
            mcs_cover_temperature=exp.mcs_cover_temperature,
            mcs_m1_temperature=exp.mcs_m1_temperature,
            taken_at=exp.taken_at,
            notes=[
                McsExposureNote(
                    id=note.id,
                    body=note.body,
                    user=ObslogUser(id=note.user.id, account_name=note.user.account_name)
                    if note.user
                    else ObslogUser(id=0, account_name="unknown"),
                )
                for note in exp.obslog_mcs_exposure_note
            ],
        )
        for exp in mcs_exposures
    ]

    return McsVisitDetail(exposures=exposures)


def _fetch_agc_detail(db: Session, visit_id: int) -> AgcVisitDetail | None:
    """AGC露出詳細を取得"""
    agc_exposures = db.scalars(
        select(M.AgcExposure)
        .where(M.AgcExposure.pfs_visit_id == visit_id)
        .order_by(M.AgcExposure.agc_exposure_id)
    ).all()

    if not agc_exposures:
        return None

    # AgcGuideOffsetを一括取得
    exposure_ids = [exp.agc_exposure_id for exp in agc_exposures]
    guide_offsets_result = db.scalars(
        select(M.AgcGuideOffset).where(M.AgcGuideOffset.agc_exposure_id.in_(exposure_ids))
    ).all()
    guide_offsets_map = {go.agc_exposure_id: go for go in guide_offsets_result}

    exposures = []
    for exp in agc_exposures:
        guide_offset = None
        if exp.agc_exposure_id in guide_offsets_map:
            go = guide_offsets_map[exp.agc_exposure_id]
            guide_offset = AgcGuideOffset(
                ra=go.guide_ra,
                dec=go.guide_dec,
                pa=go.guide_pa,
                delta_ra=go.guide_delta_ra,
                delta_dec=go.guide_delta_dec,
                delta_insrot=go.guide_delta_insrot,
                delta_az=go.guide_delta_az,
                delta_el=go.guide_delta_el,
                delta_z=go.guide_delta_z,
                delta_z1=go.guide_delta_z1,
                delta_z2=go.guide_delta_z2,
                delta_z3=go.guide_delta_z3,
                delta_z4=go.guide_delta_z4,
                delta_z5=go.guide_delta_z5,
                delta_z6=go.guide_delta_z6,
            )

        exposures.append(
            AgcExposure(
                id=exp.agc_exposure_id,
                exptime=exp.agc_exptime,
                altitude=exp.altitude,
                azimuth=exp.azimuth,
                insrot=exp.insrot,
                adc_pa=exp.adc_pa,
                m2_pos3=exp.m2_pos3,
                outside_temperature=exp.outside_temperature,
                outside_pressure=exp.outside_pressure,
                outside_humidity=exp.outside_humidity,
                measurement_algorithm=exp.measurement_algorithm,
                version_actor=exp.version_actor,
                version_instdata=exp.version_instdata,
                taken_at=exp.taken_at,
                guide_offset=guide_offset,
            )
        )

    return AgcVisitDetail(exposures=exposures)


def _fetch_iic_sequence_detail(db: Session, visit_id: int) -> IicSequenceDetail | None:
    """IICシーケンス詳細を取得"""
    # visit_setテーブルからiic_sequence_idを取得
    iic_sequence_id = db.execute(
        select(M.t_visit_set.c.iic_sequence_id).where(M.t_visit_set.c.pfs_visit_id == visit_id)
    ).scalar_one_or_none()

    if not iic_sequence_id:
        return None

    # IicSequenceを取得
    iic_sequence = db.execute(
        select(M.IicSequence)
        .where(M.IicSequence.iic_sequence_id == iic_sequence_id)
        .options(selectinload(M.IicSequence.group))
        .options(selectinload(M.IicSequence.obslog_visit_set_note).selectinload(M.ObslogVisitSetNote.user))
    ).scalar_one_or_none()

    if not iic_sequence:
        return None

    # IicSequenceStatusを取得
    status = db.execute(
        select(M.IicSequenceStatus).where(M.IicSequenceStatus.iic_sequence_id == iic_sequence_id)
    ).scalar_one_or_none()

    # グループ情報
    group = None
    if iic_sequence.group:
        group = SequenceGroup(
            group_id=iic_sequence.group.group_id,
            group_name=iic_sequence.group.group_name,
            created_at=iic_sequence.group.created_at,
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
        for note in iic_sequence.obslog_visit_set_note
    ]

    # ステータス情報
    status_info = None
    if status:
        status_info = IicSequenceStatus(
            iic_sequence_id=status.iic_sequence_id,
            status_flag=status.status_flag,
            cmd_output=status.cmd_output,
        )

    return IicSequenceDetail(
        iic_sequence_id=iic_sequence.iic_sequence_id,
        sequence_type=iic_sequence.sequence_type,
        name=iic_sequence.name,
        comments=iic_sequence.comments,
        cmd_str=iic_sequence.cmd_str,
        group_id=iic_sequence.group_id,
        created_at=iic_sequence.created_at,
        group=group,
        notes=notes,
        status=status_info,
    )


# =============================================================================
# Visit Rank API
# =============================================================================


@router.get("/{visit_id}/rank", response_model=VisitRankResponse)
def get_visit_rank(
    db: DbSession,
    visit_id: int,
    sql: str | None = Query(default=None, description="SQLライクなフィルタ条件（例: where id > 100）"),
) -> VisitRankResponse:
    """指定したVisitのフィルタリング結果内での順位を取得

    Args:
        db: DBセッション
        visit_id: VisitID
        sql: SQLライクなフィルタ条件

    Returns:
        順位（1から始まる）。Visitが見つからない場合はNone
    """
    # SQLフィルタリング条件をパース
    where_condition: ColumnElement | None = None
    required_joins: set[str] = set()

    if sql:
        try:
            where_ast = parse_where_clause(sql)
            if where_ast:
                evaluator = QueryEvaluator(M)
                where_condition = evaluator.evaluate(where_ast)
                required_joins = evaluator.required_joins
        except QueryParseError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    # ベースクエリ
    base_query = select(M.PfsVisit.pfs_visit_id).select_from(M.PfsVisit)

    # フィルタリング条件がある場合、必要なJOINを適用
    if where_condition is not None:
        join_builder = JoinBuilder(M)
        base_query = join_builder.apply_joins(base_query, required_joins)
        base_query = base_query.where(where_condition)
        base_query = base_query.distinct()

    # サブクエリとしてランク付き結果を作成
    ranked_subquery = (
        select(
            M.PfsVisit.pfs_visit_id.label("id"),
            func.rank().over(order_by=M.PfsVisit.pfs_visit_id.desc()).label("rank"),
        )
        .select_from(M.PfsVisit)
    )

    # フィルタ条件がある場合はJOINとWHEREを適用
    if where_condition is not None:
        join_builder = JoinBuilder(M)
        ranked_subquery = join_builder.apply_joins(ranked_subquery, required_joins)
        ranked_subquery = ranked_subquery.where(where_condition)

    ranked_subquery = ranked_subquery.subquery("ranked")

    # 指定されたvisit_idの順位を取得
    rank = db.execute(
        select(ranked_subquery.c.rank).where(ranked_subquery.c.id == visit_id)
    ).scalar_one_or_none()

    return VisitRankResponse(rank=rank)


# =============================================================================
# Visit CSV Export API
# =============================================================================

csv_router = APIRouter(tags=["visits"])


@csv_router.get("/visits.csv")
def export_visits_csv(
    db: DbSession,
    offset: int = Query(default=0, ge=0, description="ページネーションのオフセット"),
    limit: int = Query(default=10000, ge=-1, le=100000, description="取得件数上限（-1で無制限）"),
    sql: str | None = Query(default=None, description="SQLライクなフィルタ条件（例: where id > 100）"),
) -> Response:
    """Visit一覧をCSV形式でエクスポート

    Args:
        db: DBセッション
        offset: オフセット
        limit: 取得件数上限
        sql: SQLライクなフィルタ条件

    Returns:
        CSV形式のレスポンス
    """
    # limitが-1の場合は無制限
    effective_limit: int | None = None if limit == -1 else limit

    # SQLフィルタリング条件をパース
    where_condition: ColumnElement | None = None
    required_joins: set[str] = set()

    if sql:
        try:
            where_ast = parse_where_clause(sql)
            if where_ast:
                evaluator = QueryEvaluator(M)
                where_condition = evaluator.evaluate(where_ast)
                required_joins = evaluator.required_joins
        except QueryParseError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    # Visit一覧を取得
    visits, _count = _fetch_visits(db, effective_limit, offset, where_condition, required_joins)

    # 関連するIicSequenceを取得
    iic_sequences = _fetch_related_iic_sequences(db, visits)
    iic_sequence_map = {seq.iic_sequence_id: seq for seq in iic_sequences}

    # CSVを生成
    buf = io.StringIO()
    writer = csv.writer(buf)

    for i, visit in enumerate(visits):
        iic_sequence = iic_sequence_map.get(visit.iic_sequence_id)
        row_dict = _visit_to_csv_dict(visit, iic_sequence)
        if i == 0:
            # ヘッダー行（最初の列に#を付ける）
            columns = [f"# {c}" if i_c == 0 else c for i_c, c in enumerate(row_dict.keys())]
            writer.writerow(columns)
        writer.writerow(row_dict.values())

    csv_content = buf.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="pfsobslog.utf8.csv"'},
    )


def _visit_to_csv_dict(visit: VisitListEntry, iic_sequence: IicSequence | None) -> dict[str, str | None]:
    """VisitListEntryをCSV行用の辞書に変換"""
    return _stringify_values(
        {
            "visit_id": visit.id,
            "description": visit.description,
            "sequence_name": iic_sequence.name if iic_sequence else None,
            "issued_at": visit.issued_at,
            "iic_sequence_id": visit.iic_sequence_id,
            "n_sps_exposures": visit.n_sps_exposures,
            "n_mcs_exposures": visit.n_mcs_exposures,
            "n_agc_exposures": visit.n_agc_exposures,
            "avg_exptime": visit.avg_exptime,
            "pfs_design_id": visit.pfs_design_id,
            "avg_azimuth": visit.avg_azimuth,
            "avg_altitude": visit.avg_altitude,
            "avg_insrot": visit.avg_insrot,
            "notes": _notes_to_csv_cell(visit.notes),
            "visit_set_notes": _iic_sequence_notes_to_csv_cell(iic_sequence) if iic_sequence else None,
        }
    )


def _stringify_values(d: dict[str, object]) -> dict[str, str | None]:
    """辞書の値を文字列に変換"""
    return {k: str(v) if v is not None else None for k, v in d.items()}


def _notes_to_csv_cell(notes: list[VisitNote]) -> str:
    """VisitNoteリストをCSVセル用の文字列に変換"""
    return "\n".join(f"{n.body} by {n.user.account_name}" for n in notes)


def _iic_sequence_notes_to_csv_cell(iic_sequence: IicSequence | None) -> str | None:
    """IicSequenceのノートをCSVセル用の文字列に変換"""
    if iic_sequence is None:
        return None
    return "\n".join(f"{n.body} by {n.user.account_name}" for n in iic_sequence.notes)
