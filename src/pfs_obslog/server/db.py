import os
from typing import Callable

from sqlalchemy import create_engine
from sqlalchemy.orm import Session as SessionClass
from sqlalchemy.orm import sessionmaker

DSN = os.environ.get('PFS_OBSLOG_DSN', 'postgresql://postgres@localhost/opdb')
engine = create_engine(DSN, future=True, echo=True)

Session: Callable[..., SessionClass] = sessionmaker(bind=engine, autoflush=False)
