"""Visit Note & Visit Set Note API

Visit（観測）およびVisit Set（シーケンス）へのメモの作成・更新・削除を提供します。
メモの作成・更新・削除にはログインが必要です。
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from pfs_obslog import models as M
from pfs_obslog.auth.session import require_user
from pfs_obslog.database import get_db


router = APIRouter(prefix="/api", tags=["notes"])


# ============================================================
# Schemas
# ============================================================


class NoteCreateRequest(BaseModel):
    """メモ作成リクエスト"""

    body: str


class NoteCreateResponse(BaseModel):
    """メモ作成レスポンス"""

    id: int


class NoteUpdateRequest(BaseModel):
    """メモ更新リクエスト"""

    body: str


# ============================================================
# Dependencies
# ============================================================


def get_user_id(
    db: Annotated[Session, Depends(get_db)],
    account_name: Annotated[str, Depends(require_user)],
) -> int:
    """認証されたユーザーのDB IDを取得する

    Args:
        db: DBセッション
        account_name: ログイン中のアカウント名

    Returns:
        ユーザーのDB ID

    Raises:
        HTTPException: ユーザーが見つからない場合は404エラー
    """
    user = db.execute(
        select(M.ObslogUser).where(M.ObslogUser.account_name == account_name)
    ).scalar_one_or_none()

    if user is None:
        # ユーザーが存在しない場合は自動作成
        user = M.ObslogUser(account_name=account_name)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user.id


# ============================================================
# Visit Note Endpoints
# ============================================================


@router.post(
    "/visits/{visit_id}/notes",
    response_model=NoteCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a visit note",
    description="Create a new note for a visit. Requires authentication.",
)
def create_visit_note(
    visit_id: int,
    request: NoteCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> NoteCreateResponse:
    """Visitにメモを追加する"""
    # Visitの存在確認
    visit = db.execute(
        select(M.PfsVisit).where(M.PfsVisit.pfs_visit_id == visit_id)
    ).scalar_one_or_none()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit {visit_id} not found",
        )

    note = M.ObslogVisitNote(
        user_id=user_id,
        pfs_visit_id=visit_id,
        body=request.body,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return NoteCreateResponse(id=note.id)


@router.put(
    "/visits/{visit_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update a visit note",
    description="Update an existing visit note. Only the author can update their own notes.",
)
def update_visit_note(
    visit_id: int,
    note_id: int,
    request: NoteUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> None:
    """Visitのメモを更新する（自分のメモのみ）"""
    note = db.execute(
        select(M.ObslogVisitNote).where(
            (M.ObslogVisitNote.id == note_id)
            & (M.ObslogVisitNote.pfs_visit_id == visit_id)
            & (M.ObslogVisitNote.user_id == user_id)
        )
    ).scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you don't have permission to update it",
        )

    note.body = request.body
    db.commit()


@router.delete(
    "/visits/{visit_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a visit note",
    description="Delete a visit note. Only the author can delete their own notes.",
)
def delete_visit_note(
    visit_id: int,
    note_id: int,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> None:
    """Visitのメモを削除する（自分のメモのみ）"""
    note = db.execute(
        select(M.ObslogVisitNote).where(
            (M.ObslogVisitNote.id == note_id)
            & (M.ObslogVisitNote.pfs_visit_id == visit_id)
            & (M.ObslogVisitNote.user_id == user_id)
        )
    ).scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you don't have permission to delete it",
        )

    db.delete(note)
    db.commit()


# ============================================================
# Visit Set Note Endpoints
# ============================================================


@router.post(
    "/visit_sets/{visit_set_id}/notes",
    response_model=NoteCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a visit set note",
    description="Create a new note for a visit set (IIC sequence). Requires authentication.",
)
def create_visit_set_note(
    visit_set_id: int,
    request: NoteCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> NoteCreateResponse:
    """Visit Set（IIC Sequence）にメモを追加する"""
    # IIC Sequenceの存在確認
    sequence = db.execute(
        select(M.IicSequence).where(M.IicSequence.iic_sequence_id == visit_set_id)
    ).scalar_one_or_none()

    if sequence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit set {visit_set_id} not found",
        )

    note = M.ObslogVisitSetNote(
        user_id=user_id,
        iic_sequence_id=visit_set_id,
        body=request.body,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return NoteCreateResponse(id=note.id)


@router.put(
    "/visit_sets/{visit_set_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update a visit set note",
    description="Update an existing visit set note. Only the author can update their own notes.",
)
def update_visit_set_note(
    visit_set_id: int,
    note_id: int,
    request: NoteUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> None:
    """Visit Setのメモを更新する（自分のメモのみ）"""
    note = db.execute(
        select(M.ObslogVisitSetNote).where(
            (M.ObslogVisitSetNote.id == note_id)
            & (M.ObslogVisitSetNote.iic_sequence_id == visit_set_id)
            & (M.ObslogVisitSetNote.user_id == user_id)
        )
    ).scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you don't have permission to update it",
        )

    note.body = request.body
    db.commit()


@router.delete(
    "/visit_sets/{visit_set_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a visit set note",
    description="Delete a visit set note. Only the author can delete their own notes.",
)
def delete_visit_set_note(
    visit_set_id: int,
    note_id: int,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[int, Depends(get_user_id)],
) -> None:
    """Visit Setのメモを削除する（自分のメモのみ）"""
    note = db.execute(
        select(M.ObslogVisitSetNote).where(
            (M.ObslogVisitSetNote.id == note_id)
            & (M.ObslogVisitSetNote.iic_sequence_id == visit_set_id)
            & (M.ObslogVisitSetNote.user_id == user_id)
        )
    ).scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you don't have permission to delete it",
        )

    db.delete(note)
    db.commit()
