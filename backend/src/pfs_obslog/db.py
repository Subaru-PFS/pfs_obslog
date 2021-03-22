import contextlib
from typing import Callable

import sqlalchemy
from opdb.models import Base
from pfs_obslog.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine(settings.dsn, future=True, echo=settings.echo_sql)

_DBSession: Callable[..., Session] = sessionmaker(bind=engine, autoflush=False)


@contextlib.contextmanager
def get_db():
    if settings.app_env == 'test':
        yield sandbox.db
    else:  # pragma: no cover
        db: Session = _DBSession()
        try:
            yield db
        finally:
            db.close()


class _SandboxedTransaction:
    '''
    This class is used to wrap each test of pytest in a transaction.
    See tests/conftest.py
    '''
    _db: Session | None = None

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
