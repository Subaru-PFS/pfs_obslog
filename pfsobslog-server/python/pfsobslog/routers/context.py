from fastapi import Depends
from sqlalchemy.orm.session import Session

from ..database import SessionLocal
from ..database.models import User
from ..utils.cookiesession import CookieSession


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Context:
    def __init__(
        self,
        db: Session = Depends(get_db),
        session: CookieSession = Depends()
    ):
        self.db = db
        self.session = session

    @property
    def current_user(self):
        with self.session.activate():
            user_id = self.session.get('user_id')
        if user_id is not None:
            user: User = self.db.query(User).filter(User.id == user_id).one_or_none()
            return user
