import asyncio
import multiprocessing
from typing import Callable
from fastapi import APIRouter, Depends
from sqlalchemy import func

from ..context import Context


router = APIRouter()


@router.get('/api/healthz')
async def healthz(
    ctx: Context = Depends(),
):
    return {
        'now': ctx.db.query(func.now()).scalar(),
    }
