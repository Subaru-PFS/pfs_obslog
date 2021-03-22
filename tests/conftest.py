import pytest
from pfs_obslog.server.db  import Session as DBSession


@pytest.fixture
def test_db():
    db = DBSession()
    db.begin_nested()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
