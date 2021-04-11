try:  # this try block is to prevent IDE from reordering imports
    import matplotlib
    matplotlib.use('Agg')
finally:
    pass

import io
from logging import getLogger
from fastapi import Query

import numpy
from fastapi import APIRouter, Depends, Response
from matplotlib import pyplot
from opdb import models as M
from sqlalchemy.sql.sqltypes import Enum
from pfs_obslog.server.app.context import Context

from pfs_obslog.server.app.routers.processpool import background_process

logger = getLogger(__name__)
router = APIRouter()


class ThemeName(str, Enum):
    light = 'light'
    dark = 'dark'


@router.get('/api/mcs_data_chart/{frame_id}')
async def mcs_data_chart(
    frame_id: int,
    width: int = Query(640, le=1280),
    height: int = Query(480, le=960),
    theme: ThemeName = Query(ThemeName.light),
    ctx: Context = Depends(),
):
    q = ctx.db.query(M.mcs_data).filter(M.mcs_data.mcs_frame_id == frame_id)
    rows = list(q)
    xypb = numpy.array([[
        row.mcs_center_x_pix,
        row.mcs_center_y_pix,
        row.peakvalue,
        row.bgvalue
    ] for row in rows])
    x, y, peakvalue, bvgalue = numpy.array(xypb).T
    png = await background_process(color_scatter_plot_png, (x, y, peakvalue, theme, width, height))
    return Response(content=png, media_type='image/png')


def color_scatter_plot_png(x, y, z, theme: ThemeName, width: int, height: int) -> bytes:
    DPI = 72
    set_mpl_theme(theme)
    pyplot.figure(dpi=DPI, figsize=(width / DPI, height / DPI))
    cm = pyplot.cm.get_cmap('viridis')
    pyplot.scatter(x, y, s=1, c=z, cmap=cm)
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
