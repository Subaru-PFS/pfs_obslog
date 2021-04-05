from logging import getLogger

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pydantic.main import BaseModel


logger = getLogger(__name__)
router = APIRouter()


class VisitSetNoteCreateRequest(BaseModel):
    visit_set_id: int
    body: str


class VisitSetNoteCreateResponse(BaseModel):
    id: int


@router.post('/api/visit_set_notes', response_model=VisitSetNoteCreateResponse)
def visit_set_note_create(
    params: VisitSetNoteCreateRequest,
    ctx: Context = Depends(),
):
    note = M.obslog_visit_set_note(
        visit_set_id=params.visit_set_id,
        user_id=ctx.current_user.id,
        body=params.body,
    )
    ctx.db.add(note)
    ctx.db.commit()
    return VisitSetNoteCreateResponse(id=note.id)


class VisitSetNoteUpdateRequest(BaseModel):
    body: str


@router.put('/api/visit_set_notes/{id}')
def visit_set_note_update(
    id: int,
    params: VisitSetNoteUpdateRequest,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_visit_set_note)\
        .filter(
            (M.obslog_visit_set_note.user_id == ctx.current_user.id) &
            (M.obslog_visit_set_note.id == id))\
        .one_or_none()
    if note:
        note.body = params.body  # type: ignore
        ctx.db.commit()


@router.delete('/api/visit_set_notes/{id}')
def visit_set_note_destroy(
    id: int,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_visit_set_note)\
        .filter(
            (M.obslog_visit_set_note.user_id == ctx.current_user.id) &
            (M.obslog_visit_set_note.id == id))\
        .one_or_none()
    if note:
        ctx.db.delete(note)
        ctx.db.commit()