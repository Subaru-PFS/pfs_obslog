import os
import re
from logging import getLogger
from mimetypes import guess_type
from pathlib import Path
from posixpath import splitext
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException
from fastapi import Path as fPath
from fastapi import Query, UploadFile, status
from pfs_obslog.app.context import Context
from pfs_obslog.config import settings
from pfs_obslog.fileseries import FileSeries
from pydantic.main import BaseModel
from starlette.responses import FileResponse

attachments_dir = settings.attachments_dir

logger = getLogger(__name__)
router = APIRouter()


class CreateAttachmentResponse(BaseModel):
    path: str


SUFFIX_BLOCKED = {'', '.exe', '.com', '.dll', '.vbs', '.php'}


def allowed_file(file: UploadFile):
    ext: str = splitext(file.filename)[1]
    ext = ext.lower()
    if ext in SUFFIX_BLOCKED:
        return False
    return True


safe_account_name_regex = r'^(\w+|\w+@\w+)$'


def safe_account_name(ctx: Context = Depends()):
    account_name = ctx.current_user.account_name
    if not re.match(safe_account_name_regex, account_name):
        message = f'invalid username: {account_name}'
        logger.error(message)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, message)
    return account_name


@router.post('/api/attachments', response_model=CreateAttachmentResponse)
def create_attachment(
    file: UploadFile = File(...),
    account_name: str = Depends(safe_account_name),
):
    if not allowed_file(file):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, 'filetype not allowed')

    userdir = FileSeries(attachments_dir / account_name)
    file_id = userdir.add(file.file, filename=file.filename)
    return {
        'path': f'{account_name}/{file_id}',
    }


@router.get('/api/attachments/{account_name}/{file_id}')
def show_attachment(
    account_name: str = fPath(..., regex=safe_account_name_regex),
    file_id: int = fPath(...),
    filename: Optional[str] = Query(None),
    ctx: Context = Depends(),
):
    userdir = FileSeries(attachments_dir / account_name)
    path = userdir.file_path(file_id)
    if path.exists():
        media_type = guess_type(userdir.file_path(file_id).name)[0]
        return FileResponse(
            str(path),
            media_type=media_type,
            filename=filename,
            headers={'Cache-Control': f'max-age={7*24*3600}'},
        )
    else:
        raise HTTPException(status.HTTP_404_NOT_FOUND)


class AttachmentEntry(BaseModel):
    id: int
    name: str
    account_name: str
    media_type: str
    exists: bool


class AttachmentList(BaseModel):
    count: int
    entries: list[AttachmentEntry]


@router.get('/api/attachments', response_model=AttachmentList)
def list_attachment(
    account_name: str = Depends(safe_account_name),
    start: int = Query(1),
    per_page: int = Query(100),
):
    userdir = FileSeries(attachments_dir / account_name)
    return AttachmentList(
        count=userdir.meta.current_id,
        entries=[
            AttachmentEntry(
                id=file_id,
                name=meta.name,
                account_name=account_name,
                media_type=guess_type(meta.name)[0] or 'application/octet-stream',
                exists=exists,
            )
            for file_id, path, meta, exists
            in userdir.files(slice(-start, -(start + per_page - 1), -1))
        ])


@router.delete('/api/attachments/{file_id}')
def destroy_attachment(
    file_id: int,
    account_name: str = Depends(safe_account_name),
):
    userdir = FileSeries(attachments_dir / account_name)
    userdir.file_path(file_id).unlink(missing_ok=True)
