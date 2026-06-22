from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "AI Stock App backend is running",
    }
