import os
import contextlib
from typing import Callable, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .env import PFS_OBSLOG_ENV

DSN = os.environ.get('PFS_OBSLOG_DSN') or {
    'test': 'postgresql://postgres@localhost/opdb_test',
    'development': 'postgresql://postgres@localhost/opdb',
}.get(PFS_OBSLOG_ENV)

assert DSN, "PFS_OBSLOG_DSN must be set"

engine = create_engine(DSN, future=True, echo=True)

_DBSession: Callable[..., Session] = sessionmaker(bind=engine, autoflush=False)


@contextlib.contextmanager
def get_db():
    if PFS_OBSLOG_ENV == 'test':
        yield sandbox.db
    else:  # pragma: no cover
        db = _DBSession()
        try:
            yield db
        finally:
            db.close()


class _SandboxedTransaction:
    '''
    This class is used to wrap each test of pytest in a transaction.
    See tests/conftest.py
    '''
    _db: Optional[Session] = None

    @contextlib.contextmanager
    def __call__(self):  # called from conftest
        assert self._db is None
        self._db = _DBSession()
        self._db.begin_nested()
        try:
            yield self._db
        finally:
            self._db.rollback()
            self._db.close()
            self._db = None

    @property
    def db(self):
        assert self._db, '.db must be accessed under a `with` context'
        return self._db


sandbox = _SandboxedTransaction()
