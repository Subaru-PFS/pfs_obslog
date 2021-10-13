import subprocess
from pathlib import Path
import os
from typing import Final, Literal

PFS_OBSLOG_ENV: Final[Literal['development', 'production', 'test']] = os.environ['PFS_OBSLOG_ENV']  # type: ignore

assert PFS_OBSLOG_ENV in {'development', 'production', 'test'},\
    f'Invalid value of PFS_OBSLOG_ENV: {PFS_OBSLOG_ENV}'

HERE = Path(__file__).parent

PFS_OBSLOG_ROOT = HERE / '..' / '..' / '..'

PFS_OBSLOG_DATA_ROOT = os.environ['PFS_OBSLOG_DATA_ROOT']

HOSTNAME = subprocess.check_output(['hostname', '-s']).decode().strip()


def safe_breakpoint():
    if PFS_OBSLOG_ENV == 'test':
        breakpoint()
