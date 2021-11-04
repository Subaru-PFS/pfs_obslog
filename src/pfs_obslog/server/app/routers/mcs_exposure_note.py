from logging import getLogger

from fastapi import APIRouter, Depends
from opdb import models as M
from pfs_obslog.server.app.context import Context
from pydantic.main import BaseModel


logger = getLogger(__name__)
router = APIRouter()


class McsExposureNoteCreateRequest(BaseModel):
    mcs_exposure_frame_id: int
    body: str


class McsExposureNoteCreateResponse(BaseModel):
    id: int


@router.post('/api/mcs_exposure_notes', response_model=McsExposureNoteCreateResponse)
def create_mcs_exposure_note(
    params: McsExposureNoteCreateRequest,
    ctx: Context = Depends(),
):
    note = M.obslog_mcs_exposure_note(
        user_id=ctx.current_user.id,
        mcs_exposure_frame_id=params.mcs_exposure_frame_id,
        body=params.body,
    )
    ctx.db.add(note)
    ctx.db.commit()
    return McsExposureNoteCreateResponse(id=note.id)


class VisitNoteUpdateRequest(BaseModel):
    body: str


@router.put('/api/mcs_exposure_notes/{id}')
def update_mcs_exposure_note(
    id: int,
    params: VisitNoteUpdateRequest,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_mcs_exposure_note)\
        .filter(
            (M.obslog_mcs_exposure_note.user_id == ctx.current_user.id) &
            (M.obslog_mcs_exposure_note.id == id))\
        .one_or_none()
    if note:
        note.body = params.body  # type: ignore
        ctx.db.commit()


@router.delete('/api/mcs_exposure_notes/{id}')
def destroy_mcs_exposure_note(
    id: int,
    ctx: Context = Depends(),
):
    note = ctx.db.query(M.obslog_mcs_exposure_note)\
        .filter(
            (M.obslog_mcs_exposure_note.user_id == ctx.current_user.id) &
            (M.obslog_mcs_exposure_note.id == id))\
        .one_or_none()
    if note:
        ctx.db.delete(note)
        ctx.db.commit()
