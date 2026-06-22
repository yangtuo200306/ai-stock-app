import json

from fastapi import APIRouter

from app.database import get_connection

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports")
def get_reports():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, stock_code, stock_name, score, action, trend, created_at
            FROM reports
            ORDER BY id DESC
            """
        ).fetchall()

    items = [
        {
            "id": row["id"],
            "stock_code": row["stock_code"],
            "stock_name": row["stock_name"],
            "score": row["score"],
            "action": row["action"],
            "trend": row["trend"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]

    return {"items": items}


@router.get("/reports/{report_id}")
def get_report(report_id: int):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, stock_code, stock_name, price, score, action, trend,
                   summary, risks_json, indicators_json, created_at
            FROM reports
            WHERE id = ?
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        return {
            "message": "report not found",
            "report_id": report_id,
        }

    return {
        "id": row["id"],
        "stock_code": row["stock_code"],
        "stock_name": row["stock_name"],
        "price": row["price"],
        "score": row["score"],
        "action": row["action"],
        "trend": row["trend"],
        "summary": row["summary"],
        "risks": json.loads(row["risks_json"]),
        "indicators": json.loads(row["indicators_json"]),
        "created_at": row["created_at"],
    }
