from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from sqlalchemy.sql.functions import current_user
from pfs_obslog.server import userauth
from pydantic import BaseModel
from opdb import models
from fastapi import Depends

from pfs_obslog.server.app.context import Context, NoLoginContext

router = APIRouter()


class SessionCreateRequest(BaseModel):
    username: str
    password: str


class CurrentUser(BaseModel):
    id: int
    account_name: str

    class Config:
        orm_mode = True


class Session(BaseModel):
    current_user: CurrentUser


@router.post('/api/session', response_model=Session)
def create_session(
    params: SessionCreateRequest,
    ctx: NoLoginContext = Depends(),
):
    if account_name := userauth.authorize(params.username, params.password):
        with ctx.session.activate() as session:
            session.account_name = account_name
        user = ctx.db.query(models.obslog_user).filter_by(account_name=account_name).one_or_none()
        if user is None:
            user = models.obslog_user(account_name=account_name)
            ctx.db.add(user)
            ctx.db.commit()
        return Session(current_user=user)
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)


@router.get('/api/session', response_model=Session)
def show_session(
    ctx: Context = Depends(),
):
    return Session(current_user=ctx.current_user)


@router.delete('/api/session')
def destroy_session(
    ctx: Context = Depends(),
):
    ctx.session.clear()
