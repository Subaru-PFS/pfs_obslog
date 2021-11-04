from logging import getLogger

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pydantic.main import BaseModel


logger = getLogger(__name__)
router = APIRouter()


class VisitNoteCreateRequest(BaseModel):
    visit_id: int
    body: str


class VisitNoteCreateResponse(BaseModel):
    id: int


@router.post('/api/visit_notes', response_model=VisitNoteCreateResponse)
def create_visit_note(
    params: VisitNoteCreateRequest,
    ctx: Context = Depends(),
):
    note = M.obslog_visit_note(
        user_id=ctx.current_user.id,
        pfs_visit_id=params.visit_id,
        body=params.body,
    )
    ctx.db.add(note)
    ctx.db.commit()
    return VisitNoteCreateResponse(id=note.id)


class VisitNoteUpdateRequest(BaseModel):
    body: str


@router.put('/api/visit_notes/{id}')
def update_visit_note(
    id: int,
    params: VisitNoteUpdateRequest,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_visit_note)\
        .filter(
            (M.obslog_visit_note.user_id == ctx.current_user.id) &
            (M.obslog_visit_note.id == id))\
        .one_or_none()
    if note:
        note.body = params.body  # type: ignore
        ctx.db.commit()


@router.delete('/api/visit_notes/{id}')
def destroy_visit_note(
    id: int,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_visit_note)\
        .filter(
            (M.obslog_visit_note.user_id == ctx.current_user.id) &
            (M.obslog_visit_note.id == id))\
        .one_or_none()
    if note:
        ctx.db.delete(note)
        ctx.db.commit()
