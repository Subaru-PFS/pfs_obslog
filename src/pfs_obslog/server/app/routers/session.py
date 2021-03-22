from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from pfs_obslog.server import userauth
from pydantic import BaseModel

router = APIRouter()


class SessionCreateRequest(BaseModel):
    username: str
    password: str


class SessionCreateResponse(BaseModel):
    token: str


@router.post('/api/session', response_model=SessionCreateResponse)
def session_create(params: SessionCreateRequest):
    if userauth(params.username, params.password):
        pass
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
