import pytest
from opdb import models as M

from sqlalchemy.orm import aliased


visit_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
# visit_set_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
# mcs_exposure_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore


@pytest.mark.focus
def test_opdb():
    pass
