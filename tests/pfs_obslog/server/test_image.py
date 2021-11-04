import pytest
from pathlib import Path

from pfs_obslog.server.image import fits2png, SizeHint

# pytestmark = pytest.mark.focus


SAMPLE = Path('/data/raw/2021-09-26/mcs/PFSC06883200.fits')


@pytest.mark.skipif(not SAMPLE.exists(), reason=f'{SAMPLE} is not found')
def test_fits2png():
    fits2png(SAMPLE, SizeHint(factor=10))
