import json
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import get_current_user_id, get_connection
from app.errors import ErrorCode, api_error

logger = logging.getLogger(__name__)
from app.services.market_data import MarketDataError, get_stock_quote, get_stock_history
from app.services.technical_indicators import build_technical_indicators
from app.services.report_builder import build_analysis_report

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalysisCreate(BaseModel):
    stock_code: str


def _write_analysis_record(report: dict, task_id: str, user_id: str):
    metadata = {
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "score": report["score"],
        "action": report["action"],
        "trend": report["trend"],
        "task_id": task_id,
    }

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO records (user_id, record_type, stock_code, stock_name,
                                 title, summary, report_id, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                "report",
                report["stock_code"],
                report["stock_name"],
                f"报告：{report['stock_name']}（{report['stock_code']}）",
                report["summary"],
                report.get("report_id"),
                json.dumps(metadata, ensure_ascii=False),
            ),
        )


@router.post("/analysis")
def create_analysis_task(analysis: AnalysisCreate, user_id: str = Depends(get_current_user_id)):
    task_id = str(uuid4())
    status = "completed"
    progress = 100
    message = "analysis completed with real-time quote and technical indicators"

    logger.info("创建分析任务: stock=%s, task=%s", analysis.stock_code, task_id)
    try:
        quote = get_stock_quote(analysis.stock_code)
    except MarketDataError as error:
        failed_message = str(error)
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO analysis_tasks (
                    task_id, stock_code, status, progress, message, report_id, user_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (task_id, analysis.stock_code, "failed", 0, failed_message, None, user_id),
            )

        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, failed_message)

    try:
        history = get_stock_history(analysis.stock_code)
    except MarketDataError as error:
        failed_message = str(error)
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO analysis_tasks (
                    task_id, stock_code, status, progress, message, report_id, user_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (task_id, analysis.stock_code, "failed", 0, failed_message, None, user_id),
            )

        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, failed_message)

    technicals = build_technical_indicators(quote.price, history)
    report = build_analysis_report(quote, technicals)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO reports (
                stock_code, stock_name, price, score, action, trend,
                summary, risks_json, indicators_json, user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report["stock_code"],
                report["stock_name"],
                report["price"],
                report["score"],
                report["action"],
                report["trend"],
                report["summary"],
                json.dumps(report["risks"], ensure_ascii=False),
                json.dumps(report["indicators"], ensure_ascii=False),
                user_id,
            ),
        )
        report_id = cursor.lastrowid
        connection.execute(
            """
            INSERT INTO analysis_tasks (
                task_id, stock_code, status, progress, message, report_id, user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (task_id, analysis.stock_code, status, progress, message, report_id, user_id),
        )

    report["report_id"] = report_id
    _write_analysis_record(report, task_id, user_id)

    logger.info("分析任务完成: task=%s, stock=%s, report_id=%s",
                 task_id, analysis.stock_code, report_id)
    return {
        "message": "analysis task created",
        "task_id": task_id,
        "stock_code": analysis.stock_code,
        "status": status,
        "progress": progress,
        "report_id": report_id,
    }


@router.get("/analysis/{task_id}")
def get_analysis_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT task_id, stock_code, status, progress, message,
                   report_id, created_at, updated_at
            FROM analysis_tasks
            WHERE task_id = ? AND user_id = ?
            """,
            (task_id, user_id),
        ).fetchone()

    if row is None:
        raise api_error(404, ErrorCode.TASK_NOT_FOUND, "任务不存在")

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
