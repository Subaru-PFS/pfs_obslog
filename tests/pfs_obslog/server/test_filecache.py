from pathlib import Path

import pytest
import time_machine
from pfs_obslog.server.filecache import FileCache

# pytestmark = pytest.mark.focus


@pytest.fixture
def cache(tmp_path: Path):
    yield FileCache(tmp_path)


def test_set_and_get(cache: FileCache):
    cache.set('/image/1', b'hello')
    assert cache.get('/image/1') == b'hello'


def test_get_non_existing_entry(cache: FileCache):
    assert cache.get('/image/1') is None


def test_create_cache_on_same_directory(tmp_path: Path):
    FileCache(tmp_path)
    FileCache(tmp_path)


def test_get2(cache: FileCache):
    png, set = cache.get2('/image1')
    assert png is None
    if png is None:
        png = set(b'some1')
    assert png == b'some1'

    cache.set('/image2', b'some2')
    png, set = cache.get2('/image2')
    assert png is not None
    assert png == b'some2'


def test_hash_conflict(cache: FileCache):
    def digest(src: str):
        return '-'
    cache._digest = digest
    assert FileCache._digest != digest

    cache.set('/image1', b'1')
    assert cache.get('/image1') == b'1'
    cache.set('/image2', b'2')
    assert cache.get('/image1') == b'1'
    assert cache.get('/image2') == None


def test_vacuum(tmp_path: Path):
    cache = FileCache(tmp_path, total_size_limit=5)
    for i in range(10):
        with time_machine.travel(i):
            cache.set(f'/image/{i}', bytes([i]))
            cache.vacuum()
    assert cache.peek('/image/0') is None
    assert cache.peek('/image/4') is None
    assert cache.peek('/image/5') == bytes([5])
    assert cache.peek('/image/9') == bytes([9])


def test_autovacuum_false(tmp_path: Path):
    cache = FileCache(tmp_path, auto_vauum=False)
    cache.set('/image/0', b'')