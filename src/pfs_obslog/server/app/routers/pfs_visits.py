from datetime import datetime

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pydantic import BaseModel

router = APIRouter()


class PfsVisit(BaseModel):
    id: int
    description: str
    issued_at: datetime

    @classmethod
    def from_row(cls, row):
        return cls(
            id=row.pfs_visit_id,
            description=row.pfs_visit_description,
            issued_at=row.issued_at,
        )


@router.get('/api/pfs_visits', response_model=list[PfsVisit])
def pfs_visit_index(
    offset: int = 0,
    ctx: Context = Depends(),
):
    q = ctx.db.query(M.pfs_visit).order_by(M.pfs_visit.pfs_visit_id.desc()).offset(offset).limit(100)
    return [PfsVisit.from_row(row) for row in q.all()]
