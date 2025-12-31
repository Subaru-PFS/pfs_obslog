"""PFS Design API

PFS Design ファイル（観測設計）の一覧表示、詳細取得、ダウンロード機能を提供します。
"""

import datetime
import io
import re
from logging import getLogger
from pathlib import Path
from typing import Any, Optional

import matplotlib
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from matplotlib import pyplot as plt
from pydantic import BaseModel

from pfs_obslog.config import get_settings
from pfs_obslog.routers.fits import FitsMeta, FitsHdu, FitsHeader, Card

# Aggバックエンドを使用（GUI不要）
matplotlib.use("Agg")

logger = getLogger(__name__)
router = APIRouter(prefix="/api/pfs_designs", tags=["pfs_designs"])


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


class DesignData(BaseModel):
    """Design HDU データ"""

    fiberId: list[int]
    catId: list[int]
    tract: list[int]
    patch: list[str]
    objId: list[int]
    ra: list[float]
    dec: list[float]
    targetType: list[int]
    fiberStatus: list[int]
    pfiNominal: list[list[float]]


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
            num_design_rows=len(hdul[1].data),
            num_photometry_rows=len(hdul[2].data),
            num_guidestar_rows=len(hdul[3].data),
            design_rows=_design_rows_from_hdu(hdul[1]),
        )


# ============================================================
# Endpoints
# ============================================================


@router.get(
    "",
    response_model=list[PfsDesignEntry],
    summary="List PFS Designs",
    description="Get a list of all available PFS Design files.",
)
def list_pfs_designs():
    """PFS Design の一覧を取得"""
    settings = get_settings()
    design_dir = settings.pfs_design_dir

    if not design_dir.exists():
        return []

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

    # 更新日時の降順でソート
    design_list.sort(key=lambda d: d.date_modified, reverse=True)

    return design_list


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

            design_data = DesignData(
                fiberId=hdul[1].data.field("fiberId").tolist(),
                catId=hdul[1].data.field("catId").tolist(),
                tract=hdul[1].data.field("tract").tolist(),
                patch=hdul[1].data.field("patch").tolist(),
                objId=hdul[1].data.field("objId").tolist(),
                ra=hdul[1].data.field("ra").tolist(),
                dec=hdul[1].data.field("dec").tolist(),
                targetType=hdul[1].data.field("targetType").tolist(),
                fiberStatus=hdul[1].data.field("fiberStatus").tolist(),
                pfiNominal=hdul[1].data.field("pfiNominal").tolist(),
            )

            photometry_data = PhotometryData(
                fiberId=hdul[2].data.field("fiberId").tolist(),
                fiberFlux=hdul[2].data.field("fiberFlux").tolist(),
                psfFlux=hdul[2].data.field("psfFlux").tolist(),
                totalFlux=hdul[2].data.field("totalFlux").tolist(),
                fiberFluxErr=hdul[2].data.field("fiberFluxErr").tolist(),
                psfFluxErr=hdul[2].data.field("psfFluxErr").tolist(),
                totalFluxErr=hdul[2].data.field("totalFluxErr").tolist(),
                filterName=hdul[2].data.field("filterName").tolist(),
            )

            guidestar_data = GuidestarData(
                ra=hdul[3].data.field("ra").tolist(),
                dec=hdul[3].data.field("dec").tolist(),
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


@router.get(
    ".png",
    summary="Get PFS Design chart",
    description="Generate a chart image for one or more PFS Designs.",
)
def get_design_chart(
    id_hex: list[str] = Query(..., description="Design IDs to include in the chart"),
    date: Optional[datetime.date] = Query(
        None, description="Date for the chart (for visibility calculations)"
    ),
    width: int = Query(default=600, le=1200, description="Image width in pixels"),
    height: int = Query(default=250, le=500, description="Image height in pixels"),
) -> Response:
    """PFS Design のチャート画像を生成

    指定されたPFS Design IDのチャート画像を生成します。
    pfs.utils.pfsDesignUtils.showPfsDesign を使用して可視化します。

    Args:
        id_hex: Design ID（16進数文字列のリスト）
        date: チャートの日付（可視性計算用）
        width: 画像幅（px）
        height: 画像高さ（px）

    Returns:
        PNG画像のレスポンス
    """
    from pfs.datamodel.pfsConfig import PfsDesign
    from pfs.utils.pfsDesignUtils import showPfsDesign

    settings = get_settings()

    # IDを検証して整数に変換
    pfs_design_ids = []
    for h in id_hex:
        if not re.match(r"^[0-9a-fA-F]{16}$", h):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid design ID format: {h}",
            )
        pfs_design_ids.append(int(h, 16))

    # PfsDesignを読み込み
    try:
        pfs_designs = [
            PfsDesign.read(design_id, str(settings.pfs_design_dir))
            for design_id in pfs_design_ids
        ]
    except Exception as e:
        logger.exception(f"Error reading PfsDesign: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Design file not found or error reading: {e}",
        )

    # チャートを生成
    try:
        png_bytes = _create_design_chart(pfs_designs, date, width, height)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        logger.exception(f"Error generating design chart: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating chart: {e}",
        )


def _create_design_chart(
    pfs_designs: list,
    date: Optional[datetime.date],
    width: int,
    height: int,
) -> bytes:
    """PFS Design チャートを生成

    Args:
        pfs_designs: PfsDesign オブジェクトのリスト
        date: チャートの日付
        width: 画像幅（px）
        height: 画像高さ（px）

    Returns:
        PNG画像のバイト列
    """
    from pfs.utils.pfsDesignUtils import showPfsDesign

    DPI = 72
    fig = plt.figure(dpi=DPI, figsize=(width / DPI, height / DPI))
    try:
        showPfsDesign(pfs_designs, date=date, showTime=True)

        buf = io.BytesIO()
        fig.savefig(buf, format="png", transparent=True)
        return buf.getvalue()
    finally:
        plt.close(fig)
