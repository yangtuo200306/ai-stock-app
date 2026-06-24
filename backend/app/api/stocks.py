from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import get_current_user_id, get_connection

router = APIRouter(prefix="/api", tags=["stocks"])


class StockCreate(BaseModel):
    code: str
    name: str


@router.get("/stocks")
def get_stocks(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.code, s.name,
                   lr.id AS latest_record_id,
                   lr.record_type AS latest_record_type,
                   lr.summary AS latest_summary,
                   lr.updated_at AS latest_updated_at
            FROM stocks s
            LEFT JOIN (
                SELECT id, stock_code, record_type, summary, updated_at,
                       ROW_NUMBER() OVER (
                           PARTITION BY stock_code
                           ORDER BY updated_at DESC, id DESC
                       ) AS rn
                FROM records
                WHERE user_id = ? AND record_type IN ('ask', 'analysis', 'report')
            ) lr ON s.code = lr.stock_code AND lr.rn = 1
            WHERE s.user_id = ?
            ORDER BY s.id
            """,
            (user_id, user_id),
        ).fetchall()

    items = [
        {
            "code": row["code"],
            "name": row["name"],
            "latest_record_id": row["latest_record_id"],
            "latest_record_type": row["latest_record_type"],
            "latest_summary": row["latest_summary"],
            "latest_updated_at": row["latest_updated_at"],
        }
        for row in rows
    ]

    return {"items": items}


@router.post("/stocks")
def add_stock(stock: StockCreate, user_id: str = Depends(get_current_user_id)):
    item = {
        "code": stock.code,
        "name": stock.name,
    }

    with get_connection() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO stocks (code, name, user_id) VALUES (?, ?, ?)",
            (stock.code, stock.name, user_id),
        )

    return {
        "message": "stock added",
        "item": item,
    }


@router.delete("/stocks/{code}")
def delete_stock(code: str, user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM stocks WHERE code = ? AND user_id = ?",
            (code, user_id),
        )

    if cursor.rowcount > 0:
        return {
            "message": "stock deleted",
            "code": code,
        }

    return {
        "message": "stock not found",
        "code": code,
    }
