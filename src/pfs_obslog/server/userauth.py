import warnings
from pathlib import Path

HERE = Path(__file__).parent

if (HERE / 'userauth_secret.py').exists():  # pragma: no cover
    from .userauth_secret import authorize
else:  # pragma: no cover
    warnings.warn(f'No userauth module presents. No user can log in.')

    def authorize(username: str, password: str) -> bool:
        return False
