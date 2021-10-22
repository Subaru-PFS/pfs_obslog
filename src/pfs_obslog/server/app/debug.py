import warnings
from ..env import PFS_OBSLOG_ENV
import sys


def _noop(*args, **kwargs):  # pragma: no cover
    warnings.warn(f'safe_breakpoint(*{args}, **{kwargs})')


def setup_debugger():  # pragma: no cover
    if PFS_OBSLOG_ENV not in {'development', 'test'}:
        sys.breakpointhook = _noop
