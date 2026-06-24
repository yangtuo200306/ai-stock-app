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
            "SELECT code, name FROM stocks WHERE user_id = ? ORDER BY id",
            (user_id,),
        ).fetchall()

    items = [
        {
            "code": row["code"],
            "name": row["name"],
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
