import sys
import warnings

from pfs_obslog.config import settings


def _noop(*args, **kwargs):  # pragma: no cover
    warnings.warn(f'safe_breakpoint(*{args}, **{kwargs})')


def setup_debugger():  # pragma: no cover
    if settings.app_env == 'production':
        sys.breakpointhook = _noop
