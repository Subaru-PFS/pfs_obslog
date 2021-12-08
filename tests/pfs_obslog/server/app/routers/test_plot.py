import tempfile

import numpy
import pytest
from pfs_obslog.server.app.routers.plot import (ColorScatterPlotPngParams,
                                                ThemeName,
                                                color_scatter_plot_png)
from PIL import Image
