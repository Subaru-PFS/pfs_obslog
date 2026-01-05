"""PFS Design API

PFS Design ファイル（観測設計）の一覧表示、詳細取得、ダウンロード機能を提供します。
"""

import datetime
import math
import re
from logging import getLogger
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from pfs_obslog.config import get_settings
from pfs_obslog.pfs_design_cache import get_pfs_design_cache
from pfs_obslog.routers.fits import FitsMeta, FitsHdu, FitsHeader, Card

logger = getLogger(__name__)
router = APIRouter(prefix="/api/pfs_designs", tags=["pfs_designs"])


# ============================================================
# Helper Functions
# ============================================================


def _deg2rad(deg: float) -> float:
    """度からラジアンに変換"""
    return deg * math.pi / 180.0


def _calculate_altitude(
    ra: float, dec: float, zenith_ra: float, zenith_dec: float
) -> float:
    """高度を計算（天頂との角距離のコサイン）

    高度が高いほど値が大きくなる（1に近い）。
    天頂との角距離が小さいほど高い位置にある。

    Args:
        ra: Design の赤経（度）
        dec: Design の赤緯（度）
        zenith_ra: 天頂の赤経（度）
        zenith_dec: 天頂の赤緯（度）

    Returns:
        高度を表す値（天頂とのコサイン距離）
    """
    ra1 = _deg2rad(ra)
    dec1 = _deg2rad(dec)
    ra2 = _deg2rad(zenith_ra)
    dec2 = _deg2rad(zenith_dec)

    # 球面三角法による角距離のコサイン
    cos_d = (
        math.sin(dec1) * math.sin(dec2)
        + math.cos(dec1) * math.cos(dec2) * math.cos(ra1 - ra2)
    )
    return cos_d


# ============================================================
# Schemas
# ============================================================


class DesignRows(BaseModel):
    """Design ファイル内のターゲットタイプ別行数"""

    science: int  # ターゲットタイプ 1: 科学ターゲット
    sky: int  # ターゲットタイプ 2: 空（スカイ減算用）
    fluxstd: int  # ターゲットタイプ 3: フラックス標準星
    unassigned: int  # ターゲットタイプ 4: 未割り当て
    engineering: int  # ターゲットタイプ 5: エンジニアリング
    sunss_imaging: int  # ターゲットタイプ 6: SuNSS イメージング
    sunss_diffuse: int  # ターゲットタイプ 7: SuNSS 拡散


class PfsDesignEntry(BaseModel):
    """PFS Design エントリ（一覧用）"""

    id: str  # Design ID（16進数文字列）
    frameid: str  # ファイル名
    name: str  # Design名
    date_modified: datetime.datetime  # 更新日時
    ra: float  # 中心赤経
    dec: float  # 中心赤緯
    arms: str  # 使用するアーム
    num_design_rows: int  # Design行数
    num_photometry_rows: int  # 測光行数
    num_guidestar_rows: int  # ガイド星行数
    design_rows: DesignRows  # ターゲットタイプ別行数


class PfsDesignListResponse(BaseModel):
    """PFS Design 一覧レスポンス（ページネーション対応）"""

    items: list[PfsDesignEntry]  # Designエントリのリスト
    total: int  # 全件数（フィルタ適用後）
    offset: int  # 現在のオフセット
    limit: int  # 取得件数


class PfsDesignPosition(BaseModel):
    """PFS Design 位置情報（軽量版）"""

    id: str  # Design ID（16進数文字列）
    ra: float  # 中心赤経
    dec: float  # 中心赤緯


class PfsDesignRankResponse(BaseModel):
    """PFS Design ランクレスポンス"""

    rank: int | None  # 順位（0始まり）、見つからない場合はNone


class DesignData(BaseModel):
    """Design HDU データ"""

    fiberId: list[int]
    catId: list[int]
    tract: list[int]
    patch: list[str]
    objId: list[str]  # JavaScriptの安全な整数範囲を超えるため文字列で返す
    ra: list[float]
    dec: list[float]
    targetType: list[int]
    fiberStatus: list[int]
    pfiNominal: list[list[float]]
    epoch: list[str]
    pmRa: list[float]
    pmDec: list[float]
    parallax: list[float]
    proposalId: list[str]
    obCode: list[str]


class PhotometryData(BaseModel):
    """測光データ"""

    fiberId: list[int]
    fiberFlux: list[float]
    psfFlux: list[float]
    totalFlux: list[float]
    fiberFluxErr: list[float]
    psfFluxErr: list[float]
    totalFluxErr: list[float]
    filterName: list[str]


class GuidestarData(BaseModel):
    """ガイド星データ"""

    ra: list[float]
    dec: list[float]


class PfsDesignDetail(BaseModel):
    """PFS Design 詳細"""

    fits_meta: FitsMeta
    date_modified: datetime.datetime
    design_data: DesignData
    photometry_data: PhotometryData
    guidestar_data: GuidestarData


# ============================================================
# Helper Functions
# ============================================================


def _stringify(value: Any) -> str:
    """値を文字列に変換"""
    if value is True:
        return "T"
    if value is False:
        return "F"
    return str(value)


def _fits_meta_from_hdul(filename: str, hdul) -> FitsMeta:
    """HDUListからFitsMetaを生成"""
    return FitsMeta(
        filename=filename,
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(
                    cards=[
                        Card(
                            key=keyword,
                            value=_stringify(value),
                            comment=comment,
                        )
                        for keyword, value, comment in hdu.header.cards
                    ]
                ),
            )
            for i, hdu in enumerate(hdul)
        ],
    )


def _pick_id(frameid: str) -> str:
    """ファイル名からDesign IDを抽出

    例: 'pfsDesign-0x1234567890abcdef.fits' -> '1234567890abcdef'
    """
    return frameid[len("pfsDesign-0x") : -len(".fits")]


def _design_rows_from_hdu(hdu) -> DesignRows:
    """HDUからターゲットタイプ別行数を取得"""
    import numpy

    target_types = numpy.clip(hdu.data.field("targetType"), 0, 8)
    bc = numpy.bincount(target_types, minlength=8)

    return DesignRows(
        science=int(bc[1]),
        sky=int(bc[2]),
        fluxstd=int(bc[3]),
        unassigned=int(bc[4]),
        engineering=int(bc[5]),
        sunss_imaging=int(bc[6]),
        sunss_diffuse=int(bc[7]),
    )


def _read_design_entry(path: Path) -> PfsDesignEntry:
    """Designファイルからエントリ情報を読み取る"""
    import astropy.io.fits as afits

    with afits.open(path) as hdul:
        meta = _fits_meta_from_hdul(path.name, hdul)

        return PfsDesignEntry(
            id=_pick_id(meta.filename),
            frameid=meta.filename,
            name=meta.hdul[0].header.value("DSGN_NAM") or "",
            date_modified=datetime.datetime.fromtimestamp(path.stat().st_mtime),
            ra=float(meta.hdul[0].header.value("RA") or 0.0),
            dec=float(meta.hdul[0].header.value("DEC") or 0.0),
            arms=meta.hdul[0].header.value("ARMS") or "-",
            num_design_rows=len(hdul[1].data),  # type: ignore[arg-type]
            num_photometry_rows=len(hdul[2].data),  # type: ignore[arg-type]
            num_guidestar_rows=len(hdul[3].data),  # type: ignore[arg-type]
            design_rows=_design_rows_from_hdu(hdul[1]),  # type: ignore[arg-type]
        )


# ============================================================
# Endpoints
# ============================================================


def _sync_cache_in_background() -> None:
    """バックグラウンドでキャッシュを同期"""
    settings = get_settings()
    if not settings.pfs_design_cache_enabled:
        return
    cache = get_pfs_design_cache(settings.pfs_design_cache_db, settings.pfs_design_dir)
    cache.sync()


@router.get(
    "",
    response_model=PfsDesignListResponse,
    summary="List PFS Designs",
    description="Get a paginated list of PFS Design files with optional filtering and sorting.",
)
def list_pfs_designs(
    background_tasks: BackgroundTasks,
    search: Optional[str] = Query(
        None, description="Search string (matches name or id)"
    ),
    sort_by: Literal["date_modified", "name", "id", "altitude"] = Query(
        "date_modified", description="Field to sort by"
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Number of items to return"),
    zenith_ra: Optional[float] = Query(
        None, description="Zenith RA in degrees (required for altitude sort)"
    ),
    zenith_dec: Optional[float] = Query(
        None, description="Zenith Dec in degrees (required for altitude sort)"
    ),
    date_from: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD format)"
    ),
    date_to: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD format)"
    ),
):
    """PFS Design の一覧を取得（ページネーション対応）

    キャッシュが有効な場合、SQLiteキャッシュから一覧を取得し、
    バックグラウンドでキャッシュを更新します。

    altitude ソートの場合は zenith_ra, zenith_dec パラメータが必要です。
    """
    # altitude ソートのバリデーション
    if sort_by == "altitude":
        if zenith_ra is None or zenith_dec is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="zenith_ra and zenith_dec are required for altitude sort",
            )

    settings = get_settings()
    design_dir = settings.pfs_design_dir

    if not design_dir.exists():
        return PfsDesignListResponse(items=[], total=0, offset=offset, limit=limit)

    # キャッシュが有効な場合
    if settings.pfs_design_cache_enabled:
        cache = get_pfs_design_cache(settings.pfs_design_cache_db, design_dir)

        # バックグラウンドでキャッシュ更新
        background_tasks.add_task(_sync_cache_in_background)

        # キャッシュから取得（高度ソートもキャッシュ側で処理）
        entries, total = cache.get_entries_paginated(
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=offset,
            limit=limit,
            zenith_ra=zenith_ra,
            zenith_dec=zenith_dec,
            date_from=date_from,
            date_to=date_to,
        )

        # キャッシュが空の場合は同期を待つ（初回のみ）
        if total == 0 and not search and not date_from and not date_to:
            cache.sync()
            entries, total = cache.get_entries_paginated(
                search=search,
                sort_by=sort_by,
                sort_order=sort_order,
                offset=offset,
                limit=limit,
                zenith_ra=zenith_ra,
                zenith_dec=zenith_dec,
                date_from=date_from,
                date_to=date_to,
            )

        items = [
            PfsDesignEntry(
                id=e["id"],
                frameid=e["frameid"],
                name=e["name"],
                date_modified=e["date_modified"],
                ra=e["ra"],
                dec=e["dec"],
                arms=e["arms"],
                num_design_rows=e["num_design_rows"],
                num_photometry_rows=e["num_photometry_rows"],
                num_guidestar_rows=e["num_guidestar_rows"],
                design_rows=DesignRows(**e["design_rows"]),
            )
            for e in entries
        ]

        return PfsDesignListResponse(
            items=items, total=total, offset=offset, limit=limit
        )

    # キャッシュが無効な場合（フォールバック）
    # 全件取得してメモリでフィルタリング・ソート
    pattern = re.compile(r"^pfsDesign-0x[0-9a-fA-F]{16}\.fits$")
    design_list = []

    for path in design_dir.glob("pfsDesign-0x*.fits"):
        if pattern.match(path.name):
            try:
                entry = _read_design_entry(path)
                design_list.append(entry)
            except Exception as e:
                logger.warning(f"Failed to read design file {path}: {e}")
                continue

    # フィルタリング
    if search:
        search_lower = search.lower()
        design_list = [
            d
            for d in design_list
            if search_lower in d.name.lower() or search_lower in d.id.lower()
        ]

    # ソート
    reverse = sort_order == "desc"
    if sort_by == "name":
        design_list.sort(key=lambda d: d.name, reverse=reverse)
    elif sort_by == "id":
        design_list.sort(key=lambda d: d.id, reverse=reverse)
    elif sort_by == "altitude" and zenith_ra is not None and zenith_dec is not None:
        design_list.sort(
            key=lambda d: _calculate_altitude(d.ra, d.dec, zenith_ra, zenith_dec),
            reverse=reverse,
        )
    else:  # date_modified
        design_list.sort(key=lambda d: d.date_modified, reverse=reverse)

    # ページネーション
    total = len(design_list)
    items = design_list[offset : offset + limit]

    return PfsDesignListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get(
    "/positions",
    response_model=list[PfsDesignPosition],
    summary="Get PFS Design positions",
    description="Get positions (id, ra, dec) of PFS Designs. Supports filtering by search and date range.",
)
def list_design_positions(
    background_tasks: BackgroundTasks,
    search: Optional[str] = Query(
        None, description="Search string (matches name or id)"
    ),
    date_from: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD format)"
    ),
    date_to: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD format)"
    ),
):
    """Designの位置情報を取得

    天球ビュー（SkyViewer）でのDesign表示に使用します。
    検索条件・日付フィルターでフィルタリング可能です。
    """
    settings = get_settings()
    design_dir = settings.pfs_design_dir

    if not design_dir.exists():
        return []

    # キャッシュが有効な場合
    if settings.pfs_design_cache_enabled:
        cache = get_pfs_design_cache(settings.pfs_design_cache_db, design_dir)

        # バックグラウンドでキャッシュ更新
        background_tasks.add_task(_sync_cache_in_background)

        # フィルター条件がある場合はフィルター付きで取得
        if search or date_from or date_to:
            positions = cache.get_positions_filtered(
                search=search,
                date_from=date_from,
                date_to=date_to,
            )
        else:
            # キャッシュから取得
            positions = cache.get_all_positions()

            # キャッシュが空の場合は同期を待つ（初回のみ）
            if not positions:
                cache.sync()
                positions = cache.get_all_positions()

        return [
            PfsDesignPosition(id=p["id"], ra=p["ra"], dec=p["dec"]) for p in positions
        ]

    # キャッシュが無効な場合（フォールバック）
    # 全ファイルを読み込み、位置情報のみ抽出
    import astropy.io.fits as afits

    pattern = re.compile(r"^pfsDesign-0x([0-9a-fA-F]{16})\.fits$")
    positions = []

    for path in design_dir.glob("pfsDesign-0x*.fits"):
        match = pattern.match(path.name)
        if match:
            try:
                with afits.open(path) as hdul:
                    header = hdul[0].header  # type: ignore[union-attr]
                    positions.append(
                        PfsDesignPosition(
                            id=match.group(1).lower(),
                            ra=float(header.get("RA", 0.0)),
                            dec=float(header.get("DEC", 0.0)),
                        )
                    )
            except Exception as e:
                logger.warning(f"Failed to read design file {path}: {e}")
                continue

    return positions


@router.get(
    "/rank/{design_id}",
    response_model=PfsDesignRankResponse,
    summary="Get design rank",
    description="Get the rank (0-based index) of a design within the current filter/sort conditions.",
)
def get_design_rank(
    design_id: str,
    background_tasks: BackgroundTasks,
    search: Optional[str] = Query(
        None, description="Search string (matches name or id)"
    ),
    sort_by: Literal["date_modified", "name", "id", "altitude"] = Query(
        "date_modified", description="Field to sort by"
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
    zenith_ra: Optional[float] = Query(
        None, description="Zenith RA in degrees (required for altitude sort)"
    ),
    zenith_dec: Optional[float] = Query(
        None, description="Zenith Dec in degrees (required for altitude sort)"
    ),
    date_from: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD format)"
    ),
    date_to: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD format)"
    ),
):
    """指定したDesign IDの順位を取得

    現在のフィルター・ソート条件での順位（0始まり）を返します。
    """
    if not re.match(r"^[0-9a-fA-F]{16}$", design_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid design ID format: {design_id}",
        )

    # altitude ソートのバリデーション
    if sort_by == "altitude":
        if zenith_ra is None or zenith_dec is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="zenith_ra and zenith_dec are required for altitude sort",
            )

    settings = get_settings()
    design_dir = settings.pfs_design_dir

    if not design_dir.exists():
        return PfsDesignRankResponse(rank=None)

    # キャッシュが有効な場合
    if settings.pfs_design_cache_enabled:
        cache = get_pfs_design_cache(settings.pfs_design_cache_db, design_dir)

        # バックグラウンドでキャッシュ更新
        background_tasks.add_task(_sync_cache_in_background)

        rank = cache.get_design_rank(
            design_id=design_id.lower(),
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            zenith_ra=zenith_ra,
            zenith_dec=zenith_dec,
            date_from=date_from,
            date_to=date_to,
        )

        return PfsDesignRankResponse(rank=rank)

    # キャッシュが無効な場合はNoneを返す（フォールバックは未実装）
    return PfsDesignRankResponse(rank=None)


@router.get(
    "/{id_hex}.fits",
    summary="Download PFS Design FITS",
    description="Download the FITS file for a specific PFS Design.",
)
def download_design(id_hex: str):
    """PFS Design FITSファイルをダウンロード"""
    if not re.match(r"^[0-9a-fA-F]{16}$", id_hex):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid design ID format: {id_hex}",
        )

    settings = get_settings()
    filepath = settings.pfs_design_dir / f"pfsDesign-0x{id_hex}.fits"

    if not filepath.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Design file not found: {id_hex}",
        )

    return FileResponse(str(filepath), media_type="image/fits", filename=filepath.name)


@router.get(
    "/{id_hex}",
    response_model=PfsDesignDetail,
    summary="Get PFS Design details",
    description="Get detailed information about a specific PFS Design.",
)
def get_design(id_hex: str):
    """PFS Design の詳細を取得"""
    if not re.match(r"^[0-9a-fA-F]{16}$", id_hex):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid design ID format: {id_hex}",
        )

    settings = get_settings()
    filepath = settings.pfs_design_dir / f"pfsDesign-0x{id_hex}.fits"

    if not filepath.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Design file not found: {id_hex}",
        )

    try:
        import astropy.io.fits as afits

        with afits.open(filepath) as hdul:
            meta = _fits_meta_from_hdul(filepath.name, hdul)

            # objIdはJavaScriptの安全な整数範囲を超える可能性があるため文字列に変換
            objId_array = hdul[1].data.field("objId")  # type: ignore[union-attr]
            objId_str_list = [str(x) for x in objId_array]

            # epochフィールドの存在確認（古いデザインには存在しない場合がある）
            hdu1_columns = hdul[1].columns.names  # type: ignore[union-attr]
            if "epoch" in hdu1_columns:
                epoch_list = [str(x) for x in hdul[1].data.field("epoch")]  # type: ignore[union-attr]
            else:
                # デフォルト値（J2000.0）
                epoch_list = ["J2000.0"] * len(objId_str_list)

            design_data = DesignData(
                fiberId=hdul[1].data.field("fiberId").tolist(),  # type: ignore[union-attr]
                catId=hdul[1].data.field("catId").tolist(),  # type: ignore[union-attr]
                tract=hdul[1].data.field("tract").tolist(),  # type: ignore[union-attr]
                patch=hdul[1].data.field("patch").tolist(),  # type: ignore[union-attr]
                objId=objId_str_list,
                ra=hdul[1].data.field("ra").tolist(),  # type: ignore[union-attr]
                dec=hdul[1].data.field("dec").tolist(),  # type: ignore[union-attr]
                targetType=hdul[1].data.field("targetType").tolist(),  # type: ignore[union-attr]
                fiberStatus=hdul[1].data.field("fiberStatus").tolist(),  # type: ignore[union-attr]
                pfiNominal=hdul[1].data.field("pfiNominal").tolist(),  # type: ignore[union-attr]
                epoch=epoch_list,
                pmRa=hdul[1].data.field("pmRa").tolist(),  # type: ignore[union-attr]
                pmDec=hdul[1].data.field("pmDec").tolist(),  # type: ignore[union-attr]
                parallax=hdul[1].data.field("parallax").tolist(),  # type: ignore[union-attr]
                proposalId=hdul[1].data.field("proposalId").tolist(),  # type: ignore[union-attr]
                obCode=hdul[1].data.field("obCode").tolist(),  # type: ignore[union-attr]
            )

            photometry_data = PhotometryData(
                fiberId=hdul[2].data.field("fiberId").tolist(),  # type: ignore[union-attr]
                fiberFlux=hdul[2].data.field("fiberFlux").tolist(),  # type: ignore[union-attr]
                psfFlux=hdul[2].data.field("psfFlux").tolist(),  # type: ignore[union-attr]
                totalFlux=hdul[2].data.field("totalFlux").tolist(),  # type: ignore[union-attr]
                fiberFluxErr=hdul[2].data.field("fiberFluxErr").tolist(),  # type: ignore[union-attr]
                psfFluxErr=hdul[2].data.field("psfFluxErr").tolist(),  # type: ignore[union-attr]
                totalFluxErr=hdul[2].data.field("totalFluxErr").tolist(),  # type: ignore[union-attr]
                filterName=hdul[2].data.field("filterName").tolist(),  # type: ignore[union-attr]
            )

            guidestar_data = GuidestarData(
                ra=hdul[3].data.field("ra").tolist(),  # type: ignore[union-attr]
                dec=hdul[3].data.field("dec").tolist(),  # type: ignore[union-attr]
            )

            return PfsDesignDetail(
                fits_meta=meta,
                date_modified=datetime.datetime.fromtimestamp(filepath.stat().st_mtime),
                design_data=design_data,
                photometry_data=photometry_data,
                guidestar_data=guidestar_data,
            )
    except Exception as e:
        logger.exception(f"Error reading design file {filepath}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading design file",
        )
