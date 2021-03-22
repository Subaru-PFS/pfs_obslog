from logging import getLogger

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.app.context import Context
from pydantic.main import BaseModel


logger = getLogger(__name__)
router = APIRouter()


class VisitSetNoteCreateRequest(BaseModel):
    body: str


class VisitSetNoteCreateResponse(BaseModel):
    id: int


@router.post('/api/visit_sets/{visit_set_id}/notes', response_model=VisitSetNoteCreateResponse)
def create_visit_set_note(
    visit_set_id: int,
    params: VisitSetNoteCreateRequest,
    ctx: Context = Depends(),
):
    note = M.obslog_visit_set_note(
        visit_set_id=visit_set_id,
        user_id=ctx.current_user.id,
        body=params.body,
    )
    ctx.db.add(note)
    ctx.db.commit()
    return VisitSetNoteCreateResponse(id=note.id)  # type: ignore


class VisitSetNoteUpdateRequest(BaseModel):
    body: str


@router.put('/api/visit_sets/{visit_set_id}/notes/{id}')
def update_visit_set_note(
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


@router.delete('/api/visit_sets/{visit_set_id}/notes/{id}')
def destroy_visit_set_note(
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
