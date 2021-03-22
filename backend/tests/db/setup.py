import itertools

import opdb.models as M
from pfs_obslog.config import settings
from pfs_obslog.db import engine
from sqlalchemy.orm.session import Session, sessionmaker


def main():
    M.Base.metadata.drop_all(bind=engine)
    M.Base.metadata.create_all(bind=engine)
    # db = sessionmaker(bind=engine, autoflush=False)()
    # generate_sample_data(db)


def generate_sample_data(db: Session):
    db.commit()


class Series:
    def __init__(self):
        self._count = itertools.count(1)

    def __call__(self):
        return next(self._count)


series = Series()


if __name__ == '__main__':
    main()
