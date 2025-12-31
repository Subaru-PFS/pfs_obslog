"""MCSデータチャートAPI エンドポイント

MCSデータの可視化APIを提供します。
"""

import io

import matplotlib
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from matplotlib import pyplot as plt
from sqlalchemy import select

from pfs_obslog import models as M
from pfs_obslog.database import DbSession

# Aggバックエンドを使用（GUI不要）
matplotlib.use("Agg")

router = APIRouter(prefix="/mcs_data", tags=["plot"])


@router.get("/{frame_id}.png")
def show_mcs_data_chart(
    db: DbSession,
    frame_id: int,
    width: int = Query(default=640, le=1280, description="画像幅（px）"),
    height: int = Query(default=480, le=960, description="画像高さ（px）"),
) -> Response:
    """MCSデータチャートを取得

    指定されたframe_idのMCSデータをカラー散布図として表示します。
    色はpeakvalueに基づきます。

    Args:
        db: DBセッション
        frame_id: MCSフレームID
        width: 画像幅（px）
        height: 画像高さ（px）

    Returns:
        PNG画像のレスポンス

    Raises:
        HTTPException: データが見つからない場合は204を返す
    """
    # MCSデータを取得
    rows = db.scalars(
        select(M.McsData).where(M.McsData.mcs_frame_id == frame_id)
    ).all()

    if not rows:
        raise HTTPException(status_code=204, detail="No data found")

    # データを配列に変換
    xypb = np.array(
        [
            [
                row.mcs_center_x_pix or 0.0,
                row.mcs_center_y_pix or 0.0,
                row.peakvalue or 0.0,
                row.bgvalue or 0.0,
            ]
            for row in rows
        ]
    )
    x, y, peakvalue, _bgvalue = xypb.T

    # プロットを生成
    png_bytes = _create_color_scatter_plot(x, y, peakvalue, width, height)

    return Response(content=png_bytes, media_type="image/png")


def _create_color_scatter_plot(
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    width: int,
    height: int,
) -> bytes:
    """カラー散布図をPNG形式で生成

    Args:
        x: X座標の配列
        y: Y座標の配列
        z: 色の値の配列
        width: 画像幅（px）
        height: 画像高さ（px）

    Returns:
        PNG画像のバイト列
    """
    DPI = 72
    fig = plt.figure(dpi=DPI, figsize=(width / DPI, height / DPI))
    try:
        ax = fig.add_subplot(111)
        ax.set_aspect("equal")

        cm = plt.cm.get_cmap("viridis")
        scatter = ax.scatter(x, y, s=1, c=z, cmap=cm)
        ax.grid(True)
        fig.colorbar(scatter, ax=ax)

        buf = io.BytesIO()
        fig.savefig(buf, format="png", transparent=True)
        return buf.getvalue()
    finally:
        plt.close(fig)
