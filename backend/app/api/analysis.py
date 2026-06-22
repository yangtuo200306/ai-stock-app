import json
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
    stock_name = f"Mock Stock {analysis.stock_code}"
    price = 100.0
    score = 80
    action = "观望"
    trend = "震荡"
    summary = "这是一份 mock 分析报告。"
    risks = ["这是 mock 风险提示"]
    indicators = {
        "ma5": 100.0,
        "ma10": 98.5,
        "macd": "mock positive",
    }

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO reports (
                stock_code, stock_name, price, score, action, trend,
                summary, risks_json, indicators_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis.stock_code,
                stock_name,
                price,
                score,
                action,
                trend,
                summary,
                json.dumps(risks, ensure_ascii=False),
                json.dumps(indicators, ensure_ascii=False),
            ),
        )
        report_id = cursor.lastrowid
        connection.execute(
            """
            INSERT INTO analysis_tasks (
                task_id, stock_code, status, progress, message, report_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (task_id, analysis.stock_code, status, progress, message, report_id),
        )

    return {
        "message": "analysis task created",
        "task_id": task_id,
        "stock_code": analysis.stock_code,
        "status": status,
        "progress": progress,
        "report_id": report_id,
    }


@router.get("/analysis/{task_id}")
def get_analysis_task(task_id: str):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT task_id, stock_code, status, progress, message,
                   report_id, created_at, updated_at
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
        "report_id": row["report_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
