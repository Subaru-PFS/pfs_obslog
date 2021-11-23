import tempfile
from PIL import Image

import numpy
import pytest
from pfs_obslog.server.app.routers.plot import ColorScatterPlotPngParams, ThemeName, color_scatter_plot_png


@pytest.mark.focus
async def test_mcs_data(db):
    X, Y = numpy.mgrid[0:5:30j, 0:5:30j]
    Z = 10 * numpy.sin(X) * numpy.sin(Y)
    pass
    # with tempfile.TemporaryFile() as f:
    #     f.write(color_scatter_plot_png(ColorScatterPlotPngParams(
    #         X.flatten(),
    #         Y.flatten(),
    #         Z.flatten(),
    #         ThemeName.dark,
    #         640,
    #         480,
    #     )))
    #     f.flush()
    #     img = Image.open(f, formats=['PNG'])  # type: ignore
    #     img.show()
