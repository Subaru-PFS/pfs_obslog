import io
from pathlib import Path
from typing import Optional, Union

import astropy.io.fits as afits
import numpy
from astropy.visualization import ZScaleInterval
from PIL import Image


def fits2png(filename: Union[str, Path], *, scale: Optional[float] = None, dimensions: Optional[tuple[int, int]] = None):
    assert (not not scale) is not (not not dimensions) and (scale or dimensions)
    with afits.open(filename) as hdul:
        data = hdul[1].data[::-1]  # type: ignore
    assert len(data.shape) == 2
    zscale = ZScaleInterval()
    vmin, vmax = zscale.get_limits(data)
    data8 = numpy.array(255 * numpy.clip((data - vmin) / (vmax - vmin), 0., 1.), dtype=numpy.uint8)
    img = Image.fromarray(data8)
    size = data8.shape
    if scale:
        h = int(scale * size[0])
        w = int(scale * size[1])
    else:
        h, w = dimensions  # type:ignore
    img = img.resize((w, h))
    buffer = io.BytesIO()
    img.save(buffer, format='png')
    return buffer.getvalue()
