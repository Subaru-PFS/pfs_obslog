import dataclasses
import io

import matplotlib
import numpy
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from matplotlib import pyplot
from opdb import models as M
from pfs_obslog.app.context import Context
from pfs_obslog.app.routers.asynctask import background_process

matplotlib.use('Agg')


router = APIRouter()


@router.get('/api/mcs_data/{frame_id}.png')
async def show_mcs_data_chart(
    frame_id: int,
    width: int = Query(640, le=1280),
    height: int = Query(480, le=960),
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
    png = await background_process(ColorScatterPlotPngTask(x, y, peakvalue, width, height))
    return Response(content=png, media_type='image/png')


@dataclasses.dataclass
class ColorScatterPlotPngTask:
    x: numpy.ndarray
    y: numpy.ndarray
    z: numpy.ndarray
    width: int
    height: int

    def __call__(self) -> bytes:
        DPI = 72
        pyplot.figure(dpi=DPI, figsize=(self.width / DPI, self.height / DPI))
        cm = pyplot.cm.get_cmap('viridis')  # type: ignore
        pyplot.gca().set_aspect('equal')
        # pyplot.gca().get_xaxis().set_ticks([])
        # pyplot.gca().get_yaxis().set_ticks([])
        pyplot.scatter(self.x, self.y, s=1, c=self. z, cmap=cm)  # type: ignore
        pyplot.grid()
        pyplot.colorbar()
        out = io.BytesIO()
        pyplot.savefig(out, format='png', transparent=True)
        return out.getvalue()
