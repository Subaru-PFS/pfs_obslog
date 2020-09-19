from pytest import fixture

from ..database import SessionLocal
from .query import query_visit_sets, smart_split


def test_query_visit_sets(db):
    query_visit_sets(
        db,
        include_sps=True,
        include_mcs=True,
        page=0,
        date_start=None,
        date_end=None,
        sql='happy',
    )


def test_smart_split():
    assert smart_split('hello world') == {'hello', 'world'}
    assert smart_split('''
        "my name" is "koike michitaro"
    ''') == {'my name', 'is', 'koike michitaro'}


@ fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
