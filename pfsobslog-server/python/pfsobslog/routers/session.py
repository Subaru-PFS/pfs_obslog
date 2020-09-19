from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic.main import BaseModel

from ..database import models
from .context import Context

router = APIRouter()


class User(BaseModel):
    id: int
    email: str

    class Config:
        orm_mode = True


class SessionCreateRequest(BaseModel):
    email: str
    password: str


class SessionCreateResponse(BaseModel):
    current_user: User
    last_day: date


def make_session(ctx: Context):
    last_day = None
    for row in ctx.db.execute(
        '''
        select max("t")::date
        from (
            select taken_at as "t"
            from mcs_exposure
            union
            select time_exp_start as "t"
            from sps_exposure
        ) as "t2";
        '''):
        last_day = row[0]
    return SessionCreateResponse(current_user=ctx.current_user, last_day=last_day)


@router.post('/api/session', response_model=SessionCreateResponse)
def session_create(form: SessionCreateRequest, ctx: Context = Depends()):
    user = models.User.authenticate(ctx.db, form.email, form.password)
    if user is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f'ID or Password is incorrect')
    with ctx.session.activate():
        ctx.session['user_id'] = user.id
    return make_session(ctx)


SessionReadResponse = SessionCreateResponse


@router.get('/api/session', response_model=SessionReadResponse)
def session_read(ctx: Context = Depends()):
    user = ctx.current_user
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    return make_session(ctx)


@router.delete('/api/session')
def session_delete(ctx: Context = Depends()):
    with ctx.session.activate():
        ctx.session.clear()
