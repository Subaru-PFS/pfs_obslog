import itertools
from sqlalchemy.orm.session import Session, sessionmaker
from pfs_obslog.server.db import engine
import opdb.models as M

from pfs_obslog.server.env import PFS_OBSLOG_ENV


def main():
    assert PFS_OBSLOG_ENV == 'test'
    M.Base.metadata.drop_all(bind=engine)
    M.Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine, autoflush=False)()
    generate_sample_data(db)


def generate_sample_data(db: Session):
    # sps visit
    pfs_visit1 = M.pfs_visit(
        pfs_design_id=None,
        pfs_visit_id=series(),
        pfs_visit_description='client.v3762',
        issued_at='2021-01-01',
    )
    pfs_visit1.sps_visit = M.sps_visit(
        pfs_visit_id=pfs_visit1.pfs_visit_id,
        exp_type='bias',
    )

    db.add(pfs_visit1)
    db.commit()


class Series:
    def __init__(self):
        self._count = itertools.count(1)

    def __call__(self):
        return next(self._count)


series = Series()


if __name__ == '__main__':
    main()
