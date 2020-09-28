import time
from fastapi import APIRouter

router = APIRouter()


@router.get('/api/sleep')
def sleep(duration: int = 1):
    time.sleep(duration)