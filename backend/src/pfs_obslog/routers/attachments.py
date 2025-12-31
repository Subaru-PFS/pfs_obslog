"""添付ファイル API

ユーザーがノートに添付するファイルのアップロード、一覧、ダウンロード、削除機能を提供します。
"""

import contextlib
import fcntl
import re
import shutil
from logging import getLogger
from mimetypes import guess_type
from pathlib import Path
from posixpath import splitext
from typing import Annotated, IO, Generator, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi import Path as fPath
from fastapi.responses import FileResponse
from pydantic import BaseModel

from pfs_obslog.auth.session import require_user
from pfs_obslog.config import get_settings


logger = getLogger(__name__)
router = APIRouter(prefix="/api/attachments", tags=["attachments"])

# 拒否するファイル拡張子
SUFFIX_BLOCKED = {"", ".exe", ".com", ".dll", ".vbs", ".php", ".sh", ".bat", ".cmd"}

# 安全なアカウント名の正規表現
SAFE_ACCOUNT_NAME_REGEX = r"^(\w+|\w+@\w+)$"


# ============================================================
# File Series (ファイル管理ユーティリティ)
# ============================================================


class Meta(BaseModel):
    """ファイルシリーズのメタデータ"""

    current_id: int

    def next_id(self) -> int:
        """次のファイルIDを取得"""
        self.current_id += 1
        return self.current_id


class FileMeta(BaseModel):
    """個別ファイルのメタデータ"""

    name: str


class FileSeries:
    """ファイルシリーズ管理クラス

    ユーザーごとのファイルを連番で管理します。
    """

    N = 1000  # ディレクトリあたりのファイル数

    def __init__(self, path: Path):
        self._dirpath = path

    def add(self, file: IO, filename: str) -> int:
        """ファイルを追加

        Args:
            file: ファイルオブジェクト
            filename: ファイル名

        Returns:
            ファイルID
        """
        with self._meta() as meta:
            file_id = meta.next_id()
            path = self.file_path(file_id)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("wb") as f:
                shutil.copyfileobj(file, f)
            file_meta = FileMeta(name=filename)
            Path(f"{path}.meta.json").write_text(file_meta.model_dump_json())
        return file_id

    def file_path(self, file_id: int) -> Path:
        """ファイルパスを取得"""
        dirname = self._dirpath / f"{file_id // self.N}"
        return dirname / f"{file_id % self.N}"

    def file_meta(self, file_id: int) -> FileMeta:
        """ファイルメタデータを取得"""
        return FileMeta.model_validate_json(
            Path(f"{self.file_path(file_id)}.meta.json").read_text()
        )

    @contextlib.contextmanager
    def _meta(self) -> Generator[Meta, None, None]:
        """メタデータのコンテキストマネージャー（排他ロック付き）"""
        self._dirpath.mkdir(parents=True, exist_ok=True)
        meta_path = self._dirpath / "meta.json"
        with _ex_lock(meta_path):
            if meta_path.exists():
                meta = Meta.model_validate_json(meta_path.read_text())
            else:
                meta = Meta(current_id=0)
            yield meta
            meta_path.write_text(meta.model_dump_json())

    @property
    def meta(self) -> Meta:
        """メタデータを取得"""
        with self._meta() as meta:
            return meta

    def files(self, which: slice = slice(None, None)):
        """ファイルを列挙

        Args:
            which: スライス指定

        Yields:
            (file_id, file_path, file_meta, exists) タプル
        """
        current_id = self.meta.current_id
        for file_id in range(1, current_id + 1)[which]:
            file_path = self.file_path(file_id)
            try:
                file_meta = self.file_meta(file_id)
                yield file_id, file_path, file_meta, file_path.exists()
            except Exception:
                # メタファイルが破損している場合はスキップ
                continue


@contextlib.contextmanager
def _ex_lock(path: Path):
    """排他ロック"""
    lockfile = Path(f"{path}.lock")
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    with lockfile.open("w") as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX)
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    lockfile.unlink(missing_ok=True)


# ============================================================
# Schemas
# ============================================================


class CreateAttachmentResponse(BaseModel):
    """添付ファイル作成レスポンス"""

    path: str


class AttachmentEntry(BaseModel):
    """添付ファイルエントリ"""

    id: int
    name: str
    account_name: str
    media_type: str
    exists: bool


class AttachmentList(BaseModel):
    """添付ファイル一覧"""

    count: int
    entries: list[AttachmentEntry]


# ============================================================
# Dependencies
# ============================================================


def _allowed_file(file: UploadFile) -> bool:
    """許可されたファイルタイプかチェック"""
    if file.filename is None:
        return False
    ext = splitext(file.filename)[1].lower()
    return ext not in SUFFIX_BLOCKED


def _safe_account_name(
    account_name: Annotated[str, Depends(require_user)],
) -> str:
    """安全なアカウント名かチェック"""
    if not re.match(SAFE_ACCOUNT_NAME_REGEX, account_name):
        message = f"Invalid username format: {account_name}"
        logger.error(message)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, message)
    return account_name


# ============================================================
# Endpoints
# ============================================================


@router.post(
    "",
    response_model=CreateAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload attachment",
    description="Upload a new attachment file. Requires authentication.",
)
def create_attachment(
    file: UploadFile = File(...),
    account_name: str = Depends(_safe_account_name),
):
    """添付ファイルをアップロード"""
    if not _allowed_file(file):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File type not allowed",
        )

    settings = get_settings()
    userdir = FileSeries(settings.attachments_dir / account_name)
    file_id = userdir.add(file.file, filename=file.filename or "unnamed")

    return CreateAttachmentResponse(path=f"{account_name}/{file_id}")


@router.get(
    "",
    response_model=AttachmentList,
    summary="List attachments",
    description="List attachments for the authenticated user.",
)
def list_attachments(
    account_name: str = Depends(_safe_account_name),
    start: int = Query(1, ge=1, description="Start position"),
    per_page: int = Query(100, ge=1, le=1000, description="Items per page"),
):
    """添付ファイル一覧を取得（自分のファイルのみ）"""
    settings = get_settings()
    userdir = FileSeries(settings.attachments_dir / account_name)

    entries = []
    for file_id, path, meta, exists in userdir.files(
        slice(-start, -(start + per_page - 1) if per_page > 1 else None, -1)
    ):
        entries.append(
            AttachmentEntry(
                id=file_id,
                name=meta.name,
                account_name=account_name,
                media_type=guess_type(meta.name)[0] or "application/octet-stream",
                exists=exists,
            )
        )

    return AttachmentList(count=userdir.meta.current_id, entries=entries)


@router.get(
    "/{account_name}/{file_id}",
    summary="Download attachment",
    description="Download an attachment file.",
)
def get_attachment(
    account_name: str = fPath(..., pattern=SAFE_ACCOUNT_NAME_REGEX),
    file_id: int = fPath(..., ge=1),
    filename: Optional[str] = Query(None, description="Override filename in response"),
):
    """添付ファイルをダウンロード"""
    settings = get_settings()
    userdir = FileSeries(settings.attachments_dir / account_name)
    path = userdir.file_path(file_id)

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )

    try:
        file_meta = userdir.file_meta(file_id)
        media_type = guess_type(file_meta.name)[0]
        download_filename = filename or file_meta.name
    except Exception:
        media_type = "application/octet-stream"
        download_filename = filename or f"attachment_{file_id}"

    return FileResponse(
        str(path),
        media_type=media_type,
        filename=download_filename,
        headers={"Cache-Control": f"max-age={7 * 24 * 3600}"},
    )


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attachment",
    description="Delete an attachment. Only the owner can delete their own files.",
)
def delete_attachment(
    file_id: int = fPath(..., ge=1),
    account_name: str = Depends(_safe_account_name),
):
    """添付ファイルを削除（自分のファイルのみ）"""
    settings = get_settings()
    userdir = FileSeries(settings.attachments_dir / account_name)
    file_path = userdir.file_path(file_id)
    meta_path = Path(f"{file_path}.meta.json")

    # ファイルとメタデータを削除
    file_path.unlink(missing_ok=True)
    meta_path.unlink(missing_ok=True)
