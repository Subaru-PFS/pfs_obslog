from fastapi import APIRouter


router = APIRouter()


@router.get('/api/healthz')
def healthz_get():
    pass
