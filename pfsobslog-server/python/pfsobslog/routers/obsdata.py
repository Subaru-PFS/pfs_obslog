from datetime import date
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic.main import BaseModel

from ..database import models
from .context import Context
from .query import VisitSet, query_visit_sets
from ..opdb import models as opdbmodels

router = APIRouter()


class IndexVisitSetResponse(BaseModel):
    visit_sets: List[VisitSet]


@router.get("/api/visit_sets", response_model=IndexVisitSetResponse)
def index_visit_sets(
    date_start: date = None,
    date_end: date = None,
    include_sps: bool = True,
    include_mcs: bool = True,
    page: int = 0,
    sql: str = None,
    ctx: Context = Depends(),
):
    return IndexVisitSetResponse(
        visit_sets=query_visit_sets(
            ctx.db,
            date_start=date_start,
            date_end=date_end,
            include_sps=include_sps,
            include_mcs=include_mcs,
            sql=sql,
            page=page,
        )
    )


class NoteCreateBase(BaseModel):
    body: str


class VisitSetNoteCreate(NoteCreateBase):
    pass


@router.post("/api/visit_sets/{visit_set_id}/notes")
def create_visit_set_note(
    visit_set_id: int,
    form: VisitSetNoteCreate,
    ctx: Context = Depends(),
):
    visit_set: Any = ctx.db.query(opdbmodels.sps_sequence).get(visit_set_id)
    if visit_set is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
    visit_set.obslog_notes.append(models.VisitSetNote(user=ctx.current_user, body=form.body))
    ctx.db.commit()


@router.delete("/api/visit_sets/{visit_set_id}/notes/{note_id}")
def delete_visit_set_note(
    visit_set_id: int,
    note_id: int,
    ctx: Context = Depends(),
):
    ctx.db.query(models.VisitSetNote).filter(
        models.User.id == ctx.current_user.id,
        models.VisitSetNote.id == note_id,
    ).delete(False)
    ctx.db.commit()


class VisitNoteCreate(NoteCreateBase):
    pass


@router.post("/api/{visit_id}/notes")
def create_visit_note(
    visit_id: int,
    form: VisitNoteCreate,
    ctx: Context = Depends(),
):
    visit: Any = ctx.db.query(opdbmodels.pfs_visit).get(visit_id)
    if visit is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
    visit.obslog_notes.append(models.VisitNote(user=ctx.current_user, body=form.body))
    ctx.db.commit()


@router.post("/api/{visit_id}/notes/{note_id}")
def delete_visit_note(
    visit_id: int,
    note_id: int,
    ctx: Context = Depends(),
):
    ctx.db.query(models.VisitNote).filter(
        models.User.id == ctx.current_user.id,
        models.VisitNote.id == note_id,
    ).delete(False)
    ctx.db.commit()


class McsExposureNoteCreate(NoteCreateBase):
    pass


@router.post('/api/mcs_exposure/{mcs_exposure_id}/notes')
def create_mcs_exposure_note(
    mcs_exposure_id: int,
    form: McsExposureNoteCreate,
    ctx: Context = Depends()
):
    mcs_exposure: Any = ctx.db.query(opdbmodels.mcs_exposure).get(mcs_exposure_id)
    if mcs_exposure is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
    mcs_exposure.obslog_notes.append(models.McsExposureNote(user=ctx.current_user, body=form.body))
    ctx.db.commit()


@router.delete('/api/mcs_exposure/{mcs_exposure_id}/notes/{note_id}')
def delete_mcs_exposure_note(
    mcs_exposure_id: int,
    note_id: int,
    ctx: Context = Depends()
):
    ctx.db.query(models.McsExposureNote).filter(
        models.User.id == ctx.current_user.id,
        models.McsExposureNote.id == note_id,
    ).delete(False)
    ctx.db.commit()


# class SpsExposureNoteCreate(NoteCreateBase):
#     pass


# @router.post('/api/sps_exposure/{sps_exposure_id}/notes')
# def create_sps_exposure_note(
#     sps_exposure_id: int,
#     form: SpsExposureNoteCreate,
#     ctx: Context = Depends()
# ):
#     sps_exposure: Any = ctx.db.query(opdbmodels.sps_exposure).get(sps_exposure_id)
#     if sps_exposure is None:
#         raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
#     sps_exposure.obslog_notes.append(models.SpsExposureNote(user=ctx.current_user, body=form.body))
#     ctx.db.commit()


# @router.delete('/api/mcs_exposure/{mcs_exposure_id}/notes/{note_id}')
# def delete_mcs_exposure_note(
#     mcs_exposure_id: int,
#     note_id: int,
#     ctx: Context = Depends()
# ):
#     ctx.db.query(models.McsExposureNote).filter(
#         models.User.id == ctx.current_user.id,
#         models.McsExposureNote.id == note_id,
#     ).delete(False)
#     ctx.db.commit()
