from fastapi import APIRouter


router = APIRouter()


@router.get('/api/healthz')
def healthz():
    pass
