import pfs_obslog.server.app.routers.fits
import pytest
from opdb import models as M

# @pytest.mark.slow
# def test_list_fits(db):
#     visit_id = 46163
#     visit = db.query(M.pfs_visit).get(visit_id)
#     paths = fits_path_for_visit(visit)
#     assert len(paths) > 0


# @pytest.mark.slow
# def test_fits_meta(db):
#     visit_id = 46163
#     visit = db.query(M.pfs_visit).get(visit_id)
#     path0 = fits_path_for_visit(visit)[0]
#     print(fits_meta(path0))
