from typing import Any, cast
import pytest
from opdb import models as M
from pfs_obslog.server.parsesql import ast, parse
from pfs_obslog.server.visitquery import VisitQueryContext, visit_query
from sqlalchemy import select, distinct


@pytest.mark.focus
def test_visit_query():
    visit_query(""" where sequence_type LIKE '?domeflat?' """)
    visit_query(""" where issued_at::date = '2021-01-03' """)


def test_build_filter():
    s = parse(r""" SELECT * WHERE  sequence_type LIKE '%domeflat%' """)[0]
    ctx = VisitQueryContext()
    assert isinstance(s, ast.SelectStmt)
    assert s.whereClause
    q = select(cast(Any, distinct(M.pfs_visit.pfs_visit_id))).\
        outerjoin(M.sps_visit).\
        outerjoin(M.visit_set).\
        outerjoin(M.sps_sequence).\
        filter(s.whereClause(ctx)) # type: ignore

    print(q)
    print(s.whereClause(ctx))


def x():
    q_which = db.query(distinct(opdbmodels.pfs_visit.pfs_visit_id)).\
        outerjoin(opdbmodels.sps_visit).\
        outerjoin(opdbmodels.sps_exposure).\
        outerjoin(opdbmodels.visit_set).\
        outerjoin(opdbmodels.sps_sequence).\
        outerjoin(opdbmodels.mcs_exposure)

    if not include_sps:
        q_which = q_which.filter(opdbmodels.sps_visit.pfs_visit_id == None)
    if not include_mcs:
        q_which = q_which.filter(opdbmodels.mcs_exposure.pfs_visit_id == None)

    if sql is not None:
        q_which = apply_fulltext_search(q_which, sql)

    q_which = apply_date_condition(q_which, date_start, date_end)
    q_which = q_which.order_by(opdbmodels.pfs_visit.pfs_visit_id.desc())
    q_which = q_which[page * per_page: (page + 1) * per_page]  # type: ignore
