from typing import Any, cast
import pytest
from opdb import models as M
import sqlalchemy
from sqlalchemy.orm.session import Session
from pfs_obslog.server.parsesql import ast, parse
from pfs_obslog.server.visitquery import VisitQueryContext, visit_query
from sqlalchemy import select, distinct


def test_visit_query(db: Session):
    apply_filter(db, """ where sequence_type LIKE '?domeflat?' """)
    apply_filter(db, """ where issued_at::date = '2021-01-03' """)
    apply_filter(db, """ where is_sps_visit """)
    apply_filter(db, """ where is_mcs_visit """)
    apply_filter(db, """ where id = 3 """)
    apply_filter(db, """ where id >= 3 """)
    apply_filter(db, """ where id > 3 """)
    apply_filter(db, """ where id between 0 and 3 """)


@pytest.mark.focus
def test_header_search(db: Session):
    apply_filter(db, """ where fits_header['OBSERVER'] = 'hello' """)
    apply_filter(db, """ where fits_header['NAXIS']::float between 1 and 3""")
    apply_filter(db, """ where 'ok'::safe_float is null """)
    apply_filter(db, """ where 'ok'::safe_int is null """)
    # apply_filter(db, """ where  """)


def apply_filter(db: Session, sql: str):
    vq = visit_query(sql)
    if vq.pfs_visit_ids is not None:
        q = db.query(
            M.pfs_visit,
        ).\
            filter(sqlalchemy.and_(False, M.pfs_visit.pfs_visit_id.in_(vq.pfs_visit_ids))).\
            limit(10)
        [*q]


def test_build_filter():
    s = parse(r""" SELECT * WHERE  sequence_type LIKE '%domeflat%' """)[0]
    ctx = VisitQueryContext()
    assert isinstance(s, ast.SelectStmt)
    assert s.whereClause
    q = select(cast(Any, distinct(M.pfs_visit.pfs_visit_id))).\
        outerjoin(M.sps_visit).\
        outerjoin(M.visit_set).\
        outerjoin(M.iic_sequence).\
        filter(s.whereClause(ctx))  # type: ignore
