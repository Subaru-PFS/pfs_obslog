import os
from typing import Literal

PFS_OBSLOG_ENV: Literal['development', 'production', 'test'] = \
    os.environ.get('PFS_OBSLOG_ENV', 'production')  # type: ignore
    
assert PFS_OBSLOG_ENV in {'development', 'production', 'test'}, f'Invalid value of PFS_OBSLOG_ENV: {PFS_OBSLOG_ENV}'
