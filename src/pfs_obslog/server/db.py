import contextlib
import os
from typing import Callable, Final, Optional

import sqlalchemy
from opdb.models import Base
from psycopg2.extensions import connection as PostgresConnection
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from .env import PFS_OBSLOG_ENV

DSN: Final = os.environ.get('PFS_OBSLOG_DSN')

if not DSN:
    raise RuntimeError("PFS_OBSLOG_DSN must be set")

engine = create_engine(DSN, future=True)  # , echo=PFS_OBSLOG_ENV != 'production')

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


event.listen(
    Base.metadata,
    "after_create",
    sqlalchemy.DDL('''
        create or replace function try_cast_int(p_in text, p_default int default null)
                returns int
            as
            $$
            begin
                begin
                return $1::int;
                exception 
                when others then
                    return p_default;
                end;
            end;
            $$
            language plpgsql;

            create or replace function try_cast_float(p_in text, p_default float default null)
                returns float
            as
            $$
            begin
                begin
                return $1::float;
                exception 
                when others then
                    return p_default;
                end;
            end;
            $$
            language plpgsql;
    ''')
)
