import tempfile
from PIL import Image

import numpy
import pytest
from pfs_obslog.server.app.routers.mcs_data import color_scatter_plot_png


@pytest.mark.skip
@pytest.mark.asyncio
async def test_mcs_data(db):
    X, Y = numpy.mgrid[0:5:30j, 0:5:30j]
    Z = 10 * numpy.sin(X) * numpy.sin(Y)
    with tempfile.TemporaryFile() as f:
        f.write(color_scatter_plot_png(X.flatten(), Y.flatten(), Z.flatten()))
        f.flush()
        img = Image.open(f, formats=['PNG'])  # type: ignore
        img.show()
