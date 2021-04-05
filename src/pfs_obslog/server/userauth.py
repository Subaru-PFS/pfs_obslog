import os
from pathlib import Path
from typing import Final, Optional

from pfs_obslog.server.env import PFS_OBSLOG_ENV

HERE: Final = Path(__file__).parent

TEST_USER: Final = 'test'
TEST_PASSWORD: Final = 'password'

if PFS_OBSLOG_ENV == 'test':

    def authorize(username: str, password: str) -> Optional[str]:
        if username == TEST_USER and password == TEST_PASSWORD:
            return TEST_USER
else:
    # .userauth_secret is not in GitHub because of security reasons
    from .userauth_secret import authorize  # pragma: no cover
