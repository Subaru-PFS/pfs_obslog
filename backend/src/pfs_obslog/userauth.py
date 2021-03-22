from typing import Final, Optional

from pfs_obslog.config import settings

TEST_USER: Final = 'test'
TEST_PASSWORD: Final = 'password'


if settings.auth_method == 'stn_ldap':
    # .userauth_secret is not in GitHub because of security reasons
    from .userauth_secret import authorize  # pragma: no cover

elif settings.auth_method == 'dev':  # pragma:no cover
    def authorize(username: str, password: str):
        return f'{username}@dev' if username == password else None

elif settings.auth_method == 'test':
    def authorize(username: str, password: str) -> Optional[str]:
        if username == TEST_USER and password == TEST_PASSWORD:
            return TEST_USER

else:
    raise RuntimeError(f'Unknown auth_method: {settings.auth_method}')
