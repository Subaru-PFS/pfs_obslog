import pytest

from pfs_obslog.server.db import sandbox


@pytest.fixture(autouse=True)
def make_tests_in_transaction():
    with sandbox():
        yield


@pytest.fixture
def db():
    return sandbox.db
