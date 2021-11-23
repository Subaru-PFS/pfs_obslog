import dataclasses
import io
from pathlib import Path
from typing import Optional, Union

import astropy.io.fits as afits
import numpy
import skimage.transform
from astropy.visualization import ZScaleInterval
from pfs_obslog.server.utils.timeit import timeit
from PIL import Image


@dataclasses.dataclass
class SizeHint:
    factor: Optional[int] = None
    max_width: Optional[int] = None
    max_height: Optional[int] = None

    def __post_init__(self):
        assert (
            self.factor or
            self.max_width or
            self.max_height
        ), f'factor, max_width or max_height must be specified'


def fits2png(filename: Union[str, Path], sh: SizeHint, hdu_index=1):
    with timeit(f'fits2png({filename})'):
        with timeit('astropy.fits.open'):
            with afits.open(filename) as hdul:
                data = hdul[hdu_index].data[::-1]  # type: ignore
        assert len(data.shape) == 2
        factor = max(
            (data.shape[0] - 1) // sh.max_height + 1 if sh.max_height else 0,
            (data.shape[1] - 1) // sh.max_width + 1 if sh.max_width else 0,
            sh.factor or 0,
        )
        with timeit('resize'):
            data = skimage.transform.downscale_local_mean(data, (factor, factor))
        zscale = ZScaleInterval()
        with timeit('zscale'):
            vmin, vmax = zscale.get_limits(data)
        with timeit('convert2uint'):
            data8 = numpy.array(255 * numpy.clip((data - vmin) / (vmax - vmin), 0., 1.), dtype=numpy.uint8)
        img = Image.fromarray(data8)
        buffer = io.BytesIO()
        img.save(buffer, format='png')
        return buffer.getvalue()
