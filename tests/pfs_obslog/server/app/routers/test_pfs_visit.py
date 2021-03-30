from typing import Optional
import pytest
from opdb import models as M

from pfs_obslog.server.orm import orm_getter_dict, static_check_init_args
from pfs_obslog.server.schema import Visit, SpsSequence
from sqlalchemy.orm import Session


@static_check_init_args
class VisitListEntry(Visit):
    sps_present: bool
    mcs_present: bool
    visit_set_id: Optional[int]
    sps_sequence: SpsSequence

    class Config:
        orm_mode = True

        class getter_dict(orm_getter_dict):
            def _row_to_obj(self, row):
                return VisitListEntry(
                    id=row.pfs_visit.pfs_visit_id,
                    description=row.pfs_visit.pfs_visit_description,
                    issued_at=row.pfs_visit.issued_at,
                    sps_present=row.sps_present,
                    mcs_present=row.mcs_present,
                    sps_sequence=row.sps_sequence,
                    visit_set_id=row.visit_set_id,
                )


@pytest.mark.focus
def test_pfs_visit_index(db: Session):
    q = db.query(
        M.pfs_visit,
        M.pfs_visit.mcs_exposure.any().label('sps_present'),
        M.pfs_visit.sps_visit.has().label('mcs_present'),
        M.visit_set.visit_set_id,
    )\
        .select_from(M.pfs_visit)\
        .outerjoin(M.sps_visit)\
        .outerjoin(M.visit_set)\
        .limit(10)
    list(q)
