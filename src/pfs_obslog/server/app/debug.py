import warnings
from ..env import PFS_OBSLOG_ENV
import sys


def _noop(*args, **kwargs):
    warnings.warn(f'safe_breakpoint(*{args}, **{kwargs})')


def setup_debugger():
    if PFS_OBSLOG_ENV not in {'development', 'test'}:
        sys.breakpointhook = _noop
