import os
from pathlib import Path
from typing import Optional

from pfs_obslog.server.env import PFS_OBSLOG_ENV

HERE = Path(__file__).parent

TEST_USER = 'test'
TEST_PASSWORD = 'password'

if PFS_OBSLOG_ENV == 'test':

    def authorize(username: str, password: str) -> Optional[str]:
        if username == TEST_USER and password == TEST_PASSWORD:
            return TEST_USER
else:
    # .userauth_secret is not in GitHub because of security reasons
    from .userauth_secret import authorize  # pragma: no cover
