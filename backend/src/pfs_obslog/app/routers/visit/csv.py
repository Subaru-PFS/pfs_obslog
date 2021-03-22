import csv
import functools
import io
from typing import Optional

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.app.context import Context
from pfs_obslog.utils import myitertools
from pfs_obslog.visitquery import evaluate_where_clause, extract_where_clause
from sqlalchemy import distinct, func
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

router = APIRouter()


@router.get('/api/visits.csv')
def list_visit_csv(
    sql: Optional[str] = None,
    ctx: Context = Depends(),
):
    q = (ctx.db.query(
        M.pfs_visit,
        M.visit_set.iic_sequence_id,
        func.count(distinct(M.sps_exposure.sps_camera_id)).label('n_sps_exposures'),
        func.count(distinct(M.mcs_exposure.mcs_frame_id)).label('n_mcs_exposures'),
        func.count(distinct(M.agc_exposure.agc_exposure_id)).label('n_agc_exposures'),  # always 0 or 1
        func.coalesce(
            func.avg(M.sps_exposure.exptime),
            func.avg(M.mcs_exposure.mcs_exptime),
        ).label('avg_exptime'),
        func.avg(M.mcs_exposure.azimuth).label('avg_azimuth'),
        func.avg(M.mcs_exposure.altitude).label('avg_altitude'),
        func.avg(M.mcs_exposure.insrot).label('avg_insrot'),
    )\
        .outerjoin(M.mcs_exposure)
        .outerjoin(M.sps_visit)
        .outerjoin(M.sps_exposure)
        .outerjoin(M.visit_set)
        .outerjoin(M.agc_exposure)
        .group_by(M.pfs_visit, M.visit_set.iic_sequence_id)
        .options(selectinload('obslog_notes').selectinload('user'))
        .order_by(M.pfs_visit.pfs_visit_id.desc())
    )

    where = extract_where_clause(sql or 'select *')
    if where:
        ids = evaluate_where_clause(where)
        q = q.filter(M.pfs_visit.pfs_visit_id.in_(ids))

    batch_size = 512

    def g():
        for i_batch, v_batch in enumerate(myitertools.batch(q, batch_size)):
            buf = io.StringIO()
            writer = csv.writer(buf)
            if i_batch == 0:
                columns = [f'# {c}' if i_c == 0 else c for i_c, c in enumerate(csv_columns().keys())]
                writer.writerow(columns)
            for v in v_batch:
                writer.writerow(visit_q_row_to_csv_row(v))
            yield buf.getvalue()

    content_disposition = f'attachment; filename="pfsobslog.utf8.csv"'
    return StreamingResponse(g(), media_type='text/csv; charset=utf8', headers={'content-disposition': content_disposition})


@functools.lru_cache()
def csv_columns():
    columns: dict = {}
    columns['visit_id'] = lambda v: v.pfs_visit.pfs_visit_id
    columns['description'] = lambda v: v.pfs_visit.pfs_visit_description
    columns['issued_at'] = lambda v: v.pfs_visit.issued_at
    columns['iic_sequence_id'] = lambda v: v.iic_sequence_id
    columns['n_sps_exposures'] = lambda v: v.n_sps_exposures
    columns['n_mcs_exposures'] = lambda v: v.n_mcs_exposures
    columns['n_agc_exposures'] = lambda v: v.n_agc_exposures
    columns['avg_exptime'] = lambda v: v.avg_exptime
    columns['avg_azimuth'] = lambda v: v.avg_azimuth
    columns['avg_altitude'] = lambda v: v.avg_altitude
    columns['avg_insrot'] = lambda v: v.avg_insrot
    columns['notes'] = lambda v: visit_notes_to_csv_cell(v.pfs_visit.obslog_notes)
    return columns


def visit_q_row_to_csv_row(v):
    return [m(v) for m in csv_columns().values()]


def visit_notes_to_csv_cell(notes: list[M.obslog_visit_note]):
    return '\n'.join(f'{n.body} by {n.user.account_name}' for n in notes)
