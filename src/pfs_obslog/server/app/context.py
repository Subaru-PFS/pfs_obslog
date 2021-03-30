import contextlib
from typing import Optional

from fastapi import Depends, HTTPException, status
from opdb import models
from pfs_obslog.server.db import get_db
from pfs_obslog.server.httpsession import TokenOrCookieSession
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSessionType


def _get_db():
    with get_db() as db:
        yield db


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


class NoLoginContext:
    def __init__(
        self,
        db: DBSessionType = Depends(_get_db),
        session: Session = Depends(),
    ):
        self.db = db
        self.session = session

    @property
    def current_user(self):
        if account_name := self.session.peek().account_name:
            if user := self.db.query(models.obslog_user).filter_by(account_name=account_name).one_or_none():  # pragma: no branch
                return user
        raise HTTPException(status.HTTP_403_FORBIDDEN)


class Context(NoLoginContext):
    def __init__(
        self,
        db: DBSessionType = Depends(_get_db),
        session: Session = Depends(),
    ):
        super().__init__(db=db, session=session)
        self.current_user
