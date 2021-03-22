from pathlib import Path

import pytest
from pfs_obslog.image import SizeHint, fits2png

# pytestmark = pytest.mark.focus

SAMPLE = Path(__file__).parent / 'sample_data' / 'PFSC06883200.fits'
# SAMPLE = Path('/data/raw/2021-09-26/mcs/PFSC06883200.fits')


@pytest.mark.skipif(not SAMPLE.exists(), reason=f'{SAMPLE} is not found')
def test_fits2png():
    fits2png(SAMPLE, SizeHint(factor=10))
