import io
from pathlib import Path
from typing import Union

import astropy.io.fits as afits
import numpy
from astropy.visualization import ZScaleInterval
from PIL import Image


def fits2png(filename: Union[str, Path], scale=0.25):
    with afits.open(filename) as hdul:
        data = hdul[1].data  # type: ignore
    assert len(data.shape) == 2
    zscale = ZScaleInterval()
    vmin, vmax = zscale.get_limits(data)
    data8 = numpy.array(255 * numpy.clip((data - vmin) / (vmax - vmin), 0., 1.), dtype=numpy.uint8)
    img = Image.fromarray(data8)
    size = data8.shape
    img = img.resize((int(scale * size[0]), int(scale * size[1])))
    buffer = io.BytesIO()
    img.save(buffer, format='png')
    return buffer.getvalue()
