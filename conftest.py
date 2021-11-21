import os
from pathlib import Path

import pytest

from pfs_obslog.server.db import sandbox

os.environ['PFS_OBSLOG_DSN'] = Path('tests/pfs_obslog/server/secrets/dsn.example.txt').read_text().strip()


@pytest.fixture(autouse=True)
def make_tests_in_transaction():
    with sandbox():
        yield


@pytest.fixture
def db():
    return sandbox.db
