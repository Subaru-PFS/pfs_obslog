import os
import contextlib
from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from opdb import models
from pfs_obslog.server.db import Session as DBSession
from pfs_obslog.server.httpsession import TokenOrCookieSession
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSessionType


class SessionType(BaseModel):
    account_name: Optional[str]


class Session:
    def __init__(
        self,
        raw_session: TokenOrCookieSession = Depends(),
    ):
        super().__init__()
        self._raw_session = raw_session

    @contextlib.contextmanager
    def activate(self):
        with self._raw_session.activate():
            m = SessionType(**self._raw_session)
            yield m
            self._raw_session.clear()
            self._raw_session.update(m.dict())

    def peek(self):
        return SessionType(**self._raw_session.peek())

    def clear(self):
        with self._raw_session.activate():
            self._raw_session.clear()


def _get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()


class _TestDB:
    def __init__(self):
        self._db = None

    @contextlib.contextmanager
    def begin_nested(self):
        self._db = DBSession()
        try:
            with self.lifecycle(self._db):
                yield
        finally:
            self._db = None

    def get_db(self) -> Generator[DBSessionType, None, None]:
        if self._db is None:
            with self.lifecycle(DBSession()) as db:
                yield db
        else:
            yield self._db

    @contextlib.contextmanager
    def lifecycle(self, db):
        db.begin_nested()
        try:
            yield db
        finally:
            db.rollback()
            db.close()


test_db = _TestDB()


get_db = test_db.get_db if os.environ.get('PFS_OBSLOG_ENV') else _get_db


class Context:
    def __init__(
        self,
        db: DBSessionType = Depends(get_db),
        session: Session = Depends(),
    ):
        self.db = db
        self.session = session

    @property
    def current_user(self):
        if account_name := self.session.peek().account_name:
            if user := self.db.query(models.obslog_user).filter_by(account_name=account_name).one_or_none():
                return user
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
