import subprocess
from pathlib import Path

import pytest
from pfs_obslog.server.image import fits2png

HERE = Path(__file__).parent


@pytest.mark.focus
def test_fits_png():
    for i in range(6):
        png = fits2png(HERE / 'files' / 'PFSA06304111.fits', scale=1 / (1<<i))
        (Path('/Users/michitaro/Desktop') / f'pfs-{i}.png').write_bytes(png)
    # subprocess.check_call(['open', HERE / 'a.png'])
