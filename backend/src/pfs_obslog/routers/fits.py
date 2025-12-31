"""FITS ファイル API

FITS（Flexible Image Transport System）ファイルのダウンロードとプレビュー画像の提供を行います。
SPS、MCS、AGCの各カメラタイプに対応しています。
"""

import datetime
import functools
import io
from enum import Enum
from logging import getLogger
from pathlib import Path
from typing import Annotated, Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pfs_obslog import models as M
from pfs_obslog.config import get_settings
from pfs_obslog.database import get_db


logger = getLogger(__name__)
router = APIRouter(prefix="/api/fits", tags=["fits"])

# キャッシュコントロールヘッダー（3日間）
CACHE_CONTROL_HEADER = f"max-age={3 * 24 * 3600}"


# ============================================================
# Enums
# ============================================================


class FitsType(str, Enum):
    """FITSファイルのタイプ"""

    raw = "raw"
    calexp = "calexp"
    postISRCCD = "postISRCCD"


# ============================================================
# Schemas
# ============================================================


class Card(BaseModel):
    """FITSヘッダーカード"""

    key: str
    value: Any
    comment: str


class FitsHeader(BaseModel):
    """FITSヘッダー"""

    cards: list[Card]

    def value(self, key: str, not_found: Any = None) -> Any:
        """キーに対応する値を取得"""
        for card in self.cards:
            if card.key == key:
                return card.value
        return not_found


class FitsHdu(BaseModel):
    """FITS HDU（Header Data Unit）"""

    index: int
    header: FitsHeader


class FitsMeta(BaseModel):
    """FITSファイルのメタデータ"""

    filename: str
    hdul: list[FitsHdu]


# ============================================================
# Helper Functions
# ============================================================


def _get_settings():
    """設定を取得（DI用）"""
    return get_settings()


def _visit_date(visit: M.PfsVisit) -> datetime.date:
    """Visitの日付を取得（HSTベース）"""
    return _dbdate2filesystem_date(visit.issued_at).date()


def _dbdate2filesystem_date(dbdate: Any) -> datetime.datetime:
    """DBの日付をファイルシステムの日付に変換（HST）"""
    # FITSファイルはHSTベースの日付ディレクトリに保存されている
    return dbdate + datetime.timedelta(hours=10)


def _sps_fits_path(visit: M.PfsVisit, camera_id: int, settings=None) -> Path:
    """SPS FITSファイルのパスを取得

    Args:
        visit: PfsVisitオブジェクト
        camera_id: カメラID（1-16）
        settings: 設定オブジェクト

    Returns:
        FITSファイルのパス
    """
    if settings is None:
        settings = get_settings()

    date = _visit_date(visit)
    date_dir = settings.data_root / "raw" / date.strftime(r"%Y-%m-%d")
    camera_id -= 1
    arm_name = "brnm"[camera_id % 4]
    sm = camera_id // 4 + 1
    arm = camera_id % 4 + 1

    if arm_name == "n":
        path = date_dir / "ramps" / f"PFSB{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits"
    else:
        path = date_dir / "sps" / f"PFSA{visit.pfs_visit_id:06d}{sm:01d}{arm:01d}.fits"

    return path


def _calexp_fits_path(visit: M.PfsVisit, camera_id: int, settings=None) -> Path:
    """calexp FITSファイルのパスを取得"""
    if settings is None:
        settings = get_settings()

    visit_id = visit.pfs_visit_id
    date0 = _visit_date(visit)
    camera_id -= 1
    sm = camera_id // 4 + 1
    arm = "brnm"[camera_id % 4]

    for rerun in settings.calexp_reruns:
        for delta_d in (
            datetime.timedelta(days=0),
            datetime.timedelta(days=-1),
            datetime.timedelta(days=+1),
        ):
            date = date0 + delta_d
            date_dir = (
                settings.data_root
                / f"drp/sm1-5.2/rerun/{rerun}/calExp"
                / date.strftime(r"%Y-%m-%d")
            )
            category = "B" if arm == "n" else "A"
            path = (
                date_dir
                / f"v{visit_id:06d}"
                / f"calExp-S{category}{visit_id:06d}{arm}{sm}.fits"
            )
            if path.exists():
                return path

    raise FileNotFoundError(
        f"No such file for calexp visit={visit.pfs_visit_id} camera_id={camera_id}"
    )


def _mcs_fits_path(visit: M.PfsVisit, frame_id: int, settings=None) -> Path:
    """MCS FITSファイルのパスを取得"""
    if settings is None:
        settings = get_settings()

    date0 = _visit_date(visit)
    for delta_d in (
        datetime.timedelta(days=0),
        datetime.timedelta(days=-1),
        datetime.timedelta(days=+1),
    ):
        date = date0 + delta_d
        date_dir = settings.data_root / "raw" / date.strftime(r"%Y-%m-%d")
        path = date_dir / "mcs" / f"PFSC{frame_id:08d}.fits"
        if path.exists():
            return path

    raise FileNotFoundError(
        f"No such file for mcs visit={visit.pfs_visit_id} frame_id={frame_id}"
    )


class AgcFitsNotAccessible(FileNotFoundError):
    """AGC FITSファイルにアクセスできない場合の例外"""

    pass


def _agc_fits_path_newer(agc_exposure: M.AgcExposure, settings=None) -> Path:
    """2022年11月以降のAGC FITSファイルパスを取得"""
    if settings is None:
        settings = get_settings()

    fs_date = _dbdate2filesystem_date(agc_exposure.taken_at)
    date_dir = settings.data_root / "raw" / fs_date.strftime(r"%Y-%m-%d")
    pfs_visit = agc_exposure.pfs_visit_id
    agc_exposure_id = agc_exposure.agc_exposure_id
    return Path(f"{date_dir}/agcc/agcc_{pfs_visit:06d}_{agc_exposure_id:08d}.fits")


def _agc_fits_path(agc_exposure: M.AgcExposure, settings=None) -> Path:
    """AGC FITSファイルのパスを取得"""
    if settings is None:
        settings = get_settings()

    # 新しい命名規則を試す
    new_path = _agc_fits_path_newer(agc_exposure, settings)
    if new_path.exists():
        return new_path

    # 古い命名規則（日時ベース）を試す
    if agc_exposure.taken_at is not None:
        fs_date = _dbdate2filesystem_date(agc_exposure.taken_at)
        date_dir = settings.data_root / "raw" / fs_date.strftime(r"%Y-%m-%d")
        fname_pattern = agc_exposure.taken_at.strftime(f"agcc_%Y%m%d_%H%M%S?.fits")
        for path in (date_dir / "agcc").glob(fname_pattern):
            if _agc_frame_id_from_fits(path) == agc_exposure.agc_exposure_id:
                return path

    raise AgcFitsNotAccessible(
        f"No FITS file for agc_exposure_id={agc_exposure.agc_exposure_id}"
    )


def _agc_frame_id_from_fits(path: Path) -> Optional[int]:
    """FITSファイルからAGCフレームIDを取得"""
    try:
        import astropy.io.fits as afits

        with afits.open(path) as hdul:
            for hdu in hdul[1:]:
                frameid = hdu.header.get("FRAMEID")  # type: ignore[union-attr]
                if frameid is not None:
                    return int(frameid)
    except Exception:
        pass
    return None


def _fits_meta(path: Path) -> FitsMeta:
    """FITSファイルのメタデータを取得"""
    import astropy.io.fits as afits

    with afits.open(path) as hdul:
        return FitsMeta(
            filename=path.name,
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


def _stringify(value: Any) -> str:
    """値を文字列に変換"""
    if value is True:
        return "T"
    if value is False:
        return "F"
    return str(value)


def _fits2png(filepath: Path, max_width: int = 1024, max_height: int = 1024, hdu_index: int = 1) -> bytes:
    """FITSファイルからPNG画像を生成

    Args:
        filepath: FITSファイルのパス
        max_width: 最大幅
        max_height: 最大高さ
        hdu_index: 使用するHDUのインデックス

    Returns:
        PNG画像のバイトデータ
    """
    import astropy.io.fits as afits
    import numpy
    import skimage.transform
    from astropy.visualization import ZScaleInterval
    from PIL import Image

    with afits.open(filepath) as hdul:
        data = hdul[hdu_index].data[::-1]  # type: ignore[union-attr]

    assert len(data.shape) == 2

    # リサイズファクターを計算
    factor = max(
        (data.shape[0] - 1) // max_height + 1 if max_height else 0,
        (data.shape[1] - 1) // max_width + 1 if max_width else 0,
        1,
    )

    # ダウンスケール
    if factor > 1:
        data = skimage.transform.downscale_local_mean(data, (factor, factor))

    # ZScaleで値をマッピング
    zscale = ZScaleInterval()
    vmin, vmax = zscale.get_limits(data)

    # 8ビットに変換
    data8 = numpy.array(
        255 * numpy.clip((data - vmin) / (vmax - vmin), 0.0, 1.0), dtype=numpy.uint8
    )

    # PNG形式で出力
    img = Image.fromarray(data8)
    buffer = io.BytesIO()
    img.save(buffer, format="png")
    return buffer.getvalue()


def _cached_response(content: bytes, media_type: str) -> Response:
    """キャッシュヘッダー付きレスポンスを返す"""
    return Response(
        content=content,
        media_type=media_type,
        headers={"cache-control": CACHE_CONTROL_HEADER},
    )


# ============================================================
# SPS Endpoints
# ============================================================


@router.get(
    "/visits/{visit_id}/sps/{camera_id}.fits",
    summary="Download SPS FITS file",
    description="Download a raw or processed SPS FITS file for a specific visit and camera.",
)
async def download_sps_fits(
    visit_id: int,
    camera_id: int,
    type: FitsType = FitsType.raw,
    db: AsyncSession = Depends(get_db),
):
    """SPS FITSファイルをダウンロード"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        match type:
            case FitsType.raw:
                filepath = _sps_fits_path(visit, camera_id, settings)
            case FitsType.calexp:
                filepath = _calexp_fits_path(visit, camera_id, settings)
            case FitsType.postISRCCD:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="postISRCCD type is not yet supported",
                )

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        return FileResponse(filepath, filename=filepath.name, media_type="image/fits")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/visits/{visit_id}/sps/{camera_id}.png",
    summary="Get SPS FITS preview image",
    description="Get a PNG preview image of an SPS FITS file.",
)
async def get_sps_fits_preview(
    visit_id: int,
    camera_id: int,
    width: int = Query(default=1024, le=4096),
    height: int = Query(default=1024, le=4096),
    type: FitsType = FitsType.raw,
    db: AsyncSession = Depends(get_db),
):
    """SPS FITSファイルのプレビュー画像を取得"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        match type:
            case FitsType.raw:
                filepath = _sps_fits_path(visit, camera_id, settings)
            case FitsType.calexp:
                filepath = _calexp_fits_path(visit, camera_id, settings)
            case FitsType.postISRCCD:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="postISRCCD type is not yet supported",
                )

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        png = _fits2png(filepath, max_width=width, max_height=height)
        return _cached_response(png, "image/png")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error generating SPS FITS preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating preview image",
        )


@router.get(
    "/visits/{visit_id}/sps/{camera_id}/headers",
    response_model=FitsMeta,
    summary="Get SPS FITS headers",
    description="Get the headers from an SPS FITS file.",
)
async def get_sps_fits_headers(
    visit_id: int,
    camera_id: int,
    type: FitsType = FitsType.raw,
    db: AsyncSession = Depends(get_db),
):
    """SPS FITSファイルのヘッダーを取得"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        match type:
            case FitsType.raw:
                filepath = _sps_fits_path(visit, camera_id, settings)
            case FitsType.calexp:
                filepath = _calexp_fits_path(visit, camera_id, settings)
            case FitsType.postISRCCD:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="postISRCCD type is not yet supported",
                )

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        return _fits_meta(filepath)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================
# MCS Endpoints
# ============================================================


@router.get(
    "/visits/{visit_id}/mcs/{frame_id}.fits",
    summary="Download MCS FITS file",
    description="Download an MCS FITS file for a specific visit and frame.",
)
async def download_mcs_fits(
    visit_id: int,
    frame_id: int,
    db: AsyncSession = Depends(get_db),
):
    """MCS FITSファイルをダウンロード"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        filepath = _mcs_fits_path(visit, frame_id, settings)

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        return FileResponse(filepath, filename=filepath.name, media_type="image/fits")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/visits/{visit_id}/mcs/{frame_id}.png",
    summary="Get MCS FITS preview image",
    description="Get a PNG preview image of an MCS FITS file.",
)
async def get_mcs_fits_preview(
    visit_id: int,
    frame_id: int,
    width: int = Query(default=1024, le=4096),
    height: int = Query(default=1024, le=4096),
    db: AsyncSession = Depends(get_db),
):
    """MCS FITSファイルのプレビュー画像を取得"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        filepath = _mcs_fits_path(visit, frame_id, settings)

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        png = _fits2png(filepath, max_width=width, max_height=height)
        return _cached_response(png, "image/png")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error generating MCS FITS preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating preview image",
        )


@router.get(
    "/visits/{visit_id}/mcs/{frame_id}/headers",
    response_model=FitsMeta,
    summary="Get MCS FITS headers",
    description="Get the headers from an MCS FITS file.",
)
async def get_mcs_fits_headers(
    visit_id: int,
    frame_id: int,
    db: AsyncSession = Depends(get_db),
):
    """MCS FITSファイルのヘッダーを取得"""
    result = await db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    )
    visit = result.scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Visit {visit_id} not found"
        )

    try:
        settings = get_settings()
        filepath = _mcs_fits_path(visit, frame_id, settings)

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        return _fits_meta(filepath)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================
# AGC Endpoints
# ============================================================


@router.get(
    "/visits/{visit_id}/agc/{exposure_id}.fits",
    summary="Download AGC FITS file",
    description="Download an AGC FITS file for a specific exposure.",
)
async def download_agc_fits(
    visit_id: int,
    exposure_id: int,
    db: AsyncSession = Depends(get_db),
):
    """AGC FITSファイルをダウンロード"""
    result = await db.execute(
        select(M.AgcExposure).where(M.AgcExposure.agc_exposure_id == exposure_id)
    )
    agc_exposure = result.scalar_one_or_none()

    if agc_exposure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AGC exposure {exposure_id} not found",
        )

    try:
        settings = get_settings()
        filepath = _agc_fits_path(agc_exposure, settings)

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        return FileResponse(filepath, filename=filepath.name, media_type="image/fits")
    except (FileNotFoundError, AgcFitsNotAccessible) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png",
    summary="Get AGC FITS preview image",
    description="Get a PNG preview image of a specific HDU in an AGC FITS file.",
)
async def get_agc_fits_preview(
    visit_id: int,
    exposure_id: int,
    hdu_index: int,
    width: int = Query(default=512, le=4096),
    height: int = Query(default=512, le=4096),
    db: AsyncSession = Depends(get_db),
):
    """AGC FITSファイルのプレビュー画像を取得"""
    result = await db.execute(
        select(M.AgcExposure).where(M.AgcExposure.agc_exposure_id == exposure_id)
    )
    agc_exposure = result.scalar_one_or_none()

    if agc_exposure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AGC exposure {exposure_id} not found",
        )

    try:
        settings = get_settings()
        filepath = _agc_fits_path(agc_exposure, settings)

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        png = _fits2png(filepath, max_width=width, max_height=height, hdu_index=hdu_index)
        return _cached_response(png, "image/png")
    except (FileNotFoundError, AgcFitsNotAccessible) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error generating AGC FITS preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating preview image",
        )
