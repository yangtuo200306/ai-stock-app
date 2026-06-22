from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_connection

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalysisCreate(BaseModel):
    stock_code: str


@router.post("/analysis")
def create_analysis_task(analysis: AnalysisCreate):
    task_id = str(uuid4())
    status = "completed"
    progress = 100
    message = "mock analysis completed"

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO analysis_tasks (task_id, stock_code, status, progress, message)
            VALUES (?, ?, ?, ?, ?)
            """,
            (task_id, analysis.stock_code, status, progress, message),
        )

    return {
        "message": "analysis task created",
        "task_id": task_id,
        "stock_code": analysis.stock_code,
        "status": status,
        "progress": progress,
    }


@router.get("/analysis/{task_id}")
def get_analysis_task(task_id: str):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT task_id, stock_code, status, progress, message, created_at, updated_at
            FROM analysis_tasks
            WHERE task_id = ?
            """,
            (task_id,),
        ).fetchone()

    if row is None:
        return {
            "message": "task not found",
            "task_id": task_id,
        }

    return {
        "task_id": row["task_id"],
        "stock_code": row["stock_code"],
        "status": row["status"],
        "progress": row["progress"],
        "message": row["message"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
