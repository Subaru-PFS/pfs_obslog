from typing import Type
from . import simplecache
import pytest

CacheFactory = tuple[Type[simplecache.Cache], list[tuple[str, bytes]]]


@pytest.fixture
def cache_factory() -> CacheFactory:
    calls: list[tuple[str, bytes]] = []

    class Cache(simplecache.Cache):
        def _on_delete(self, key: str, value: bytes):
            calls.append((key, value))

    return Cache, calls


def test_set_get(cache_factory: CacheFactory):
    Cache, calls = cache_factory
    cache = Cache(2)
    assert cache.get('x') is None
    cache.set('x', b'Y')
    assert cache.get('x') == b'Y'
    assert len(calls) == 0
    cache.set('y', b'Z')
    assert cache.get('x') is None
    assert len(calls) == 1
    assert calls[0] == ('x', b'Y')


def test_get_reorders_delete_queue(cache_factory: CacheFactory):
    Cache, calls = cache_factory
    cache = Cache(3)
    cache.set('1', b'1')
    cache.set('2', b'2')
    cache.get('1')
    assert len(calls) == 0
    cache.set('3', b'3')
    assert len(calls) == 1
    assert cache.peek('1') is not None
    assert cache.peek('2') is None
