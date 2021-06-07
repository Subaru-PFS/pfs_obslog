import pytest
from sqlalchemy.orm import Session
from sqlalchemy import func
import opdb.models as M


@pytest.mark.focus
def test_visit(db: Session):
    q = db.query(
        M.pfs_visit,
        M.visit_set.visit_set_id,
        func.count(M.sps_exposure.pfs_visit_id).label('n_sps_exposures'),
        func.count(M.mcs_exposure.pfs_visit_id).label('n_mcs_exposures'),
    )\
        .outerjoin(M.mcs_exposure)\
        .outerjoin(M.sps_visit)\
        .outerjoin(M.sps_exposure)\
        .outerjoin(M.visit_set)\
        .group_by(M.pfs_visit.pfs_visit_id, M.visit_set.visit_set_id)\
        .limit(10)

    [*q]

# * VisitSet
#     * ID
#     * Name
#     * Type
#     * Status
# * VisitID
# * Desc.
# * IssuedAt
# * number of MCSExposures
# * number of SpSExposures
# * VisitComments
