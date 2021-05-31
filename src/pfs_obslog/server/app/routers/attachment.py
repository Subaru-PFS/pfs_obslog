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
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.env import PFS_OBSLOG_ROOT
from pfs_obslog.server.fileseries import FileSeries
from pfs_obslog.server.orm import static_check_init_args
from pydantic.main import BaseModel
from starlette.responses import FileResponse

attachments_dir: Path = Path(os.environ.get('PFS_OBSLOG_ATTACHMENTS_DIR', PFS_OBSLOG_ROOT / 'attachments'))

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class CreateAttachmentResponse(BaseModel):
    path: str


SUFFIX_BLOCKED = {'', 'exe', 'com', 'dll', 'vbs', 'php'}


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
    try:
        media_type = guess_type(userdir.file_path(file_id).name)[0]
        return FileResponse(
            str(path),
            media_type=media_type,
            filename=filename,
            headers={'Cache-Control': f'max-age={7*24*3600}'},
        )
    except FileNotFoundError:
        logger.warn(f'File Not Found: {path}')
        raise HTTPException(status.HTTP_404_NOT_FOUND)
