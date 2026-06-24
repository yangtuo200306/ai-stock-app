import json

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_current_user_id, get_connection

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports")
def get_reports(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, stock_code, stock_name, price, score, action, trend,
                   indicators_json, created_at
            FROM reports
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,),
        ).fetchall()

    items = []
    for row in rows:
        indicators = json.loads(row["indicators_json"]) if row["indicators_json"] else {}
        change_pct = indicators.get("change_pct")
        ma_trend = indicators.get("ma_trend")

        items.append({
            "id": row["id"],
            "stock_code": row["stock_code"],
            "stock_name": row["stock_name"],
            "price": row["price"],
            "score": row["score"],
            "action": row["action"],
            "trend": row["trend"],
            "change_pct": change_pct,
            "trend_summary": ma_trend or row["trend"],
            "created_at": row["created_at"],
        })

    return {"items": items}


@router.get("/reports/{report_id}")
def get_report(report_id: int, user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, stock_code, stock_name, price, score, action, trend,
                   summary, risks_json, indicators_json, created_at
            FROM reports
            WHERE id = ? AND user_id = ?
            """,
            (report_id, user_id),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "REPORT_NOT_FOUND", "message": "报告不存在"},
        )

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
