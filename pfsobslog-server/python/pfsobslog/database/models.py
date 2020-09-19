import logging
from typing import Any, Optional

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.orm.session import Session
from sqlalchemy.sql.schema import ForeignKey

from ..opdb import models as opdbmodels
from . import engine

Base: Any = opdbmodels.Base


obslog_tables = []


def obslog_table(model):
    obslog_tables.append(model)
    return model


@obslog_table
class User(Base):
    __tablename__ = 'obslog_user'
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)

    @classmethod
    def authenticate(cls, db: Session, email: str, password: str) -> Optional['User']:
        if '@' not in email:
            return None
        user: Optional[User] = db.query(User).filter(User.email == email).one_or_none()
        if user is None:
            user = User(email=email)
            db.add(user)
            db.commit()
        return user

    visit_notes = relationship('VisitNote')
    visit_set_notes = relationship('VisitSetNote')
    mcs_exposure_notes = relationship('McsExposureNote')


@obslog_table
class VisitSetNote(Base):
    __tablename__ = 'obslog_visit_set_note'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('obslog_user.id'))
    visit_set_id = Column(Integer, ForeignKey('sps_sequence.visit_set_id'))
    body = Column(String, nullable=False)

    user = relationship('User', back_populates='visit_set_notes')
    sps_sequence = relationship('sps_sequence', back_populates='obslog_notes')


opdbmodels.sps_sequence.obslog_notes = relationship('VisitSetNote')


@obslog_table
class VisitNote(Base):
    __tablename__ = 'obslog_visit_note'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('obslog_user.id'))
    pfs_visit_id = Column(Integer, ForeignKey('pfs_visit.pfs_visit_id'))
    body = Column(String, nullable=False)

    user = relationship('User', back_populates='visit_notes')
    pfs_visit = relationship('pfs_visit', back_populates='obslog_notes')


opdbmodels.pfs_visit.obslog_notes = relationship('VisitNote')


@obslog_table
class McsExposureNote(Base):
    __tablename__ = 'obslog_mcs_exposure_note'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('obslog_user.id'))
    mcs_exposure_frame_id = Column(Integer, ForeignKey('mcs_exposure.mcs_frame_id'))
    body = Column(String, nullable=False)

    user = relationship('User', back_populates='mcs_exposure_notes')
    mcs_exposure = relationship('mcs_exposure', back_populates='obslog_notes')


opdbmodels.mcs_exposure.obslog_notes = relationship('McsExposureNote')


def create_tables():
    for model in obslog_tables:
        model.__table__.create(bind=engine, checkfirst=True)


def drop_tables():
    for model in reversed(obslog_tables):
        model.__table__.drop(bind=engine, checkfirst=True)


if __name__ == '__main__':
    import argparse
    from ..utils import logging

    logging.setup()

    parser = argparse.ArgumentParser()
    parser.add_argument('--drop', '-D', action='store_true')
    args = parser.parse_args()
    if args.drop:
        drop_tables()
    create_tables()
