import os
from pathlib import Path

os.environ['PFS_OBSLOG_DSN'] = Path('tests/pfs_obslog/server/secrets/dsn.txt').read_text().strip()

if True:
    import pytest

    from pfs_obslog.server.db import sandbox


@pytest.fixture(autouse=True)
def make_tests_in_transaction():
    with sandbox():
        yield


@pytest.fixture
def db():
    return sandbox.db
