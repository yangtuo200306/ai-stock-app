from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["stocks"])


@router.get("/stocks")
def get_stocks():
    return {"items": []}
