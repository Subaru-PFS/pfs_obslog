import dataclasses
import io
from enum import Enum

import matplotlib
import numpy
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from matplotlib import pyplot
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.app.routers.asynctask import background_process

matplotlib.use('Agg')


router = APIRouter()


class ThemeName(str, Enum):
    light = 'light'
    dark = 'dark'


@router.get('/api/mcs_data/{frame_id}.png')
async def show_mcs_data_chart(
    frame_id: int,
    width: int = Query(640, le=1280),
    height: int = Query(480, le=960),
    theme: ThemeName = Query(ThemeName.light),
    ctx: Context = Depends(),
):
    q = ctx.db.query(M.mcs_data).filter(M.mcs_data.mcs_frame_id == frame_id)
    rows = list(q)
    if len(rows) == 0:
        raise HTTPException(status.HTTP_204_NO_CONTENT)
    xypb = numpy.array([[
        row.mcs_center_x_pix,
        row.mcs_center_y_pix,
        row.peakvalue,
        row.bgvalue
    ] for row in rows])
    x, y, peakvalue, bvgalue = numpy.array(xypb).T
    png = await background_process(color_scatter_plot_png, ColorScatterPlotPngParams(x, y, peakvalue, theme, width, height), new_process=True)
    return Response(content=png, media_type='image/png')


@router.get('/api/agc_data/{visit_id}.png')
async def show_agc_data_chart(
    visit_id: int,
    width: int = Query(640, le=1280),
    height: int = Query(480, le=960),
    theme: ThemeName = Query(ThemeName.light),
    ctx: Context = Depends(),
):
    pass
    # q = ctx.db.query(M.mcs_data).filter(M.mcs_data.mcs_frame_id == frame_id)
    # rows = list(q)
    # if len(rows) == 0:
    #     raise HTTPException(status.HTTP_204_NO_CONTENT)
    # xypb = numpy.array([[
    #     row.mcs_center_x_pix,
    #     row.mcs_center_y_pix,
    #     row.peakvalue,
    #     row.bgvalue
    # ] for row in rows])
    # x, y, peakvalue, bvgalue = numpy.array(xypb).T
    # png = await background_process(color_scatter_plot_png, ColorScatterPlotPngParams(x, y, peakvalue, theme, width, height), new_process=True)
    # return Response(content=png, media_type='image/png')


@dataclasses.dataclass
class ColorScatterPlotPngParams:
    x: numpy.ndarray
    y: numpy.ndarray
    z: numpy.ndarray
    theme: ThemeName
    width: int
    height: int


def color_scatter_plot_png(args: ColorScatterPlotPngParams) -> bytes:
    DPI = 72
    set_mpl_theme(args.theme)
    pyplot.figure(dpi=DPI, figsize=(args.width / DPI, args.height / DPI))
    cm = pyplot.cm.get_cmap('viridis')
    pyplot.gca().set_aspect('equal')
    pyplot.scatter(args.x, args.y, s=1, c=args. z, cmap=cm)  # type: ignore
    pyplot.grid()
    pyplot.colorbar()
    out = io.BytesIO()
    pyplot.savefig(out, format='png', transparent=True)
    return out.getvalue()


def set_mpl_theme(theme: ThemeName):
    color = {
        ThemeName.dark: 'white',
    }.get(theme, 'black')
    matplotlib.rcParams['text.color'] = color
    matplotlib.rcParams['axes.labelcolor'] = color
    matplotlib.rcParams['xtick.color'] = color
    matplotlib.rcParams['ytick.color'] = color
