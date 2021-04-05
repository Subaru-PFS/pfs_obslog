import time
from typing import Generic, Tuple, TypeVar, Union

_K = TypeVar('_K')
_V = TypeVar('_V')
_TtlValue = Tuple[float, _V]
_no_default = object()
_D = TypeVar('_D')


class TtlCache(Generic[_K, _V]):
    def __init__(self, *, ttl: float = 300.):
        self._ttl = ttl
        self._cache: dict[_K, _TtlValue[_V]] = {}

    def set(self, k: _K, v: _V):
        self._cache[k] = (time.time() + self._ttl, v)

    def get(self, k, default: _D = _no_default) -> Union[_V, _D]:
        if k not in self._cache:
            if default is _no_default:
                raise KeyError(f'{k} not found in {self}')
            else:
                return default
        expire, v = self._cache[k]
        if time.time() < expire:
            return v
        del self._cache[k]
        if default is _no_default:
            raise KeyError(f'{k} not found in {self}')
        else:
            return default
