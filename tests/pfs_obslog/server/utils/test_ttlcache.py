from pfs_obslog.server.utils.ttlcache import TtlCache
import pytest
import time_machine


ttl = 5


@pytest.fixture
def frozen_cache():
    with time_machine.travel(0):
        yield TtlCache(ttl=ttl)


def test_ttlcache_without_default_value(frozen_cache: TtlCache[int, int]):
    frozen_cache.set(2, 4)
    assert frozen_cache.get(2) == 4
    with pytest.raises(KeyError):
        # should raise Error for non-existent key
        frozen_cache.get(3)


def test_ttlcache_with_default_value(frozen_cache: TtlCache[int, int]):
    frozen_cache.set(3, 9)
    assert frozen_cache.get(3, 99) == 9
    assert frozen_cache.get(2, 99) == 99


def test_ttlcache_with_expired_data(frozen_cache: TtlCache[int, int]):
    frozen_cache.set(2, 4)
    with time_machine.travel(ttl * 2):
        assert frozen_cache.get(2, 99) == 99

    frozen_cache.set(2, 4)
    with time_machine.travel(ttl * 2):
        with pytest.raises(KeyError):
            frozen_cache.get(2)
