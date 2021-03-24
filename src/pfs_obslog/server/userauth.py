import os
from pathlib import Path
from typing import Optional

HERE = Path(__file__).parent

TEST_USER = 'test'
TEST_PASSWORD = 'password'

if os.environ.get('PFS_OBSLOG_ENV') == 'test':

    def authorize(username: str, password: str) -> Optional[str]:
        if username == TEST_USER and password == TEST_PASSWORD:
            return TEST_USER
else:
    # .userauth_secret is not in GitHub because of security reasons
    from .userauth_secret import authorize  # pragma: no cover
