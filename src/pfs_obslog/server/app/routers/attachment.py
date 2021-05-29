import os
import secrets
import shutil
from logging import getLogger
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException
from fastapi import Path as fPath
from fastapi import Query, UploadFile, status
from pfs_obslog.server.app.context import Context
from pfs_obslog.server.env import PFS_OBSLOG_ROOT
from pfs_obslog.server.orm import static_check_init_args
from pydantic.main import BaseModel
from starlette.responses import FileResponse

attachments_dir: Path = Path(os.environ.get('PFS_OBSLOG_ATTACHMENTS_DIR', PFS_OBSLOG_ROOT / 'attachments'))

logger = getLogger(__name__)
router = APIRouter()


@static_check_init_args
class CreateAttachmentResponse(BaseModel):
    id: str
    suffix: str


SUFFIX_BLOCKED = {'', 'exe', 'com', 'dll', 'vbs', 'php'}


@router.post('/api/attachments', response_model=CreateAttachmentResponse)
def create_attachment(
    file: UploadFile = File(...),
    ctx: Context = Depends(),
):
    bname = Path(file.filename)
    suffix = bname.suffix[1:].lower()
    if suffix in SUFFIX_BLOCKED or len(suffix) == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY)
    a_id = secrets.token_hex(16)
    dirname = attachments_dir / a_id[:2]
    dirname.mkdir(parents=True, exist_ok=True)
    with (dirname / f'{a_id}.{suffix}').open('wb') as new:
        shutil.copyfileobj(file.file, new)
    return {
        'id': a_id,
        'suffix': suffix,
    }


@router.get('/api/attachments/{a_id}.{suffix}')
def show_attachment(
    a_id: str = fPath(..., regex=r'^\w+$'),
    suffix: str = fPath(..., regex=r'^\w+$'),
    filename: str = Query(None),
    ctx: Context = Depends(),
):
    if filename and Path(filename).suffix[:1].lower() in SUFFIX_BLOCKED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST)
    dirname = attachments_dir / a_id[:2]
    filepath = dirname / f'{a_id}.{suffix}'
    if filepath.exists():
        return FileResponse(str(filepath), filename=filename)
    logger.warn(f'File Not Found: {filepath}')
    raise HTTPException(status.HTTP_404_NOT_FOUND)
