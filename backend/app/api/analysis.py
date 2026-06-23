import json
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_connection
from app.services.market_data import get_stock_quote

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalysisCreate(BaseModel):
    stock_code: str


@router.post("/analysis")
def create_analysis_task(analysis: AnalysisCreate):
    task_id = str(uuid4())
    status = "completed"
    progress = 100
    message = "analysis completed with real-time quote"

    try:
        quote = get_stock_quote(analysis.stock_code)
    except ValueError as error:
        failed_message = str(error)
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO analysis_tasks (
                    task_id, stock_code, status, progress, message, report_id
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (task_id, analysis.stock_code, "failed", 0, failed_message, None),
            )

        return {
            "message": "analysis task failed",
            "task_id": task_id,
            "stock_code": analysis.stock_code,
            "status": "failed",
            "progress": 0,
            "report_id": None,
            "error": failed_message,
        }

    stock_name = quote.name
    price = quote.price
    score = 80
    action = "观望"
    trend = "震荡" if abs(quote.change_pct) <= 1 else ("偏强" if quote.change_pct > 1 else "偏弱")
    summary = f"基于实时行情分析：{quote.name}（{quote.code}）当前价 {quote.price}，涨跌幅 {quote.change_pct}%。"
    risks = ["行情数据来自第三方接口（efinance），仅供学习和参考"]
    indicators = {
        "change_pct": quote.change_pct,
        "source": quote.source,
        "fetched_at": quote.fetched_at,
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
