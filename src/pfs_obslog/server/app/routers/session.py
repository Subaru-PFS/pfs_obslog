from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from pfs_obslog.server import userauth
from pydantic import BaseModel
from opdb import models
from fastapi import Depends

from pfs_obslog.server.app.context import Context, NoLoginContext

router = APIRouter()


class SessionCreateRequest(BaseModel):
    username: str
    password: str


@router.post('/api/session')
def session_create(
    params: SessionCreateRequest,
    ctx: NoLoginContext = Depends(),
):
    if account_name := userauth.authorize(params.username, params.password):
        with ctx.session.activate() as session:
            session.account_name = account_name
        if ctx.db.query(models.obslog_user).filter_by(account_name=account_name).one_or_none() is None:
            user = models.obslog_user(account_name=account_name)
            ctx.db.add(user)
            ctx.db.commit()
        return
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)


@router.get('/api/session')
def session_show(
    ctx: Context = Depends(),
):
    pass


@router.delete('/api/session')
def session_destroy(
    ctx: Context = Depends(),
):
    ctx.session.clear()
